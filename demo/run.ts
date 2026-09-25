/**
 * Prints the whole product surface off one event stream:
 * the live pulse, answer-to-reveal, missions, the organiser report,
 * the people list, one attendee's night, the Wrap, and what leaves for the CRM.
 *
 *   npm run demo
 */
import { buildExperience } from '../src/tracking/experience.ts';
import { stitch } from '../src/tracking/identity.ts';
import { SUGGESTED_MISSIONS, missionBoard, missionCrowdStats, type Reveal } from '../src/tracking/missions.ts';
import { buildPeople, contributors } from '../src/tracking/people.ts';
import { organiserPlaybook } from '../src/tracking/playbook.ts';
import { eventPulse } from '../src/tracking/pulse.ts';
import { crowdResult, pct } from '../src/tracking/reveal.ts';
import { segments, toCrmContacts } from '../src/tracking/crm.ts';
import { buildTimeline } from '../src/tracking/timeline.ts';
import { touchpointFlow } from '../src/tracking/touchpoints.ts';
import { buildWrap } from '../src/tracking/wrap.ts';
import { TIME_ZONE, WRAP_ID, WRAP_TITLE, simulateNight } from './simulate.ts';

const night = simulateNight();
const actions = stitch(night.store.list({ wrap_id: WRAP_ID }), night.identity);
const people = buildPeople(actions, { identity: night.identity, timeZone: TIME_ZONE });
const missions = SUGGESTED_MISSIONS.filter((mission) =>
  ['prove_you_were_here', 'settle_it', 'hot_take'].includes(mission.id),
);

const heading = (text: string) => console.log(`\n\x1b[1m${text.toUpperCase()}\x1b[0m\n${'─'.repeat(text.length)}`);
const bar = (share: number, width = 24) => '█'.repeat(Math.round(share * width)).padEnd(width, '·');

heading('live pulse · 45 minutes in');
const midPulse = eventPulse(actions, {
  expectedAttendees: night.expectedAttendees,
  people,
  until: new Date(Date.parse('2026-09-25T23:45:00.000Z')),
});
for (const line of midPulse.lines) console.log(`  ${line}`);

heading('answer to reveal');
const result = crowdResult(actions, 'track_of_the_night', 'Track 4');
console.log(`  ${result.headline}`);
for (const option of result.options) {
  console.log(`  ${option.choice.padEnd(10)} ${bar(option.share)} ${pct(option.share).padStart(4)}  (${option.votes})`);
}

heading('missions');
for (const stat of missionCrowdStats(actions, missions, { expectedAttendees: night.expectedAttendees })) {
  console.log(`  ${(stat.mission.emoji ?? '•')} ${stat.mission.title.padEnd(22)} ${stat.people}/${night.expectedAttendees}  ${pct(stat.share)}`);
}
const reveals: Reveal[] = [
  { id: 'crowd_results', label: 'crowd results', requires: { actions: ['poll_answered'] } },
  { id: 'secret_gallery', label: 'the secret gallery', requires: { mission_ids: ['prove_you_were_here'] } },
  { id: 'final_wrap', label: 'the Wrap', requires: { missions: 2 } },
];
const board = missionBoard(actions, missions, night.focusActor, reveals);
console.log(`\n  one attendee's board (${night.focusActor}):`);
for (const progress of board.missions) {
  console.log(`    ${progress.completed ? '✓' : '○'} ${progress.mission.title} (${progress.done}/${progress.needed})`);
}
console.log(`    unlocked: ${board.unlocked.join(', ') || 'none'}`);
for (const locked of board.locked) console.log(`    locked:   ${locked.label} — ${locked.needs}`);

heading('organiser report');
const report = buildExperience(actions, { timeZone: TIME_ZONE, expectedAttendees: night.expectedAttendees });
console.log(`  ${report.visitors} of ${report.expected_attendees} guests opened MyWrap (${pct(report.reach ?? 0)})`);
console.log(`  ${report.actions} actions · ${report.sessions} sessions · ${report.identified} identified · ${report.anonymous} anonymous`);
console.log(`  ${report.returning.visitors} came back on another day (${pct(report.returning.share)})\n`);
for (const step of report.funnel) {
  if (step.visitors === 0) continue;
  console.log(`  ${String(step.visitors).padStart(3)}  ${bar(step.share_of_opened)}  ${step.label} (${pct(step.share_of_opened)})`);
}

console.log('\n  what people did');
console.log(`    photos      ${report.photos.viewers} people · ${report.photos.views} views · ${report.photos.downloads} downloads`);
console.log(`    contributed ${report.photos.contributors} people · ${report.photos.uploads} photos · ${report.photos.reactions} reactions`);
for (const poll of report.polls) {
  const leader = poll.leader;
  console.log(`    ${(poll.question ?? poll.poll_id).padEnd(28)} ${poll.votes} votes · ${leader ? `${leader.choice} ${pct(leader.share)}` : '—'}${poll.contested ? ' · contested' : ''}`);
}
for (const prompt of report.prompts) {
  const sentiment = prompt.sentiment
    ? ` · ${Object.entries(prompt.sentiment).map(([key, value]) => `${value} ${key}`).join(', ')}`
    : '';
  console.log(`    ${(prompt.question ?? prompt.prompt_id).padEnd(28)} ${prompt.responses} responses${sentiment}`);
}
for (const link of report.links) {
  console.log(`    ${(link.label ?? link.link_id).padEnd(28)} ${link.clicks} clicks · ${link.clickers} people`);
}

heading('touchpoints (only what was scanned)');
for (const stop of touchpointFlow(actions, [
  { id: 'entrance', label: 'Entrance', order: 1 },
  { id: 'listening_room', label: 'Listening room', order: 2 },
  { id: 'bar', label: 'Bar', order: 3 },
  { id: 'photo_wall', label: 'Photo wall', order: 4 },
])) {
  console.log(`  ${stop.label.padEnd(16)} ${String(stop.visitors).padStart(3)}  ${bar(stop.share_of_first)} ${pct(stop.share_of_first)}`);
}

heading('people');
const contributed = contributors(people);
console.log(`  ${people.length} visitors · ${contributed.total} contributed (${contributed.named.length} chose to be named)\n`);
for (const person of people.slice(0, 8)) {
  const bits = [
    `${person.actions} actions`,
    `${person.photos_downloaded} downloads`,
    person.photos_uploaded ? `${person.photos_uploaded} uploads` : '',
    Object.values(person.poll_choices)[0] ?? '',
    person.opted_in ? 'opted in' : '',
    person.returned ? 'returned' : '',
  ].filter(Boolean);
  console.log(`  ${person.label.padEnd(20)} ${bits.join(' · ')}`);
}

heading(`one attendee's night`);
const timeline = buildTimeline(actions, night.focusActor, { timeZone: TIME_ZONE });
for (const day of timeline.days) {
  console.log(`  ${day.label}`);
  for (const entry of day.entries.slice(0, 12)) {
    console.log(`    ${entry.time.padStart(8)}  ${entry.description}`);
  }
}

heading('the wrap');
const wrap = buildWrap(actions, {
  title: WRAP_TITLE,
  dateLabel: 'September 25, 2026',
  timeZone: TIME_ZONE,
  people,
  actor: night.focusActor,
});
console.log(`  ${wrap.title} · ${wrap.date_label}`);
console.log(`  ${wrap.stats.map((stat) => `${stat.value} ${stat.label}`).join(' · ')}\n`);
for (const section of wrap.sections) {
  console.log(`  ${section.title}${section.note ? `  (${section.note})` : ''}`);
  for (const item of section.items.slice(0, 4)) {
    console.log(`    ${item.label}${item.value ? ` — ${item.value}` : ''}`);
  }
}
console.log('\n  your POV');
for (const section of wrap.personal ?? []) {
  console.log(`    ${section.title}${section.note ? ` (${section.note})` : ''}`);
}

heading('what leaves mywrap');
for (const segment of segments(people)) {
  console.log(`  ${segment.label.padEnd(46)} ${segment.people.length}`);
}
const contacts = toCrmContacts(people, {
  wrapId: WRAP_ID,
  wrapTitle: WRAP_TITLE,
  eventDate: '2026-09-25',
});
console.log(`\n  ${contacts.length} contacts exportable (marketing consent only)`);
if (contacts[0]) {
  console.log('  example:');
  for (const [key, value] of Object.entries(contacts[0].properties).slice(0, 8)) {
    console.log(`    ${key.padEnd(28)} ${value}`);
  }
}

heading('what to tell the host');
for (const step of organiserPlaybook({
  title: WRAP_TITLE,
  wrapUrl: 'https://getmywrap.com/w/vinyl-word',
  pollQuestion: 'which track wins tonight?',
  ctaLabel: 'tickets for the next one',
  photographer: true,
  missions,
})) {
  console.log(`  [${step.when}] ${step.title}`);
  if (step.copy) console.log(step.copy.split('\n').map((line) => `      "${line}"`).join('\n'));
}
console.log();
