import { activityFloor, filterPeople, type PersonSummary } from './people.ts';

/**
 * The output side: what leaves MyWrap.
 *
 * MyWrap is not a CRM and shouldn't become one. What it has that a CRM does
 * not is what happened in the room. These shapes are designed to be pushed
 * into HubSpot/Klaviyo/Salesforce as contact properties and a timeline —
 * nothing here makes network calls, so the mapping stays reviewable.
 */

export interface CrmContact {
  email?: string;
  phone?: string;
  name?: string;
  properties: Record<string, string | number | boolean>;
}

export interface CrmExportOptions {
  wrapId: string;
  wrapTitle: string;
  eventDate?: string;
  /**
   * Only export people who agreed to be contacted. Leave this on. Turning it
   * off is a decision someone should have to make explicitly.
   */
  requireMarketingConsent?: boolean;
  /** Prefix for contact properties. */
  prefix?: string;
}

export function toCrmContacts(people: PersonSummary[], options: CrmExportOptions): CrmContact[] {
  const prefix = options.prefix ?? 'mywrap';
  const requireConsent = options.requireMarketingConsent ?? true;

  return people
    .filter((person) => person.identified && (person.email || person.phone))
    .filter((person) => (requireConsent ? person.marketing_consent : true))
    .map((person) => {
      const properties: Record<string, string | number | boolean> = {
        [`${prefix}_last_event`]: options.wrapTitle,
        [`${prefix}_last_event_id`]: options.wrapId,
        [`${prefix}_last_seen`]: person.last_seen,
        [`${prefix}_actions`]: person.actions,
        [`${prefix}_photos_downloaded`]: person.photos_downloaded,
        [`${prefix}_photos_contributed`]: person.photos_uploaded,
        [`${prefix}_gave_feedback`]: person.prompts_answered > 0,
        [`${prefix}_opted_in`]: person.opted_in,
        [`${prefix}_returned`]: person.returned,
        [`${prefix}_clicked_cta`]: person.links_clicked.length > 0,
      };
      if (options.eventDate) properties[`${prefix}_last_event_date`] = options.eventDate;
      for (const [poll, choice] of Object.entries(person.poll_choices)) {
        properties[`${prefix}_choice_${poll}`] = choice;
      }
      return {
        ...(person.email ? { email: person.email } : {}),
        ...(person.phone ? { phone: person.phone } : {}),
        ...(person.name ? { name: person.name } : {}),
        properties,
      };
    });
}

export interface Segment {
  key: string;
  label: string;
  people: PersonSummary[];
}

/**
 * The lists an organiser actually asks for. Each one is a filter over observed
 * behaviour, so the name on the segment is defensible to the client.
 */
export function segments(people: PersonSummary[]): Segment[] {
  const floor = activityFloor(people, 0.75);
  const list: Segment[] = [
    { key: 'opted_in', label: 'Opted in', people: filterPeople(people, { optedIn: true }) },
    {
      key: 'engaged_no_optin',
      label: 'Engaged but did not opt in',
      people: filterPeople(people, { optedIn: false }).filter((person) => person.actions > 1),
    },
    { key: 'contributors', label: 'Contributed photos', people: filterPeople(people, { contributed: true }) },
    { key: 'returned', label: 'Came back on another day', people: filterPeople(people, { returned: true }) },
    { key: 'clicked_cta', label: 'Clicked the next action', people: filterPeople(people, { clickedLink: true }) },
    {
      key: 'most_active',
      label: `Top 25% by actions at this event (${floor}+ actions)`,
      people: filterPeople(people, { minActions: floor }),
    },
  ];
  return list.filter((segment) => segment.people.length > 0);
}

/** Everyone who picked a given option — "tell me when the cherry one launches". */
export function segmentByChoice(people: PersonSummary[], poll: string, choice: string): Segment {
  return {
    key: `choice_${poll}_${choice}`,
    label: `Picked ${choice}`,
    people: filterPeople(people, { votedFor: { poll, choice } }),
  };
}
