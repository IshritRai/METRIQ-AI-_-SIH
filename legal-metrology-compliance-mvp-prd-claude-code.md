# Packaged Commodity Compliance Checker — MVP PRD
### Screening-round build spec — target: Claude Code (local project)

---

## 1. Overview

A web application that lets a Legal Metrology enforcement inspector photograph or upload an image of a packaged commodity's label, automatically extracts the mandatory declarations (manufacturer/packer/importer details, net quantity, MRP, month/year of manufacture, consumer care), checks them against the Legal Metrology (Packaged Commodities) Rules, 2011, and produces a compliance verdict with an explanation. A supervisor-facing dashboard aggregates scan history into violation trends and category-level compliance stats. The system distinguishes a genuinely non-compliant label from a badly-photographed one and asks for a retake in the latter case rather than flagging it.

This build is scoped for a **screening-round demo**: it should work convincingly end-to-end on a handful of real sample images, not survive production load or legal scrutiny.

**There is already a working single-file React prototype** (`legal-metrology-demo.jsx`) that implements this whole flow, including the extraction/verdict logic, the retake check, and a tuned prompt that avoids response truncation on dense real labels. Claude Code should treat this as the reference implementation to port into a proper local project, not something to redesign from scratch — the UI logic, the field-checking rules, and the prompt wording in it have already been tested against a real product photo.

---

## 2. Users

| Role | Uses the app to |
|---|---|
| **Inspector** (primary) | Scan a product in the field, get an instant compliance read, save it to a case history, generate a report |
| **Supervisor** (secondary) | Monitor inspection activity, see violation trends and category/brand compliance, review individual cases |

Auth for this round: a simple role picker / mock login (Inspector vs Supervisor) — not a real credential system.

---

## 3. Goals for this round

- Demonstrate a believable scan → extract → validate → report → repository loop
- Show at least two features that read as genuinely clever to a judge, not just "OCR + if-statements" (retake-detection, explainability)
- Show systemic thinking on the harder problems (POS cross-check, cross-state ledger, chain of custody) **without** having to build them — a clearly written roadmap section counts for this
- Get a project that actually runs locally (`npm run dev`) and that Claude Code has itself clicked through end to end — not just code that looks correct

## 4. Non-goals for this round

- Real hardware integration (digital weighing scales, calibration tracking)
- Legally admissible tamper-evidence at scale, cross-jurisdiction data sharing
- Production auth/security, real user accounts, data protection compliance
- Real historical inspection data — all trend/aggregate data is seeded
- A real database — session/in-memory state is enough; don't add Postgres, Supabase, etc. for this round

---

## 5. Feature Scope

| # | Feature | Priority | How it's realized |
|---|---|---|---|
| 1 | Image upload / live capture | Must | Standard file input + camera capture |
| 2 | Declaration extraction (name/address, net qty, MRP, mfg date, consumer care) | Must | Claude vision call via a small local API proxy (see §8) — already implemented and tested in the reference prototype |
| 3 | Rule-based compliance check against extracted fields | Must | Plain JS logic over a small rules table, not a second model call |
| 4 | Retake suggestion for blurry/wrinkled/miscropped images | Must | Same Claude call returns an image-quality verdict before compliance fields |
| 5 | Compliance report (view + export) | Must | On-screen report; export as a downloaded `.txt`/`.pdf` |
| 6 | Scan repository with search/filter | Must | In-memory state (seeded + live), filter by status/date/category |
| 7 | Role-based mock auth (Inspector/Supervisor) | Must | Local role switch, no real credential store |
| 8 | Supervisor dashboard — violation summary, category compliance benchmarks | Must | Seeded historical data blended with live scans |
| 9 | Explainability — plain-language reason per flagged field | Should | Already part of the same Claude call in the prototype |
| 10 | "What's new" rule-amendments changelog | Should | A small versioned rules table + modal/button showing recent changes, with a human "approve" toggle before a rule goes live |
| 11 | Per-scan integrity badge (hash + timestamp + mock GPS) | Should | Client-side SHA-256 of the image bytes (already implemented, decoded via `atob` — avoid `fetch()` on a `data:` URL, which is unreliable in sandboxed contexts) |
| 12 | Shrinkflation flag (net qty dropped vs. price for same SKU) | Could | Compare against a prior scan of the same brand/SKU in the repository |
| 13 | Predictive risk heatmap (category/region) | Could | Seeded synthetic dataset, rendered as a heatmap/grid |
| 14 | Combo-pack / bundle MRP handling | Could | Prompt tweak so the model first classifies single item vs. bundle |
| 15 | Multi-lingual label support | Could | Claude's vision reads multiple Indian scripts reasonably; worth a mention even if not deeply tested |
| — | POS/UPI billed-price vs. MRP cross-check | **Won't** (this round) | Documented as a future integration stub |
| — | Cross-state repeat-offender hash-ledger | **Won't** | Documented concept only |
| — | Full immutable chain-of-custody / legal admissibility infra | **Won't** | Documented; §11 |
| — | Physical sample QR chain-of-custody | **Won't** | Documented |
| — | Weighing-scale hardware integration | **Won't** | Documented |
| — | Calibration-certificate tracking for inspector equipment | **Won't** | Documented |
| — | Inspector bias/pattern detection analytics | **Won't** | Documented |
| — | Formal notice/response legal workflow with SLA tracking | **Won't** | Documented |
| — | Court-ready multilingual report generation | **Won't** | Documented |
| — | Batch/lot-level tracking tied to distribution volume | **Won't** | Documented |
| — | Seasonal risk-based patrol routing | **Won't** | Documented |

---

## 6. Screens & Flows

**Inspector**
1. *Role select / mock login* → Inspector
2. *New Scan* → capture or upload image → processing state (visible "analyzing label" state, not instant, to feel real)
3. *Results* — original image alongside extracted fields, each marked compliant/non-compliant/missing, with a one-line explanation per flag. If image quality is poor: a distinct "Retake recommended" state with the specific reason (blur, glare, crop, wrinkle) instead of a compliance verdict.
4. *Save & Generate Report* → adds to repository, produces exportable report, shows the integrity badge (hash/timestamp)
5. *History* — searchable/filterable list of past scans (by date, category, status)
6. *Rules updates* — a button/badge showing new rule updates → modal with a changelog and what changed

**Supervisor**
7. *Dashboard* — violations over time, category-wise compliance benchmark table, brand scorecard, risk heatmap
8. *Case detail* — drill into a single scan: image, extracted fields, verdict, explanation, integrity badge, (stubbed) notice status

---

## 7. Data Model (in-memory, no DB)

| Entity | Key fields |
|---|---|
| `User` | id, name, role (inspector/supervisor) |
| `Scan` | id, inspector_id, image data URL, timestamp, mock_gps, sha256_hash, status (compliant/non-compliant/retake-needed) |
| `Declaration` | scan_id, field_name, extracted_value, verdict, explanation |
| `Rule` | id, field_name, requirement, version, effective_date, approved (bool) |
| `Product` | brand, sku, category — used to link repeat scans for shrinkflation checks |

Keep this as React state seeded on load, same as the reference prototype. No persistence layer needed for this round.

---

## 8. AI Integration — using the Gemini API

This app calls an AI vision model server-side to read labels. Using the Gemini API instead of the Anthropic API:

1. Get a Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey) — no credit card needed for the free tier. Put it in `.env` as `GEMINI_API_KEY=...` and add `.env` to `.gitignore`. Never expose it in client-side code.
2. Use a Flash-class model (e.g. `gemini-2.5-flash` or whatever the current default flash alias is in AI Studio at build time — don't hardcode an old model string, check what's current) rather than a Pro-class model: Flash has by far the more generous free-tier quota, and Pro-class models mostly require billing enabled as of 2026.
3. Scaffold a minimal backend (Node/Express, or Vite's dev-server API middleware) with one endpoint, e.g. `POST /api/analyze`, that takes the uploaded image, calls `https://generativelanguage.googleapis.com/v1beta/models/<model>:generateContent` server-side with the key in the `x-goog-api-key` header, and returns the parsed JSON to the frontend. The frontend never talks to Google's API directly.
4. Reuse the same JSON contract already validated in the reference prototype (the five-field shape, image-quality/retake check, "keep explanations under 15 words", "English text only" instructions) — just adapt the request/response wrapping for Gemini's API shape (`contents`/`parts` instead of Anthropic's `messages`/`content` blocks, and `system_instruction` instead of a top-level `system` string). The prompt wording itself doesn't need to change.
5. Check for a non-2xx response and validate the parsed shape before trusting it, same as the prototype does for the Anthropic API — don't skip this just because the provider changed; a truncated or malformed response is possible with any provider.
6. Compliance pass/fail logic (which field is compliant/non-compliant/missing) stays as deterministic frontend/backend code against the `Rule` table, not a second model call — this is what makes verdicts repeatable instead of wobbling between runs of the same photo.
7. Free-tier rate limits are low (roughly 10 requests/minute, a few hundred/day for Flash models, per Google's current docs) — fine for a screening demo with a handful of test scans, but don't hammer it with rapid repeated testing right before the judging round.

---

## 9. Mock/Seed Data

- ~15–20 seeded historical `Scan` records spanning 3–4 categories (e.g. packaged snacks, dairy, cosmetics, e-commerce), with a mix of compliant/non-compliant statuses, dated over the past few months — this is what makes the dashboard's trend charts and category benchmarks look real on day one. The reference prototype already has a full seeded set that can be ported directly.
- A couple of real sample label photos for the live demo path, including at least one deliberately non-compliant label and one deliberately blurry/wrinkled one.

---

## 10. Success Criteria for the Demo

- `npm run dev` starts cleanly with no build errors
- A real sample image runs through scan → extraction → verdict without manual intervention
- A deliberately non-compliant sample is correctly flagged with a legible explanation
- A deliberately blurry/rotated sample triggers "retake" rather than a false compliance verdict
- The dashboard renders trends/benchmarks from combined seeded + live data
- A report can be generated and exported
- **Claude Code has itself run the app and clicked through every screen and button before calling this done** — including uploading a real photo, not just the generated samples
- The roadmap section (§11) is visible somewhere in the app, not just in this doc

---

## 11. Roadmap (documented, not built this round)

- **POS/UPI cross-check**: hook into point-of-sale/UPI transaction data to catch overcharging vs. declared MRP at the register — the scanner only ever sees the label, not what's actually billed.
- **Cross-state repeat-offender ledger**: a hash-linked shared ledger (manufacturer+SKU+violation fingerprint, no raw data) so a violation flagged in one state is visible to inspectors in another.
- **Full tamper-evident chain of custody**: every scan cryptographically hashed and chained with GPS/inspector ID at the moment of capture, so any later edit is detectable — legally admissible evidence trail. (This round ships a per-scan hash badge as a taste of this, not the chained ledger.)
- **Physical sample QR tracking**: chain-of-custody for samples sent to a government lab.
- **Weighing-scale integration**: label scanning alone can't catch underfilled packages — pairing with a certified digital scale would.
- **Calibration tracking**: inspector equipment needs a valid, unexpired calibration certificate to hold up in court.
- **Inspector bias detection**: supervisors need visibility into inspectors who only target small shops for easy numbers, or never flag large retailers.
- **Formal notice/response workflow**: legally, the accused party must get a chance to respond before a penalty is final — the app currently stops at "violation found."
- **Multilingual, court-ready reports**: auto-generate the final report in the relevant state's official language for legal use.
- **Batch/lot-level tracking**: linking a flagged unit to how many units from the same batch were distributed, to size penalties to actual harm.
- **Seasonal, risk-based patrol routing**: factor in predictable spikes (e.g. sweets and gift packs around Diwali) into where the limited pool of inspectors is sent.

---

## 12. Notes for building this with Claude Code

- Scaffold with Vite + React (`npm create vite@latest`) rather than Next.js — this is a single-page demo with a tiny API proxy, not a full framework app.
- Port the reference prototype (`legal-metrology-demo.jsx`) into the new project structure rather than rewriting the UI from scratch. It already has: the seeded data, the scan flow with retake handling, the SHA-256 integrity badge, the dashboard charts and heatmap, and a top-level error boundary. Known fixed bugs worth preserving on the port: don't use `fetch()` on a `data:` URL (blocked in some sandboxed contexts — decode with `atob` instead), and don't write `\u2014`-style escapes directly as JSX text (they only decode inside quoted strings).
- Add the backend proxy described in §8 and point the frontend's fetch call at it instead of calling Google's API directly from the browser.
- After each feature is wired up, actually run `npm run dev`, open the app, and click through it — including a real photo upload, not just the synthetic sample-label buttons — before moving to the next feature. This project already broke twice in ways that only showed up on real usage (a hashing bug, a response-truncation bug on a dense real label); testing as you go is what catches that.
- Keep the compliance pass/fail logic (§8, point 5) as plain code, not a second model call, so the same photo gives the same verdict every time.
