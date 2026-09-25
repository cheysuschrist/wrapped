import { sequentialIds } from '../src/tracking/ids.ts';
import { MemoryActionStore } from '../src/tracking/store.ts';
import { Tracker, memoryStorage, type TrackerOptions } from '../src/tracking/tracker.ts';
import type { EventAction } from '../src/tracking/types.ts';

export const BASE = Date.parse('2026-09-25T23:00:00.000Z');
export const at = (minutes: number): Date => new Date(BASE + minutes * 60_000);

export function action(overrides: Partial<EventAction> & { action: string }): EventAction {
  return {
    event_id: overrides.event_id ?? `evt_${Math.random().toString(36).slice(2)}`,
    wrap_id: overrides.wrap_id ?? 'wrap_test',
    anonymous_id: overrides.anonymous_id ?? 'visitor_a',
    person_id: overrides.person_id ?? null,
    session_id: overrides.session_id ?? 'session_1',
    timestamp: overrides.timestamp ?? at(0).toISOString(),
    action: overrides.action,
    object_id: overrides.object_id ?? null,
    ...(overrides.metadata ? { metadata: overrides.metadata } : {}),
  };
}

export function harness(options: Partial<TrackerOptions> = {}) {
  const store = options.store ?? new MemoryActionStore();
  const newId = options.newId ?? sequentialIds();
  const tracker = new Tracker({
    wrapId: 'wrap_test',
    store,
    storage: options.storage ?? memoryStorage(),
    newId,
    now: options.now ?? (() => at(0)),
    ...options,
  });
  return { store: store as MemoryActionStore, tracker, newId };
}
