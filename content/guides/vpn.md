---
title: VPNs: threat models, trust, and jurisdiction
category: Technology
type: curated-guide
status: published
last_updated: 2026-08-15
maintainer: Conscious Consuming
disclosure: We take no money from any VPN provider. Nothing here is sponsored. We rank by public no-logs policies, audits, ownership, jurisdiction, app openness, and usability.
---

# VPNs: threat models, trust, and jurisdiction

A VPN is not a magic invisibility cloak. It moves some trust away from your internet provider, school, workplace, hotel Wi-Fi, or mobile carrier and toward the VPN company. That can be useful, but it means the VPN provider itself has to be worthy of the trust you just moved.

> **The short answer.** Use a VPN for public Wi-Fi, carrier/ISP privacy, regional blocking, or reducing casual network surveillance. Do not buy one because an ad promised total anonymity. Prefer providers with clear no-logs policies, recent independent audits, open-source apps, simple ownership, and business models that do not depend on tracking you. For high-risk anonymity, learn about Tor instead; for everyday privacy, a reputable paid VPN, a well-understood free privacy service, or no VPN at all can each be the right answer depending on the threat.

---

## The data, at a glance

Privacy scores across the live VPN data:

{{chart:vpn:privacy}}

## What to compare

| Axis | What to look for | Why it matters |
| --- | --- | --- |
| No-logs privacy | A specific policy plus recent independent audit evidence | The provider can see traffic metadata your ISP otherwise would |
| Transparency | Public audit summaries, warrant canaries, ownership disclosure, incident history | Trust depends on what outsiders can inspect |
| Open apps | Published client code and standard protocols such as WireGuard or OpenVPN | App code can leak more than the tunnel protects |
| Jurisdiction | Legal home, ownership group, and server architecture | Law matters, but engineering and logs matter more |
| Accessibility | Fair price, clear cancellation, good device support, usable apps | Privacy tools only help if you keep using them |

## Put the VPN in the right layer

A VPN can be useful, but it belongs after the basics it cannot replace. Treat it as one layer in a small privacy stack.

| Layer | First control | Where a VPN fits |
| --- | --- | --- |
| device | updates, screen lock, app permissions | does not fix a compromised endpoint |
| browser | cookie controls, fewer extensions, tracker awareness | can hide your network location, not your browser identity |
| accounts | separate logins and MFA | does not hide you from services you log into |
| network | HTTPS, DNS choices, untrusted Wi-Fi caution | can reduce local network and ISP visibility |
| high-risk anonymity | threat-model guidance and Tor where appropriate | consumer VPN alone is not enough |

This stack keeps the tool in its lane. If the skipped layer is phishing, malware, account identity, or browser tracking, the VPN is not the main fix.

## First decide what problem you are solving

| Problem | VPN helps? | Also check |
| --- | --- | --- |
| Public Wi-Fi snooping | Often | HTTPS, software updates, device lock |
| ISP or carrier profiling | Often | DNS settings, browser privacy, account logins |
| Regional access | Often | Terms, reliability, payment privacy |
| Hiding from websites you log into | No | Browser tracking, cookies, account identity |
| High-risk anonymity | Not enough | Tor, operational security, device hygiene |
| Malware or phishing | Not by itself | Updates, password manager, MFA, safe browsing |

## Fix the leaks a VPN does not fix

| Leak or risk | Better control | Why the VPN cannot solve it alone |
| --- | --- | --- |
| Logged-in websites | Separate accounts, cookie controls, browser hygiene | The site knows you because you logged in |
| Browser fingerprinting | Privacy-focused browser settings, fewer extensions | Network location is only one fingerprint signal |
| Phishing | Password manager, MFA, cautious links | A VPN still delivers the fake page securely |
| Device compromise | Updates, app permissions, malware protection | The tunnel cannot protect a compromised endpoint |
| DNS and app telemetry | Check provider DNS, OS settings, app permissions | Apps may report directly to their own services |
| Payment trail | Privacy-conscious payment options | A subscription can identify you even if traffic is tunneled |

Think of a VPN as a network trust shift, not a privacy force field. It can reduce what local networks, ISPs, carriers, or Wi-Fi operators see. It does not make bad browser habits safe, remove tracking scripts, erase account identity, or replace operational security.

## A VPN decision tree you can defend

Before choosing a provider, write the sentence "I need a VPN because..." and finish it plainly. If the answer is public Wi-Fi, travel, carrier profiling, regional access, or separating home IP from casual browsing, a reputable consumer VPN may fit. If the answer is hiding from websites you log into, stopping phishing, preventing malware, or becoming anonymous against a powerful adversary, the VPN is not the main tool.

| If your main concern is | Choose first |
| --- | --- |
| hotel, cafe, airport, or school Wi-Fi | trustworthy VPN plus HTTPS and updates |
| ISP or mobile-carrier profiling | paid no-logs VPN, DNS hygiene, browser controls |
| censorship or high-risk speech | expert threat-model guidance, Tor where appropriate |
| account privacy from a website | browser isolation, cookies, account choices |
| scams and malicious links | password manager, MFA, safe-browsing habits |

This decision tree also protects your budget. A VPN subscription that does not match the threat can become privacy theater, while the boring fixes you skipped remain unfixed.

## Match provider evidence to your use case

Once a VPN actually fits the problem, evaluate the provider by the evidence your use case needs. A traveler on hotel Wi-Fi, an activist avoiding casual network exposure, and a person trying to reduce ISP profiling do not need the same proof.

| Use case | Evidence that matters most | Weak signal |
| --- | --- | --- |
| public Wi-Fi and travel | reliable apps, modern protocols, leak protection, clear support | scary ads about hackers in cafes |
| ISP or carrier profiling | no-logs policy, recent audit, provider-owned DNS, clean app permissions | "private browsing" language with vague logging terms |
| regional access | usable server locations, clear terms, cancellation path | huge server counts without ownership clarity |
| privacy-first daily use | open-source apps, independent audit, simple ownership, paid or credible funding model | affiliate rankings and mystery parent companies |
| high-risk anonymity | threat-model guidance and Tor where appropriate | consumer VPN marketing that promises invisibility |

This is where a values comparison helps. Privacy, openness, jurisdiction, security, and accessibility pull in different directions; the right answer is the provider whose tradeoff matches your real exposure.

## When no VPN is the better choice

No VPN may be better when a provider is obscure, heavily advertised through affiliate funnels, vague about ownership, unsupported on your devices, or free without a believable funding model. A weak VPN adds another party that can see traffic metadata without meaningfully reducing other risks. In some workplaces, schools, or countries, VPN use may also violate rules or attract attention. The values move is choosing the right layer for the threat, not collecting privacy products.

## Claims to verify

- **"Military-grade encryption."** Almost every VPN can say this. Logging, apps, ownership, and audits are the real questions.
- **"Anonymous forever."** A VPN does not make you anonymous to websites you log into, trackers in your browser, payment records, or the VPN provider itself.
- **Free with no business model.** The FTC warns that some VPN apps are free because they sell ads or share information with third parties.
- **Server-count theater.** More countries is not the same as better privacy.
- **Affiliate rankings.** Many VPN review pages are paid referral funnels. Treat dramatic top-ten lists carefully.
- **No-logs without evidence.** A privacy policy is a promise; audits, court-tested claims, and architecture make the promise more inspectable.
- **One-click security bundles.** Antivirus, password, cloud, identity monitoring, and VPN features can be useful, but bundling can blur what each tool actually does.
- **Threat-model inflation.** Ads often sell everyone the same fear. Your real need may be public Wi-Fi, streaming, work travel, censorship resistance, or no VPN.
- **Mystery ownership.** A privacy provider should not make you dig through shell companies to understand who receives your trust.

## A practical default

If you want simple everyday privacy, choose a provider with recent no-logs audit evidence, clear ownership, and apps you can understand. Mullvad, IVPN, Proton VPN, and similar privacy-first services are the kind of shape to look for: specific logging claims, published audits, and less dependence on tracking-based marketing. If you mostly need a VPN for public Wi-Fi, make sure your browser uses HTTPS and keep your OS updated; the VPN is only one layer. If your real concern is government-level anonymity, a normal consumer VPN is the wrong tool.

## A VPN due-diligence checklist

Before paying, find the logging policy, audit date, ownership, jurisdiction, protocol support, app source-code status, cancellation path, payment options, and incident history. Then search for the provider plus "acquired", "breach", "audit", "logs", and "warrant". The goal is not to find a perfect company. It is to avoid handing all your network trust to a mystery brand with a louder ad budget than a privacy practice.

## Configure it, then test the boring parts

After choosing a provider, check the settings that decide whether the subscription helps in real life: auto-connect on untrusted Wi-Fi, kill switch if you need it, DNS leak protection, app permissions, update cadence, and whether the VPN starts before sensitive apps sync. Also test turning it off. If maps, banking, work tools, or school networks break constantly, you may stop using the VPN entirely. The best privacy default is the one that survives ordinary Tuesday.

Useful anchors: the FTC on [shopping for a VPN app](https://www.ftc.gov/business-guidance/blog/2018/02/market-vpn-app), CISA's [mobile communications best practices](https://www.cisa.gov/sites/default/files/2024-12/joint-guidance-mobile-communications-best-practices_v2.pdf), EFF's [Surveillance Self-Defense](https://ssd.eff.org/), Mullvad's [no-logging policy](https://mullvad.net/en/help/no-logging-data-policy), Proton VPN's [no-logs information](https://protonvpn.com/support/no-logs-vpn), WireGuard's [protocol site](https://www.wireguard.com/), and the Tor Project's [Tor Browser manual](https://tb-manual.torproject.org/).

---

*Compare VPNs on privacy, transparency, openness, jurisdiction and accessibility in the [VPN explorer](#explore/vpn).*
