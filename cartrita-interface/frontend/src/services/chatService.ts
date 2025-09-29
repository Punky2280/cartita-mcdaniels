/**
 * Cartrita Interface - Chat Service
 * Handles chat API interactions, WebSocket connections, and agent communication
 */

import { apiClient } from './api';
import {
  ChatMessage,
  ChatConversation,
  ChatRequest,
  ChatResponse,
  AgentInfo,
  WebSocketMessage,
  ApiResponse
} from '@/types';
import { logger } from '@/utils/logger';

export class ChatService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private messageQueue: ChatRequest[] = [];
  private listeners: Map<string, (data: WebSocketMessage) => void> = new Map();

  constructor() {
    this.initializeWebSocket();
  }

  // WebSocket Management
  private initializeWebSocket(): void {
    try {
      const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3002/ws';
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        logger.info('WebSocket connected');
        this.reconnectAttempts = 0;
        this.processMessageQueue();
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleWebSocketMessage(message);
        } catch (error) {
          logger.error('Failed to parse WebSocket message', error instanceof Error ? error : new Error(String(error)));
        }
      };

      this.ws.onclose = () => {
        logger.warn('WebSocket disconnected');
        this.handleReconnect();
      };

      this.ws.onerror = (error) => {
        logger.error('WebSocket error', error instanceof Error ? error : new Error('WebSocket error'));
      };
    } catch (error) {
      logger.error('Failed to initialize WebSocket', error instanceof Error ? error : new Error(String(error)));
    }
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

      logger.info(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

      setTimeout(() => {
        this.initializeWebSocket();
      }, delay);
    } else {
      logger.error('Max reconnection attempts reached');
    }
  }

  private handleWebSocketMessage(message: WebSocketMessage): void {
    // Notify all listeners
    this.listeners.forEach((listener) => {
      try {
        listener(message);
      } catch (error) {
        logger.error('Error in WebSocket message listener', error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  private processMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      const request = this.messageQueue.shift();
      if (request) {
        this.sendWebSocketMessage(request);
      }
    }
  }

  private sendWebSocketMessage(request: ChatRequest): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'chat_request',
        payload: request,
        timestamp: new Date()
      }));
    } else {
      this.messageQueue.push(request);
      if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
        this.initializeWebSocket();
      }
    }
  }

  // Public API Methods
  public addMessageListener(id: string, listener: (data: WebSocketMessage) => void): void {
    this.listeners.set(id, listener);
  }

  public removeMessageListener(id: string): void {
    this.listeners.delete(id);
  }

  public async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    try {
      // Send via WebSocket for real-time streaming if available
      if (request.streaming && this.ws?.readyState === WebSocket.OPEN) {
        this.sendWebSocketMessage(request);

        // Return a promise that resolves when we get the response
        return new Promise((resolve, reject) => {
          const responseListener = (message: WebSocketMessage) => {
            if (message.type === 'chat_response' && message.conversationId === request.conversationId) {
              this.removeMessageListener('temp-response');
              resolve(message.payload as ChatResponse);
            } else if (message.type === 'error') {
              this.removeMessageListener('temp-response');
              reject(new Error((message.payload as { message: string }).message));
            }
          };

          this.addMessageListener('temp-response', responseListener);

          // Timeout after 30 seconds
          setTimeout(() => {
            this.removeMessageListener('temp-response');
            reject(new Error('Request timeout'));
          }, 30000);
        });
      }

      // Fallback to HTTP API
      const response = await apiClient.post<ChatResponse>('/v1/chat', request);
      return response.data;
    } catch (error) {
      logger.error('Failed to send chat message', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  public async getConversations(): Promise<ChatConversation[]> {
    try {
      const response = await apiClient.get<ChatConversation[]>('/v1/chat/conversations');
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch conversations', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  public async getConversation(id: string): Promise<ChatConversation> {
    try {
      const response = await apiClient.get<ChatConversation>(`/v1/chat/conversations/${id}`);
      return response.data;
    } catch (error) {
      logger.error(`Failed to fetch conversation ${id}`, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  public async createConversation(title: string, agentType?: string): Promise<ChatConversation> {
    try {
      const response = await apiClient.post<ChatConversation>('/v1/chat/conversations', {
        title,
        agentType
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to create conversation', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  public async deleteConversation(id: string): Promise<void> {
    try {
      await apiClient.delete(`/v1/chat/conversations/${id}`);
    } catch (error) {
      logger.error(`Failed to delete conversation ${id}`, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  public async getAvailableAgents(): Promise<AgentInfo[]> {
    try {
      const response = await apiClient.get<AgentInfo[]>('/v1/agents');
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch available agents', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  public async getAgentInfo(agentId: string): Promise<AgentInfo> {
    try {
      const response = await apiClient.get<AgentInfo>(`/v1/agents/${agentId}`);
      return response.data;
    } catch (error) {
      logger.error(`Failed to fetch agent info for ${agentId}`, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  public cleanup(): void {
    this.listeners.clear();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Create singleton instance
export const chatService = new ChatService();

export default chatService;