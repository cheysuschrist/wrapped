import { createId, normalizeEmail, normalizePhone } from './ids.ts';
import type {
  Consent,
  EventAction,
  IdentifyTraits,
  Person,
  PersonId,
  VisitorId,
} from './types.ts';
import { DEFAULT_CONSENT } from './types.ts';

export interface IdentityGraphOptions {
  /** Default consent applied when `identify` doesn't say otherwise. */
  defaultConsent?: Consent;
  newId?: (prefix: string) => string;
  now?: () => Date;
}

export interface IdentityState {
  people: Person[];
}

/**
 * Maps browsers to attendee records.
 *
 * A visitor is a stable identity from their first scan; identifying only
 * attaches a name and contact details to actions that already existed. Whether
 * the actions taken *before* that moment count as theirs is a consent
 * question, answered by `Consent.link_history` and enforced in `stitch`.
 */
export class IdentityGraph {
  private readonly peopleById = new Map<PersonId, Person>();
  private readonly personByVisitor = new Map<VisitorId, PersonId>();
  private readonly personByEmail = new Map<string, PersonId>();
  private readonly personByPhone = new Map<string, PersonId>();
  private readonly defaultConsent: Consent;
  private readonly newId: (prefix: string) => string;
  private readonly now: () => Date;

  constructor(options: IdentityGraphOptions = {}) {
    this.defaultConsent = options.defaultConsent ?? DEFAULT_CONSENT;
    this.newId = options.newId ?? createId;
    this.now = options.now ?? (() => new Date());
  }

  /**
   * Someone volunteered who they are. Matches an existing attendee record by
   * explicit id, then email, then phone; otherwise creates one.
   */
  identify(visitorId: VisitorId, traits: IdentifyTraits): Person {
    const email = normalizeEmail(traits.email);
    const phone = normalizePhone(traits.phone);

    const existing =
      (traits.person_id ? this.peopleById.get(traits.person_id) : undefined) ??
      (email ? this.byKey(this.personByEmail, email) : undefined) ??
      (phone ? this.byKey(this.personByPhone, phone) : undefined);

    const previous = this.personFor(visitorId);
    let person = existing ?? previous;

    if (!person) {
      person = {
        person_id: traits.person_id ?? this.newId('person'),
        anonymous_ids: [],
        identified_at: this.now().toISOString(),
        consent: { ...this.defaultConsent },
        traits: {},
      };
      this.peopleById.set(person.person_id, person);
    } else if (previous && existing && previous.person_id !== existing.person_id) {
      person = this.merge(existing, previous);
    }

    if (!person.anonymous_ids.includes(visitorId)) person.anonymous_ids.push(visitorId);
    this.personByVisitor.set(visitorId, person.person_id);

    if (email) {
      person.email = email;
      this.personByEmail.set(email, person.person_id);
    }
    if (phone) {
      person.phone = phone;
      this.personByPhone.set(phone, person.person_id);
    }
    if (traits.name) person.name = traits.name;
    if (traits.traits) person.traits = { ...person.traits, ...traits.traits };
    if (traits.consent) person.consent = { ...person.consent, ...traits.consent };

    return person;
  }

  /** Attach another browser to a known attendee (second device, NFC tap, magic link). */
  attach(visitorId: VisitorId, personId: PersonId): Person | undefined {
    const person = this.peopleById.get(personId);
    if (!person) return undefined;
    if (!person.anonymous_ids.includes(visitorId)) person.anonymous_ids.push(visitorId);
    this.personByVisitor.set(visitorId, personId);
    return person;
  }

  personFor(visitorId: VisitorId): Person | undefined {
    const id = this.personByVisitor.get(visitorId);
    return id ? this.peopleById.get(id) : undefined;
  }

  personById(personId: PersonId): Person | undefined {
    return this.peopleById.get(personId);
  }

  people(): Person[] {
    return [...this.peopleById.values()];
  }

  /** Seed attendee records from a guest list before anyone has scanned anything. */
  seed(people: Person[]): void {
    for (const person of people) {
      this.peopleById.set(person.person_id, person);
      for (const visitorId of person.anonymous_ids) {
        this.personByVisitor.set(visitorId, person.person_id);
      }
      if (person.email) this.personByEmail.set(person.email, person.person_id);
      if (person.phone) this.personByPhone.set(person.phone, person.person_id);
    }
  }

  toJSON(): IdentityState {
    return { people: this.people() };
  }

  static fromJSON(state: IdentityState, options?: IdentityGraphOptions): IdentityGraph {
    const graph = new IdentityGraph(options);
    graph.seed(state.people);
    return graph;
  }

  private byKey(index: Map<string, PersonId>, key: string): Person | undefined {
    const id = index.get(key);
    return id ? this.peopleById.get(id) : undefined;
  }

  /** Fold `loser` into `winner` — same human, two records. */
  private merge(winner: Person, loser: Person): Person {
    for (const visitorId of loser.anonymous_ids) {
      if (!winner.anonymous_ids.includes(visitorId)) winner.anonymous_ids.push(visitorId);
      this.personByVisitor.set(visitorId, winner.person_id);
    }
    winner.traits = { ...loser.traits, ...winner.traits };
    if (!winner.name && loser.name) winner.name = loser.name;
    if (!winner.email && loser.email) winner.email = loser.email;
    if (!winner.phone && loser.phone) winner.phone = loser.phone;
    if (loser.identified_at < winner.identified_at) winner.identified_at = loser.identified_at;
    winner.merged_from = [...(winner.merged_from ?? []), loser.person_id];
    this.peopleById.delete(loser.person_id);
    return winner;
  }
}

export interface StitchOptions {
  /**
   * Override the per-person `link_history` consent flag. Leave unset to honour
   * what each attendee agreed to.
   */
  linkHistory?: boolean;
}

/**
 * Resolves `person_id` across the stream.
 *
 * Actions logged before someone identified themselves are only attributed to
 * them when they agreed to it; otherwise those rows stay anonymous and the
 * attendee's history starts at `identified_at`. Returns a new array — the
 * stored rows are never rewritten, so revoking consent is one re-read away.
 */
export function stitch(
  actions: EventAction[],
  graph: IdentityGraph,
  options: StitchOptions = {},
): EventAction[] {
  return actions.map((action) => {
    if (action.person_id) return action;
    const person = graph.personFor(action.anonymous_id);
    if (!person) return action;
    const linkHistory = options.linkHistory ?? person.consent.link_history;
    if (!linkHistory && action.timestamp < person.identified_at) return action;
    return { ...action, person_id: person.person_id };
  });
}
