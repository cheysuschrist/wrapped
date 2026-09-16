# Problem-fit pre-registration

A protocol for answering one question about mywrap: **are we solving a problem people
don't have?**

Written before the data comes in, on purpose. The thresholds below are worth something
only if they are fixed in advance. If we set them after seeing a result, we will set
them wherever the result landed.

---

## 1. Why the question can't be answered by asking

Nobody says "no" to a memory product. A shared recap of a night out is pleasant in the
abstract, costs the person nothing to endorse, and flatters the asker. Interviews will
return warmth at any level of real demand, including zero.

So the question gets restated as four claims that can each fail on their own, and each
of which is visible in behaviour rather than opinion:

| | Claim | Fails if |
|---|---|---|
| **H** | The host wants the event's photos back badly enough to do something about it | They already have a habit that works, or they never think about it again after the event |
| **A** | Guests will contribute without being chased | The album stays near-empty unless the host nags |
| **R** | The finished artifact gets revisited | Opened once on the day, never again |
| **P** | Someone pays | Free signups, no completed charge |

The trap is that **all four failures look identical from the outside.** Each one
produces the same symptom: a quiet album and an unanswered follow-up. That is why this
has to be measured layer by layer instead of as one funnel.

### The specific failure mode to watch for

**H true, A false.** Hosts genuinely want the photos. Guests genuinely don't care
enough to upload them. The album is empty, so there is nothing to come back to (R
fails), so there is nothing worth money (P fails).

This is the dangerous case because every conversation you have will be encouraging. You
talk to hosts. Hosts have the problem. The people who have to solve it for them are the
guests, and nobody interviews the guests. A product can die of guest apathy while the
host interviews stay positive the entire way down.

If A is where this breaks, the fix is not better positioning. It is changing who
supplies the content — the host's own camera roll, the photographer, the venue — so the
product stops depending on a behaviour strangers won't perform.

---

## 2. Rules that make the results readable

**Concierge work is labelled and excluded.** Any event where we collected the photos,
built the album, or set up the account by hand is a sales demo, not an observation. It
can still be run, and it is still useful for learning, but it does not count toward the
primary metric. An event only counts as clean if the host set it up end to end without
our help. Target: at least half of test events clean.

**Warm-up traffic never enters a reply count.** Inbox-warming pools generate replies
that read exactly like buying signals — "happy with my current solution but yours seems
more powerful" is a warm-up template, not a prospect. Any reply-rate metric is computed
only over addresses on the actual target list, with warm-up labels excluded by filter,
not by eye.

**Thresholds are not revised mid-experiment.** If one genuinely has to move, log the old
value, the new value, and the reason, in this file, before looking at the next result.

**One event is not a rate.** Contribution measured at a single 30-person event carries a
confidence interval roughly 20 points wide. A single event can only settle the question
at the extremes — a 3% or a 60% result means something, anything in between does not.
The decision table in §7 applies after 6 to 8 events, not before.

---

## 3. E1 — Does anyone contribute? (layer A)

The core experiment. Run it at the next live event, and every one after.

**Denominator.** Ask the host for a headcount of people actually present. Not RSVPs, not
the guest list. Get it within 24 hours while they still remember.

**Collect per event:**

- unique contributors (distinct people who added at least one item)
- total items
- timestamp of every upload
- how many times the host posted or announced the link, and when
- unique openers, and unique openers who return after 72 hours and after 7 days
- whether the event was clean or concierge

**Derived metrics:**

- **Contribution rate** = unique contributors ÷ attendees present
- **Unprompted share** = contributors who uploaded before the host's *second* prompt ÷ all contributors
- **Depth** = median items per contributor
- **Decay** = any organic contribution after day 3, yes or no
- **Return rate** = unique openers at day 7 ÷ unique openers at day 1

**Pre-registered thresholds, per event:**

| Metric | Guests have the problem | Ambiguous | Guests do not have the problem |
|---|---|---|---|
| Contribution rate | ≥ 25% | 10–25% | < 10% |
| Unprompted share | ≥ 50% | 25–50% | < 25% |
| Depth (median items) | ≥ 3 | 2 | 1 |
| Return rate at day 7 | ≥ 30% | 15–30% | < 15% |

Depth deserves the most attention. A median of one item per contributor is compliance —
somebody asked, they complied, they left. A median of five is someone enjoying
themselves. The two are indistinguishable in a contributor count and they mean opposite
things.

**Runnable by hand.** None of this needs analytics shipped first. Headcount comes from
the host, contributors and items can be counted off the album, upload times are visible
on the items, prompts are whatever the host posted. Instrument it properly later; do not
let missing instrumentation cost the next event.

---

## 4. E2 — Is it already solved? (layer H)

A problem that exists is already being handled badly by somebody. If nobody has a
workaround, nobody has the problem.

**The retrospective question, asked after the event, never before:**

> For the last event you ran — not this one — what happened to the photos?

Then shut up. Score the answer:

- *"Nothing, I never thought about it"* → no problem
- *"There's a group chat / shared album somewhere"* → problem exists, already solved, low value
- *"I chased people for a week and still didn't get them"* → problem exists, badly solved, this is the customer

Past behaviour is the only honest evidence of an existing problem. What they say they
will do next time is worth nothing.

**The workaround control.** The sharper version, and cheap to run. Of the next ten
community hosts, give five the product and five a deliberately unglamorous substitute: a
bare cloud folder and a recap assembled by hand. If satisfaction and usage come out the
same, the product is not the value — the service is, and that is a different company.

---

## 5. E3 — Will anyone pay? (layer P)

A free signup is not a conversion, and enthusiasm in an email is not willingness to pay.
Until a charge completes, layer P is entirely untested no matter how many accounts exist.

Put a real price in front of the host at the moment of peak intent — immediately after
they first see their finished recap, not before the event — and require a card.

- charge completes → the problem is worth money
- card entered, then abandoned → price problem, not a problem problem
- won't reach for a card at the best moment they will ever feel → layer P has failed, and it
  does not matter what they said in the thread

Ten hosts through this gate is enough to tell the three apart.

---

## 6. E4 — Whose problem is it? (segment)

Two candidate buyers, two different problems, one mechanism:

- **community and creative hosts** — want the night's photos in one place
- **brands and agencies** — want attendee data and something to report to a client

These are not the same problem and there is no reason the same product wins both. Test
it properly rather than inferring from whichever batch happened to go out last.

Matched batch, same week, same effort, same quality bar: 25 sends to brands and
agencies, 25 to community hosts. Compare **positive** reply rate, not reply rate.

n=25 per arm detects a large difference (roughly 4% vs 20%), which is the only size of
difference that should change a segment decision. It will not resolve anything subtler,
and it should not be asked to.

**A prior worth stating before the batch goes out:** a scatter of sends across both
segments to date has produced interest from the community side and silence from the
brand side. At that volume this is not evidence — zero replies from a handful of cold
sends is exactly what a perfectly healthy funnel looks like. It is a hypothesis to test,
which is what E4 is for. It is not a finding, and it should not be quoted as one.

---

## 7. Decision table

Applies after 6 to 8 instrumented events, at least half of them clean.

| Contribution (median) | Anyone paid? | Read | What it licenses |
|---|---|---|---|
| < 10% | no | Guests do not have this problem. The product depends on labour they will not supply. | Change the collection mechanism — host's camera roll, photographer, venue — or stop |
| ≥ 25% | no | Real behaviour, no value captured. Free tools already do this well enough. | It is a feature. Find the adjacent thing that is worth money, or fold it into someone's stack |
| ≥ 25% | ≥ 1 in 5 hosts | The problem exists and is worth money. | Distribution problem, not a product problem. Fix copy and segment, spend on volume |
| 10–25% | mixed | Undetermined. Do not let this run indefinitely. | Set a date. If it is still here after two more months, treat it as the first row |

The second row is the one that gets rationalised away, so it is worth naming in advance:
healthy contribution with nobody paying is a *good product* and a *bad business*, and it
is the hardest result to accept because everything looks alive.

---

## 8. What would have to be true to stop

Written down now, while it is cheap to be honest:

- guests will not contribute above single digits without being chased, across six-plus events
- no host completes a charge at the moment of highest intent
- hosts, asked about their *last* event, mostly say nothing happened to the photos and they didn't mind

All three together is an answer. It is not a verdict on the idea and it is not a verdict
on anyone's judgement — it is the thing the experiment was built to be able to find, and
finding it early is the entire point of running it.

---

## 9. Log

Append per event. Keep it boring.

```
date | event | attendees | contributors | items | prompts | d1 opens | d7 opens | clean/concierge | paid | notes
```
