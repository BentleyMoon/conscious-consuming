---
title: Self-hosting platforms: licensing, maintenance, and control
category: Technology
type: curated-guide
status: published
last_updated: 2026-08-15
maintainer: Conscious Consuming
disclosure: We take no money from any hosting company, hardware maker or software project. Nothing here is sponsored. Every licence claim below was read in the project's own repository rather than on its marketing page, because the two often disagree.
---

# Self-hosting platforms: licensing, maintenance, and control

Most of the software you rely on runs on a machine somebody else owns, under terms you agreed to once and have not read since. Self-hosting is the other arrangement: the files, the photos, the notes and the backups sit on a computer in your house, and the company selling you a subscription is out of the loop.

The question that decides whether that is a good idea for you is not which platform has the nicest dashboard. It is how much of the work you are willing to own, and what happens to your data on the day you stop.

> **The short answer.** If you want the fewest moving parts, buy a Synology and accept that leaving later means copying your data off rather than moving your drives. If you want software that will still be yours in ten years, Proxmox VE and YunoHost are AGPL and the licence file says so. If you want somebody else to run open software for you, a paid host like PikaPods or a volunteer collective like Disroot gives you most of the independence and none of the three-in-the-morning maintenance. And if none of that appeals, renting from a large provider is a real answer, as long as you have checked that you can get your data out.

---

{{chart:self-hosting-platforms:openness}}

## Open source is a spectrum here, and the middle of it is crowded

Almost everything in this category calls itself open. Read the licence file and four different arrangements appear, with real consequences.

| What the licence says | What it means for you | Examples in the explorer |
| --- | --- | --- |
| AGPL or GPL | Anyone may run, modify and redistribute it, and modifications shipped to others must stay open | Proxmox VE, YunoHost, OpenMediaVault, Runtipi |
| Permissive (Apache, zlib) | Same freedoms, without the requirement to share changes back | CasaOS, Portainer Community Edition |
| Source available with conditions | You can read and modify the code, but not sell it or a service built on it | Umbrel (PolyForm Noncommercial), Cosmos Cloud (Apache with Commons Clause), Cloudron |
| Proprietary | You buy a licence or a device; the source is not yours to inspect | Unraid, Synology DSM |

The middle row is where the marketing is loosest. Umbrel's README is candid about it: you are free to use and modify umbrelOS for personal and nonprofit use, and commercial use needs a separate agreement. Cosmos Server says the same thing in different words, free to fork and redistribute but you are not allowed to sell it or a service based on it. Both are reasonable positions for a small project to take. Neither is what most people mean by open source, and a project that describes itself that way while shipping a licence with a sales restriction has told you something about how it will behave later.

TrueNAS SCALE deserves its own line. Its end user agreement says the software is made available as open source software, and then says it also includes proprietary extensions available under additional licences. Both sentences are in the same document.

## The install is a one-day problem. The exit is a ten-year problem.

Every platform here will take an afternoon or a weekend. What differs is what happens when you want to stop.

The clearest case is Synology, and it is worth reading their own words. Synology's migration page says drive migration only works with compatible Synology models or a refreshed version of the same model. Their Migration Assistant copies your data to a new Synology device. So the array you build is portable to their next box and nowhere else. That is not a hidden trap; it is documented, and for many people the convenience is worth it. It is simply a different deal from the one Unraid describes, where array disks default to XFS with EXT4, ZFS and BTRFS also selectable, and Linux systems read those file systems natively.

TrueNAS documents importing a ZFS pool created on another system entirely. That is the strongest exit story in the category, and it is the reason people who have been burned once tend to end up on ZFS.

If you are renting instead, check the same thing. Google's own Takeout page says you can export mail, documents, calendar, photos and account activity, and warns that downloading an archive does not delete it from Google's servers, and that the download link expires after about a week and five downloads. An export you have to notice, request and catch inside seven days is an exit, but a narrow one.

## Security practice is visible before you install

A self-hosted server is a machine on the internet with your files on it. Before choosing, look at how the project handles the bad day.

| Project | What it publishes |
| --- | --- |
| Proxmox VE | A security address, receipt confirmed within one Austrian business day, advisories posted publicly |
| OpenMediaVault | A named security contact, a request to hold disclosure until a fix ships, and a written out-of-scope list |
| TrueNAS SCALE | A dedicated advisories site rating each vulnerability's impact, with email and ticket routes in |
| Synology DSM | Dated, rated advisories, and a stated policy of not announcing a vulnerability before a fix exists |
| Umbrel, Runtipi, Cosmos Cloud | No SECURITY.md; reports go through GitHub's generic private advisory form |

A missing security policy does not mean a project is careless. It usually means it is small. But it tells you what to expect when something goes wrong, and you should know that before your family photos are on it.

## Match the hardware you already have

The hardware floor varies more than the feature lists suggest.

| Platform | What it asks for |
| --- | --- |
| YunoHost | An old desktop or laptop, any x86 machine, a Raspberry Pi, an ARM board, or a rented server |
| CasaOS | Debian 12, Ubuntu Server 20.04 or Raspberry Pi OS; runs on ZimaBoard, Intel NUC, Raspberry Pi |
| Unraid | Nearly any 64-bit x86_64 system, booted from a USB flash drive |
| Runtipi | A 64-bit Linux server or Raspberry Pi, 4 GB RAM, 10 GB free disk |
| TrueNAS SCALE | x86_64, 8 GB memory, a 20 GB SSD boot device, two matched drives for a pool |
| Proxmox VE | 1 GB RAM plus more per guest, and the docs say that minimum is for evaluation only |
| CapRover | 1 GB RAM recommended because builds are memory-hungry, about $5 a month on a VPS |

Portainer is a different kind of thing and it catches people out. It manages Docker, Swarm, Kubernetes and ACI environments, which means it assumes you already have a container runtime running. It is a control panel, not a starting point.

## The routes that are not a platform at all

Two options in the explorer involve no server administration and still leave your data yours.

**Paid hosting of open software.** PikaPods runs open-source applications for you from $1.80 a month, scaling with the resources a pod uses. Their own page says you can download your data any time over SFTP and move to another host. You are paying somebody to do the sysadmin, and the software underneath is still software anyone can run.

**A community server.** Disroot runs about a dozen services on entirely free and open source software, including Nextcloud storage, CryptPad and XMPP messaging. Their donation page says it is run by volunteers and offers all services free of charge, funded by donations, and publishes a running monthly total. There is no company, so there is nobody to be acquired.

Both are worth considering before you buy hardware. The reason most self-hosting projects fail is not the install; it is month seven, when a disk fills up on a Tuesday.

## A short audit before you commit

1. **Open the LICENSE file in the repository.** Not the marketing page. If it names PolyForm, Commons Clause, or an appendix about paid features, you are in the source-available middle, which may be fine but is worth knowing.
2. **Find the project's SECURITY.md.** If there is not one, decide whether you are comfortable being the person who notices the problem.
3. **Read the migration page before the install page.** Ask specifically what happens to a populated array on hardware that is not theirs.
4. **Count the drives, not the features.** TrueNAS wants two matched drives to make a pool. That is a purchase, not a setting.
5. **Decide who gets woken up.** If the answer is nobody, choose managed hosting or a community server and stop reading comparison tables.
6. **Test the restore, not the backup.** A backup nobody has restored from is a belief, not a file.

## What this guide will not tell you

It will not tell you that self-hosting is cheaper. Sometimes it is: Google One is $9.99 a month for 2 TB, indefinitely, against a one-time hardware cost. Sometimes it is not: Umbrel's own Umbrel Home starts at $549, and Unraid's licences run $49 to $249 one-time. Whether that pays back depends on how long the hardware lasts and what your time is worth.

It will also not tell you that running your own server makes you more private in every respect. It moves the trust rather than removing it: from a company's policies to your own patching, your own backups and your own physical security. That is a trade many people want. It is still a trade.
