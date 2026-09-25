import { buildPeople, type PersonSummary } from './people.ts';
import { mostDivisive, pct, tallyPolls } from './reveal.ts';
import { actorKey } from './taxonomy.ts';
import { buildTimeline } from './timeline.ts';
import type { EventAction } from './types.ts';

/**
 * The Wrap — the thing everything builds toward.
 *
 * This is the reciprocity half of the product. Attendees gave photos, votes,
 * takes and an email; the Wrap is what they get back, and it is assembled
 * entirely from what they collectively did. Nothing in here is generated
 * flattery: every section is a count, a verbatim answer, or a photo id with
 * the number of people behind it.
 */

export interface WrapStat {
  label: string;
  value: string;
}

export type WrapSectionKind = 'stat' | 'list' | 'photos' | 'quotes';

export interface WrapSection {
  key: string;
  title: string;
  kind: WrapSectionKind;
  /** Sub-line stating what the number is counted from. Keeps claims honest. */
  note?: string;
  items: { label: string; value?: string; object_id?: string }[];
}

export interface FinalWrap {
  wrap_id: string;
  title: string;
  date_label?: string;
  stats: WrapStat[];
  sections: WrapSection[];
  personal?: WrapSection[];
}

export interface WrapOptions {
  title: string;
  dateLabel?: string;
  timeZone?: string;
  people?: PersonSummary[];
  /** Render the "your POV" half for this attendee. */
  actor?: string;
  /** How close two uploads must be to count as the same moment. Default 5 min. */
  momentWindowMs?: number;
}

/** Uploads that landed within the same window, from at least three people. */
export function sameMomentClusters(
  actions: EventAction[],
  windowMs = 5 * 60 * 1000,
): { at: string; object_ids: string[]; people: number }[] {
  const uploads = actions
    .filter((action) => action.action === 'photo_uploaded' && action.object_id)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  const clusters: { at: string; object_ids: string[]; people: Set<string> }[] = [];
  for (const upload of uploads) {
    const at = new Date(upload.timestamp).getTime();
    const current = clusters.at(-1);
    if (current && at - new Date(current.at).getTime() <= windowMs) {
      current.object_ids.push(upload.object_id!);
      current.people.add(actorKey(upload));
    } else {
      clusters.push({ at: upload.timestamp, object_ids: [upload.object_id!], people: new Set([actorKey(upload)]) });
    }
  }

  return clusters
    .filter((cluster) => cluster.people.size >= 3)
    .map((cluster) => ({ at: cluster.at, object_ids: cluster.object_ids, people: cluster.people.size }))
    .sort((a, b) => b.people - a.people);
}

function topReacted(actions: EventAction[]): { object_id: string; reactions: number; people: number } | undefined {
  const counts = new Map<string, { reactions: number; people: Set<string> }>();
  for (const action of actions) {
    if (action.action !== 'reaction_added' || !action.object_id) continue;
    const entry = counts.get(action.object_id) ?? { reactions: 0, people: new Set<string>() };
    entry.reactions += 1;
    entry.people.add(actorKey(action));
    counts.set(action.object_id, entry);
  }
  const best = [...counts.entries()].sort((a, b) => b[1].reactions - a[1].reactions)[0];
  return best ? { object_id: best[0], reactions: best[1].reactions, people: best[1].people.size } : undefined;
}

export function buildWrap(actions: EventAction[], options: WrapOptions): FinalWrap {
  const sorted = [...actions].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const people =
    options.people ?? buildPeople(sorted, { ...(options.timeZone ? { timeZone: options.timeZone } : {}) });
  const polls = tallyPolls(sorted);
  const uploads = sorted.filter((action) => action.action === 'photo_uploaded');
  const takes = sorted.filter(
    (action) => action.action === 'hot_take_submitted' && typeof action.metadata?.response === 'string',
  );

  const stats: WrapStat[] = [
    { label: 'people', value: String(people.length) },
    {
      label: 'memories',
      value: String(
        new Set(
          sorted
            .filter((action) => action.action === 'photo_uploaded' || action.action === 'photo_viewed')
            .map((action) => action.object_id)
            .filter(Boolean),
        ).size,
      ),
    },
    { label: 'added by the room', value: String(uploads.length) },
    { label: 'votes', value: String(sorted.filter((action) => action.action === 'poll_answered').length) },
  ];

  const sections: WrapSection[] = [];

  const headline = polls[0];
  if (headline?.leader) {
    sections.push({
      key: 'crowd_picked',
      title: 'the crowd picked',
      kind: 'stat',
      note: `${headline.leader.votes} of ${headline.votes} votes`,
      items: [{ label: headline.leader.choice, value: pct(headline.leader.share) }],
    });
  }

  const divisive = mostDivisive(polls);
  if (divisive && divisive.poll_id !== headline?.poll_id) {
    sections.push({
      key: 'most_disagreed',
      title: 'most disagreed-on',
      kind: 'list',
      note: divisive.question ?? divisive.poll_id,
      items: divisive.options.map((option) => ({ label: option.choice, value: pct(option.share) })),
    });
  }

  const photo = topReacted(sorted);
  if (photo) {
    sections.push({
      key: 'the_photo',
      title: 'the photo',
      kind: 'photos',
      note: `${photo.reactions} reactions from ${photo.people} people`,
      items: [{ label: photo.object_id, object_id: photo.object_id }],
    });
  }

  const clusters = sameMomentClusters(sorted, options.momentWindowMs);
  if (clusters[0]) {
    sections.push({
      key: 'same_moment',
      title: 'the same moment, from every angle',
      kind: 'photos',
      note: `${clusters[0].people} people uploaded within minutes of each other`,
      items: clusters[0].object_ids.slice(0, 6).map((id) => ({ label: id, object_id: id })),
    });
  }

  if (takes.length > 0) {
    sections.push({
      key: 'lore',
      title: "tonight's lore",
      kind: 'quotes',
      note: `${takes.length} hot takes, verbatim`,
      items: takes.slice(-8).map((take) => ({ label: String(take.metadata!.response) })),
    });
  }

  const wrap: FinalWrap = {
    wrap_id: sorted[0]?.wrap_id ?? '',
    title: options.title,
    ...(options.dateLabel ? { date_label: options.dateLabel } : {}),
    stats,
    sections,
  };

  if (options.actor) {
    wrap.personal = personalSections(sorted, options.actor, options);
  }

  return wrap;
}

/** "your POV" — only this attendee's own rows. */
export function personalSections(
  actions: EventAction[],
  actor: string,
  options: { timeZone?: string } = {},
): WrapSection[] {
  const timeline = buildTimeline(actions, actor, {
    ...(options.timeZone ? { timeZone: options.timeZone } : {}),
  });
  const mine = actions.filter((action) => actorKey(action) === actor || action.anonymous_id === actor);

  const uploads = mine.filter((action) => action.action === 'photo_uploaded' && action.object_id);
  const downloads = mine.filter((action) => action.action === 'photo_downloaded' && action.object_id);
  const choices = mine.filter(
    (action) => action.action === 'poll_answered' && typeof action.metadata?.choice === 'string',
  );

  const sections: WrapSection[] = [];
  if (uploads.length > 0) {
    sections.push({
      key: 'your_pov',
      title: 'your POV',
      kind: 'photos',
      note: `${uploads.length} you added`,
      items: uploads.map((action) => ({ label: action.object_id!, object_id: action.object_id! })),
    });
  }
  if (downloads.length > 0) {
    sections.push({
      key: 'you_kept',
      title: 'you kept',
      kind: 'photos',
      note: `${downloads.length} downloaded`,
      items: downloads.map((action) => ({ label: action.object_id!, object_id: action.object_id! })),
    });
  }
  if (choices.length > 0) {
    sections.push({
      key: 'you_picked',
      title: 'you picked',
      kind: 'list',
      items: choices.map((action) => ({
        label: String(action.metadata!.choice),
        ...(action.object_id ? { value: action.object_id } : {}),
      })),
    });
  }
  sections.push({
    key: 'your_night',
    title: 'your night',
    kind: 'list',
    note: `${timeline.entries.length} things you did`,
    items: timeline.entries.map((entry) => ({ label: entry.description, value: entry.time })),
  });
  return sections;
}
