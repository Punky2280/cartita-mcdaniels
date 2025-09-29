import { EventEmitter } from 'node:events';
import 'reflect-metadata';

/**
 * Enterprise Dependency Injection Container
 *
 * Implements the Service Locator and Dependency Injection patterns
 * for loose coupling and testability
 */

interface ServiceDefinition<T = any> {
  factory: (...deps: any[]) => T | Promise<T>;
  dependencies?: string[];
  singleton?: boolean;
  scope?: 'singleton' | 'transient' | 'scoped';
  tags?: string[];
  meta?: Record<string, unknown>;
}

interface ServiceInstance<T = any> {
  value: T;
  created: Date;
  dependencies: string[];
  scope: 'singleton' | 'transient' | 'scoped';
}

export class DIContainer extends EventEmitter {
  private services: Map<string, ServiceDefinition> = new Map();
  private instances: Map<string, ServiceInstance> = new Map();
  private resolving: Set<string> = new Set();
  private scopedInstances: Map<string, Map<string, ServiceInstance>> = new Map();

  /**
   * Register a service with the container
   */
  register<T>(
    name: string,
    factory: (...deps: any[]) => T | Promise<T>,
    options: {
      dependencies?: string[];
      singleton?: boolean;
      scope?: 'singleton' | 'transient' | 'scoped';
      tags?: string[];
      meta?: Record<string, unknown>;
    } = {}
  ): this {
    this.services.set(name, {
      factory,
      dependencies: options.dependencies || [],
      singleton: options.singleton ?? true,
      scope: options.scope || (options.singleton !== false ? 'singleton' : 'transient'),
      tags: options.tags || [],
      meta: options.meta || {}
    });

    this.emit('serviceRegistered', { name, options });
    return this;
  }

  /**
   * Register a singleton service
   */
  singleton<T>(
    name: string,
    factory: (...deps: any[]) => T | Promise<T>,
    dependencies: string[] = []
  ): this {
    return this.register(name, factory, { dependencies, singleton: true, scope: 'singleton' });
  }

  /**
   * Register a transient service
   */
  transient<T>(
    name: string,
    factory: (...deps: any[]) => T | Promise<T>,
    dependencies: string[] = []
  ): this {
    return this.register(name, factory, { dependencies, singleton: false, scope: 'transient' });
  }

  /**
   * Register a service instance directly
   */
  instance<T>(name: string, instance: T): this {
    this.instances.set(name, {
      value: instance,
      created: new Date(),
      dependencies: [],
      scope: 'singleton'
    });

    this.emit('instanceRegistered', { name, instance });
    return this;
  }

  /**
   * Resolve a service by name
   */
  async resolve<T>(name: string, scopeId?: string): Promise<T> {
    // Check for circular dependencies
    if (this.resolving.has(name)) {
      throw new Error(`Circular dependency detected: ${Array.from(this.resolving).join(' -> ')} -> ${name}`);
    }

    const definition = this.services.get(name);
    if (!definition) {
      throw new Error(`Service '${name}' is not registered`);
    }

    // Handle scoped instances
    if (definition.scope === 'scoped' && scopeId) {
      const scopedMap = this.scopedInstances.get(scopeId) || new Map();
      const existing = scopedMap.get(name);
      if (existing) {
        return existing.value;
      }
    }

    // Handle singleton instances
    if (definition.scope === 'singleton') {
      const existing = this.instances.get(name);
      if (existing) {
        return existing.value;
      }
    }

    // Resolve dependencies
    this.resolving.add(name);

    try {
      const dependencies = await Promise.all(
        (definition.dependencies || []).map(dep => this.resolve(dep, scopeId))
      );

      // Create the service instance
      const instance = await definition.factory(...dependencies);

      // Store the instance based on scope
      const serviceInstance: ServiceInstance = {
        value: instance,
        created: new Date(),
        dependencies: definition.dependencies || [],
        scope: definition.scope ?? 'singleton'
      };

      if (definition.scope === 'singleton') {
        this.instances.set(name, serviceInstance);
      } else if (definition.scope === 'scoped' && scopeId) {
        const scopedMap = this.scopedInstances.get(scopeId) || new Map();
        scopedMap.set(name, serviceInstance);
        this.scopedInstances.set(scopeId, scopedMap);
      }

      this.emit('serviceResolved', { name, instance, scope: definition.scope });
      return instance;

    } finally {
      this.resolving.delete(name);
    }
  }

  /**
   * Resolve multiple services by tag
   */
  async resolveByTag<T>(tag: string, scopeId?: string): Promise<T[]> {
    const services = Array.from(this.services.entries())
      .filter(([, definition]) => definition.tags?.includes(tag))
      .map(([name]) => name);

    return Promise.all(
      services.map(name => this.resolve<T>(name, scopeId))
    );
  }

  /**
   * Check if a service is registered
   */
  has(name: string): boolean {
    return this.services.has(name) || this.instances.has(name);
  }

  /**
   * Get service definition
   */
  getDefinition(name: string): ServiceDefinition | undefined {
    return this.services.get(name);
  }

  /**
   * Get all registered service names
   */
  getServiceNames(): string[] {
    return Array.from(new Set([
      ...this.services.keys(),
      ...this.instances.keys()
    ]));
  }

  /**
   * Get services by tag
   */
  getServicesByTag(tag: string): string[] {
    return Array.from(this.services.entries())
      .filter(([, definition]) => definition.tags?.includes(tag))
      .map(([name]) => name);
  }

  /**
   * Create a new scope
   */
  createScope(scopeId: string): DIScope {
    return new DIScope(this, scopeId);
  }

  /**
   * Dispose of a scope and its instances
   */
  async disposeScope(scopeId: string): Promise<void> {
    const scopedMap = this.scopedInstances.get(scopeId);
    if (scopedMap) {
      // Dispose instances that implement IDisposable
      for (const [name, instance] of scopedMap) {
        if (this.isDisposable(instance.value)) {
          try {
            await instance.value.dispose();
          } catch (error) {
            this.emit('disposeError', { name, error, scopeId });
          }
        }
      }
      this.scopedInstances.delete(scopeId);
    }

    this.emit('scopeDisposed', { scopeId });
  }

  /**
   * Dispose all instances and clear the container
   */
  async dispose(): Promise<void> {
    // Dispose all scoped instances
    for (const scopeId of this.scopedInstances.keys()) {
      await this.disposeScope(scopeId);
    }

    // Dispose singleton instances
    for (const [name, instance] of this.instances) {
      if (this.isDisposable(instance.value)) {
        try {
          await instance.value.dispose();
        } catch (error) {
          this.emit('disposeError', { name, error });
        }
      }
    }

    this.instances.clear();
    this.services.clear();
    this.resolving.clear();

    this.emit('containerDisposed');
  }

  /**
   * Get container health information
   */
  getHealth(): {
    registeredServices: number;
    singletonInstances: number;
    scopedInstances: number;
    totalScopes: number;
    circularDependencies: string[];
  } {
    return {
      registeredServices: this.services.size,
      singletonInstances: this.instances.size,
      scopedInstances: Array.from(this.scopedInstances.values())
        .reduce((total, scopeMap) => total + scopeMap.size, 0),
      totalScopes: this.scopedInstances.size,
      circularDependencies: Array.from(this.resolving)
    };
  }

  /**
   * Validate service definitions for circular dependencies
   */
  validateDependencies(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (serviceName: string): boolean => {
      if (visiting.has(serviceName)) {
        errors.push(`Circular dependency detected involving service: ${serviceName}`);
        return false;
      }

      if (visited.has(serviceName)) {
        return true;
      }

      const definition = this.services.get(serviceName);
      if (!definition) {
        errors.push(`Service '${serviceName}' is not registered`);
        return false;
      }

      visiting.add(serviceName);

      for (const dependency of definition.dependencies || []) {
        if (!visit(dependency)) {
          return false;
        }
      }

      visiting.delete(serviceName);
      visited.add(serviceName);
      return true;
    };

    for (const serviceName of this.services.keys()) {
      if (!visited.has(serviceName)) {
        visit(serviceName);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private isDisposable(obj: any): obj is { dispose(): Promise<void> | void } {
    return obj && typeof obj.dispose === 'function';
  }
}

/**
 * Scoped dependency injection container
 */
export class DIScope {
  constructor(
    private container: DIContainer,
    private scopeId: string
  ) {}

  async resolve<T>(name: string): Promise<T> {
    return this.container.resolve<T>(name, this.scopeId);
  }

  async resolveByTag<T>(tag: string): Promise<T[]> {
    return this.container.resolveByTag<T>(tag, this.scopeId);
  }

  async dispose(): Promise<void> {
    return this.container.disposeScope(this.scopeId);
  }
}

/**
 * Decorators for service registration
 */
export function Injectable(name?: string) {
  return function <T extends new (...args: any[]) => any>(constructor: T) {
    const serviceName = name || constructor.name;
    const reflectMetadata = Reflect as typeof Reflect & {
      defineMetadata?: (metadataKey: string, metadataValue: unknown, target: object) => void;
      getMetadata?: (metadataKey: string, target: object) => unknown;
    };

    // Store metadata for later registration
    reflectMetadata.defineMetadata?.('injectable', true, constructor);
    reflectMetadata.defineMetadata?.('serviceName', serviceName, constructor);

    return constructor;
  };
}

export function Inject(name: string) {
  return function (target: any, propertyKey: string | symbol, parameterIndex: number) {
    const reflectMetadata = Reflect as typeof Reflect & {
      defineMetadata?: (metadataKey: string, metadataValue: unknown, target: object) => void;
      getMetadata?: (metadataKey: string, target: object) => unknown;
    };

  const injectMetadata = reflectMetadata.getMetadata?.('injects', target);
  const existingInjects: string[] = Array.isArray(injectMetadata) ? [...injectMetadata] : [];
  existingInjects[parameterIndex] = name;
  reflectMetadata.defineMetadata?.('injects', existingInjects, target);
  };
}

/**
 * Global container instance
 */
export const container = new DIContainer();

/**
 * Service registration helpers
 */
export const service = {
  singleton: <T>(name: string, factory: (...deps: any[]) => T | Promise<T>, dependencies?: string[]) =>
    container.singleton(name, factory, dependencies),

  transient: <T>(name: string, factory: (...deps: any[]) => T | Promise<T>, dependencies?: string[]) =>
    container.transient(name, factory, dependencies),

  instance: <T>(name: string, instance: T) =>
    container.instance(name, instance),

  resolve: <T>(name: string) =>
    container.resolve<T>(name),

  resolveByTag: <T>(tag: string) =>
    container.resolveByTag<T>(tag)
};

// Add global reflection support for decorators
const reflectGlobal = Reflect as typeof Reflect & {
  defineMetadata?: (...args: unknown[]) => unknown;
};

if (typeof Reflect === 'undefined' || !reflectGlobal.defineMetadata) {
  require('reflect-metadata');
}