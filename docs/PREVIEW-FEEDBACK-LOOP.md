# Preview Feedback Plan

*Last updated 2026-07-08. This is the operating path for showing Values Commons to a small circle without turning it into a public launch.*

## Goal

The next milestone is not more surface area. It is learning whether real people can use the current system for one real decision, trust the evidence, and tell us what blocked them.

Use this plan for grant reviewers, trusted testers, and the first 20-50 people you can invite personally.

## Before Sending A Link

Build the private preview and run the checks:

```bash
npm run build:preview
npm run audit:preview
npm run verify:full
```

The preview should be noindexed, static, and self-contained. Send the deployed root URL, not raw repository files.

## Who To Invite

Invite people who can test one concrete wedge:

- Someone considering a bank, credit union, or divestment move.
- Someone choosing a digital tool and worried about privacy.
- Someone who buys clothing, electronics, or learning resources and cares about repair, labor, or openness.
- One or two technically curious people who can inspect sources and tell you where trust breaks.

Do not ask for general opinions first. Ask them to make or evaluate one real decision.

## Invitation Materials

Prepare one invitation, a list of twenty people, three questions, and a place to record notes from each tester.

### Invite Text

Subject: Private preview: Values Commons

Hello `<name>`,

I am inviting a small first circle to test Values Commons, a no-account, no-tracking way to choose by your values using sourced evidence.

Could you try it for one real decision this week and send back three notes?

1. Did it help?
2. What was missing?
3. Did you trust it?

Start at `<preview URL>`, take the two-minute tour, then choose one path: compare a bank, AI assistant, clothing option, learning resource, or another real choice; walk a small group through Assembly and Slate; or use the adoption guide to describe a possible new subject.

The preview is private and noindexed. Your values stay on your device unless you choose to export notes.

Thank you for testing the working draft before it becomes a pitch.

### Contact List

Fill the twenty names before sending links. Choose people with real decisions, not vague audiences.

| # | Name | Why this person | Test | Sent | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 |  |  | Individual / Group / New subject |  |  |
| 2 |  |  | Individual / Group / New subject |  |  |
| 3 |  |  | Individual / Group / New subject |  |  |
| 4 |  |  | Individual / Group / New subject |  |  |
| 5 |  |  | Individual / Group / New subject |  |  |
| 6 |  |  | Individual / Group / New subject |  |  |
| 7 |  |  | Individual / Group / New subject |  |  |
| 8 |  |  | Individual / Group / New subject |  |  |
| 9 |  |  | Individual / Group / New subject |  |  |
| 10 |  |  | Individual / Group / New subject |  |  |
| 11 |  |  | Individual / Group / New subject |  |  |
| 12 |  |  | Individual / Group / New subject |  |  |
| 13 |  |  | Individual / Group / New subject |  |  |
| 14 |  |  | Individual / Group / New subject |  |  |
| 15 |  |  | Individual / Group / New subject |  |  |
| 16 |  |  | Individual / Group / New subject |  |  |
| 17 |  |  | Individual / Group / New subject |  |  |
| 18 |  |  | Individual / Group / New subject |  |  |
| 19 |  |  | Individual / Group / New subject |  |  |
| 20 |  |  | Individual / Group / New subject |  |  |

### Send in Small Groups

Send the first 5 invitations, collect the notes, and fix only trust breaks or dead ends before sending the next 5. Do not post the link publicly, add analytics, or turn soft praise into a feature plan.

Before the first invitation, run the [R1 review](R1-REVIEW.md). After at least 5 responses, run it again before deciding whether to share publicly.

## Three Ways to Test

| Test | Ask them to try | What to record |
| --- | --- | --- |
| Individual choice | Use a live instance for one real decision, then inspect the evidence behind one result. | Did the ranking change when their values changed? Which source or option affected trust? |
| Group decision | Take a small group through Assembly, Workshop, and Slate for a real shared choice. | Where did alignment appear, where did dissent remain, and what blocked commitment? |
| New subject | Use the [adoption guide](ADOPTION-KIT.md) to describe a possible new app before code. | Was the decision clear, were the starter facts plausible, and was the correction path visible? |

## The Tester Task

Ask each tester to choose one of the three paths, then do this:

1. Open the preview root and take the two-minute tour.
2. For an individual choice, open a live instance, set real values, inspect at least one result, and try one category such as `/app/#explore/banking`, `/app/#explore/ai-assistants`, `/app/#explore/clothing`, or `/app/#explore/learning-resources`.
3. For a group choice, open Assembly and Slate, then name both agreement and dissent.
4. For a new subject, open the adoption guide and fill in the new-subject brief before touching code.
5. Export or write back short notes answering the three core questions.

## The Three Questions

**Did it help?** Did it make a decision clearer, easier, or more confident?

**What was missing?** Name the absent option, stale source, confusing term, broken route, or category gap.

**Did you trust it?** Where did trust increase or break: evidence links, scoring, language, privacy, or values control?

Optional fourth question: **Was it calm?** Did it feel finite and respectful, or cluttered and pushy?

## Tester Notes

For each tester or group, record these notes:

- **Path tested:** individual choice, group decision, or new subject.
- **Real decision:** what they tried to choose, compare, move, fund, avoid, or build.
- **Did it help?** What became clearer, easier, or more confident.
- **What was missing?** The absent option, stale source, confusing term, broken page, or no clear way to send a correction.
- **Did they trust it?** Where trust increased or broke: evidence links, scoring, language, privacy, values control, exportability, or dissent.
- **Next change:** the smallest change that would help the next person.

The notes should be useful even if the tester never creates an account and never shares their private values file.

## Feedback Worth Acting On

Turn feedback into work only when it is specific:

- A missing mainstream option or values niche.
- A stale or weak source.
- A phrase that made the scoring feel more certain than the evidence allows.
- A broken route, unclear first step, or failed share/preview path.
- A repeated request from multiple testers.

Do not turn vague praise, vague dislike, or imagined scale into work. Changes should come from actual use.

## Preview Email

Subject: Private preview: Values Commons

Hello,

I am sharing a private preview of Values Commons, a no-account, no-tracking way to choose by your values using sourced evidence.

Could you try it for one real decision and send back three notes?

1. Did it help?
2. What was missing?
3. Did you trust it?

Suggested path: start at the home page, take the two-minute tour, then choose one route: try a category such as banking, AI assistants, clothing, or learning resources; walk a group through Assembly and Slate; or use the adoption guide to describe a possible new subject. The preview is intentionally private and noindexed.

Thank you for testing the working draft before it becomes a pitch.

## Stop Conditions

Pause broad sharing if any of these show up:

- A tester reasonably thinks the app is sponsored or pay-to-rank.
- A health, finance, or safety-adjacent claim reads as advice rather than a sourced comparison.
- The preview package exposes source folders, raw internal docs, or search-indexable private pages.
- Multiple testers cannot find the evidence trail.
- A group cannot see dissent or someone planning a new subject cannot find the adoption guide and correction route.
- A major first-use path fails on mobile or hosted preview.

Fix the trust break before inviting the next circle.
