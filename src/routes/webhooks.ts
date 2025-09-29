import type { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { ErrorResponseSchema, SuccessResponseSchema } from '../schemas/common.js';

// Webhook event types
interface WebhookEvent {
  id: string;
  type: string;
  source: string;
  timestamp: Date;
  data: unknown;
  signature?: string;
  metadata?: Record<string, unknown>;
}

interface WebhookSubscription {
  id: string;
  url: string;
  events: string[];
  secret: string;
  isActive: boolean;
  retryConfig: {
    maxRetries: number;
    retryDelay: number;
    exponentialBackoff: boolean;
  };
  filters?: Record<string, unknown>;
  headers?: Record<string, string>;
  createdAt: Date;
  lastDelivery?: Date;
  failureCount: number;
}

interface WebhookDelivery {
  id: string;
  subscriptionId: string;
  eventId: string;
  url: string;
  attempt: number;
  status: 'pending' | 'success' | 'failed';
  statusCode?: number;
  response?: string;
  error?: string;
  timestamp: Date;
  duration?: number;
}

// In-memory stores (replace with database in production)
const webhookSubscriptions = new Map<string, WebhookSubscription>();
const webhookDeliveries = new Map<string, WebhookDelivery>();
const webhookEvents = new Map<string, WebhookEvent>();

// Event emitter for webhook system
const webhookEmitter = new EventEmitter();

const toError = (error: unknown): Error => (error instanceof Error ? error : new Error(String(error)));

// Webhook processor queue
class WebhookProcessor {
  private deliveryQueue: WebhookDelivery[] = [];
  private isProcessing = false;

  async processDelivery(delivery: WebhookDelivery, subscription: WebhookSubscription): Promise<void> {
    const event = webhookEvents.get(delivery.eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    const payload = {
      id: event.id,
      type: event.type,
      source: event.source,
      timestamp: event.timestamp.toISOString(),
      data: event.data,
      delivery: {
        id: delivery.id,
        attempt: delivery.attempt
      }
    };

    const signature = this.generateSignature(JSON.stringify(payload), subscription.secret);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Webhook-Signature': signature,
      'X-Webhook-Event': event.type,
      'X-Webhook-ID': delivery.id,
      'X-Webhook-Timestamp': event.timestamp.toISOString(),
      'User-Agent': 'Cartrita-Webhooks/1.0',
      ...subscription.headers
    };

    const startTime = Date.now();

    try {
      const response = await fetch(delivery.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });

      const duration = Date.now() - startTime;
      const responseText = await response.text().catch(() => '');

      delivery.status = response.ok ? 'success' : 'failed';
      delivery.statusCode = response.status;
      delivery.response = responseText.substring(0, 1000); // Limit response size
      delivery.duration = duration;
      delivery.timestamp = new Date();

      if (response.ok) {
        subscription.lastDelivery = new Date();
        subscription.failureCount = 0;
      } else {
        subscription.failureCount++;
        delivery.error = `HTTP ${response.status}: ${response.statusText}`;
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      delivery.status = 'failed';
      delivery.error = error instanceof Error ? error.message : String(error);
      delivery.duration = duration;
      delivery.timestamp = new Date();
      subscription.failureCount++;
    }

    webhookDeliveries.set(delivery.id, delivery);
    webhookSubscriptions.set(subscription.id, subscription);

    webhookEmitter.emit('deliveryCompleted', delivery, subscription);
  }

  private generateSignature(payload: string, secret: string): string {
    return `sha256=${createHmac('sha256', secret).update(payload).digest('hex')}`;
  }

  async queueDelivery(delivery: WebhookDelivery): Promise<void> {
    this.deliveryQueue.push(delivery);
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    this.isProcessing = true;

    while (this.deliveryQueue.length > 0) {
      const delivery = this.deliveryQueue.shift();
      if (!delivery) continue;

      const subscription = webhookSubscriptions.get(delivery.subscriptionId);
      if (!subscription || !subscription.isActive) {
        continue;
      }

      try {
        await this.processDelivery(delivery, subscription);
      } catch (error) {
        console.error('Error processing webhook delivery:', error);
      }

      // Delay between deliveries to avoid overwhelming endpoints
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.isProcessing = false;
  }
}

const webhookProcessor = new WebhookProcessor();

// Webhook routes
const webhookRoutes: FastifyPluginAsync = async (fastify) => {

  // Create webhook subscription
  fastify.post('/subscriptions', {
    schema: {
      description: 'Create a webhook subscription',
      tags: ['Webhooks'],
      security: [{ bearerAuth: [] }],
      body: Type.Object({
        url: Type.String({ format: 'uri' }),
        events: Type.Array(Type.String(), { minItems: 1 }),
        secret: Type.Optional(Type.String()),
        filters: Type.Optional(Type.Record(Type.String(), Type.Any())),
        headers: Type.Optional(Type.Record(Type.String(), Type.String())),
        retryConfig: Type.Optional(Type.Object({
          maxRetries: Type.Optional(Type.Number({ minimum: 0, maximum: 10, default: 3 })),
          retryDelay: Type.Optional(Type.Number({ minimum: 1000, maximum: 300000, default: 5000 })),
          exponentialBackoff: Type.Optional(Type.Boolean({ default: true }))
        }))
      }),
      response: {
        201: Type.Object({
          id: Type.String(),
          url: Type.String(),
          events: Type.Array(Type.String()),
          secret: Type.String(),
          isActive: Type.Boolean(),
          createdAt: Type.String()
        }),
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      await request.requireAuth(['webhooks:create', 'admin']);
      const { url, events, secret, filters, headers, retryConfig } = request.body as any;

      // Generate secret if not provided
      const webhookSecret = secret || Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('hex');

      const subscription: WebhookSubscription = {
        id: `wh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        url,
        events,
        secret: webhookSecret,
        isActive: true,
        retryConfig: {
          maxRetries: retryConfig?.maxRetries || 3,
          retryDelay: retryConfig?.retryDelay || 5000,
          exponentialBackoff: retryConfig?.exponentialBackoff ?? true
        },
        filters: filters || {},
        headers: headers || {},
        createdAt: new Date(),
        failureCount: 0
      };

      webhookSubscriptions.set(subscription.id, subscription);

      return reply.status(201).apiSuccess({
        id: subscription.id,
        url: subscription.url,
        events: subscription.events,
        secret: webhookSecret,
        isActive: subscription.isActive,
        createdAt: subscription.createdAt.toISOString()
      });
    } catch (error) {
      const err = toError(error);
      fastify.log.error({ err }, 'Error creating webhook subscription');
      return reply.apiError('WEBHOOK_CREATION_FAILED', 'Failed to create webhook subscription', 500, err);
    }
  });

  // List webhook subscriptions
  fastify.get('/subscriptions', {
    schema: {
      description: 'List webhook subscriptions',
      tags: ['Webhooks'],
      security: [{ bearerAuth: [] }],
      querystring: Type.Object({
        event: Type.Optional(Type.String()),
        active: Type.Optional(Type.Boolean()),
        limit: Type.Optional(Type.Number({ minimum: 1, maximum: 100, default: 20 })),
        offset: Type.Optional(Type.Number({ minimum: 0, default: 0 }))
      }),
      response: {
        200: Type.Object({
          subscriptions: Type.Array(Type.Object({
            id: Type.String(),
            url: Type.String(),
            events: Type.Array(Type.String()),
            isActive: Type.Boolean(),
            createdAt: Type.String(),
            lastDelivery: Type.Optional(Type.String()),
            failureCount: Type.Number()
          })),
          total: Type.Number()
        }),
        401: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      await request.requireAuth(['webhooks:read', 'admin']);
      const { event, active, limit = 20, offset = 0 } = request.query as any;

      let subscriptions = Array.from(webhookSubscriptions.values());

      // Apply filters
      if (event) {
        subscriptions = subscriptions.filter(sub => sub.events.includes(event));
      }

      if (active !== undefined) {
        subscriptions = subscriptions.filter(sub => sub.isActive === active);
      }

      // Apply pagination
      const total = subscriptions.length;
      const paginatedSubscriptions = subscriptions
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(offset, offset + limit);

      const result = paginatedSubscriptions.map(sub => ({
        id: sub.id,
        url: sub.url,
        events: sub.events,
        isActive: sub.isActive,
        createdAt: sub.createdAt.toISOString(),
        lastDelivery: sub.lastDelivery?.toISOString(),
        failureCount: sub.failureCount
      }));

      return reply.apiSuccess({
        subscriptions: result,
        total
      });
    } catch (error) {
      const err = toError(error);
      fastify.log.error({ err }, 'Error listing webhook subscriptions');
      return reply.apiError('WEBHOOK_LIST_FAILED', 'Failed to list webhook subscriptions', 500, err);
    }
  });

  // Update webhook subscription
  fastify.put<{ Params: { id: string } }>('/subscriptions/:id', {
    schema: {
      description: 'Update webhook subscription',
      tags: ['Webhooks'],
      security: [{ bearerAuth: [] }],
      params: Type.Object({
        id: Type.String()
      }),
      body: Type.Object({
        url: Type.Optional(Type.String({ format: 'uri' })),
        events: Type.Optional(Type.Array(Type.String())),
        isActive: Type.Optional(Type.Boolean()),
        filters: Type.Optional(Type.Record(Type.String(), Type.Any())),
        headers: Type.Optional(Type.Record(Type.String(), Type.String())),
        retryConfig: Type.Optional(Type.Object({
          maxRetries: Type.Optional(Type.Number({ minimum: 0, maximum: 10 })),
          retryDelay: Type.Optional(Type.Number({ minimum: 1000, maximum: 300000 })),
          exponentialBackoff: Type.Optional(Type.Boolean())
        }))
      }),
      response: {
        200: Type.Object({
          id: Type.String(),
          url: Type.String(),
          events: Type.Array(Type.String()),
          isActive: Type.Boolean(),
          updatedAt: Type.String()
        }),
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      await request.requireAuth(['webhooks:update', 'admin']);
      const { id } = request.params;
      const updates = request.body as any;

      const subscription = webhookSubscriptions.get(id);
      if (!subscription) {
        return reply.apiError('WEBHOOK_NOT_FOUND', 'Webhook subscription not found', 404);
      }

      // Update subscription
      Object.assign(subscription, updates);
      webhookSubscriptions.set(id, subscription);

      return reply.apiSuccess({
        id: subscription.id,
        url: subscription.url,
        events: subscription.events,
        isActive: subscription.isActive,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      const err = toError(error);
      fastify.log.error({ err }, 'Error updating webhook subscription');
      return reply.apiError('WEBHOOK_UPDATE_FAILED', 'Failed to update webhook subscription', 500, err);
    }
  });

  // Delete webhook subscription
  fastify.delete<{ Params: { id: string } }>('/subscriptions/:id', {
    schema: {
      description: 'Delete webhook subscription',
      tags: ['Webhooks'],
      security: [{ bearerAuth: [] }],
      params: Type.Object({
        id: Type.String()
      }),
      response: {
        204: SuccessResponseSchema,
        401: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      await request.requireAuth(['webhooks:delete', 'admin']);
      const { id } = request.params;

      const subscription = webhookSubscriptions.get(id);
      if (!subscription) {
        return reply.apiError('WEBHOOK_NOT_FOUND', 'Webhook subscription not found', 404);
      }

      webhookSubscriptions.delete(id);
      return reply.status(204).send();
    } catch (error) {
      const err = toError(error);
      fastify.log.error({ err }, 'Error deleting webhook subscription');
      return reply.apiError('WEBHOOK_DELETE_FAILED', 'Failed to delete webhook subscription', 500, err);
    }
  });

  // Trigger webhook event (for internal use)
  fastify.post('/events', {
    schema: {
      description: 'Trigger a webhook event',
      tags: ['Webhooks'],
      security: [{ bearerAuth: [] }],
      body: Type.Object({
        type: Type.String(),
        source: Type.String(),
        data: Type.Any(),
        metadata: Type.Optional(Type.Record(Type.String(), Type.Any()))
      }),
      response: {
        202: Type.Object({
          eventId: Type.String(),
          deliveriesQueued: Type.Number(),
          message: Type.String()
        }),
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      await request.requireAuth(['webhooks:trigger', 'admin']);
      const { type, source, data, metadata } = request.body as any;

      const event: WebhookEvent = {
        id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        source,
        timestamp: new Date(),
        data,
        metadata
      };

      webhookEvents.set(event.id, event);

      // Find matching subscriptions
      const matchingSubscriptions = Array.from(webhookSubscriptions.values())
        .filter(sub => sub.isActive && sub.events.includes(type));

      let deliveriesQueued = 0;

      // Queue deliveries
      for (const subscription of matchingSubscriptions) {
        // Apply filters if configured
        if (subscription.filters && Object.keys(subscription.filters).length > 0) {
          // Simple filter matching (extend as needed)
          const matchesFilter = Object.entries(subscription.filters).every(([key, value]) => {
            return data[key] === value;
          });

          if (!matchesFilter) {
            continue;
          }
        }

        const delivery: WebhookDelivery = {
          id: `del_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          subscriptionId: subscription.id,
          eventId: event.id,
          url: subscription.url,
          attempt: 1,
          status: 'pending',
          timestamp: new Date()
        };

        webhookDeliveries.set(delivery.id, delivery);
        await webhookProcessor.queueDelivery(delivery);
        deliveriesQueued++;
      }

      return reply.status(202).apiSuccess({
        eventId: event.id,
        deliveriesQueued,
        message: `Event triggered and ${deliveriesQueued} deliveries queued`
      });
    } catch (error) {
      const err = toError(error);
      fastify.log.error({ err }, 'Error triggering webhook event');
      return reply.apiError('WEBHOOK_TRIGGER_FAILED', 'Failed to trigger webhook event', 500, err);
    }
  });

  // Get webhook deliveries
  fastify.get('/deliveries', {
    schema: {
      description: 'Get webhook delivery history',
      tags: ['Webhooks'],
      security: [{ bearerAuth: [] }],
      querystring: Type.Object({
        subscriptionId: Type.Optional(Type.String()),
        eventId: Type.Optional(Type.String()),
        status: Type.Optional(Type.Union([
          Type.Literal('pending'),
          Type.Literal('success'),
          Type.Literal('failed')
        ])),
        limit: Type.Optional(Type.Number({ minimum: 1, maximum: 100, default: 20 })),
        offset: Type.Optional(Type.Number({ minimum: 0, default: 0 }))
      }),
      response: {
        200: Type.Object({
          deliveries: Type.Array(Type.Object({
            id: Type.String(),
            subscriptionId: Type.String(),
            eventId: Type.String(),
            url: Type.String(),
            attempt: Type.Number(),
            status: Type.String(),
            statusCode: Type.Optional(Type.Number()),
            error: Type.Optional(Type.String()),
            timestamp: Type.String(),
            duration: Type.Optional(Type.Number())
          })),
          total: Type.Number()
        }),
        401: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      await request.requireAuth(['webhooks:read', 'admin']);
      const { subscriptionId, eventId, status, limit = 20, offset = 0 } = request.query as any;

      let deliveries = Array.from(webhookDeliveries.values());

      // Apply filters
      if (subscriptionId) {
        deliveries = deliveries.filter(del => del.subscriptionId === subscriptionId);
      }

      if (eventId) {
        deliveries = deliveries.filter(del => del.eventId === eventId);
      }

      if (status) {
        deliveries = deliveries.filter(del => del.status === status);
      }

      // Apply pagination
      const total = deliveries.length;
      const paginatedDeliveries = deliveries
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(offset, offset + limit);

      const result = paginatedDeliveries.map(del => ({
        id: del.id,
        subscriptionId: del.subscriptionId,
        eventId: del.eventId,
        url: del.url,
        attempt: del.attempt,
        status: del.status,
        statusCode: del.statusCode,
        error: del.error,
        timestamp: del.timestamp.toISOString(),
        duration: del.duration
      }));

      return reply.apiSuccess({
        deliveries: result,
        total
      });
    } catch (error) {
      const err = toError(error);
      fastify.log.error({ err }, 'Error getting webhook deliveries');
      return reply.apiError('WEBHOOK_DELIVERIES_FAILED', 'Failed to get webhook deliveries', 500, err);
    }
  });

  // Retry webhook delivery
  fastify.post<{ Params: { deliveryId: string } }>('/deliveries/:deliveryId/retry', {
    schema: {
      description: 'Retry a failed webhook delivery',
      tags: ['Webhooks'],
      security: [{ bearerAuth: [] }],
      params: Type.Object({
        deliveryId: Type.String()
      }),
      response: {
        202: Type.Object({
          deliveryId: Type.String(),
          message: Type.String()
        }),
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      await request.requireAuth(['webhooks:retry', 'admin']);
      const { deliveryId } = request.params;

      const delivery = webhookDeliveries.get(deliveryId);
      if (!delivery) {
        return reply.apiError('DELIVERY_NOT_FOUND', 'Webhook delivery not found', 404);
      }

      if (delivery.status === 'success') {
        return reply.apiError('DELIVERY_ALREADY_SUCCESS', 'Delivery already succeeded', 400);
      }

      const subscription = webhookSubscriptions.get(delivery.subscriptionId);
      if (!subscription || !subscription.isActive) {
        return reply.apiError('SUBSCRIPTION_INACTIVE', 'Webhook subscription is inactive', 400);
      }

      // Create new delivery attempt
      const { statusCode: _statusCode, response: _response, error: _error, duration: _duration, ...deliveryRest } = delivery;
      const retryDelivery: WebhookDelivery = {
        ...deliveryRest,
        id: `del_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        attempt: delivery.attempt + 1,
        status: 'pending',
        timestamp: new Date()
      };

      webhookDeliveries.set(retryDelivery.id, retryDelivery);
      await webhookProcessor.queueDelivery(retryDelivery);

      return reply.status(202).apiSuccess({
        deliveryId: retryDelivery.id,
        message: 'Delivery retry queued'
      });
    } catch (error) {
      const err = toError(error);
      fastify.log.error({ err }, 'Error retrying webhook delivery');
      return reply.apiError('WEBHOOK_RETRY_FAILED', 'Failed to retry webhook delivery', 500, err);
    }
  });

  // Test webhook endpoint
  fastify.post<{ Params: { id: string } }>('/subscriptions/:id/test', {
    schema: {
      description: 'Test a webhook subscription',
      tags: ['Webhooks'],
      security: [{ bearerAuth: [] }],
      params: Type.Object({
        id: Type.String()
      }),
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          statusCode: Type.Optional(Type.Number()),
          response: Type.Optional(Type.String()),
          error: Type.Optional(Type.String()),
          duration: Type.Number()
        }),
        401: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      await request.requireAuth(['webhooks:test', 'admin']);
      const { id } = request.params;

      const subscription = webhookSubscriptions.get(id);
      if (!subscription) {
        return reply.apiError('WEBHOOK_NOT_FOUND', 'Webhook subscription not found', 404);
      }

      // Create test event
      const testEvent: WebhookEvent = {
        id: `test_${Date.now()}`,
        type: 'webhook.test',
        source: 'webhook-test',
        timestamp: new Date(),
        data: {
          message: 'This is a test webhook event',
          subscriptionId: subscription.id
        }
      };

      // Create test delivery
      const testDelivery: WebhookDelivery = {
        id: `test_del_${Date.now()}`,
        subscriptionId: subscription.id,
        eventId: testEvent.id,
        url: subscription.url,
        attempt: 1,
        status: 'pending',
        timestamp: new Date()
      };

      // Process delivery immediately
      await webhookProcessor.processDelivery(testDelivery, subscription);

      return reply.apiSuccess({
        success: testDelivery.status === 'success',
        statusCode: testDelivery.statusCode,
        response: testDelivery.response,
        error: testDelivery.error,
        duration: testDelivery.duration || 0
      });
    } catch (error) {
      const err = toError(error);
      fastify.log.error({ err }, 'Error testing webhook');
      return reply.apiError('WEBHOOK_TEST_FAILED', 'Failed to test webhook', 500, err);
    }
  });
};

export default webhookRoutes;

// Export webhook utilities for use in other modules
export {
  webhookEmitter,
  type WebhookEvent,
  type WebhookSubscription,
  type WebhookDelivery
};

// Helper function to trigger webhook events from other parts of the application
export async function triggerWebhookEvent(type: string, source: string, data: unknown, metadata?: Record<string, unknown>): Promise<string> {
  const event: WebhookEvent = {
    id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    source,
    timestamp: new Date(),
    data,
    ...(metadata ? { metadata } : {})
  };

  webhookEvents.set(event.id, event);

  // Find matching subscriptions and queue deliveries
  const matchingSubscriptions = Array.from(webhookSubscriptions.values())
    .filter(sub => sub.isActive && sub.events.includes(type));

  for (const subscription of matchingSubscriptions) {
    const delivery: WebhookDelivery = {
      id: `del_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      subscriptionId: subscription.id,
      eventId: event.id,
      url: subscription.url,
      attempt: 1,
      status: 'pending',
      timestamp: new Date()
    };

    webhookDeliveries.set(delivery.id, delivery);
    await webhookProcessor.queueDelivery(delivery);
  }

  return event.id;
}