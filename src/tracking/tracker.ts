import { createId } from './ids.ts';
import type { IdentityGraph } from './identity.ts';
import type { ActionStore } from './store.ts';
import type {
  ActionName,
  EventAction,
  IdentifyTraits,
  Metadata,
  Person,
  SessionId,
  VisitorId,
  WrapId,
} from './types.ts';

/** Structurally satisfied by `window.localStorage`. */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function memoryStorage(seed: Record<string, string> = {}): KeyValueStorage {
  const map = new Map(Object.entries(seed));
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
  };
}

export interface TrackerOptions {
  wrapId: WrapId;
  store: ActionStore;
  /** Defaults to an in-memory store; pass `localStorage` in the browser. */
  storage?: KeyValueStorage;
  identity?: IdentityGraph;
  /** A visit ends after this much inactivity. Default 30 minutes. */
  sessionTtlMs?: number;
  now?: () => Date;
  newId?: (prefix: string) => string;
}

export interface TrackOptions {
  objectId?: string | null;
  metadata?: Metadata;
  /** Override the clock, e.g. when replaying a queued offline action. */
  timestamp?: Date | string;
}

const TTL_DEFAULT = 30 * 60 * 1000;

/**
 * The write side: one first-party visitor id per browser, a rotating session
 * id, and a row appended per action.
 *
 * Nothing is sampled and nothing is inferred — if it isn't called, it didn't
 * happen, which is exactly the property that makes the numbers downstream
 * defensible.
 */
export class Tracker {
  readonly wrapId: WrapId;
  readonly visitorId: VisitorId;
  /** True when this browser has been here before and the last visit expired. */
  readonly isReturningVisit: boolean;

  private sessionIdValue: SessionId;
  private lastSeen: number;
  private readonly store: ActionStore;
  private readonly storage: KeyValueStorage;
  private readonly identity: IdentityGraph | undefined;
  private readonly ttl: number;
  private readonly now: () => Date;
  private readonly newId: (prefix: string) => string;

  constructor(options: TrackerOptions) {
    this.wrapId = options.wrapId;
    this.store = options.store;
    this.storage = options.storage ?? memoryStorage();
    this.identity = options.identity;
    this.ttl = options.sessionTtlMs ?? TTL_DEFAULT;
    this.now = options.now ?? (() => new Date());
    this.newId = options.newId ?? createId;

    const stored = this.storage.getItem(this.key('visitor'));
    this.visitorId = stored ?? this.newId('visitor');
    if (!stored) this.storage.setItem(this.key('visitor'), this.visitorId);

    const lastSeenRaw = Number(this.storage.getItem(this.key('seen')) ?? '0');
    const previousSession = this.storage.getItem(this.key('session'));
    const expired = !previousSession || this.now().getTime() - lastSeenRaw > this.ttl;

    this.isReturningVisit = Boolean(stored) && expired;
    this.sessionIdValue = expired ? this.newId('session') : previousSession;
    this.lastSeen = this.now().getTime();
    this.persistSession();
  }

  get sessionId(): SessionId {
    return this.sessionIdValue;
  }

  /** The attendee record behind this browser, if they've identified themselves. */
  get person(): Person | undefined {
    return this.identity?.personFor(this.visitorId);
  }

  track(action: ActionName, options: TrackOptions = {}): EventAction {
    const at = options.timestamp ? new Date(options.timestamp) : this.now();
    this.rotateSessionIfStale(at);

    const row: EventAction = {
      event_id: this.newId('evt'),
      wrap_id: this.wrapId,
      anonymous_id: this.visitorId,
      person_id: this.person?.person_id ?? null,
      session_id: this.sessionIdValue,
      timestamp: at.toISOString(),
      action,
      object_id: options.objectId ?? null,
      ...(options.metadata ? { metadata: options.metadata } : {}),
    };

    this.store.append(row);
    this.lastSeen = at.getTime();
    this.persistSession();
    return row;
  }

  /**
   * Someone handed over contact details. Records the attendee, logs the moment,
   * and from here on rows carry `person_id`. Earlier rows are attributed by
   * `stitch()` at read time, and only if they consented to that.
   */
  identify(traits: IdentifyTraits, options: TrackOptions = {}): Person | undefined {
    if (!this.identity) {
      throw new Error('Tracker.identify requires an IdentityGraph — pass one to the constructor.');
    }
    const person = this.identity.identify(this.visitorId, traits);
    this.track('identified', {
      ...options,
      objectId: person.person_id,
      metadata: {
        has_email: Boolean(person.email),
        has_phone: Boolean(person.phone),
        link_history: person.consent.link_history,
        marketing: person.consent.marketing,
      },
    });
    return person;
  }

  private rotateSessionIfStale(at: Date): void {
    if (at.getTime() - this.lastSeen > this.ttl) {
      this.sessionIdValue = this.newId('session');
    }
  }

  private persistSession(): void {
    this.storage.setItem(this.key('session'), this.sessionIdValue);
    this.storage.setItem(this.key('seen'), String(this.lastSeen));
  }

  private key(suffix: string): string {
    return `mywrap:${this.wrapId}:${suffix}`;
  }
}
