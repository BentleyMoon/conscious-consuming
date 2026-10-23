---
title: Messaging apps: encryption by default, what ties you in, and who pays
category: Technology
type: curated-guide
status: published
last_updated: 2026-09-29
maintainer: Conscious Consuming
disclosure: We take no money from any messaging app. Nothing here is sponsored. We compare on default encryption, open code, whether your identity and history can leave, the business model, how easily you can reach people, and cost.
---

# Messaging apps: encryption by default, what ties you in, and who pays

Choosing a messenger means choosing a room to meet people in. The most private room is no use if nobody you know is in it, and the busiest room may be owned by a company that profits from knowing who you talk to. Our [private messaging guide](#guide/private-messaging) covers settings, backups and moving a group across. This one compares the apps themselves.

> **The short answer.** If privacy comes first, Signal is the benchmark: it says it cannot read your messages or calls, and it is run by a nonprofit funded by grants and donations, though you register with a phone number. WhatsApp and Messenger encrypt personal messages by default and are where many of your contacts may already be, but they sit inside Meta. If you would rather not give a phone number at all, Threema, Session and SimpleX let you join without one, though you may find few of your contacts there yet. There is no single best app: the more private and independent the app, the fewer of your contacts are usually on it.

{{chart:messaging:portability}}

## What to compare

| Measure | The question to ask | Why it matters |
|---|---|---|
| Encryption by default | Are ordinary chats end-to-end encrypted without you doing anything? | Optional protection mostly goes unused |
| What you sign up with | A phone number, an email, a random ID, or nothing? | Your identifier links your account to the rest of your life |
| Leaving | Is your identity tied to one company's network? | A closed network makes switching a social cost |
| Who pays | Ads and data, subscriptions, a one-time price, or donations? | The funding decides what the company needs to know |
| Reach | Are the people you talk to already there? | A messenger works only if people answer |

## Weigh what you care about

**Encryption by default.** Signal says it cannot decrypt or otherwise access the content of your messages or calls. WhatsApp says personal messages, calls, photos and videos are end-to-end encrypted so that not even WhatsApp can see them. Meta says personal messages and calls on Messenger are end-to-end encrypted by default. Apple says iMessage conversations are end-to-end encrypted, but a message to a non-Apple phone falls back to SMS, MMS or RCS; SMS and MMS are not end-to-end encrypted, and RCS is encrypted only when both carriers support it. Telegram's ordinary Cloud Chats use server-client encryption and are stored on Telegram's servers; end-to-end encryption is only in Secret Chats, which you start yourself. Citizen Lab found that WeChat is not end-to-end encrypted and that its servers can and do decrypt every message.

**What you sign up with.** Signal asks you to register a phone number. Threema gives you a randomly generated ID, with no phone number or email needed. Session uses Account IDs and needs neither. SimpleX calls itself the first network without user IDs, with every contact and group kept on your device rather than in a server's database.

**Leaving.** Most messengers are closed networks: your contacts know you by an identity that only works inside one app. Matrix describes itself as an open, decentralised network, and Delta Chat is decentralised too, built on relays that it says store no user data. Briar goes furthest: messages sync directly between devices, over Tor when the internet is up and over Bluetooth or Wi-Fi when it is down. Regulation is opening the biggest closed networks a little. Under the EU's Digital Markets Act, WhatsApp had to open one-to-one messaging to other apps by March 2024, and WhatsApp and Messenger both had to open group chats by September 2025, with calls due by September 2027. The first two outside apps able to message WhatsApp users launched in November 2025. In February 2024 the European Commission decided iMessage would not be designated, so it carries no such duty.

**Who pays.** Signal says it is an independent nonprofit that can never be acquired by a tech company, with no ads, affiliate marketing or tracking. Threema says it pays its way only through app revenue, not by selling data. Delta Chat says it takes no venture capital, is not in debt, and has been funded by public sources such as the EU's Next Generation Internet programme. Telegram shows ads in public channels with 1,000 or more subscribers and in public search results; it says it does not use your private chats or contacts for ad targeting, and Premium subscribers see no ads. In 2021 Ireland's Data Protection Commission fined WhatsApp 225 million euros over how it explained sharing information with other Facebook companies.

**Cost and reach.** WhatsApp advertises messaging and calling for free, noting that data charges may apply. Threema Private is a one-time purchase of 6 Swiss francs. Briar runs on Android only.

## If you care most about...

There is no best messenger for everyone. Start from the thing you would least like to give away.

| If you care most about | Look at | Why |
|---|---|---|
| Strong privacy that friends will actually install | Signal | Content it cannot read, run by a nonprofit |
| Not handing over a phone number | Threema, Session, SimpleX | Random IDs or no IDs at all |
| Not depending on one company's servers | Matrix, Delta Chat, Briar | Decentralised networks or direct device sync |
| Reaching people where they already are | WhatsApp, Messenger | Encrypted personal chats by default, inside Meta's networks |
| Big public channels and groups | Telegram | Large one-to-many channels; start a Secret Chat for anything private |
| Messaging during an internet outage | Briar | Syncs over Bluetooth or Wi-Fi |

## The route that costs nothing

You probably do not need to buy anything, and you do not need to leave an app to use it more carefully. If you use Telegram, start a Secret Chat for private conversations. If your contacts are on WhatsApp, keep it for them and install Signal alongside it for the conversations that matter most.

## What we're not telling you

- End-to-end encryption protects messages on the way and on the company's servers. It does not stop the person you write to from taking a screenshot or backing up the chat unencrypted.
- Claims such as "we collect nothing" are each company's own words. We link to them; we cannot audit them.
- We do not score call quality, spam, or access for disabled users. We checked these pages in September 2026, and apps change their defaults.

## How we made this

We take no money from any messaging app. Every fact above comes from the app maker's own pages, a regulator, or published security research, linked below. Each app's scores, with the source behind every cell, are in the [messaging comparison](#explore/messaging). If something has changed, tell us through Contribute and we will correct it.

## Sources

- [Signal terms and privacy policy](https://signal.org/legal/), checked 2026-09
- [Signal](https://signal.org/), checked 2026-09
- [WhatsApp](https://www.whatsapp.com/), checked 2026-09
- [WhatsApp privacy](https://www.whatsapp.com/privacy), checked 2026-09
- [Messenger privacy](https://www.messenger.com/privacy?locale=en_US), checked 2026-09
- [Apple: iMessage, SMS, MMS and RCS](https://support.apple.com/en-us/104972), checked 2026-09
- [Telegram FAQ](https://telegram.org/faq), checked 2026-09
- [Telegram privacy policy](https://telegram.org/privacy), checked 2026-09
- [Citizen Lab: WeChat encryption FAQ](https://citizenlab.ca/research/should-we-chat-too-security-analysis-of-wechats-mmtls-encryption-protocol/should-we-chat-too-faq/), checked 2026-09
- [Threema Private](https://threema.com/en/products/private), checked 2026-09
- [Session](https://getsession.org/), checked 2026-09
- [SimpleX Chat](https://simplex.chat/), checked 2026-09
- [Matrix](https://matrix.org/), checked 2026-09
- [Delta Chat help](https://delta.chat/en/help), checked 2026-09
- [Briar: how it works](https://briarproject.org/how-it-works/), checked 2026-09
- [Briar: download](https://briarproject.org/download-briar/), checked 2026-09
- [European Commission: messaging interoperability under the DMA](https://digital-markets-act.ec.europa.eu/developer-portal/messaging-interoperability_en), checked 2026-09
- [European Commission: iMessage, Bing, Edge and Microsoft Advertising not designated (13 February 2024)](https://digital-markets-act.ec.europa.eu/commission-closes-market-investigations-microsofts-and-apples-services-under-digital-markets-act-2024-02-13_en), checked 2026-09
- [Data Protection Commission: WhatsApp decision (2 September 2021)](https://www.dataprotection.ie/en/news-media/press-releases/data-protection-commission-announces-decision-whatsapp-inquiry), checked 2026-09
