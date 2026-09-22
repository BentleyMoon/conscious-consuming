---
title: Leaving locked-in software: export, formats, and switching
category: Digital services
type: curated-guide
status: published
last_updated: 2026-08-15
maintainer: Conscious Consuming
disclosure: We take no money from any vendor or project named here. Nothing is sponsored. We rank by published export paths, licences and policies, not by who pays.
---

# Leaving locked-in software: export, formats, and switching

Most software does not hold you with a contract. It holds you with the cost of leaving: the export
that drops half the structure, the format only one program reads, the shared workspace that stops
making sense the moment you take your files out of it. You notice the cost only when you try to go.

This guide is about that cost, and about what you can move to instead. It covers everyday tools:
notes, files, mail, chat, forms, sites, photos. Every product below is scored on **portability**,
whether you can get your work out in a form something else can read, and **openness**, whether
anyone outside the company can inspect, run or fork the thing.

> **The short answer.** Two different problems get confused here. A tool can have a
> perfectly good export and still be impossible to leave, because what travels is the files and what
> stays behind is the structure: Notion supports Markdown, CSV and HTML export, but its own help
> notes that complex databases and views can lose fidelity ([Notion](https://www.notion.com/help/export-your-content), 2026).
> A tool can also be genuinely open and still cost you weeks, because the work is in rebuilding
> habits. So test the exit before you need it, prefer tools whose native format is already a plain
> file, and move one job at a time rather than all at once. If you only do one thing after reading
> this: export your most important tool today, open the export in something else, and see what
> survived.

---

{{chart:digital-services:portability}}

## What makes a tool hard to leave

| Axis | The question | Why it matters |
|---|---|---|
| Export path | Can you get everything out, without an admin, a paid plan, or a support ticket? | An export that needs permission is a permission that can be refused |
| Format | Does the export open in something that is not the original product? | A file only one program reads is not really yours yet |
| Structure | Do relationships, views, permissions and history survive the move? | Files usually travel; the shape around them usually does not |
| Openness | Can anyone inspect, run or fork the code? | Open code means the tool can outlive the company that made it |
| Self-hosting | Could you run it yourself if you had to? | The strongest form of not being locked out |
| Network | Do other people have to move with you? | Some tools are held in place by who else is in them, not by the software |

## A five-minute exit test

Run this on the tool you would least like to lose. It takes about five minutes and tells you more
than any review.

1. **Find the export.** Settings, account, admin. If you cannot find it in two minutes, that is
   itself a finding.
2. **Check who is allowed to run it.** Slack exports exist, but its own help says the scope depends
   on owner or admin role and plan, and that Enterprise exports cannot be imported into another
   workspace ([Slack](https://slack.com/help/articles/201658943-Export-your-workspace-data), 2026).
3. **Look at what comes out.** A zip of standard files is good. A single proprietary blob is not.
4. **Open it somewhere else.** This is the step people skip and the only one that proves anything.
5. **Note what is missing.** Feedly documents OPML export of feeds, and also says the OPML does not
   include Boards, Read Later articles, AI Feeds or Reddit feeds
   ([Feedly](https://docs.feedly.com/article/52-how-can-i-export-my-sources-and-feeds-through-opml), 2026).
   That gap is the real switching cost.

## Replacements, by the job you need done

Scores are out of 100 on this site's own data, for portability and openness. The left column is not
a list of bad companies. It is a list of tools whose exit path is narrower than the alternative
beside it, which is a different and more checkable claim.

| Job | Commonly used | Port / Open | A more portable option | Port / Open |
|---|---|---|---|---|
| Notes | Notion | 60 / 25 | Joplin | 92 / 95 |
| Office documents | Microsoft 365 | 66 / 20 | ONLYOFFICE | 86 / 82 |
| Files and sync | Dropbox | 70 / 25 | Nextcloud | 90 / 100 |
| Mail | Outlook.com | 58 / 20 | Thunderbird | 88 / 92 |
| Team chat | Slack | 55 / 25 | Zulip | 92 / 100 |
| Project tracking | monday.com | 62 / 18 | Vikunja | 76 / 94 |
| Forms and surveys | Typeform | 60 / 20 | LimeSurvey | 88 / 96 |
| Websites | Wix | 35 / 20 | WordPress.org | 92 / 100 |
| Photo backup | Amazon Photos | 62 / 20 | Immich | 88 / 100 |
| Site analytics | Cloudflare Web Analytics | 58 / 25 | Matomo | 90 / 90 |
| Feeds | Feedly | 66 / 25 | NetNewsWire | 90 / 96 |
| PDF work | iLovePDF | 70 / 20 | Stirling PDF | 88 / 96 |
| Signing documents | SignWell | 62 / 20 | DocuSeal | 80 / 92 |
| Search | Google Search | 48 / 20 | SearXNG | 76 / 100 |

What the sources say about the four biggest moves:

- **Notes.** Joplin imports Evernote and Markdown, and exports JEX, raw files, HTML, PDF and
  Markdown ([Joplin](https://joplinapp.org/help/apps/import_export/), 2026). Evernote itself exports
  ENEX or HTML from the desktop app, and free users can export
  ([Evernote](https://help.evernote.com/hc/en-us/articles/209005557-Export-Notes-and-Notebooks-as-ENEX-or-HTML), 2026),
  so leaving Evernote for Joplin is one of the better-supported moves on this page.
- **Files.** Nextcloud runs on your own server with standard sync and file workflows
  ([Nextcloud](https://nextcloud.com/install/), 2026). Dropbox lets you download files and folders,
  but its help is clear that shared-workspace permissions, comments and collaboration context do not
  fully travel ([Dropbox](https://help.dropbox.com/delete-restore/download-file-folder), 2026).
- **Chat.** Zulip documents organisation export tools that move data between its cloud and a
  self-hosted server ([Zulip](https://zulip.com/help/export-your-organization), 2026). That is the
  property Slack's own export documentation does not offer at the enterprise tier.
- **Sites.** WordPress has a built-in export for posts, pages, comments, custom fields, terms, menus
  and custom post types ([WordPress](https://wordpress.org/documentation/article/tools-export-screen/), 2026).
  Wix documents domain transfer and embedding, but its help does not present full site-code export as
  a normal path ([Wix](https://support.wix.com/en/article/exporting-or-embedding-your-wix-site-elsewhere), 2026).

## If you care most about...

| Your priority | Start here | Why |
|---|---|---|
| Never losing access to your own writing | Plain files: Markdown in a folder you sync | No product sits between you and the text |
| Getting off one specific tool this week | The single job you use most, not all of them | One migration you finish beats five you abandon |
| Running things yourself | Nextcloud, Immich, Zulip, Matomo | All four document a self-hosted install |
| Keeping the people you work with | Tools with an import path from the old one | The social cost is usually larger than the technical one |
| Spending nothing | Thunderbird, Joplin, LibreOffice, Firefox | Free and open, with no account required to start |

## What we are not telling you

**We do not measure intent.** Whether a company made leaving hard on purpose is not something we
can source, so we do not claim it. We measure the exit path that is published, which is checkable,
and leave motive alone.

**A low openness score is not a verdict on quality.** Google Drive scores 70 on portability here,
because Takeout genuinely works; it scores 25 on openness because the service is closed
([Google](https://support.google.com/accounts/answer/3024190?hl=en), 2026). Those are two separate
facts and a tool can be strong on one and weak on the other.

**Self-hosting moves the work rather than removing it.** Immich's own documentation notes that
self-hosting keeps the library under your control and that you must manage exports, storage and
backups yourself ([Immich](https://docs.immich.app/FAQ), 2026). If nobody is going to run the
backups, a hosted tool with a good export is the better choice.

**We do not score switching effort or cost.** Time, retraining and the people who would have to move
with you are usually the deciding factors, and we have no sourced way to score them yet.

**Scores change.** Every figure above carries an as-of year in the data. Export paths improve and
degrade; check the source link before making a decision that matters.

## How we made this

Nobody pays to appear here, and no vendor or project was contacted. Every score comes from this
site's `digital-services` data, where each figure carries a note, a source link and the year it was
checked. Products were paired by the job they do, then compared on portability and openness. Where
a product's own documentation contradicted a claim, the documentation won.

Found something wrong, or an export path that has changed? Corrections are welcome and get applied
with their source.

## Sources

- Notion, Export your content: https://www.notion.com/help/export-your-content
- Slack, Export your workspace data: https://slack.com/help/articles/201658943-Export-your-workspace-data
- Feedly, OPML export: https://docs.feedly.com/article/52-how-can-i-export-my-sources-and-feeds-through-opml
- Joplin, Import and export: https://joplinapp.org/help/apps/import_export/
- Evernote, Export notes and notebooks: https://help.evernote.com/hc/en-us/articles/209005557-Export-Notes-and-Notebooks-as-ENEX-or-HTML
- Nextcloud, Install: https://nextcloud.com/install/
- Dropbox, Download a file or folder: https://help.dropbox.com/delete-restore/download-file-folder
- Zulip, Export your organization: https://zulip.com/help/export-your-organization
- WordPress, Tools Export screen: https://wordpress.org/documentation/article/tools-export-screen/
- Wix, Exporting or embedding your site elsewhere: https://support.wix.com/en/article/exporting-or-embedding-your-wix-site-elsewhere
- Immich, FAQ: https://docs.immich.app/FAQ
- Google, Download your data: https://support.google.com/accounts/answer/3024190?hl=en
- ONLYOFFICE, Self-hosted installation: https://api.onlyoffice.com/docs/docs-api/get-started/installation/self-hosted/
- Thunderbird: https://www.thunderbird.net/en-US/
- Vikunja, Importing: https://vikunja.io/docs/importing/
- LimeSurvey, Pricing and export formats: https://www.limesurvey.org/pricing
- Matomo On-Premise: https://matomo.org/matomo-on-premise/
- NetNewsWire: https://netnewswire.com/
- Stirling PDF: https://github.com/Stirling-Tools/stirling-pdf
- DocuSeal: https://www.docuseal.com/
- SearXNG documentation: https://docs.searxng.org/
