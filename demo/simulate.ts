/**
 * A synthetic 50-person listening party, used to exercise every aggregation in
 * `src/tracking` without needing a live event. Deterministic: same seed, same
 * night, every run.
 */
import { IdentityGraph } from '../src/tracking/identity.ts';
import { guestsToPeople, parseGuestList, type Guest } from '../src/tracking/guests.ts';
import { sequentialIds } from '../src/tracking/ids.ts';
import { MemoryActionStore } from '../src/tracking/store.ts';
import { Tracker, memoryStorage } from '../src/tracking/tracker.ts';

export const WRAP_ID = 'wrap_vinyl_word';
export const WRAP_TITLE = 'The Vinyl Word';
export const TIME_ZONE = 'America/New_York';
/** Doors at 7:00 PM, 25 September 2026, New York. */
const START = Date.parse('2026-09-25T23:00:00.000Z');

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST_NAMES = [
  'Maya', 'Jordan', 'Chidera', 'Sam', 'Priya', 'Noah', 'Amara', 'Luca', 'Zoe', 'Ade',
  'Ines', 'Theo', 'Nia', 'Omar', 'Ruth', 'Kai', 'Lena', 'Tomas', 'Iris', 'Malik',
  'Bea', 'Hugo', 'Sade', 'Elif', 'Rosa', 'Dev', 'Yara', 'Nils', 'Kemi', 'Otto',
  'Vera', 'Jae', 'Nora', 'Ravi', 'Lila', 'Finn', 'Tara', 'Sol', 'Mina', 'Cyrus',
  'Esme', 'Bo', 'Ayo', 'Juno', 'Rico', 'Suki', 'Dara', 'Ivo', 'Rae', 'Zain',
];
const LAST_NAMES = ['Rodriguez', 'Lee', 'Eze', 'Okafor', 'Novak', 'Haddad', 'Silva', 'Tan', 'Moreau', 'Bello'];

export function guestListCsv(): string {
  const rows = ['Name,Email,Status,Ticket type'];
  for (let i = 0; i < 50; i += 1) {
    const name = `${FIRST_NAMES[i]} ${LAST_NAMES[i % LAST_NAMES.length]}`;
    const email = `${FIRST_NAMES[i]!.toLowerCase()}.${LAST_NAMES[i % LAST_NAMES.length]!.toLowerCase()}@example.com`;
    rows.push(`${name},${email},${i < 46 ? 'Going' : 'Maybe'},${i < 8 ? 'Guest list' : 'General'}`);
  }
  return rows.join('\n');
}

const GALLERY = Array.from({ length: 60 }, (_, i) => `IMG_${String(3800 + i)}`);
const TRACK_POLL = 'track_of_the_night';
const TRACKS = ['Track 1', 'Track 3', 'Track 4', 'Track 7'];
const NEXT_POLL = 'what_next';
const NEXT_OPTIONS = ['rooftop', 'basement'];
const HOT_TAKES = [
  'track 3 is objectively a skip and I will die on this hill',
  'whoever picked the closing song, marry me',
  'the sequencing on side B is criminal',
  'best room in brooklyn tonight, no notes',
  'I came for the record, stayed for the arguing',
  'track 7 only wins because of the drums',
];
const TOUCHPOINTS = ['entrance', 'listening_room', 'bar', 'photo_wall'];

export interface SimulatedNight {
  store: MemoryActionStore;
  identity: IdentityGraph;
  guests: Guest[];
  expectedAttendees: number;
  /** The attendee used for the worked "one person" examples. */
  focusActor: string;
}

export function simulateNight(seed = 7): SimulatedNight {
  const random = mulberry32(seed);
  const pick = <T,>(list: T[]): T => list[Math.floor(random() * list.length)]!;
  const chance = (probability: number) => random() < probability;
  const at = (minutes: number) => new Date(START + Math.round(minutes * 60_000));

  const store = new MemoryActionStore();
  const newId = sequentialIds();
  const identity = new IdentityGraph({ newId, now: () => at(0) });
  const guests = parseGuestList(guestListCsv(), 'partiful');
  identity.seed(guestsToPeople(guests, newId));

  const attendees = guests.slice(0, 41);
  let focusActor = '';

  attendees.forEach((guest, index) => {
    const tracker = new Tracker({
      wrapId: WRAP_ID,
      store,
      storage: memoryStorage(),
      identity,
      newId,
      now: () => at(0),
    });

    // Arrival is staggered across the first 40 minutes.
    let clock = 2 + random() * 38;
    tracker.track('touchpoint_visited', {
      objectId: 'entrance',
      metadata: { label: 'Entrance' },
      timestamp: at(clock),
    });
    tracker.track('album_opened', { timestamp: at(clock += 0.2) });

    // First ask: one tap, instant result.
    if (chance(0.78)) {
      tracker.track('poll_viewed', { objectId: TRACK_POLL, timestamp: at((clock += 0.3)) });
      tracker.track('poll_answered', {
        objectId: TRACK_POLL,
        metadata: {
          choice: chance(0.42) ? 'Track 7' : pick(TRACKS),
          question: 'which track wins tonight?',
        },
        timestamp: at((clock += 0.4)),
      });
    }

    // Browsing the gallery the photographer is filling in real time.
    if (chance(0.88)) {
      const views = 2 + Math.floor(random() * 12);
      for (let v = 0; v < views; v += 1) {
        tracker.track('photo_viewed', { objectId: pick(GALLERY), timestamp: at((clock += 0.3 + random())) });
      }
      if (chance(0.55)) {
        tracker.track('photos_found', { metadata: { count: 1 + Math.floor(random() * 5) }, timestamp: at((clock += 0.5)) });
      }
      if (chance(0.5)) {
        const downloads = 1 + Math.floor(random() * 3);
        for (let d = 0; d < downloads; d += 1) {
          tracker.track('photo_downloaded', { objectId: pick(GALLERY), timestamp: at((clock += 1 + random())) });
        }
      }
    }

    for (const touchpoint of TOUCHPOINTS.slice(1)) {
      if (!chance(touchpoint === 'listening_room' ? 0.72 : touchpoint === 'bar' ? 0.6 : 0.34)) continue;
      tracker.track('touchpoint_visited', {
        objectId: touchpoint,
        metadata: { label: touchpoint },
        timestamp: at((clock += 4 + random() * 10)),
      });
    }

    // Missions: a minority contributes, and that is fine.
    if (chance(0.32)) {
      const uploads = 1 + Math.floor(random() * 4);
      const moment = 62 + random() * 4; // everyone shoots the same moment, roughly
      for (let u = 0; u < uploads; u += 1) {
        tracker.track('photo_uploaded', {
          objectId: `POV_${index}_${u}`,
          metadata: { mission: 'prove_you_were_here' },
          timestamp: at(moment + u * 0.6),
        });
      }
      tracker.track('mission_completed', { objectId: 'prove_you_were_here', timestamp: at(moment + 1) });
    }

    if (chance(0.44)) {
      const photo = pick(GALLERY);
      tracker.track('reaction_added', { objectId: photo, metadata: { reaction: '🔥' }, timestamp: at((clock += 2)) });
      if (chance(0.5)) {
        tracker.track('reaction_added', { objectId: GALLERY[12]!, metadata: { reaction: '😭' }, timestamp: at((clock += 1)) });
      }
    }

    if (chance(0.26)) {
      tracker.track('hot_take_submitted', {
        objectId: 'hot_takes',
        metadata: { response: pick(HOT_TAKES), question: 'one sentence about tonight' },
        timestamp: at((clock += 3)),
      });
      tracker.track('mission_completed', { objectId: 'hot_take', timestamp: at((clock += 0.1)) });
    }

    if (chance(0.55)) {
      tracker.track('poll_viewed', { objectId: NEXT_POLL, timestamp: at((clock += 2)) });
      tracker.track('poll_answered', {
        objectId: NEXT_POLL,
        metadata: { choice: pick(NEXT_OPTIONS), question: 'where should the next one be?' },
        timestamp: at((clock += 0.3)),
      });
    }

    // Feedback near the end of the night.
    if (chance(0.48)) {
      tracker.track('prompt_answered', {
        objectId: 'how_was_tonight',
        metadata: {
          question: 'how was tonight?',
          response: pick(['loved it', 'too loud but great', 'best one yet', 'good crowd', 'bring back the strings']),
          sentiment: chance(0.88) ? 'positive' : 'neutral',
        },
        timestamp: at((clock += 20 + random() * 30)),
      });
    }

    // Identifying themselves: the exchange is "send me my photos".
    if (chance(0.34)) {
      tracker.identify(
        {
          ...(guest.email ? { email: guest.email } : {}),
          ...(guest.name ? { name: guest.name } : {}),
          consent: { link_history: chance(0.75), marketing: chance(0.8) },
          traits: {
            source: 'photo_delivery',
            public_display: chance(0.5),
            rsvp_status: String(guest.traits.rsvp_status ?? ''),
          },
        },
        { timestamp: at((clock += 1)) },
      );
      tracker.track('email_submitted', { timestamp: at((clock += 0.2)) });
      if (chance(0.35)) {
        tracker.track('link_clicked', {
          objectId: 'next_event',
          metadata: { label: 'tickets for the next one' },
          timestamp: at((clock += 1)),
        });
      }
    }

    // The next morning, once the Wrap is published.
    if (chance(0.38)) {
      const morning = 15.5 * 60 + random() * 90; // ~10:30 AM the next day
      tracker.track('returned_to_album', { timestamp: at(morning) });
      tracker.track('wrap_viewed', { timestamp: at(morning + 0.4) });
      const views = 1 + Math.floor(random() * 6);
      for (let v = 0; v < views; v += 1) {
        tracker.track('photo_viewed', { objectId: pick(GALLERY), timestamp: at(morning + 1 + v * 0.5) });
      }
      if (chance(0.6)) {
        tracker.track('photo_downloaded', { objectId: pick(GALLERY), timestamp: at(morning + 5) });
      }
      if (chance(0.3)) {
        tracker.track('wrap_shared', { timestamp: at(morning + 6) });
      }
    }

    if (index === 0) focusActor = tracker.person?.person_id ?? tracker.visitorId;
  });

  return { store, identity, guests, expectedAttendees: 50, focusActor };
}
