# R1 Review Gate

*Last updated 2026-07-09. Run this before the first tester invite. This is the founder's first-user pass: build the private preview, use it for one real decision, and decide what must change before anyone else sees it.*

## Build The Preview

Start from a clean tree, then prepare the first-invite private package:

```bash
npm run r1:preflight
```

That command runs the manual pieces in order: `npm run prepare:preview`, the private package audit (`npm run audit:preview:private`), full verification (`npm run verify:full`), both-lane package smoke, status refresh, and the R1 blocker gate. When it passes, it writes `dist/r1-preflight-check.json` as the local preflight receipt. `npm run release:status` and `docs/PROJECT-STATUS.md` summarize that receipt afterward.

Deploy the resulting `dist/` folder to the private preview host you will actually send. Open the deployed root URL on desktop and phone. Do not use raw repository files as the review target.

## First-User Path

Do this as a real user, not as the maintainer who knows where everything lives:

1. Open the preview root and take the two-minute tour.
2. Open Conscious Consuming from the instance path.
3. Pick one real decision you might actually make this week.
4. Try one flagship category: `/app/#explore/banking`, `/app/#explore/ai-assistants`, `/app/#explore/clothing`, or `/app/#explore/learning-resources`.
5. Change the values controls and confirm the ranking or explanation changes for a reason you can say aloud.
6. Open one result, inspect its evidence trail, and decide whether the source is enough for the claim being made.
7. Try one non-shopping path: Assembly, Workshop, Slate, or the Adoption Kit.
8. Export or write the receipt below before changing the product.

## R1 Gate Questions

Answer these before inviting the first 5 testers:

- **Did one real decision get clearer?** Name the decision and what changed.
- **Where did trust rise or break?** Check evidence links, scoring language, privacy posture, and source dates.
- **Could you explain the score to a skeptical person?** If not, patch before inviting.
- **Did any sentence sound generated?** Mark exact words, not vibes.
- **Did the privacy promise hold?** Values, notes, and exports should stay on-device unless you choose to share them.
- **Did mobile work without special knowledge?** A phone is part of the gate, not a later polish pass.
- **Where did the path dead-end?** A missing next act is a blocker when it appears on the chosen path.

## Decision Rule

Use one of three outcomes:

- **Pass to first 5:** one real decision became clearer, evidence was findable, no stop condition appeared, and the next action was obvious enough.
- **Patch first:** the product mostly worked, but a trust break, broken route, unclear score, stale source, generated-sounding sentence, or mobile failure would make the first testers teach us about a known defect.
- **Stop:** a health, finance, or safety-adjacent claim reads as advice; a preview exposes raw internal files; the evidence trail cannot be found; the privacy promise appears false; or the app looks sponsored or pay-to-rank.

If the outcome is **Patch first** or **Stop**, fix the smallest cause and rerun this gate. Do not invite around a known trust break.

## R1 Receipt

Copy this receipt into your notes before sending any invite:

```text
Preview URL:
Build stamp:
Preflight receipt:
Date:
Device/browser:
Real decision:
Path tested:
Values changed:
Result inspected:
Evidence source checked:
Did it help?
What was missing?
Did you trust it?
Mobile result:
Copy strikes:
Stop conditions:
Decision: Pass to first 5 / Patch first / Stop
First 5 invitees:
Next patch:
```

The R1 review is done when this receipt exists and the decision is either **Pass to first 5** or a specific patch before rerun.
