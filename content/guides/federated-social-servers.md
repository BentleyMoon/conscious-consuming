---
title: Federated social servers: operators, rules, and portability
category: Technology
type: curated-guide
status: published
last_updated: 2026-08-15
maintainer: Conscious Consuming
disclosure: We take no money from any social platform or hosting company. Nothing here is sponsored. Licence claims were read in each project's own repository, and the enforcement facts come from the European Commission's own decision rather than from news coverage of it.
---

# Federated social servers: operators, rules, and portability

On a federated network, the software is open and the servers are independent. Your account lives on one of them, and it can talk to all the others. The company that wrote the software cannot close your account, because it does not hold it.

That solves one problem and creates a smaller one. Somebody still runs the server your account is on, and finding out who they are, how they are funded and what happens if they get bored is now your job rather than a regulator's.

> **The short answer.** If you just want an account, join a server whose operator publishes who they are: Fosstodon is a registered nonprofit with a three-member board and a written dissolution clause, and mastodon.social is run by Mastodon GmbH under EU law. If you want to run a server for yourself or a few friends, GoToSocial needs about 250 to 350 MB of RAM and runs on an old laptop, where Mastodon wants Ruby, PostgreSQL, Redis, Node and FFmpeg. If you want somebody else to run it, masto.host starts at $6 a month and lets you migrate out. And before you move, know that account migration carries your followers but not your posts.

---

{{chart:federated-social-servers:openness}}

## The software is the easy part

Every piece of federated software in the explorer is AGPL. That is a genuinely unusual level of agreement, and it means the licence is not the thing that distinguishes them.

| Software | Licence | What it is for |
| --- | --- | --- |
| Mastodon | AGPL v3 | General microblogging, the largest network |
| GoToSocial | AGPL v3 | Microblogging on very small hardware |
| Pleroma | AGPL-3 | Microblogging, built on Elixir |
| Akkoma | AGPLv3 | A Pleroma-compatible fork, ships the Mastodon frontend too |
| Misskey | AGPL-3.0 | Microblogging with a different interface tradition |
| Pixelfed | AGPL | Photos, without algorithmic ordering |
| PeerTube | AGPL-3.0 | Video, as an alternative to centralised platforms |
| Friendica | AGPL-3.0 | Links across Mastodon, Lemmy, Diaspora and corporate services |

AGPL matters more here than in most categories, because these are network services. GoToSocial's README spells out the consequence: anyone running a modified version over a network has to offer its users the corresponding source. A server operator cannot quietly fork the software and keep the changes to themselves.

## What a server costs to run

If you are considering running your own, the hardware requirement is the first real filter, and the range is wide.

| Software | What it asks for |
| --- | --- |
| GoToSocial | About 250 to 350 MB of RAM and very little CPU; the README names single-board computers, old laptops and $5 a month servers |
| Pleroma | Low-power devices including a Raspberry Pi, scaling up on better hardware |
| Mastodon | Ruby 3.3+, PostgreSQL 14+, Redis 7.0+, Node.js 22+ and FFmpeg 5.1+ |
| PeerTube | 1 vCore, 1.5 GB RAM and 20 Mbit/s upload for a small instance; 4 vCore, 4 GB and 1 Gbit/s for around 1,000 concurrent viewers |

PeerTube's figures are worth pausing on, because video is the case where self-hosting costs real money. Their FAQ adds that transcoding on the same machine pushes the requirement to 8 vCore and 8 GB. A video server is a bandwidth bill, and anyone planning one should price the upload link before the software.

## Who runs the server is a separate question from who wrote the software

This is where the category actually differs, and where most advice stops short.

**Fosstodon** publishes the strongest answer in the explorer. Its foundation announcement says it is a legally recognised nonprofit with a three-member board, formed so the community stays independent and aligned with its original mission rather than subject to corporate ownership, funded by donations and grants. The same announcement says the board prepares annual financial statements, and that if the foundation ever dissolves its funds go to other open-source projects rather than to any individual. That last clause is the one to look for anywhere. It tells you what happens to the money when the project ends.

**mastodon.social** is run by Mastodon GmbH, a German company subject to the EU Digital Services Act. Its about page records something worth knowing: the project's earlier non-profit gGmbH status was lost when Germany removed software projects from eligibility. That is a real constraint imposed from outside, disclosed rather than hidden.

**masto.host** is the case that shows why this axis exists. Its pricing page describes plans and support in detail, from $6 a month up to $89, and states clearly that it only runs stock Mastodon with no custom forks. It also says you can migrate in and out whenever you like, with guides for both directions and daily backups to remote storage. What it does not say anywhere is who operates it. The only ownership statement on the page is a disclaimer that the service is not affiliated with Mastodon GmbH. The exit is excellent and the operator is anonymous, and those are two different things a reader should weigh separately.

## Moving is possible, and it is not free

Before you pick a server, understand what a move costs, because you will probably make one.

Mastodon's own documentation is direct about it. Account migration moves your followers to a new server. Your posts will not be moved, due to technical limitations. Media cannot be imported automatically. And there is a thirty-day cooldown before you can migrate again.

So the thing that survives a move is your audience, and the thing that does not is your archive. If your posts matter to you, export them yourself and keep the file. If your followers matter more, migration works and the network is genuinely better than a closed platform on this point, where leaving means starting from zero.

## The comparison with what most people use

Two mainstream platforms are in the explorer because a comparison only among federated software would be a comparison among people who already agree.

**X** is free to download and enormously easier to join than any server here. Its transparency and openness scores rest on a single institutional record: the European Commission fined X 120 million euros under the Digital Services Act, citing a blue checkmark verified-account design the Commission found deceptive, an advertising repository that does not meet the DSA's transparency requirements, and a failure to provide researchers access to public data. That last violation is the direct opposite of what an ActivityPub server does by design, where the protocol and the data are open to anyone who implements it.

**Threads** federates, partially. Meta's engineering blog says users aged 18 or over with public profiles can choose to federate their profiles over ActivityPub so posts appear on other servers. The feature is opt-in, and fediverse likes and replies do not yet come back. It is a real bridge and a one-way one, and worth understanding as such rather than as either a betrayal or a victory.

## Choosing, in six steps

1. **Decide whether you are joining or hosting.** These are different decisions with different costs, and most people only need the first.
2. **If joining, read the server's about page before the timeline.** Look for a named operator, a legal form, and a statement about funding.
3. **Look for the dissolution clause.** Any server that has thought about ending well has thought about running well.
4. **Check the moderation rules while you are calm.** They are the terms you will care about later.
5. **If hosting, match the software to the hardware you have,** not the software with the best-known name. GoToSocial on an old laptop is a working server; Mastodon on the same laptop is a bad afternoon.
6. **Export your posts now, and again in a year.** Migration will carry your followers. It will not carry your archive.

## What this guide will not tell you

It will not tell you that federated networks are more pleasant. Moderation quality varies by server and the variance is the point of the design. Some servers are better moderated than any large platform, and some are worse, and you choose which by choosing where you sign up.

It also will not tell you that the network is beyond commercial pressure. Mastodon GmbH is a company. masto.host is a business whose owner is not named. What the architecture guarantees is narrower and still valuable: no single operator can lock the network, and the licence means any of them can be replaced by anyone willing to run the software.
