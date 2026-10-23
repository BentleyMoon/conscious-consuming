---
title: Cloud storage: who holds the keys, tested encryption, and price
category: Technology
type: curated-guide
status: published
last_updated: 2026-09-29
maintainer: Conscious Consuming
disclosure: We take no money from any storage provider. Nothing here is sponsored. We compare on whether the provider can read your files, open code, how easily you can leave, the business model, ease of use, and price.
---

# Cloud storage: who holds the keys, tested encryption, and price

Cloud storage ends up holding the most private files many of us own: passports, tax returns, medical letters, years of photos. The question that separates providers is who holds the key that decrypts your files. If the provider does, it can read them, and so can anyone who compromises it. If only you do, the provider cannot, but you carry more of the responsibility, and not every service that says so has held up when researchers tested it.

> **The short answer.** Google Drive, iCloud Drive in its standard setting, OneDrive and Dropbox all hold the keys to personal accounts, which is part of what lets them offer search, previews and shared links. Proton Drive encrypts files and file names on your device before upload. Tresorit's design was mostly unaffected when ETH Zurich researchers analysed five encrypted services in 2024, while the other four had severe flaws. If you would rather not use anyone's cloud, Syncthing keeps files moving between your own devices. There is no single best service: the more a provider is locked out of your files, the less it can do for you.

{{chart:cloud-storage:privacy}}

## What to compare

| Measure | The question to ask | Why it matters |
|---|---|---|
| Who holds the keys | Can the provider decrypt your files in normal operation? | If it can, a breach or a legal demand can reach them |
| Tested or claimed | Has independent research checked the encryption? | Several "end-to-end" designs failed when tested |
| Leaving | Can you download everything in ordinary folders or archives? | A full export is your exit |
| Who pays | Selling storage, or a business built on ads and data? | The model shapes what happens to your files |
| Everyday ease | Apps on your devices, sharing, previews | The safest store is useless if you avoid it |

## Weigh what you care about

**Who holds the keys.** Google offers client-side encryption for Drive only to Workspace accounts whose administrator has switched it on; its help page describes nothing equivalent for a personal account. Apple's security overview lists iCloud Drive as encrypted with keys held by Apple under standard protection, and end to end, with keys only on your trusted devices, if you turn on Advanced Data Protection. Microsoft encrypts each OneDrive file at rest with its own key, and protects those keys with master keys it keeps in Azure Key Vault. Dropbox offers end-to-end encryption only to teams on its Business Plus, Advanced and Enterprise plans, not in its mobile app, and encrypted folders lose search, previews and shared links. Proton says it encrypts your files and their names on your device before upload, so that only you hold the keys. pCloud's client-side encryption applies only to files in its Crypto folder, sold as an add-on at 150 US dollars for life.

**Tested or claimed.** In 2024, ETH Zurich researchers analysed Sync, pCloud, Icedrive, Seafile and Tresorit on the assumption that the server itself is malicious. They found severe cryptographic vulnerabilities in four; in some cases a malicious server could inject files, tamper with them, or read their contents. Tresorit's design was mostly unaffected. As of 4 September 2024, the paper says, Sync and pCloud had not responded to repeated contact. In 2022 researchers found five attacks on MEGA that together allowed full compromise of file confidentiality; they say MEGA's patch stops the key and plaintext recovery attacks but keeps a non-standard use of cryptography.

**Not using a cloud at all.** Syncthing does not upload your data to the cloud; it exchanges files between your own machines whenever they are online at the same time. A registered Swedish non-profit foundation pays for its infrastructure, and its team has no plans to officially support iOS. Nextcloud lets you run your own server, or pick a hosting provider, and uses open standards such as WebDAV and CalDAV so other apps can connect. Its end-to-end encryption is an app your administrator must enable, and works only on empty folders, which stay read-only in the browser.

**Price.** Every Google Account comes with up to 15 GB, shared with Gmail and Photos; 100 GB is 1.99 US dollars a month and 2 TB is 9.99. Apple gives 5 GB free, then 50 GB for 0.99 dollars, 200 GB for 2.99 and 2 TB for 9.99 a month. Dropbox's Basic plan is free with 2 GB, and Plus is 9.99 dollars a month for 2 TB. Proton Drive's free plan starts at 2 GB and rises to 5 GB when you complete its setup steps; Proton Unlimited, with 500 GB shared across its services, is 12.99 euros a month or 119.88 euros a year. Filen, which includes client-side encryption on every plan, lists 2 TiB at 8.99 euros a month.

## If you care most about...

There is no best service for everyone. Decide what you want the provider to be able to do.

| If you care most about | Look at | Why |
|---|---|---|
| Encryption that held up under independent analysis | Tresorit | Mostly unaffected in the 2024 ETH Zurich study |
| Encryption on by default, with a free plan | Proton Drive | Files and names encrypted on your device |
| Staying with Apple | iCloud Drive with Advanced Data Protection on | Keys move to your trusted devices |
| Easiest sharing and working with others | Google Drive, Dropbox, OneDrive | Apps across your devices and simple sharing, but the provider holds the keys |
| No cloud copy at all | Syncthing | Syncs only between your own devices |
| Running it yourself | Nextcloud | Your server, open standards |

## The route that costs nothing

Before paying for more space, look at what you already have. Google, Apple, Dropbox and Proton all include a free allowance, and clearing out duplicates and old videos may be enough to stay inside it. Keep a second copy of anything irreplaceable on a drive you own, so no single company is the only place it lives.

## What we're not telling you

- If you choose end-to-end encryption, find out how the service lets you recover your account before you need it, and keep those recovery details somewhere safe.
- We do not score reliability, upload speed, or access for disabled users. Photo-only services, backup tools and one-off transfer services do a different job and are not compared.
- Prices are US or euro list prices read in September 2026; some pages load prices by script, and where we could not read one we left it out.

## How we made this

We take no money from any storage provider. Every fact above comes from a provider's own pages or from published security research, linked below. Each service's scores, with the source behind every cell, are in the [cloud storage comparison](#explore/cloud-storage). If something has changed, tell us through Contribute and we will correct it.

## Sources

- [Google: Workspace client-side encryption in Drive](https://support.google.com/docs/answer/10519333?hl=en), checked 2026-09
- [Google One plans](https://one.google.com/about/plans), checked 2026-09
- [Apple iCloud data security overview](https://support.apple.com/en-us/102651), checked 2026-09
- [Apple iCloud+ plans and pricing](https://support.apple.com/en-us/108047), checked 2026-09
- [Microsoft: how OneDrive safeguards your data](https://support.microsoft.com/en-us/onedrive/how-onedrive-safeguards-your-data-in-the-cloud), checked 2026-09
- [Dropbox: encrypted team folders](https://help.dropbox.com/security/encrypted-team-folders), checked 2026-09
- [Dropbox plans](https://www.dropbox.com/plans), checked 2026-09
- [Proton Drive](https://proton.me/drive), checked 2026-09
- [Proton plans](https://proton.me/support/proton-plans), checked 2026-09
- [pCloud Encryption](https://www.pcloud.com/encrypted-cloud-storage.html), checked 2026-09
- [Filen pricing](https://filen.io/pricing), checked 2026-09
- [Hofmann and Truong, End-to-End Encrypted Cloud Storage in the Wild: A Broken Ecosystem (ETH Zurich, 2024)](https://eprint.iacr.org/2024/1616.pdf), checked 2026-09
- [MEGA: Malleable Encryption Goes Awry (2022)](https://mega-awry.io/), checked 2026-09
- [Syncthing FAQ](https://docs.syncthing.net/users/faq.html), checked 2026-09
- [Syncthing Foundation](https://syncthing.net/foundation/), checked 2026-09
- [Nextcloud install](https://nextcloud.com/install/), checked 2026-09
- [Nextcloud manual: end-to-end encryption](https://docs.nextcloud.com/server/stable/user_manual/en/files/using_e2ee.html), checked 2026-09
