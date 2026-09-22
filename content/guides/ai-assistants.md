---
title: AI assistants: privacy, data use, and openness
category: AI
type: curated-guide
status: published
last_updated: 2026-08-15
maintainer: Conscious Consuming
disclosure: We take no money from any AI company. Nothing here is sponsored. We rank by public policies, model cards, open releases, and user controls, and AI policies change fast.
---

# AI assistants: privacy, data use, and openness

AI assistants now handle questions, writing, code, research, plans, and work documents. They receive whatever you type and may also connect to files, accounts, or tools. Before choosing one, check how it uses that material and whether its code, policies, or audits can be inspected outside the company.

> **The short answer.** Pick by sensitivity. For personal, confidential, legal, health, work, or identity-heavy material, use a local model or a hosted product with clear data controls and the right account tier for privacy. For everyday brainstorming, a hosted assistant can be fine if you understand whether your chats may be used to improve models and where the opt-out lives. For openness, be precise: "open weights" is not always the same as Open Source AI. The safest habit is to treat AI output as a draft to verify, not an oracle.

---

{{chart:ai-assistants:privacy}}

## What to compare

| Axis | The question | Why it matters |
| --- | --- | --- |
| Privacy controls | Can you stop chats from being used for model improvement? | Your prompts may contain personal, work, or third-party data |
| Local option | Can the model run on your device or private infrastructure? | Local use can remove the upload question entirely |
| Openness | Are weights, code, data information, and licenses clear? | OSI distinguishes open weights from fully open-source AI systems |
| Transparency | Are there model cards, system cards, safety reports, or policy pages? | Public documentation gives outsiders something to inspect |
| Safety and reliability | Does the provider document risk management and limitations? | NIST frames trustworthy AI as something designed and managed, not assumed |

## Choose by task shape, not by leaderboard

The "best" assistant changes with the work. A model that is excellent for coding may be the wrong place for a diary. A source-grounded search assistant may be better for a fresh factual question than a more fluent general chatbot. A local model may be weaker at hard reasoning but much stronger for private drafting.

| Task shape | Better assistant type | Watch for |
| --- | --- | --- |
| private drafting | local model, private deployment, or strong consumer data controls | device limits, weaker models, forgotten file uploads |
| public brainstorming | hosted general assistant | hallucinated facts, paste creep into sensitive material |
| current research | source-grounded assistant or search plus primary sources | summaries that cite weak, old, or mismatched sources |
| coding | approved coding assistant, local tool, or enterprise route | repository secrets, license exposure, insecure suggestions |
| study and explanation | general assistant with citation checks | overconfident simplification and invented examples |
| companionship or roleplay | companion-specific tool with strict boundaries | emotional dependence, parasocial nudges, identity and safety risk |
| regulated or consequential advice | governed workflow plus expert review | treating a plausible answer as a decision |

This keeps capability in its lane. You do not need one permanent AI brand identity. You need a small map of what each assistant is allowed to touch.

## A one-session AI privacy audit

1. **Find the data-control page before you paste anything sensitive.** Check whether chats, files, voice, images, and code can be used for training or model improvement.
2. **Separate account tiers.** Free, consumer paid, team, enterprise, API, and local use can have different retention, logging, and training rules.
3. **Check file handling.** A prompt is one thing; uploading a contract, source file, meeting transcript, spreadsheet, medical note, or unpublished manuscript is a different privacy event.
4. **Look for export and deletion.** If the assistant becomes part of your workflow, you should know how to retrieve, delete, or migrate important conversations.
5. **Read the limits page.** Safety reports, model cards, system cards, or known-limitation pages tell you what the provider is willing to admit publicly.
6. **Decide what never goes in.** Names, secrets, credentials, client data, unpublished work, health details, and legal facts may need a local or governed route.

## Sort inputs before you paste

| Input type | Safer route | Why |
| --- | --- | --- |
| Public text | Hosted assistant is usually fine | The information is already public |
| Personal journaling | Data controls on, or local model | It may reveal identity, health, relationships, or location |
| Work documents | Approved team, enterprise, API, or private deployment | Your employer or client may own the risk |
| Source code | Check policy and repository sensitivity | Code can include secrets, IP, vulnerabilities, or customer logic |
| Legal, medical, financial facts | Use governed tools and professional review | Consequential advice needs verification and confidentiality |
| Passwords, API keys, credentials | Do not paste | These are secrets, not prompts |

This small sorting step prevents most accidental over-sharing. The issue is not whether AI is good or bad; it is whether the tool, account tier, and retention policy match the sensitivity of the material. A casual assistant can be wonderful for brainstorming and still be the wrong place for a client file.

## Match the account tier to the promise

Do not assume the logo tells you the privacy deal. The same provider can offer different controls for free chat, paid consumer chat, team plans, enterprise plans, API use, education accounts, and local deployments.

| Tier or route | Often better for | Check before trusting it |
| --- | --- | --- |
| free consumer chat | casual learning, drafts, low-risk brainstorming | model-improvement defaults, ad/data ecosystem, retention |
| paid consumer chat | ordinary personal productivity | whether payment changes training, retention, or support rights |
| team or business plan | work documents and collaboration | admin controls, data-use promises, workspace ownership |
| enterprise or education plan | governed organizational use | audit logs, retention, contractual terms, deletion, regional controls |
| API | app workflows and controlled processing | logging window, abuse monitoring, data retention, downstream storage |
| local model | sensitive drafts and offline work | device security, model quality, update source, prompt-history storage |

The uncomfortable rule is simple: if you are relying on a privacy promise, find the exact promise for the exact route you are using. A general privacy page is not enough when the work is confidential.

## Match the assistant to the risk band

The practical choice is not one assistant for everything. It is a risk band for each kind of task. The same person may sensibly use a fast hosted assistant for public brainstorming, an approved work tool for client documents, and a local model for private notes.

| Risk band | Better default | Before using it |
| --- | --- | --- |
| Low | hosted assistant with ordinary data controls | verify facts and sources before sharing |
| Personal | hosted with training controls off, or local | redact names, health details, locations, and third-party secrets |
| Professional | approved team, enterprise, API, or private deployment | check employer, client, and repository rules |
| Consequential | governed route plus primary-source or expert review | treat output as a draft, not a decision-maker |
| Secret | do not paste into a chatbot | rotate exposed credentials and move to secure tooling |

This framing is useful because capability can seduce the boundary. A model that writes beautifully is still the wrong place for material you promised to protect.

## Use a prompt boundary before the prompt

Before pasting, decide which boundary the task belongs in: public, personal, professional, confidential, or prohibited. Then choose the assistant, account tier, and data-control setting to match. This one step prevents the common failure mode where a low-stakes brainstorming tool slowly becomes the default place for every document in your life.

| Boundary | Reasonable use | Guardrail |
| --- | --- | --- |
| public | rewriting public text, summarizing published sources | still verify citations and dates |
| personal | journaling, planning, sensitive life details | data controls on, local model, or careful redaction |
| professional | work drafts, meeting notes, code | approved tool and employer/client rules |
| confidential | contracts, customer records, health or legal facts | governed private route and human review |
| prohibited | passwords, API keys, identity secrets | do not paste |

The boundary can change during a conversation. If a harmless brainstorm turns into names, files, secrets, or decisions with consequences, stop and move to the right environment before continuing.

## Verify output by risk

For low-stakes writing, you can treat AI as a draft partner. For research, ask for primary sources and then open them. For code, run tests and review security-sensitive changes. For health, legal, finance, employment, housing, immigration, or safety decisions, treat the answer as a starting point for professional or primary-source verification. NIST's AI risk work is useful because it frames reliability as a managed risk, not a personality trait a model either has or lacks.

## Treat memory, tools, and agents as permissions

The privacy question is no longer only "what did I paste into chat?" Assistants increasingly remember preferences, connect to files, browse the web, call tools, summarize meetings, write code, schedule tasks, or act across apps. Each capability is a permission surface.

| Capability | Safer default | Why it matters |
| --- | --- | --- |
| long-term memory | turn on only for low-risk preferences you actually want remembered | memory can turn casual chats into a profile |
| file connectors | connect the smallest folder or workspace that solves the job | search over all files can expose drafts, contracts, photos, or client data |
| email and calendar access | use approved work tools and review what the assistant can read or send | inboxes contain other people's private information too |
| browser or shopping actions | confirm before purchases, bookings, posts, or form submissions | an agentic mistake can become an external action |
| code execution | keep secrets, credentials, and production data out of the session | generated or executed code can leak, delete, or transform sensitive material |
| shared assistants or bots | assume prompts, files, and outputs may be visible to admins or collaborators | team tools change who can inspect the work |

If an assistant can act, not just answer, slow down. The more the tool can do for you, the more clearly you need consent, logs, review, and an undo path.

## Source-grounded does not mean verified

Assistants that show citations are often better for research than plain chat, but the citation box is not the finish line. It can point to a page that is outdated, irrelevant, low-quality, quoted out of context, or summarised too aggressively.

| Claim type | Verification habit |
| --- | --- |
| date-sensitive news | open the original source and check publication/update date |
| product policy | open the provider's own policy page for the exact account tier |
| scientific or technical claim | prefer papers, standards, documentation, or primary data |
| legal, medical, financial, safety | use primary official sources and qualified human review |
| statistics | check methodology, sample, geography, and year |
| citations in generated text | make sure each cited source actually supports the sentence |

The assistant can make retrieval faster. It should not outsource judgment. A good workflow is: ask, collect sources, open the sources, then write the conclusion in your own words.

## Keep the tradeoffs visible

- **"We value your privacy" is not a setting.** Find the actual data-control page and check what is on by default for your account.
- **Local is strongest for sensitive input.** If nothing leaves your machine, the privacy question becomes much simpler.
- **Open weights are useful but not magic.** They can support self-hosting and scrutiny, but openness also depends on license, code, and training-data information.
- **Hosted frontier models trade control for capability.** That can be worth it; just make the trade consciously.
- **AI can be confidently wrong.** For anything consequential, verify with primary sources or a human expert.
- **A chatbot is not a records system.** Treat important outputs like drafts: save the source material, citations, and final version somewhere durable.
- **"Open" needs nouns.** Ask open weights, open code, open data information, open license, open evals, or open governance.
- **Paste inertia.** The easiest workflow can become the riskiest one if every file goes through the same assistant by habit.
- **Policy drift.** AI product terms, training controls, retention, and enterprise promises can change faster than ordinary software expectations.

## Extra caution for companion and social AI

Companion, character, and social-platform assistants deserve a different boundary from productivity tools. They are designed around ongoing relationship, mood, identity, roleplay, or social discovery, so they can collect unusually intimate signals even when the topic feels playful.

| Risk | Better boundary |
| --- | --- |
| emotional dependence | keep real support people, therapy, and emergency resources outside the app |
| identity exposure | avoid full names, addresses, workplace details, school details, and third-party secrets |
| sexual or romantic roleplay | check age policies, consent boundaries, moderation, and data controls |
| teen or family use | prefer tools with clear youth policies, guardian controls, and safety documentation |
| social graph leakage | assume platform assistants can connect chats to a wider account ecosystem unless proven otherwise |
| crisis moments | do not rely on a chatbot as emergency care |

This is not an argument against playful AI. It is an argument for treating intimacy as sensitive data. The warmer the interface feels, the more deliberately you should choose what belongs there.

## When the right move is not to use AI

Conscious use includes refusal. Do not use an assistant when the task requires confidentiality you cannot verify, consent from people whose data appears in the file, professional accountability, or a record that must survive audit. Also pause when the assistant is making the decision rather than helping you inspect it.

| Situation | Better move |
| --- | --- |
| credentials, API keys, private keys, recovery phrases | never paste; rotate if exposed |
| someone else's health, legal, school, or workplace record | use an approved governed route or do the work outside chat |
| hiring, lending, housing, discipline, grades, benefits, or eligibility | require policy, human review, and documented process |
| emotional crisis or self-harm risk | contact real emergency, crisis, clinical, or trusted human support |
| one-click agent action with money or public posting | require explicit review before the action leaves the device |
| answer with no source for a claim that matters | verify from primary sources before relying on it |

The point is not to make AI scary. It is to keep the human responsibility visible exactly where the interface tries to make everything feel effortless.

## A practical default

Use a hosted assistant with model-improvement training turned off for ordinary work, and a local or private model for sensitive drafts, identity details, client data, unpublished work, or anything you would not paste into a search box. Prefer providers that publish meaningful safety and privacy documentation, and keep an export/delete habit for tools you rely on.

## When to choose local or private deployment

Choose local, private-cloud, enterprise, or API routes when the assistant touches confidential work, regulated data, unpublished creative assets, customer records, source code, internal strategy, or anything covered by a promise you made to someone else. The tradeoff is usually convenience and raw capability versus control, auditability, and data governance. For casual brainstorming, the tradeoff can be fine. For sensitive work, make the boring governance choice before the magic demo talks you out of it.

Useful anchors: NIST [AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework), NIST's [Generative AI Profile](https://doi.org/10.6028/NIST.AI.600-1), the FTC warning that AI companies must uphold [privacy and confidentiality commitments](https://www.ftc.gov/policy/advocacy-research/tech-at-ftc/2024/01/ai-companies-uphold-your-privacy-confidentiality-commitments), the Open Source Initiative's [Open Source AI Definition](https://opensource.org/ai/open-source-ai-definition), OSI's explainer on [open weights](https://opensource.org/ai/open-weights), and OpenAI's [Data Controls FAQ](https://help.openai.com/en/articles/7730893-data-controls-faq).

---

*Compare assistants on privacy, openness, safety and transparency by your own weighting in the [AI-assistants explorer](#explore/ai-assistants).*
