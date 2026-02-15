// comments/events.ts
// Lightweight typed pub/sub — no framework dependency
// Usage:
//   const events = new CommentEventBus();
//   events.on('COMMENT_CREATED', (payload) => { ... });
//   events.emit('COMMENT_CREATED', { commentId, postId, userId, ... });

import type { CommentEvent, CommentEventPayload } from '../types';
import { createLogger } from '@/server/observability/logger';

const logger = createLogger('comments/events');

type Listener = (payload: CommentEventPayload) => void | Promise<void>;

export class CommentEventBus {
  private listeners = new Map<CommentEvent, Listener[]>();
  private onceSet = new WeakSet<Listener>();

  /** Subscribe to an event */
  on(event: CommentEvent, listener: Listener): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event)!.push(listener);
    return () => this.off(event, listener);
  }

  /** Subscribe once */
  once(event: CommentEvent, listener: Listener): () => void {
    this.onceSet.add(listener);
    return this.on(event, listener);
  }

  /** Unsubscribe */
  off(event: CommentEvent, listener: Listener): void {
    const arr = this.listeners.get(event);
    if (!arr) return;
    const idx = arr.indexOf(listener);
    if (idx !== -1) arr.splice(idx, 1);
    if (arr.length === 0) this.listeners.delete(event);
  }

  /** Emit — calls listeners in order. Async listeners run concurrently. */
  async emit(event: CommentEvent, payload: CommentEventPayload): Promise<void> {
    const arr = this.listeners.get(event);
    if (!arr || arr.length === 0) return;

    const fns = [...arr]; // snapshot to avoid mutation during iteration
    const promises: Promise<void>[] = [];

    for (const fn of fns) {
      if (this.onceSet.has(fn)) {
        this.onceSet.delete(fn);
        this.off(event, fn);
      }
      try {
        const result = fn(payload);
        if (result instanceof Promise) promises.push(result);
      } catch (err) {
        logger.error(`Error in ${event} listener`, { error: err instanceof Error ? err.message : String(err) });
      }
    }

    if (promises.length > 0) {
      await Promise.allSettled(promises);
    }
  }

  /** Remove all listeners (useful in tests) */
  removeAll(event?: CommentEvent): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  /** List all registered event names (useful for debugging) */
  get eventNames(): CommentEvent[] {
    return [...this.listeners.keys()];
  }
}
