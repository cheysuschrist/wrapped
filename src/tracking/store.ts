import type { EventAction, WrapId } from './types.ts';

export interface ActionFilter {
  wrap_id?: WrapId;
  anonymous_id?: string;
  person_id?: string;
  action?: string | string[];
  since?: Date | string;
  until?: Date | string;
}

/**
 * Where actions land. The whole package only needs append + read, so a real
 * deployment can back this with Postgres, a queue, or an analytics warehouse
 * without changing anything downstream.
 */
export interface ActionStore {
  append(action: EventAction): void;
  list(filter?: ActionFilter): EventAction[];
}

function asTime(value: Date | string | undefined): number | undefined {
  if (value === undefined) return undefined;
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

export function matchesFilter(action: EventAction, filter: ActionFilter = {}): boolean {
  if (filter.wrap_id && action.wrap_id !== filter.wrap_id) return false;
  if (filter.anonymous_id && action.anonymous_id !== filter.anonymous_id) return false;
  if (filter.person_id && action.person_id !== filter.person_id) return false;
  if (filter.action) {
    const wanted = Array.isArray(filter.action) ? filter.action : [filter.action];
    if (!wanted.includes(action.action)) return false;
  }
  const at = new Date(action.timestamp).getTime();
  const since = asTime(filter.since);
  const until = asTime(filter.until);
  if (since !== undefined && at < since) return false;
  if (until !== undefined && at > until) return false;
  return true;
}

/** Keeps rows in memory, sorted by timestamp. Good enough for a single event. */
export class MemoryActionStore implements ActionStore {
  private rows: EventAction[] = [];

  append(action: EventAction): void {
    this.rows.push(action);
    this.rows.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  list(filter: ActionFilter = {}): EventAction[] {
    return this.rows.filter((row) => matchesFilter(row, filter));
  }

  get size(): number {
    return this.rows.length;
  }
}

/** Fans one stream out to several stores (e.g. memory + a warehouse writer). */
export class TeeActionStore implements ActionStore {
  private readonly stores: ActionStore[];

  constructor(stores: ActionStore[]) {
    this.stores = stores;
  }

  append(action: EventAction): void {
    for (const store of this.stores) store.append(action);
  }

  list(filter?: ActionFilter): EventAction[] {
    return this.stores[0] ? this.stores[0].list(filter) : [];
  }
}
