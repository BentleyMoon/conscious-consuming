---
title: The app contract: privacy, control, and exit
category: Foundations
type: curated-guide
status: published
last_updated: 2026-08-15
maintainer: Conscious Consuming
disclosure: This page is our promise to you, written so you can hold us to it. No ads, no sponsored ranking, no hidden tracking, and no brand pays us - ever.
---

# The app contract: privacy, control, and exit

Almost every consumer app is trying to do something to you: keep you scrolling, harvest your data, nudge you toward whatever pays it, or make leaving feel harder than staying. Conscious Consuming is built on the opposite premise. If we are going to help people resist manipulative technology, the tool itself has to refuse the manipulative playbook.

> **The short contract.** This app should help you decide and leave. No brand can pay to rank higher. Your values, saved items, notes, and contribution drafts live in your own browser unless you export them. The normal app does not need an account, email address, ad network, cookie banner, or behavioral profile. It should be inspectable: sources are linked, scoring is legible, exports are available, and deletion is local. Where a network action exists, it should be explicit, narrow, and named.

---

## What anti-app means in practice

| Common app pattern | Anti-app commitment | How to check it |
| --- | --- | --- |
| Sponsored ranking | No ads, affiliate boosts, brand payments, or pay-to-rank | Read the disclosure and compare the source trail on any verdict |
| Behavioral tracking | No hidden analytics, ad pixels, cookie walls, or accounts in normal use | Open the browser Network tab and reload the app |
| Data capture | Values, saved entries, notes, and drafts stay in local browser storage | Open the You page, export your data, or inspect localStorage |
| Engagement loops | No infinite feed, autoplay, streaks, manufactured urgency, or pushy notifications | Use the app for one task; success is getting out with a decision |
| Lock-in | Export and erase are first-class actions | Use the You page to export, import, or delete everything local |
| Opaque scoring | Scores are values-relative and source-linked, not a hidden editorial verdict | Open any item and follow the evidence links |
| Silent growth | New claims should be sourced, dated, and humble about uncertainty | Treat missing or stale evidence as a bug to report |

The [FTC's dark-patterns work](https://www.ftc.gov/reports/bringing-dark-patterns-light) is the public-interest anchor here: design can manipulate people into choices they would not otherwise make. The anti-app rule is simple: if a pattern would be manipulative in another product, we do not get to use it because our cause sounds nicer.

## What stays on your device

The core app stores your personal state in your browser, not on a Conscious Consuming server.

| Local thing | What it contains | Why it exists |
| --- | --- | --- |
| Values profile | Your theme weights and category weights | So every category can re-rank by what you care about |
| You settings | Region, diet, allergy, language, and theme choices | So the app can remember practical preferences |
| Saved list | Entries you kept for later | So you can compare without creating an account |
| Notes and suggestions | Your testing notes and contribution drafts | So feedback is useful before you choose to export it |
| App cache | Static files needed for offline use where supported | So the tool can keep working without a live backend |

This is why the You page matters. It is the account replacement: export a JSON file if you want a backup, import it on another device, or erase it locally when you are done. Privacy is a design problem before it is a hiding problem; NIST’s [Privacy Framework](https://www.nist.gov/privacy-framework) frames privacy as a risk-management design problem. Here, the simplest risk reduction is not collecting server-side personal data in the first place.

## Where network use can happen

Local-first does not mean every click is metaphysically offline. It means personal state and ordinary ranking do not require a remote profile.

| Action | Network behavior | What leaves your device |
| --- | --- | --- |
| Open the app from a hosted site | Browser requests static files from that host | Standard web request metadata to the host |
| Compare categories and guides | Uses bundled/static data already shipped with the app | No values, saved list, or notes |
| Follow an external source link | Leaves the app for that source website | Whatever your browser sends to that site |
| Use barcode lookup when an item is missing | Sends the barcode to Open Food Facts for that lookup | The barcode only; your values do not leave |
| Export, import, or erase | Happens in your browser | Nothing is sent automatically |

If the public deployment ever adds aggregate visit counting, it should be disclosed plainly, configured without personal profiling, and kept out of local development. Hidden analytics would violate this page.

## Feature gates before we add anything

Every useful feature still has to pass the anti-app test. A feature can be convenient and still shift power away from the person using it.

| Proposed feature asks for | It must prove | Red line |
| --- | --- | --- |
| personalization | works from local values or explicit settings | hidden behavioral profile |
| contribution flow | exports or submits only what the user chooses | silent upload of notes, values, or saved items |
| reminders or prompts | clearly user-requested and easy to turn off | streaks, guilt loops, or manufactured urgency |
| recommendations | based on visible criteria and source trails | paid placement or undisclosed ranking boost |
| accounts or sync | optional, portable, and deletable | making sign-in required for ordinary comparison |
| analytics | aggregate, minimal, disclosed, and non-profiling | ad pixels, cross-site tracking, or user-level surveillance |
| AI assistance | narrow, labeled, source-aware, and privacy-scoped | hidden prompt upload or generated claims without review |

This is not a ban on ambition. It is a gate that keeps useful growth from quietly becoming platform capture.

## How to hold us to it

1. **Open Developer Tools, then Network.** Reload the app and look for third-party scripts, pixels, analytics, or unexpected calls.
2. **Open Application or Storage.** Look for the local Conscious Consuming keys that hold values, saved items, notes, and preferences.
3. **Use the You page.** Export your data, import it, then erase it. A private tool should make departure boring.
4. **Follow the source trail.** Open an entry, read the score basis, and check whether the linked source actually supports the claim.
5. **Inspect the files.** The app is static: guides, lenses, datasets, and scoring code are built into readable files.
6. **Report the mismatch.** If the app's behavior and this page disagree, the page is not marketing cover; the mismatch is a bug.

EFF's [Surveillance Self-Defense](https://ssd.eff.org/) is useful because it treats privacy as practice, not branding. This page should be read the same way: not "trust us," but "here is the behavior you can check."

## The failure modes we guard against

| Failure mode | What it would look like | The guardrail |
| --- | --- | --- |
| Mission laundering | Ethical language wrapped around ad-tech behavior | No ads, no paid ranking, no hidden trackers |
| Engagement creep | Streaks, badges, urgency loops, personalized nudges | Finishable tasks, calm navigation, no manufactured urgency |
| Source theater | Scores with links that do not support the claim | Dated provenance, source links, and correction paths |
| Phantom precision | A confident number where evidence is thin | Coarse bands, honest missing data, no invented zeros |
| Lock-in | Saved choices trapped in an account or subscription | Local export, import, erase, and no sign-in requirement |
| Product drift | Useful features slowly becoming platform capture | Handoff discipline, public docs, and anti-app review |

Data portability matters because the right to leave changes the power balance. The [Data Transfer Initiative](https://dtinit.org/) works on easier movement of user data between services; this app takes the small-tool version of the same principle: your values should be portable because they are yours, not ours.

## The promise is not purity

Not every respectful tool has to be tiny, offline, or local-first. A bank, a library system, a clinic portal, a messaging network, and an AI assistant cannot all behave like a static file. The standard is not "never use a server." The standard is: collect less, explain why, protect what you collect, avoid manipulation, make leaving possible, and let people choose with enough information to disagree.

That is also the product philosophy. Conscious Consuming ranks options by your weights, not ours. It should make tradeoffs legible instead of pretending they disappear. If a category is incomplete, if a source is old, or if a score is contestable, the honest answer is to show the limitation and improve the commons.

## If a server becomes necessary

Some future features may need a server: voluntary contribution intake, opt-in sync, collaborative review, source-change monitoring, or account recovery. If that happens, the server should be treated as a narrow tool, not a business model.

| Server use | Anti-app condition |
| --- | --- |
| sync | opt-in, encrypted where feasible, exportable, deletable |
| contributions | explicit submit action with preview and edit trail |
| moderation or review | transparent queue and no private profiling |
| aggregate metrics | coarse, disclosed, privacy-preserving, and not used for manipulation |
| notifications | user-created reminders only, never engagement bait |
| AI help | labeled, scoped, and never a source of unsupervised verdict claims |

The test is whether a person still understands what leaves their device, why it leaves, how long it stays, and how to remove it.

## A practical default

Use the app when it helps a real decision, then close it. Set your values once, compare the category you came for, save only what matters, export if you want a backup, and erase if you are done. If a feature ever tries to make you stay for its own sake, it has crossed the line.

Useful anchors: FTC [Bringing Dark Patterns to Light](https://www.ftc.gov/reports/bringing-dark-patterns-light), NIST [Privacy Framework](https://www.nist.gov/privacy-framework), CISA [Secure Our World](https://www.cisa.gov/secure-our-world), EFF [Surveillance Self-Defense](https://ssd.eff.org/), and the [Data Transfer Initiative](https://dtinit.org/).

---

*Next, read [digital literacy](#guide/digital-literacy), [healthy tech](#guide/healthy-tech), or compare privacy-sensitive tools in [digital services](#explore/digital-services), [AI assistants](#explore/ai-assistants), [password managers](#explore/password-managers), and [VPNs](#explore/vpn).*
