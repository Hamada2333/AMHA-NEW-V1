// ─── EVENT BUS (in-process pub/sub) ───
// Lightweight event-driven architecture for local deployment.
// Extensible to Kafka/RabbitMQ by swapping this module.
//
// Features:
//   - Typed event subscriptions
//   - Wildcard (*) subscriptions for logging/monitoring
//   - Async handler execution (non-blocking)
//   - Error isolation per handler
//   - Metrics tracking

class EventBus {
  constructor() {
    this.handlers = new Map();
    this.wildcardHandlers = [];
    this.metrics = {
      published: 0,
      processed: 0,
      errors: 0,
    };
  }

  /**
   * Subscribe to a specific event type
   * @param {string} eventType - Event type to listen for, or '*' for all events
   * @param {Function} handler - Async handler function(event)
   * @returns {Function} unsubscribe function
   */
  on(eventType, handler) {
    if (eventType === '*') {
      this.wildcardHandlers.push(handler);
      return () => {
        this.wildcardHandlers = this.wildcardHandlers.filter(h => h !== handler);
      };
    }

    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType).push(handler);

    return () => {
      const handlers = this.handlers.get(eventType);
      if (handlers) {
        this.handlers.set(eventType, handlers.filter(h => h !== handler));
      }
    };
  }

  /**
   * Publish an event to all matching subscribers
   * @param {string} eventType - Event type
   * @param {Object} event - Full event object
   */
  async emit(eventType, event) {
    this.metrics.published++;

    const eventWithType = { ...event, event_type: eventType };

    // Fire typed handlers
    const handlers = this.handlers.get(eventType) || [];
    for (const handler of handlers) {
      try {
        // Execute async — non-blocking
        setImmediate(async () => {
          try {
            await handler(eventWithType);
            this.metrics.processed++;
          } catch (err) {
            this.metrics.errors++;
            console.error(`[EventBus] Handler error for ${eventType}:`, err.message);
            // Emit to error channel for dead-letter processing
            this._emitError(eventType, eventWithType, err);
          }
        });
      } catch (err) {
        this.metrics.errors++;
        console.error(`[EventBus] Dispatch error for ${eventType}:`, err.message);
      }
    }

    // Fire wildcard handlers (for logging, monitoring, broadcasting)
    for (const handler of this.wildcardHandlers) {
      try {
        setImmediate(async () => {
          try {
            await handler(eventWithType);
          } catch (err) {
            console.error(`[EventBus] Wildcard handler error:`, err.message);
          }
        });
      } catch (err) {
        // Silently ignore wildcard errors
      }
    }
  }

  /**
   * Internal error emission for dead-letter queue processing
   */
  _emitError(eventType, event, error) {
    const errorHandlers = this.handlers.get('__error__') || [];
    for (const handler of errorHandlers) {
      try {
        handler({ eventType, event, error: error.message });
      } catch (_) {
        // Last resort — log and swallow
      }
    }
  }

  /**
   * Subscribe to handler errors (for dead-letter queue)
   */
  onError(handler) {
    return this.on('__error__', handler);
  }

  /**
   * Get bus metrics
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * List all registered event types
   */
  getRegisteredTypes() {
    return [...this.handlers.keys()].filter(k => k !== '__error__');
  }
}

// Singleton instance
const eventBus = new EventBus();
export default eventBus;
