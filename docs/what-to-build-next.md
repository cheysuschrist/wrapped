# What to add next

Parsed out of the two threads, ranked by what I'd actually spend the next build
cycle on. "Built" means it exists in `src/tracking` with tests; the UI is what's
missing in every case.

## Ship first: the small-event loop

At fifty people you don't need enterprise analytics, you need the room to feel
connected. These four are one release, not four.

**1. Answer-to-reveal.** Built (`reveal.ts`). One tap, instant crowd result:
*"you picked Track 4 — 28% of the room agrees."* This is the cheapest thing on
the list and it's the one that teaches the room that MyWrap is something
happening at this event rather than a photo app the host wants them to use.
Everything else depends on that lesson landing in the first thirty seconds.

**2. Missions.** Built (`missions.ts`, six suggested ones). The mechanic that
matters is the wording: "upload your photos" is work, "who got the shot from
outside 😭" is a social request. Completions gate reveals — crowd results, the
secret gallery, the final Wrap — so contribution buys something instead of
being a chore the host nags about.

**3. Live pulse.** Built (`pulse.ts`). *"17 of 50 have added their POV."* At
fifty people this is peer pressure in its friendliest form, because everyone
knows each other. Needs a screen mode for the venue and a refresh loop.

**4. The Wrap reveal.** Built (`wrap.ts`). The crowd pick, the most
disagreed-on, the photo, the lore, and *your POV*. This is the reciprocity
half: without it you're only taking photos, answers and an email. With it, the
night produced something. It's also the acquisition loop — the Wrap is what
gets shared into the group chat the next morning, which is where the second
visit, the downloads and most opt-ins actually happen.

## Then: make the organiser's Monday morning shorter

**5. The recap as the deliverable.** Built as data (`experience.ts`,
`people.ts`, `crm.ts`); the generated, branded, shareable report is not. This
is the thesis worth testing: an interactive album is an extra, and extras get
cut. "Run MyWrap → the client recap is already written" is not an extra. Before
building the PDF, go get the six hours you think you're saving — see the last
section.

**6. Guest-list import.** Built (`guests.ts`, Partiful CSV shape). Small, and
it changes every sentence in the report from "41 people" to "41 of 50 —
82%". Percentages need a denominator, and the denominator lives in the event
page they already use.

**7. HubSpot push.** Contact properties and segments are built (`crm.ts`); the
OAuth app and sync are not. Pick HubSpot first not because everyone uses it but
because it forces you to decide what MyWrap's *output* actually is. The
position — event platform → MyWrap → CRM — means you never ask an agency to
replace anything.

## Later, and genuinely good

**8. Touchpoints.** Built (`touchpoints.ts`). A QR per station, so the flow
comes from scans rather than from a claim about walking. Worth doing when you
have a client with real stations; pointless at a fifty-person listening party.

**9. Cross-event benchmarks.** Not built. "How did this compare to the last
six?" is the question a survey can't answer and a CRM doesn't have the context
for. It only becomes real at event #12, so the thing to do now is keep
`wrap_id` on every row and never lose old events — which the schema already
does.

## What I'd not build

- **Engagement scores.** No 87/100, no SUPERFAN. You don't know what 87 means
  and neither does the client. `people.ts` exposes `activityFloor()` instead —
  "top 25% by actions at this event", which is a fact.
- **Face matching for "find photos of you."** Biometric identification is a
  real legal exposure, especially for brands. V1 (staff tagging, manual
  selection) proves the funnel — find → view → download → interact → opt in →
  CTA — and `photos_found` measures it either way.
- **Anything claiming physical behaviour you didn't instrument.** "Maya visited
  the Cherry booth" is only sayable if Maya scanned the Cherry booth.
- **More games.** The crossword is not what's missing.
- **Becoming the event platform.** Registration, ticketing, invites — all
  solved, all a fight you don't need.

## What this codebase still needs before a real event

Honest gaps in what's here, roughly in the order they'd bite:

- **A durable store.** `MemoryActionStore` implements the interface; a Postgres
  or warehouse adapter is a small module against the same two methods.
- **Moderation.** Attendee uploads and hot takes go on a screen in a room with
  a brand's logo behind it. A hold-and-approve queue is not optional for
  anything client-facing.
- **An offline queue.** Venue wifi is terrible. Actions should buffer locally
  and flush later; `track()` already accepts an explicit `timestamp` for
  exactly this replay.
- **Rate limiting on the write path**, so one bored attendee can't invent 400
  votes.
- **A visible consent surface.** `link_history`, `marketing` and
  `public_display` are enforced in code; attendees need to see and change them.

## The thing that decides all of the above

Don't ship the recap PDF until five experiential producers have walked you
through everything that happens between "the activation ends" and "the client
gets the deck", screen shared, out loud. Listen for "then I export…", "someone
on my team spends…", "the client always asks…". If five of them independently
say six hours go into the recap, attack the six hours and skip #8 and #9
entirely. If they say getting photos back to attendees is irrelevant to them,
that's worth more than another month of feature design.
