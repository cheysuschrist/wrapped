# Instrumentation contract

One rule: if the client doesn't call it, it didn't happen. Nothing downstream
infers actions that weren't logged.

## Actions and their metadata

| Action | `object_id` | `metadata` | Funnel stage |
| --- | --- | --- | --- |
| `album_opened` | — | — | opened |
| `returned_to_album` | — | — | opened |
| `touchpoint_visited` | touchpoint id | `label` | opened |
| `photo_viewed` | photo id | — | explored |
| `photos_found` | — | `count` | explored |
| `poll_viewed` | poll id | — | explored |
| `mission_viewed` | mission id | — | explored |
| `wrap_viewed` | — | — | explored |
| `photo_downloaded` | photo id | — | acquired |
| `poll_answered` | poll id | `choice` (required), `question` | participated |
| `reaction_added` | photo id | `reaction` | participated |
| `hot_take_submitted` | prompt id | `response`, `question` | participated |
| `game_started` / `game_completed` | game id | — | participated |
| `mission_completed` | mission id | — | participated |
| `photo_uploaded` | photo id | `mission` | contributed |
| `prompt_answered` | prompt id | `response`, `question`, `sentiment` | feedback |
| `email_submitted` / `phone_submitted` | — | — | opted in |
| `link_clicked` | link id | `label`, `url` | next action |
| `wrap_shared` | — | — | next action |
| `identified` | person id | consent flags | — |

`metadata.sentiment` must come from something the attendee explicitly chose
(😍 / 🙂 / 😐). Never populate it from free text — the aggregation reports it
verbatim, which would turn a guess into a number on a client deck.

Unknown actions are accepted and counted, they just don't land in a funnel
stage. Add them to `taxonomy.ts` when they earn a stage.

## Counting rules worth knowing

- **A person is counted once per stage**, no matter how many times they act.
- **The actor** is `person_id` when known, otherwise `anonymous_id`. One human
  on two devices collapses into one as soon as both are stitched.
- **One vote per person per poll.** Changing your mind replaces the earlier
  answer rather than adding one.
- **"Returned" means a different calendar day**, in the event's timezone — not
  a new session. A second session twenty minutes later is the same night.
- **Funnel stages are not assumed to be sequential.** Someone can scan a QR at
  the bar and vote without ever opening the gallery, and the numbers say so.

## Sessions

A session rotates after 30 minutes of inactivity (`sessionTtlMs`). The visitor
id does not rotate — it's first-party and per-browser, and it is what makes an
anonymous attendee a coherent row on the People page.

## Bringing in other systems

**In — event platforms.** `parseGuestList()` handles a Partiful/Eventbrite/Luma
CSV export today; the aliases cover the usual column names and everything else
is kept as traits. Seeding the graph with `guestsToPeople()` means the first
person to type their email lands on the record the organiser already had, and
every percentage gets a real denominator ("41 of 50", not "41").

Luma exposes an API, webhooks (including check-in) and Zapier; Eventbrite has
webhooks for orders and attendees. Both fit the same seam: they answer *who
registered*, MyWrap answers *what happened after they arrived*.

**Out — CRM and email.** `toCrmContacts()` emits contact properties, and
`segments()` emits the lists an organiser actually asks for ("engaged but
didn't opt in", "picked Cherry"). Nothing makes network calls: the mapping
stays reviewable, and the marketing-consent gate is on by default.
