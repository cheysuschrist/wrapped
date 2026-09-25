# MyWrap — experience tracking

One normalized stream of observed actions, and everything the product shows
built as a query over it: the live pulse during the event, answer-to-reveal,
missions, the final Wrap, the organiser's report, one attendee's timeline, and
the contact record that leaves for a CRM.

```bash
npm test     # 48 tests, no build step (Node 22 type stripping)
npm run demo # a synthetic 50-person listening party, printed end to end
```

## Why it is shaped this way

MyWrap cannot know that someone walked from the sampling booth to the photo
booth to the bar. It knows what happened inside MyWrap, plus whatever another
system hands it. So everything here is built from first-party interactions:

- **Every number is a count** of logged actions or of distinct people.
- **No engagement scores.** "Maya = 87/100 🔥 SUPERFAN" is not a thing this
  package can produce, because nobody knows what 87 means.
- **No inferred feeling.** Sentiment appears only where a client explicitly
  logged it (an emoji scale), never derived from free text.
- **No claimed physical behaviour.** A touchpoint appears in the flow only
  because its QR/NFC link was actually scanned.

That restraint is not squeamishness — it is what makes the report survive
contact with an agency's client.

## The stream

Every row, in `event_actions` shape:

```ts
{
  event_id, wrap_id, anonymous_id, person_id?, session_id,
  timestamp, action, object_id?, metadata?
}
```

`anonymous_id` is a first-party per-browser id, created on first open and
persisted. Anonymous does not mean unknown session: an anonymous visitor is a
stable identity with a history, they just don't have a name attached.

## Modules

| Phase | Module | What it does |
| --- | --- | --- |
| 1. Event tracking | `src/tracking/tracker.ts`, `store.ts`, `types.ts` | Append actions; pluggable store |
| 2. Persistent visitor | `tracker.ts` | Per-browser id + session that rotates after 30 min idle |
| 3. Identity | `identity.ts` | Match on email/phone, merge devices, stitch history **with consent** |
| 4. Experience | `experience.ts` | Funnel + "what people did", per crowd |
| 5. People | `people.ts` | The same stream grouped per person, with filters and segments |
| 6. Timeline | `timeline.ts` | One attendee's night, literal descriptions only |
| 7. Touchpoints | `touchpoints.ts` | Per-station QR/NFC links, scan flow, common paths |
| — | `reveal.ts` | Answer-to-reveal: instant crowd result on every vote |
| — | `missions.ts` | Missions, progress, and what a completion unlocks |
| — | `pulse.ts` | The live "43 joined · 87 photos · Cherry is winning" board |
| — | `wrap.ts` | The final Wrap: crowd pick, most disagreed-on, the photo, lore, your POV |
| — | `playbook.ts` | What the host should say, and when |
| — | `guests.ts` | Guest-list import (Partiful CSV today, Luma/Eventbrite later) |
| — | `crm.ts` | Segments and contact properties for HubSpot/Klaviyo/Salesforce |

## The shape of a night

```ts
import { Tracker, MemoryActionStore, IdentityGraph, stitch } from './src/tracking/index.ts';

const store = new MemoryActionStore();
const identity = new IdentityGraph();
const tracker = new Tracker({ wrapId: 'wrap_vinyl_word', store, storage: localStorage, identity });

tracker.track('album_opened');
tracker.track('poll_answered', { objectId: 'tracks', metadata: { choice: 'Track 7' } });
tracker.identify({ email: 'maya@example.com', consent: { link_history: true, marketing: true } });

// Read side: resolve identities at query time, never by rewriting stored rows.
const actions = stitch(store.list({ wrap_id: 'wrap_vinyl_word' }), identity);
```

Consent is enforced where it matters. `Consent.link_history` decides whether
the things someone did before typing their email belong to them; when it's
false, their history starts at the moment they identified. `Consent.marketing`
gates the CRM export. Stored rows are never rewritten, so revoking either one
takes effect on the next read.

## Not built here

Face matching for "find photos of you" (V2/V3 in the product sketch) is
deliberately absent. Biometric identification is a real legal exposure,
especially for brands, and `photos_found` already measures the funnel whether
photos are found by staff tagging, manual selection, or anything later.

See `docs/instrumentation.md` for the action and metadata contract, and
`docs/what-to-build-next.md` for what this leaves open.
