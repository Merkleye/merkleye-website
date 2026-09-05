# Merkleye performance claims — measured

Generated 2026-09-03T02:34:38Z by `make perf` (`internal/perf`). Every row is produced by
driving a complete, standalone Merkleye instance — real config loader, real
store, real matcher, real pipeline, real notification sender over a real HTTP
webhook, real certspotter hook listener — through its own wire protocol.

## Environment

| | |
|---|---|
| Go | go1.27.0 |
| Platform | darwin/arm64, 14 CPU |
| Race detector | off |
| Store | sqlite (in-memory, modernc.org/sqlite, ent schema) |
| Variant source | dnstwist 20250130 (real generator, via python3) |
| Revision | `aee76e7-dirty` |

## Verdicts

14 claims: 10 PASS, 4 QUALIFIED, 0 FAIL, 0 NOT RUN.

| Claim | Website says | Measured | Verdict |
|---|---|---|---|
| **C-01** Firehose throughput | Every certificate on the stream reaches the matcher: 20–30M CT log entries a day, with no upstream watchlist to outgrow. | 809,874 certificates/s on one core against a 115,461-name watch set — 2332× the 30M/day the site claims | QUALIFIED |
| **C-02** Watch-set scale | 20 real domains through dnstwist becomes roughly 100,000 lookalike variants, and all of them are watched on every certificate. | 115,438 variants from 23 domains (115,317 matchable), snapshot built in 2ms using 6.06 MB | QUALIFIED |
| **C-03** Watch-set size does not cost lookup time | Testing every certificate against six figures of variants is architecturally tractable, not a rate-limit problem. | 100× more variants cost 1.07× the lookup time (449ns → 480ns per SAN) | PASS |
| **C-04** Observation-to-alert latency | A finding reaches Slack and the webhook 0.4s after the certificate is observed. | p50 350µs, p99 580µs, max 740µs from hook POST to webhook delivery — the claim is 400ms | PASS |
| **C-05** Zero third-party egress | No third party sees your domain list: nothing about the watch set leaves the instance. | 0 outbound connections to anything but loopback across the whole suite under the shipped configuration, with 8 egress-capable packages all accounted for — enabling SSLMate backfill sends 23 watched domains to api.certspotter.com in 23 requests | QUALIFIED |
| **C-06** Sweep cost: firehose vs query-per-domain | Sweeping the watch set costs a query-per-domain model 100,000 API requests. Merkleye does not query at all — one continuous log stream. | one full sweep of 115,461 watched names cost 0 outbound requests, against 115,461 for a query-per-domain model | PASS |
| **C-07** Storage tracks hit rate, not issuance volume | Only matches are persisted, so the storage footprint tracks your hit rate rather than global CT issuance. | 0 match rows and 0 alerts for 2,000 non-matching certificates — but each still costs 1,065 bytes of certificate/observation storage once it reaches the pipeline | QUALIFIED |
| **C-08** Per-certificate processing, no batch schedule | Every certificate is tested as it is observed, not on a batch schedule, so detection latency is bounded by CT log propagation rather than a poll interval. | a single certificate arriving alone alerts in 760µs, against a burst p99 of 1ms — no accumulation window | PASS |
| **C-09** Substring issuer matching survives CA rotation | Expected-issuer policy is a case-insensitive substring match on issuer DN/O, because exact matching would page you on every intermediate rotation. | 0 false criticals over 138 legitimate renewals; exact-DN matching would have raised 138 | PASS |
| **C-10** sha256(DER) dedup, never the serial | Dedup keys on sha256 of the DER, never the certificate serial, because serials collide across CAs and would under-count real issuances. | 1,000 certificates with 50% colliding serials stored without a single false merge; one issuance seen in 6 logs produced 1 alert | PASS |
| **C-11** A-label normalization catches IDN homoglyphs | Names normalize to punycode/A-label before comparison, matching how SANs are encoded on the wire; comparing Unicode against them matches nothing and fails silently. | 100.0% of 108,386 IDN homoglyph lookalikes detected as they appear on the wire; 0.0% with Unicode watch keys | PASS |
| **C-12** PSL reduction catches subdomain phishing | Variant lookups reduce through the Public Suffix List to eTLD+1 first, so login.secure-paypaI.com still resolves back to the watched variant. | 100.0% of 9,985 subdomain-hosted lookalike certificates detected (0.0% without PSL reduction), including 3/3 multi-label public suffixes | PASS |
| **C-13** Scoring is additive and explainable | Risk scoring is a documented additive rule set, not a black-box model: every score is explainable back to the signals that produced it. | 100.0% of 2,000 persisted findings reproduce their score exactly from their stored components | PASS |
| **C-14** Cold start | Self-hosting is a five-minute job. | config file to serving the observation hook in 3.683s with a 115,461-name watch set (6ms with none) | PASS |

## C-01 — Firehose throughput

**Claim.** Every certificate on the stream reaches the matcher: 20–30M CT log entries a day, with no upstream watchlist to outgrow.

**Source.** `src/components/Hero.astro`, `src/components/Firehose.astro`, `src/components/Pillars.astro`

**Threshold.** sustained match-stage throughput ≥ 30,000,000 certificates/day (347/s) against a 100k-variant watch set, single core, plus a live tail of a real certstream-server-rust confirming the stream is unfiltered and the matcher keeps ahead of its arrival rate

**Verdict.** QUALIFIED — 809,874 certificates/s on one core against a 115,461-name watch set — 2332× the 30M/day the site claims

| Metric | Value | Unit | Note |
|---|---:|---|---|
| match_stage_single_core | 809,874 | certificates/s |  |
| match_stage_single_core_sans | 2,166,195 | SANs/s |  |
| match_stage_single_core_extrapolated | 69,973,135,702 | certificates/day | 2332× the 30M/day claim |
| match_stage_all_cores | 274,189,243,194 | certificates/day | 14 cores |
| firehose_requirement | 30,000,000 | certificates/day | the claim: 347 certificates/s sustained |
| full_instance_hook_to_persist | 18,635 | observations/s | sqlite (in-memory, modernc.org/sqlite, ent schema), every observation persisted |
| full_instance_extrapolated | 1,610,034,140 | observations/day |  |
| certstream_live_feed_measured | 0 | bool | no certstream-server-rust was reachable: docker run ghcr.io/reloading01/certstream-server-rust:1.5.6: exit status 1: failed to connect to the docker API at unix:///Users/wesley/.docker/run/docker.sock; check if the path is correct and if the daemon is running: dial unix /Users/wesley/.docker/run/docker.sock: connect: no such file or directory |

> Two firehose plugins ship, and the claim is about the harder one. certstream subscribes to the full, unfiltered stream and every certificate on it reaches match.Match, so watch-set size is Merkleye's problem rather than an upstream tool's. certspotter is the lighter path: the sidecar holds the log connections and pre-filters against a watchlist file, so the instance only ever sees hits.

> Under the certspotter path only watchlist hits are posted to the instance, so the full-instance number is a ceiling there; on certstream it is the working rate, because nothing is filtered upstream.

> Single-core headroom over the 30M/day claim is 2332×; the claim needs 347 certificates/s and one core delivered 809,874.

> The unfiltered-stream half of this claim was not exercised on this run: docker run ghcr.io/reloading01/certstream-server-rust:1.5.6: exit status 1: failed to connect to the docker API at unix:///Users/wesley/.docker/run/docker.sock; check if the path is correct and if the daemon is running: dial unix /Users/wesley/.docker/run/docker.sock: connect: no such file or directory. Set MERKLEYE_PERF_CERTSTREAM_URL to a running certstream-server-rust, or leave docker available, to measure it.

## C-02 — Watch-set scale

**Claim.** 20 real domains through dnstwist becomes roughly 100,000 lookalike variants, and all of them are watched on every certificate.

**Source.** `src/components/Hero.astro`, `src/components/Firehose.astro`

**Threshold.** ≥ 100,000 variants generated from 20 domains under the shipped default config, every one of them matchable in the built snapshot

**Verdict.** QUALIFIED — 115,438 variants from 23 domains (115,317 matchable), snapshot built in 2ms using 6.06 MB

| Metric | Value | Unit | Note |
|---|---:|---|---|
| variants_generated | 115,438 | names |  |
| variants_per_domain_mean | 5,019 | names |  |
| variants_per_domain_min | 1,542 | names |  |
| variants_per_domain_max | 19,299 | names |  |
| variants_matchable | 115,317 | names | probed through the live matcher, apex and subdomain |
| variants_unmatchable | 121 | names |  |
| generation_time | 3.66 | s |  |
| snapshot_build_time | 1 | ms |  |
| snapshot_heap | 6.06 | MB |  |
| snapshot_heap_per_variant | 55.08 | bytes/name |  |
| snapshot_watched | 23 | domains |  |
| snapshot_variants | 115,438 | variants |  |
| snapshot_allowlisted | 23 | names | watched domains are auto-allowlisted so your own defensive registrations stay quiet |
| certspotter_watchlist_lines | 115,461 | lines |  |
| certspotter_watchlist_size | 2.82 | MB |  |

> Per-domain spread: min 1542, median 3731, max 19299 — the website's "~5,000 each" is a mean over domains of very different lengths, since the homoglyph fuzzer's output grows with label length.

> Breakdown by fuzzer: homoglyph 109504, insertion 1841, replacement 936, addition 936, bitsquatting 902, tld-swap 322, omission 191, hyphenation 171, transposition 164, vowel-swap 147, subdomain 145, repetition 101, plural 50, various 23, cyrillic 5.

> 121 of 115,438 generated variants (0.10%) are on the watchlist but cannot produce a match: subdomain 121 (e.g. ex.ample.com). These are names whose own registrable domain (eTLD+1) is something else, so the variant lookup reduces past them — dnstwist's subdomain fuzzer inserts a dot, and match.Snapshot keys variants by eTLD+1. certspotter would fire the hook for such a certificate and the pipeline would store it without classifying it as a lookalike hit.

## C-03 — Watch-set size does not cost lookup time

**Claim.** Testing every certificate against six figures of variants is architecturally tractable, not a rate-limit problem.

**Source.** `src/components/Firehose.astro`

**Threshold.** per-SAN match latency at 100k variants ≤ 1.5× the latency at 1k variants (flat, not proportional to watch-set size)

**Verdict.** PASS — 100× more variants cost 1.07× the lookup time (449ns → 480ns per SAN)

| Metric | Value | Unit | Note |
|---|---:|---|---|
| per_san_at_1k_variants | 449.02 | ns |  |
| per_san_at_10k_variants | 438.05 | ns |  |
| per_san_at_full_watch_set | 480.24 | ns | 100,000 variants |
| cost_ratio_full_over_1k | 1.07 | × | 1.0 would be perfectly flat; the threshold is 1.5 |
| snapshot_build_1k | 18 | µs |  |
| snapshot_build_full | 1,520 | µs |  |

> Two hash lookups per SAN (exact-suffix walk, then eTLD+1 in the variant map), neither of which iterates the watch set — which is why a 100× larger set does not cost 100× the time.

## C-04 — Observation-to-alert latency

**Claim.** A finding reaches Slack and the webhook 0.4s after the certificate is observed.

**Source.** `src/components/Hero.astro`, `src/components/Pillars.astro`

**Threshold.** p99 ≤ 400ms from POST /internal/v1/observations to webhook delivery, through the full pipeline and a real notification sender

**Verdict.** PASS — p50 350µs, p99 580µs, max 740µs from hook POST to webhook delivery — the claim is 400ms

| Metric | Value | Unit | Note |
|---|---:|---|---|
| p50 | 0.3529 | ms |  |
| p95 | 0.4114 | ms |  |
| p99 | 0.5819 | ms |  |
| max | 0.7438 | ms |  |
| samples | 300 | alerts | rate limit raised to 6000/min so the limiter is not what is measured |
| shipped_defaults_p50 | 0.3508 | ms | rate limit 10/min, burst 30 — the shipped config |
| shipped_defaults_p95 | 0.5220 | ms |  |
| shipped_defaults_p99 | 0.8655 | ms |  |
| shipped_defaults_max | 0.8655 | ms |  |
| claim_budget | 400 | ms |  |
| headroom_at_p99 | 687.43 | × |  |

> This is the instance's own contribution. End-to-end detection latency also includes the CA submitting to a log, the log's merge delay and certspotter's tailing — none of which Merkleye controls, and none of which are in this number.

> Beyond burst 30 the shipped rate limit (10/min) stops delivering immediately and queues to the outbox instead, where redelivery is on the drain interval rather than in the 0.4s envelope. That is the alert-fatigue guard working as designed, not a latency regression — it is why the headline number is measured at a raised limit, with the shipped-default run (30 samples) reported beside it.

## C-05 — Zero third-party egress

**Claim.** No third party sees your domain list: nothing about the watch set leaves the instance.

**Source.** `src/components/Hero.astro`, `src/components/Pillars.astro`

**Threshold.** 0 outbound connections to any non-loopback host during a full ingest→alert workload, and every egress-capable package in the tree accounted for as opt-in and off by default

**Verdict.** QUALIFIED — 0 outbound connections to anything but loopback across the whole suite under the shipped configuration, with 8 egress-capable packages all accounted for — enabling SSLMate backfill sends 23 watched domains to api.certspotter.com in 23 requests

| Metric | Value | Unit | Note |
|---|---:|---|---|
| external_connections_default_config | 0 | connections | HTTP requests + resolver dials to non-loopback hosts, under the configuration Merkleye ships |
| sslmate_backfill_requests_if_enabled | 23 | requests | what one backfill sweep sends to api.certspotter.com once ingest.sslmate_backfill.enabled is true |
| sslmate_backfill_names_disclosed_if_enabled | 23 | names | watched domains named in those requests — the watch set, one domain per request |
| egress_capable_packages | 8 | packages |  |
| unlisted_egress_packages | 0 | packages | a non-zero value fails this claim |
| example_sslmate_backfill_enabled | 0 | bool | the one integration that would show a third party your domain list |
| example_certstream_enabled | 0 | bool |  |
| example_otel_enabled | 0 | bool |  |
| watch_set_names_held_locally | 115,461 | names | in-process snapshot plus the watchlist file the local sidecar reads |

> The watch set reaches certspotter through a file on a shared volume, not over a network: certspotter.WriteWatchlist renders it locally and the sidecar reads it. Nothing in the ingest path transmits it.

> Paths that could carry watch-set names, all opt-in and all named in config.yaml: internal/api → the system resolver, through internal/dnsprovider (GET /api/v1/domains/{id}/dns-provider, default on demand); internal/dnsprovider → the system resolver (GET /api/v1/domains/{id}/dns-provider, default on demand); internal/ingest/sslmate → api.certspotter.com (SSLMate) (ingest.sslmate_backfill.enabled, default off); internal/notify → the notification channels in your config (notifications.channels, default whatever you configure); internal/variants → the dnstwist sidecar named by variants.generator_url (variants.generator_url, default a sidecar in your own compose file).

> The source audit covers first-party code. A dependency that dials on Merkleye's behalf — nikoksr/notify's Slack, Discord and SMTP senders — does not appear in it, which is why the runtime recorder is the other half of this measurement rather than a redundant one.

> Scope: this instruments what a Go process does through the standard library. The certspotter sidecar is a separate process and does talk to CT logs — it fetches log entries, it does not upload the watchlist, and its filtering happens locally against the file above.

## C-06 — Sweep cost: firehose vs query-per-domain

**Claim.** Sweeping the watch set costs a query-per-domain model 100,000 API requests. Merkleye does not query at all — one continuous log stream.

**Source.** `src/components/Firehose.astro`

**Threshold.** 0 outbound requests to sweep the full watch set once, against 1 request per watched name for the query-per-domain model

**Verdict.** PASS — one full sweep of 115,461 watched names cost 0 outbound requests, against 115,461 for a query-per-domain model

| Metric | Value | Unit | Note |
|---|---:|---|---|
| firehose_requests_per_sweep | 0 | requests |  |
| query_per_domain_requests_per_sweep | 115,461 | requests |  |
| names_swept | 115,340 | names |  |
| sweep_time | 88 | ms |  |
| website_figure | 100,000 | requests | the site's round number for the same comparison |

> The website's panel reads 100,000 vs 1. The 1 is one continuous log stream, held by the certspotter sidecar; the backend itself makes no request at all, which is what this measures.

> A sweep is not a thing Merkleye does. Certificates arrive and are tested as they arrive — the sweep here is a synthetic full pass over the watch set purely to price the comparison.

## C-07 — Storage tracks hit rate, not issuance volume

**Claim.** Only matches are persisted, so the storage footprint tracks your hit rate rather than global CT issuance.

**Source.** `src/components/Firehose.astro`

**Threshold.** under the shipped certspotter configuration nothing is stored for a certificate that does not match; rows and bytes measured for a matching and a non-matching observation on both ingest paths

**Verdict.** QUALIFIED — 0 match rows and 0 alerts for 2,000 non-matching certificates — but each still costs 1,065 bytes of certificate/observation storage once it reaches the pipeline

| Metric | Value | Unit | Note |
|---|---:|---|---|
| non_matching_match_rows | 0 | rows | the claim, and it holds |
| non_matching_certificate_rows | 2,000 | rows | persisted before matching, by pipeline.process |
| non_matching_observation_rows | 2,000 | rows |  |
| non_matching_bytes_each | 1,065 | bytes |  |
| matching_certificate_rows | 2,000 | rows |  |
| matching_match_rows | 2,000 | rows |  |
| matching_bytes_each | 1,935 | bytes |  |
| watchlist_forwards_only_watch_set | 1 | bool | every watchlist line is a watch-set name, so the sidecar posts only hits |
| cost_if_every_ct_entry_were_forwarded | 29.75 | GB/day | 30M entries/day × measured per-observation cost — the storage the sidecar's pre-filter avoids |

> QUALIFIED rather than PASS: "only matches are persisted" is true of the shipped deployment, where certspotter filters against the watchlist before the hook fires, and false of the pipeline on its own. pipeline.process calls UpsertCertificate and RecordObservation before MatchAll, so anything that does reach the backend is stored whether it matches or not.

> That difference is worth 29.75 GB/day if an unfiltered feed is ever wired in — which is what ingest.certstream would be, and it is currently unimplemented (internal/ingest/certstream, TODO(phase-6)). The claim should be read as being about the certspotter deployment.

> Match rows, the part the claim is really about, track hits exactly: 0 for the non-matching batch, 2000 for the matching one.

## C-08 — Per-certificate processing, no batch schedule

**Claim.** Every certificate is tested as it is observed, not on a batch schedule, so detection latency is bounded by CT log propagation rather than a poll interval.

**Source.** `src/components/Pillars.astro`

**Threshold.** a single certificate arriving alone is alerted within the same latency envelope as one arriving in a burst — no accumulation window, no scheduled sweep

**Verdict.** PASS — a single certificate arriving alone alerts in 760µs, against a burst p99 of 1ms — no accumulation window

| Metric | Value | Unit | Note |
|---|---:|---|---|
| lone_arrival | 0.7646 | ms | idle instance, nothing else in flight |
| spaced_arrivals_max | 3.79 | ms | 3 certificates, 2s apart |
| burst_p99 | 1.32 | ms | 100 certificates back to back |
| burst_max | 1.45 | ms |  |
| envelope | 20 | ms | the bar: 3× burst p99, floored at 20ms |

> pipeline.Run consumes its observation channel one at a time and calls process on each — there is no accumulation buffer, no ticker and no batch size in the ingest path. The one scheduled loop in the system is the notification outbox drain, which only ever handles alerts that immediate delivery already failed or rate-limited.

## C-09 — Substring issuer matching survives CA rotation

**Claim.** Expected-issuer policy is a case-insensitive substring match on issuer DN/O, because exact matching would page you on every intermediate rotation.

**Source.** `src/components/Pillars.astro`

**Threshold.** 0 false criticals across a year of simulated renewals spanning intermediate rotations, where exact-match comparison produces a measured non-zero count on the same corpus

**Verdict.** PASS — 0 false criticals over 138 legitimate renewals; exact-DN matching would have raised 138

| Metric | Value | Unit | Note |
|---|---:|---|---|
| renewals | 138 | certificates |  |
| false_criticals_substring | 0 | alerts | the shipped comparison |
| classified_routine | 276 | matches | severity info — recorded, nobody paged |
| matches_recorded | 276 | matches | two per renewal: the apex and the www SAN |
| false_criticals_exact_dn | 138 | alerts | exact equality against the issuer DN |
| false_criticals_exact_org | 51 | alerts | exact equality against O= — "DigiCert Inc" is not "DigiCert" |
| false_criticals_case_sensitive | 17 | alerts | substring, but case-sensitive |
| alerts_delivered | 276 | webhook posts |  |

> Every certificate in this corpus is legitimate. The measurement is entirely about how many of them a comparison strategy would have woken someone up for.

> Exact O= matching survives Let's Encrypt's intermediate rotations and still fails 51 times, because the configured pattern "DigiCert" is not the string "DigiCert Inc" — which is the failure mode substring matching exists to avoid.

## C-10 — sha256(DER) dedup, never the serial

**Claim.** Dedup keys on sha256 of the DER, never the certificate serial, because serials collide across CAs and would under-count real issuances.

**Source.** `src/components/Pillars.astro`, `src/components/Correctness.astro`

**Threshold.** 0 certificates merged or lost under sha256(DER) on a corpus containing cross-CA serial collisions, where serial-keyed dedup under-counts by a measured margin; one alert per issuance across its 2–6 log sightings

**Verdict.** PASS — 1,000 certificates with 50% colliding serials stored without a single false merge; one issuance seen in 6 logs produced 1 alert

| Metric | Value | Unit | Note |
|---|---:|---|---|
| certificates_posted | 1,000 | certificates |  |
| certificate_rows_sha256 | 1,000 | rows | the shipped dedup key |
| certificate_rows_if_keyed_on_serial | 500 | rows |  |
| undercount_if_keyed_on_serial | 50 | % | certificates that would have vanished into a collision |
| log_sightings | 6 | sightings |  |
| certificate_rows_from_sightings | 1 | rows |  |
| observation_rows_from_sightings | 6 | rows | provenance kept for every sighting |
| match_rows_from_sightings | 1 | rows |  |
| alerts_from_sightings | 1 | alerts | the anti-fatigue property this claim is really about |

> A 50% collision rate is deliberately adversarial. The point is the shape of the failure: serial-keyed dedup does not merely mislabel a colliding pair, it silently drops one of them — the certificate that never gets stored is also the one that never gets matched.

> Every sighting is still recorded as an observation row, so which logs carried an issuance stays answerable; what deduplicates is the alerting, not the provenance.

## C-11 — A-label normalization catches IDN homoglyphs

**Claim.** Names normalize to punycode/A-label before comparison, matching how SANs are encoded on the wire; comparing Unicode against them matches nothing and fails silently.

**Source.** `src/components/Pillars.astro`, `src/components/Correctness.astro`

**Threshold.** 100% detection of IDN-homoglyph certificates presented as wire-format A-labels, against a measured detection rate for the naive Unicode comparison on the same corpus

**Verdict.** PASS — 100.0% of 108,386 IDN homoglyph lookalikes detected as they appear on the wire; 0.0% with Unicode watch keys

| Metric | Value | Unit | Note |
|---|---:|---|---|
| idn_variants_in_watch_set | 108,386 | names |  |
| detection_rate_a_label | 100 | % | the shipped normalization |
| detection_rate_unicode_keys | 0 | % | comparing wire A-labels against Unicode keys |
| real_certificates_detected | 50 | of 50 |  |

> The failure mode this prevents is the quiet one: a Unicode-keyed watch set raises no error and logs nothing, it simply never matches. Both implementations look identical in a dashboard until an actual homoglyph certificate appears.

> Example from the set: xn--80ajb1au1a38g.com (ехамрӏе.com).

## C-12 — PSL reduction catches subdomain phishing

**Claim.** Variant lookups reduce through the Public Suffix List to eTLD+1 first, so login.secure-paypaI.com still resolves back to the watched variant.

**Source.** `src/components/Correctness.astro`

**Threshold.** 100% detection of certificates issued on subdomains of a watched variant, including multi-label public suffixes, against a measured rate for exact-name comparison

**Verdict.** PASS — 100.0% of 9,985 subdomain-hosted lookalike certificates detected (0.0% without PSL reduction), including 3/3 multi-label public suffixes

| Metric | Value | Unit | Note |
|---|---:|---|---|
| probes | 9,985 | certificates |  |
| detection_rate_psl | 100 | % | the shipped eTLD+1 reduction |
| detection_rate_exact_name | 0 | % | matching the full SAN against watch entries |
| multi_label_suffixes_detected | 3 | of 3 |  |
| multi_label_detected_by_last_two_labels | 0 | of 3 | the shortcut that looks like PSL handling until it isn't |

> login.secure-paypaI.com — the example on the site — is the whole point: phishing certificates are issued on subdomains, and a watch set of registrable domains only meets them if SANs are reduced through the public suffix list first.

## C-13 — Scoring is additive and explainable

**Claim.** Risk scoring is a documented additive rule set, not a black-box model: every score is explainable back to the signals that produced it.

**Source.** `src/components/Correctness.astro`

**Threshold.** every scored match carries components that sum to its score (modulo the documented 0–100 clamp) and reproduces bit-identically on a second pass

**Verdict.** PASS — 100.0% of 2,000 persisted findings reproduce their score exactly from their stored components

| Metric | Value | Unit | Note |
|---|---:|---|---|
| matches_scored | 2,000 | findings |  |
| matches_total_reported_by_store | 2,000 | findings |  |
| score_equals_sum_of_components | 100 | % |  |
| carry_at_least_one_component | 100 | % |  |
| clamped_at_bounds | 0 | findings | the documented 0–100 clamp, the only permitted divergence |
| reproducible | 500 | of 500 |  |
| distinct_signals_observed | 6 | signals | credential_keyword 400, deceptive_algorithm 728, routine_issuance 400, unexpected_issuer 400, validity_exceeds_policy 400, variant_hit 800 |

> Explainability here means the stored record, not the code: each match carries its components as JSONB, so a finding from six months ago can still be read back after the weights have been retuned.

## C-14 — Cold start

**Claim.** Self-hosting is a five-minute job.

**Source.** `src/components/Hero.astro`

**Threshold.** an instance goes from config file to serving the observation hook in ≤ 5s — the process-side component of the five minutes; image pull and editing config.yaml are out of scope

**Verdict.** PASS — config file to serving the observation hook in 3.683s with a 115,461-name watch set (6ms with none)

| Metric | Value | Unit | Note |
|---|---:|---|---|
| cold_start_full_watch_set | 3,683 | ms |  |
| cold_start_domains_only | 6 | ms |  |
| watch_set_cost | 3,676 | ms | what 115,438 variants add to startup |
| budget | 5,000 | ms | the process-side allowance out of the five minutes |

> The five minutes on the site is a human number: docker compose pull, generating two secrets, and editing expected_issuers into config.yaml. Only the last step is judgement, and only the process side of it is measurable here.

> Variant generation is not in this number. It runs against the dnstwist sidecar after boot, and on this machine took 3.657s for the 20-domain estate — a first-run cost, not a restart cost.

