# Phase 2 provenance-domain baseline - 2026-07-15

## Decision

Does CC count independently controlled source domains rather than treating one publisher's subdomains as corroboration?

## Method

The read-only baseline extracted every provenance URL from the 24,621 generated entries, then compared the current hostname count with registrable domains resolved against the official Public Suffix List snapshot retrieved on 2026-07-15. The snapshot SHA-256 is `cb2dc2164bf1a062a528cf335d02271fa493113cbae32de26092eb93e55bedd8` and includes the PSL private-domain section.

Official source: https://publicsuffix.org/list/public_suffix_list.dat

## Frozen baseline

| Measure | Hostname contract | Registrable-domain contract |
| --- | ---: | ---: |
| Generated entries | 24,621 | 24,621 |
| Unique normalized source hostnames observed | 3,153 | n/a |
| Entries presented as multi-source | 5,857 | 1,227 |
| Entries whose raw source hostnames collapse | 4,845 | 0 after correction |
| Raw hostname slots collapsed | 4,918 | 0 after correction |

The current generator therefore overstates source independence for most entries labeled multi-source. The problem is not cosmetic: `sourceDomainCount` drives the live corroboration indicator and Trust Lens.

## Representative failures

- `support.apple.com`, `security.apple.com`, and `apple.com` currently count as three; the registrable-domain key is one: `apple.com`.
- `prices.openfoodfacts.org` and `world.openfoodfacts.org` currently count as two; the key is one: `openfoodfacts.org`.
- `docs.aws.amazon.com` and `aws.amazon.com` currently count as two; the key is one: `amazon.com`.
- Private suffixes must remain precise: `alice.github.io` and `bob.github.io` are distinct registrable domains under the PSL private section.
- Multi-label public suffixes must remain precise: `bbc.co.uk` resolves to `bbc.co.uk`, not `co.uk`.

## Acceptance boundary

1. Normal builds stay local and deterministic; they never fetch the PSL.
2. Exact, wildcard, exception, and relevant private suffix rules are represented in a tracked contract.
3. Unknown suffixes fall back conservatively so sibling subdomains cannot inflate corroboration.
4. Python generation and Node auditing must produce identical fixture results.
5. Distinct registrable domains remain only a proxy; they do not prove editorial or financial independence.
