import type { Mission } from './missions.ts';

/**
 * Adoption is a product feature.
 *
 * A QR in the corner of a room does nothing. A host saying "the photos are all
 * going in here, and there's a vote happening, and apparently you lot have
 * terrible taste" does everything. MyWrap should hand the organiser the words.
 */

export interface PlaybookInput {
  title: string;
  wrapUrl: string;
  /** The question you want the room to settle. */
  pollQuestion?: string;
  /** What the next action is: "Shop the collection", "Tickets for the next one". */
  ctaLabel?: string;
  hostName?: string;
  /** Set when a photographer is shooting — it's the strongest reason to scan. */
  photographer?: boolean;
  missions?: Mission[];
}

export interface PlaybookStep {
  key: string;
  when: string;
  title: string;
  instruction: string;
  /** Copy the organiser can lift verbatim. */
  copy?: string;
}

export function organiserPlaybook(input: PlaybookInput): PlaybookStep[] {
  const { title, wrapUrl, pollQuestion, ctaLabel, photographer, missions } = input;

  const steps: PlaybookStep[] = [
    {
      key: 'signage',
      when: 'before doors',
      title: 'Put this where people are already standing',
      instruction:
        'Bar, entrance, and wherever the queue forms. One QR per surface — a code nobody is near is a code nobody scans.',
      copy: photographer
        ? `you're part of tonight's wrap ↓\nphotos from tonight land here\n${wrapUrl}`
        : `you're part of tonight's wrap ↓\n${wrapUrl}`,
    },
    {
      key: 'welcome',
      when: 'as people arrive',
      title: 'Say it once, out loud',
      instruction:
        'The first ask is never "upload your photos". It is one tap, and it pays off immediately.',
      copy: photographer
        ? `everything ${input.hostName ?? 'our photographer'} shoots tonight goes into one place — scan the code, that's where you'll find yours. there's also a vote happening.`
        : `scan the code on your table — there's a vote happening and it's already going badly.`,
    },
  ];

  if (pollQuestion) {
    steps.push({
      key: 'settle_it',
      when: 'first 15 minutes',
      title: 'Open the vote',
      instruction: 'One tap, instant result. This is what teaches the room that the Wrap is live.',
      copy: `${pollQuestion} — settle it. results show the second you vote.`,
    });
  }

  steps.push({
    key: 'midpoint',
    when: '~30 minutes in',
    title: 'Make one specific ask',
    instruction:
      '"Share your memories" is work. "Who got the shot from outside?" is a social request. Name the moment.',
    copy:
      missions && missions[0]
        ? `okay — ${missions[0].title}: ${missions[0].blurb ?? 'add yours'}. it's in the wrap.`
        : `who got the photo from outside 😭 put it in the wrap, everyone wants it`,
  });

  steps.push({
    key: 'pulse',
    when: 'when the room is warm',
    title: 'Read the pulse out',
    instruction:
      'Say the live numbers. At fifty people, "17 of you have added yours" is peer pressure in the friendliest possible form.',
    copy: `[current count] of you have added your POV. the rest of you were definitely there.`,
  });

  steps.push({
    key: 'next_morning',
    when: 'next morning, ~10am',
    title: 'Drop this in the group chat',
    instruction:
      'The second visit is where downloads and opt-ins happen. It needs a reason, and the reason is that the Wrap now exists.',
    copy: `last night's wrap is up — photos, the vote results, and whatever was said\n${wrapUrl}`,
  });

  if (ctaLabel) {
    steps.push({
      key: 'next_step',
      when: 'in the Wrap itself',
      title: 'Give them somewhere to go',
      instruction:
        'One next action, at the end, after they got something. Clicks here are the number your client will ask about.',
      copy: `${ctaLabel} →`,
    });
  }

  steps.push({
    key: 'title_card',
    when: 'after the event',
    title: 'Send the Wrap',
    instruction: `"${title}" is the deliverable — the attendee version and the organiser report come from the same night.`,
  });

  return steps;
}
