// src/features/distribution/server/events.ts
import { DistributionEvent } from "../types";
import type { DistributionEventPayload } from "../types";

export type DistributionEventHandler = (payload: DistributionEventPayload) => void | Promise<void>;

export class DistributionEventBus {
  private handlers = new Map<DistributionEvent, DistributionEventHandler[]>();

  on(event: DistributionEvent, handler: DistributionEventHandler): void {
    const list = this.handlers.get(event) ?? [];
    list.push(handler);
    this.handlers.set(event, list);
  }

  off(event: DistributionEvent, handler: DistributionEventHandler): void {
    const list = this.handlers.get(event);
    if (list) {
      this.handlers.set(event, list.filter((h) => h !== handler));
    }
  }

  async emit(event: DistributionEvent, data?: Record<string, unknown>): Promise<void> {
    const payload: DistributionEventPayload = {
      event,
      action: event,
      data,
      timestamp: new Date(),
    };
    const list = this.handlers.get(event) ?? [];
    for (const handler of list) {
      try { await handler(payload); } catch (err) { console.error(`[DistributionEventBus] Handler error for ${event}:`, err); }
    }
  }
}
