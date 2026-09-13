# METRIQ — Product Requirements Document (v2)
### For the engineering team — what exists today, and what's being asked for next

---

## 1. What this document is

This is a plain-language brief for the engineering team. It has two parts:

1. **What the app actually does today** — a straight inventory of what's real, so nobody assumes something works just because it's demo-ready.
2. **Four new feature requests** from the product side, each with a blunt call on whether it's implemented, partially implemented, or not implemented at all — plus what it would actually take to build it, and where we'd recommend simulating instead of building the real thing (and why).

No sugar-coating anywhere in this doc. If something isn't built, it says so.

---

## 2. What exists today (current build)

**Stack:** React 19 + Vite frontend, one Express backend route (`server/index.js`) that proxies to Gemini for the actual label-reading. No database — everything lives in React state, seeded with fake sample data on load, and **resets the moment the page is refreshed.** No user accounts or login — "role" (Inspector / Supervisor / Rule Admin) is just a button you click; nothing stops anyone from clicking any of the three.

**The flow, as it exists:**

- **Landing page** → **role picker** (Inspector / Supervisor / Rule Admin) → role-specific console.
- **Inspector — Scan:**
  - Takes **one photo** of a label (native phone camera via a file input, or upload from gallery). This is a **single shot**, not a multi-angle capture — there's no "front / back / side" flow of any kind today.
  - The photo is sent to our backend, which calls Gemini and gets back a structured list of ~18 mandatory declaration fields (manufacturer address, net quantity, MRP, packing date, consumer care, etc.), each marked compliant / non-compliant / missing.
  - If the photo is unusable (blur, glare, wrong angle), the model says so and the inspector re-takes it, tagging a reason (glare / wrinkle / blur / other).
  - There's a **manual weight-check**: the inspector can type in a number from a scale and the app compares it to the declared net quantity with a 5% tolerance. **This is manual entry only — nothing talks to real hardware.**
  - If something's flagged, the inspector can **confirm the violation** (moves to a hold-notice + PDF export) or **dispute/override it** — but this is a single free-text reason for the *whole* result, not a per-field fix.
  - Saved cases go into an in-memory case list (not a real database).
- **History** (Inspector + Supervisor): searchable list of past cases.
- **Supervisor — Dashboard:** compliance trend charts, category/brand breakdowns, a hardcoded "certified scale calibration" widget, and a simulated "e-commerce monitor" that auto-generates flagged cases for a fixed list of tracked online SKUs.
- **Rule Admin:** a changelog of rule versions with a text diff between them, and a form to draft + publish a new version. **Important:** this is purely a record-keeping screen — publishing a new rule version does **not** change what the scan analysis actually checks (see Feature 2 below for why that matters).
- **Case Detail** (all roles): escalate, assign to another inspector, set a penalty band, a fake batch/lot ledger, a decorative (non-scannable) QR code, and PDF exports (case report + a jurisdiction summary).

That's the honest state of the build. Now, the four asks.

---

## 3. New feature requests

### Feature 1 — Build a 3D model of the scanned product from front/back/side photos

**Status: Not implemented. Not realistically buildable as described, in this project's timeframe.**

Turning a handful of photos into an accurate 3D model on the spot is a genuinely hard computer vision problem (photogrammetry / neural reconstruction) — it's not something you bolt onto a compliance-scanning app as a feature, and it has nothing to do with Legal Metrology compliance anyway.

**What we'd actually build for the demo:** a scripted simulation, not real 3D generation.
- Pick 5 real products ahead of time, and get (or make) a 3D model file for each one (`.glb`/`.gltf` format), stored in the project just like the sample images already are.
- In the UI, the inspector still "captures" front / back / side views — those clicks can be real photos, they just don't feed into anything. Once all three are "captured," the app looks up which of the 5 pre-loaded demo products this is and shows its pre-built 3D model in a viewer.
- Needs one new dependency (a 3D viewer — `three.js` or the simpler `<model-viewer>` web component). Nothing like this exists in the project today.

**Bottom line for judges:** it will look real in the room, but it's a lookup against 5 hardcoded products, not a generator. Worth saying that plainly internally so nobody oversells it later.

---

### Feature 2 — Change a rule, rescan a product, see the updated report — plus an agent that web-searches for rule updates

This is two separate asks bundled together.

**2a. Rule change → the scan report reflects it**
**Status: Not implemented, and not automatically fixed by anything we have today — even though it looks like it should be.**

Here's the catch: Rule Admin lets you publish a new rule *version* today, and there's a nice changelog for it. But the actual label-checking is done by Gemini, called from `server/index.js`, using a fixed prompt. **The rule text that gets published in Rule Admin is never sent to that analysis call.** So today, publishing a rule change and then scanning a product will show the exact same result as before — the "rule change" is cosmetic as far as the scan is concerned.

To make this real, we'd need to:
- Track which rule version is currently "active."
- Pass that rule's actual text into the Gemini prompt at scan time (or otherwise use it to drive which fields are checked and how).
- Make sure the report generated afterward references the version that was active when the scan happened, for audit purposes.

This is a real, scoped piece of engineering — not a trick — but it does touch the backend prompt and the scan pipeline, so it's not a small tweak either.

**2b. An agent that web-searches for rule updates and updates the rule set**
**Status: Not implemented at all.**

Nothing today searches the web for anything. Building this for real means: a job (scheduled or on-demand) that searches for official Legal Metrology gazette notifications or amendments, pulls out anything that looks like a rule change, and drops it into Rule Admin as a **draft** for a human to review and publish (never auto-publish something a script found on the internet — that's how you get a compliance tool citing a hallucinated rule).

This is buildable with an LLM + a web search API, but getting it *accurate* — correctly identifying a real gazette notification vs. a blog post's guess, and citing the right source — is a real trust problem, not just a plumbing one. **Recommendation:** for a demo, simulate it — a "Check for updates" button that returns one canned, realistic-looking "found amendment" draft, rather than actually crawling the web live and hoping it finds something sensible in front of judges.

---

### Feature 3 — Let the inspector correct a misread value, but only after photographing evidence of it

**Status: Not implemented.**

Today, if the AI misreads a value, the inspector's only option is to hit "Dispute / override" on the **entire result** with one free-text explanation. There is no way to fix a single field, and there's no evidence-capture step at all.

What's being asked for is more deliberate than that, and it's a good instinct for a compliance tool — you don't want inspectors casually overriding what the AI found without leaving a trail:

- Each field in the results screen gets its own "this looks wrong" action.
- Clicking it **forces** the inspector to take a close-up photo of that specific part of the label first — that photo becomes attached evidence.
- Only after that photo exists does the app let them type in the corrected value.
- The case record needs to keep: the original AI-read value, the corrected value, the evidence photo, who made the change, and when — all visible later in the case file. This matters because the whole pitch of this tool is a defensible audit trail; a value that quietly changed with no trace would undermine that.

This is genuinely useful and buildable — not a demo trick, a real feature. Moderate scope: a new small capture-and-edit modal per field, plus new fields on the case record to store the audit trail.

---

### Feature 4 — Connect a Bluetooth weighing machine and pull the weight into the report

**Status: Partially there. The comparison logic already works — it's just fed by hand, not by a real scale.**

Today's manual weight-check (type a number, compare to declared quantity, 5% tolerance) already covers the *logic* half of this. What's missing is a real scale talking to the browser.

Doing this for real means the **Web Bluetooth API**, which comes with a hard limitation worth calling out now, not after building it: **it does not work in Safari on iPhone/iPad at all** — only Chrome/Edge on desktop and Android. If inspectors are using iPhones in the field, real Bluetooth integration simply won't run for them, full stop — that's a platform limitation, not something we can code around. It would also need us to know the specific scale hardware's Bluetooth protocol, which we don't have today.

**Recommendation:** simulate it for the demo — a "Connect scale" button that fakes a short pairing animation and then fills in a plausible weight value automatically, instead of the inspector typing it. It demonstrates the idea cleanly without betting the demo on real hardware and a browser that may not even support it on the device in the room.

---

## 4. Summary table

| # | Feature | Status | What ships for the demo |
|---|---|---|---|
| — | Everything in Section 2 (current app) | ✅ Implemented | Real, but no database / no auth / resets on refresh |
| 1 | 3D model from front/back/side scan | ❌ Not implemented | Simulated: 5 pre-built 3D models, looked up after 3 "capture" clicks |
| 2a | Rule change reflected in next scan's report | ❌ Not implemented | Needs real backend work: pipe active rule text into the analysis call |
| 2b | Agent that web-searches for rule updates | ❌ Not implemented | Simulated for demo: canned "found amendment" draft, not a live web crawl |
| 3 | Per-field correction, gated by evidence photo | ❌ Not implemented | Real feature, worth building properly — moderate scope |
| 4 | Bluetooth scale integration | ⚠️ Half-there | Comparison logic exists; hardware link simulated (real Bluetooth is iOS-incompatible anyway) |

---

## 5. One thing worth flagging to whoever's managing scope

Of these four, **Feature 3 (per-field correction with evidence) and Feature 2a (rules actually driving the scan) are the two that are real, valuable engineering work**, not demo tricks — they'd make the tool meaningfully better even outside a demo setting. Features 1, 2b, and 4 are reasonable to simulate for a judged demo, but that should be a conscious decision the team makes out loud, not something that gets discovered later.
