# Legal Metrology (Packaged Commodities) Rules, 2011 — Compliance Reference for Dev Team
### SIH26034 Rule Engine Reference — Final Verified Version (v3), prepared 29 Aug 2026

**Status of this version:** Every item flagged 🟡/🔴 in the prior draft has been re-checked against primary or near-primary sources this round. Almost all of it closed out cleanly, including the two hardest ones (the Rule 7 font-size table and the Second/Fourth Schedule data) — I found the actual consolidated Rules text with tables intact. **One item remains genuinely open** (exact post-May-2026 Section 36 rupee figures) and I'm not going to manufacture false certainty on it — I'll explain exactly why below and give you the best-supported range with its source, instead of a number I can't stand behind.

Legend: 🟢 Verified against primary/consolidated statutory text or multiple independent corroborating sources. 🟡 Corroborated but not against the primary Gazette PDF itself. 🔴 Still unresolved.

---

## 0. CATEGORY INDEX

| Product / channel category | Applicable ruleset | Section |
|---|---|---|
| Standard retail packaged good (default) | Full Rule 6(1) declaration set + placement/format rules | §2, §3 |
| Food articles | Rule 6(1)(a) [manufacturer name/address] disapplied — governed by FSSA 2006 instead | §2 |
| Cosmetics | Manufacture-date rule → Drugs and Cosmetics Rules, 1945 | §2 |
| Medical devices | 🟢 Fully carved out (23 Oct 2025) — Medical Devices Rules, 2017 governs declarations, font size, character width; Rule 33 relaxation doesn't apply | §2, §8 |
| Alcoholic beverages | MRP → State Excise Law | §2 |
| Seeds (Seeds Act 1966 certified) | Exempt from manufacture-date declaration | §2 |
| Spare parts/accessories under warranty, not for direct sale | Exempt from manufacture-date declaration (2023) | §2 |
| Pan masala | 🟢 Removed from the ≤10g/10ml exemption — full declarations required on every pack size (G.S.R. 881(E), 2 Dec 2025, eff. 1 Feb 2026) | §1 |
| Imported products | Country-of-origin declaration (6(1)(aa)) mandatory | §2 |
| Perishable/time-limited-safety goods | Best-before/use-by date mandatory (6(1)(da)) | §2 |
| Garments/hosiery sold loose in-store | 🟢 Reduced checklist, Rule 26(f) (notified 22 Aug 2022, eff. 1 Jan 2023; size-notation detail added by 2023 Amendment Rules, eff. 1 Jan 2024) | §6 |
| Loose commodities via e-commerce | 🟢 Reduced checklist, Rule 26(g) (notified 6 Oct 2023, eff. 1 Jan 2024) | §6 |
| Standard e-commerce listing | Full Rule 6(1) checklist minus manufacture date (Rule 6(10)) | §5 |
| E-commerce, imported product | + CoO searchable filter — 🟢 confirmed deferred to 1 Jul 2027, not yet in force | §5, §8 |
| Bulk/institutional/industrial direct purchase | Exempt from Chapter II entirely | §1 |
| Wholesale packages | Separate Rule 24 checklist | §7 |
| Bidis, incense sticks, PSU domestic LPG (14.2kg/5kg) | Exempt from manufacture-date declaration | §2 |
| Items ≤10g/10ml (non-tobacco, non-pan-masala) | Fully exempt from Chapter II (Rule 26(a)) | §1 |

---

## 1. SCOPE — Rule 3, Rule 26

| Exclusion | Condition |
|---|---|
| Bulk packages | Net quantity > 25 kg or 25 litres (cement/fertilizer bags up to 50kg still covered) |
| Institutional consumer | Bought directly from manufacturer by hospitals, airlines, hotels, railways, etc. |
| Industrial consumer | Bought directly from manufacturer for that industry's production |

Rule 26 full exemptions:

| # | Exemption | Note |
|---|---|---|
| 26(a) | Net weight/measure ≤ 10g or 10ml | Except tobacco products |
| 26(a) proviso 🟢 | Pan masala — **verified: G.S.R. 881(E), notified 2 Dec 2025, in force 1 Feb 2026.** Withdraws the small-pack exemption for pan masala specifically; full declarations (including MRP) now required on every pan masala pack regardless of size. Confirmed independently by Business Standard, The Statesman, TeamLease RegTech, CliniExperts (x2), and legalitysimplified.com — all agree on the notification number and date. | |
| 26(b) | Fast food packed by restaurant/hotel | |
| 26(c) | Scheduled/non-scheduled drug formulations under Drugs (Price Control) Order | 🟢 Original consolidated text (verified below) actually cites the **Drug (Price Control) Order, 2013** under the Essential Commodities Act — the earlier draft's reference to "1995" appears to be an error; 2013 is the version in the primary consolidated text I retrieved. |
| 26(d) | Agricultural farm produce in packages above 50kg | |
| 26(f) 🟢 | Garment/hosiery sold loose/open, buyer can inspect first | Notified 22 Aug 2022, in force 1 Jan 2023 — see §6 |
| 26(g) 🟢 | Loose commodities via e-commerce | Notified 6 Oct 2023, in force 1 Jan 2024 — see §6 |

**Dev implication:** classification step (category + quantity + sale channel + buyer type) runs before any declaration check.

---

## 2. CORE MANDATORY DECLARATIONS — Rule 6(1)
### 🟢 Cross-checked against the consolidated Rules text (source: West Bengal Department of Consumer Affairs official mirror of the Gazette-notified Rules, 43-page PDF, retrieved and read in full this round)

| # | Declaration | Rule | What to check |
|---|---|---|---|
| 1 | Name & address of manufacturer/packer/importer | 6(1)(a) | Unqualified name+address presumed manufacturer's; imported goods need importer's name+address. **Explanation II** (confirmed in primary text): if a brand owner's name/address appears as "marketer," the brand owner is liable as deemed manufacturer; if multiple names appear, prosecution targets the one listed first. |
| 2 | Country of origin/manufacture/assembly | 6(1)(aa) *(2017)* | Mandatory only for imported products |
| 3 | Common/generic name | 6(1)(b) | Multi-product packs: each product's name + quantity |
| 4 | Net quantity | 6(1)(c) | See §4 |
| 5 | Month & year of manufacture/pack/import | 6(1)(d) | Exceptions (🟢 confirmed verbatim): bidis/incense sticks; 14.2kg/5kg PSU domestic LPG cylinders; spare parts/accessories under warranty not for direct sale (2023) |
| 6 | Best before/use by date | 6(1)(da) *(2017)* | Only if commodity can become unfit for consumption/use over time |
| 7 | MRP | 6(1)(e) | "Maximum retail price Rs.../MRP Rs... inclusive of all taxes." **Rounding rule confirmed verbatim from primary text:** fraction below 50 paise rounds **down** to the preceding rupee; fraction from 50 to 95 paise rounds to 50 paise (i.e., not simply "50-95 rounds up") |
| 8 | Dimensions (where relevant) | 6(1)(f) | Multiple differently-sized pieces each dimensioned separately |
| 9 | Consumer care details | 6(2) | Name, address, phone, email (if available) |

### Sub-checks (🟢 all confirmed against primary text)
- **Food articles:** name/address declaration (a) governed by food law instead. Note: the primary consolidated text I retrieved still names the **Prevention of Food Adulteration Act, 1954** here — the earlier draft's claim that this was updated to route to the **Food Safety and Standards Act, 2006** by the 2017 amendment is very likely correct (FSSA 2006 replaced the 1954 Act nationally), but the specific PDF I pulled may predate that specific cross-reference update within Rule 6 itself. Treat "FSSA 2006 governs food article name/address" as the operative rule, but note the source text variance.
- **Cosmetics:** manufacture-date rule → Drugs and Cosmetics Rules, 1945 (confirmed verbatim).
- **Seeds** (Seeds Act 1966 certified): exempt from manufacture-date declaration (confirmed verbatim).
- **Alcoholic beverages:** MRP → State Excise Law where it covers the declaration; PCR applies only as gap-filler (confirmed verbatim).
- **Spare parts/accessories** under warranty, not for direct sale: exempt from manufacture-date declaration (2023).
- **Medical devices** 🟢: entire Rule 7 font/character regime and Rule 2(h) declaration regime disapplied; Medical Devices Rules, 2017 governs instead — confirmed via the actual amendment text excerpt (CliniExperts): a new proviso to Rule 2(h) and a new proviso to Rule 7(2) were inserted, effective 23 Oct 2025.
- **No stickers rule** (confirmed verbatim, Rule 6(3)): individual stickers cannot alter/make declarations, except a sticker may show a reduced MRP without covering the original.
- **Multi-component commodities** (confirmed, Rule 6(5)): if sold as components in 2+ units as a single commodity, the main package carries the full declaration and references the other packages; if sold as spare parts, every package needs its own full declaration.

---

## 3. PLACEMENT & FORMAT — Rule 7, 8, 9

| Check | Rule | Requirement |
|---|---|---|
| Location | 8(1) | All declarations on the Principal Display Panel (PDP) |
| PDP definition 🟢 | Rule 2(h) (confirmed verbatim) | "The total surface area of the package where the information required under these rules is to be given," either all grouped in one place, or pre-printed info grouped in one place and on-line-added info grouped in another |
| Free space around net quantity 🟢 | 8(1) proviso (confirmed verbatim) | Above/below: space ≥ height of the numeral. Left/right: space ≥ **twice** the height of the numeral |
| **Font size — RESOLVED** 🟢 | Rule 7(2)/(3) | **Full Table I and Table II retrieved from the consolidated Rules text.** See below. |
| Medical device carve-out 🟢 | Rule 2(h)/7(2) provisos, Amendment Rules 2025 | Confirmed via actual amendment excerpt: "packages containing medical devices, the provisions of the Medical Devices Rules, 2017, shall apply to make declarations" — inserted into Rule 2(h) and Rule 7(2), effective 23 Oct 2025 |
| Contrast | 9(1)(b) | MRP & net quantity numerals must contrast with background (exception: blown/molded glass/plastic) |
| Legibility | 9(1)(a) | Legible, prominent; handwritten declarations must be clear |
| Not read through liquid | 9(2) | Confirmed verbatim |
| Outer wrapper duplication | 9(3) | Confirmed verbatim — exception for transparent wrapper with readable inner declarations |
| Language | 9(4) | Hindi (Devanagari) or English; others may be added, not substituted |
| No stickers over MRP | 6(3) | See §2 |
| No smudging/altering | 18(5) | Confirmed verbatim |

### Rule 7 Table I — Minimum numeral height, net quantity by WEIGHT or VOLUME
*(source: consolidated Rules text, confirmed as introduced/restated by the 2017 amendment structure)*

| Net quantity | Normal case | Blown/formed/molded/embossed/perforated on container |
|---|---|---|
| Up to 200 g/ml | 1 mm | 2 mm |
| Above 200 g/ml up to 500 g/ml | 2 mm | 4 mm |
| Above 500 g/ml | 4 mm | 6 mm |

### Rule 7 Table II — Minimum numeral height, net quantity by LENGTH, AREA or NUMBER
*(keyed to Principal Display Panel area, not to quantity)*

| PDP area | Normal case | Blown/formed/molded/embossed/perforated |
|---|---|---|
| Up to 100 cm² | 1 mm | 2 mm |
| Above 100 up to 500 cm² | 2 mm | 4 mm |
| Above 500 up to 2500 cm² | 4 mm | 6 mm |
| Above 2500 cm² | 6 mm | 6 mm |

**Additional confirmed rule (Rule 7(3)):** letter height (as opposed to numeral height) ≥ 1mm normal, ≥ 2mm if blown/formed/molded/embossed/perforated. **Width rule (confirmed):** width of letter/numeral ≥ ⅓ of its height, except numeral "1" and letters i/I/l. **Rule 7(4) (confirmed, previously not in either draft):** none of Rule 7 applies if the same information is already required by some other law in force — this is the general carve-out mechanism the medical-device proviso plugs into.

**One caveat I can't fully close:** the source PDF I retrieved is a consolidated text that clearly incorporates the 2017 restructuring (it has the Table-I/Table-II split, which indiankanoon's amendment history confirms was introduced by G.S.R. 629(E), 23 June 2017) — so this is very likely the currently governing table. But I could not find a dated "last consolidated as of" marker on that specific PDF, and I could not independently confirm no further numeric change has been made to Rule 7 since 2017 (only that the *medical device carve-out* was layered on top in 2025, which I did separately confirm). Recommend one final check: search the Department of Consumer Affairs' own published FAQ or a 2024+ compliance guide to confirm these mm figures are still current before hardcoding — but this is now a much smaller residual risk than "no data at all."

---

## 4. NET QUANTITY — Rule 11–17, Schedules

| Check | Rule | Requirement |
|---|---|---|
| Correct unit type | 12(2) | Solid/semi-solid → mass; linear → length; area → area; liquid/cubic → volume; count → number, except Fourth Schedule exceptions |
| Sub-unit thresholds 🟢 | 13(2)-(3), confirmed verbatim | <1kg → grams; <1m → cm; <1m² → sq. decimetre; <1m³ → cubic cm; <1 litre → ml. ≥1kg → kg + decimal/sub-multiple fractions (not mixed units); same logic scaled up for length, area, volume |
| No banned counting terms | 13(4) | Dozen, score, gross, great gross, etc. — confirmed verbatim, banned outright (not just "as primary declaration") |
| SI units, primary declaration 🟡 | 13(5) | Confirmed verbatim: "No system of units other than the International System of Units shall be used"; number symbol "N" or "U." **Customary-units advisory:** I could not locate the specific letter (No. I-9/1/2026-W&M, 18 May 2026) directly, but I did find it referenced as a real topic ("Advisory on using customary units alongside [SI units]") in a Dhruva Advisors regulatory alert PDF dated June 2026 discussing the same batch of 2026 changes as G.S.R. 418(E) — so the advisory itself is corroborated as real by a second, independent professional source, just not verified against its own primary text. Treat the *existence* of the advisory as 🟢 and its *exact conditions* as 🟡. |
| No misleading qualifiers | 12(6) | Confirmed verbatim: "minimum," "not less than," "average," "about," "approximately," or similar |
| **Standard package sizes — RESOLVED** 🟢 | Rule 5, Second Schedule | **Full table retrieved — see below.** |
| Exclude wrapper weight | 11(1) | Confirmed verbatim |
| "When packed" qualifier | 11(4), Third Schedule | Confirmed verbatim: only for **soaps, lotions, cream (other than cream of milk)** |

### Second Schedule — Standard package quantities (Rule 5)
*(confirmed against consolidated primary text; 19 commodity rows)*

| Commodity | Standard quantities |
|---|---|
| Baby food / weaning food | 100g, 200g, 300g, 400g, 500g, 600g, 700g, 800g, 900g, 1kg, 2kg, 5kg, 10kg |
| Biscuits | 25g, 50g, 75g, 100g, 150g, 200g, 250g, 300g, then multiples of 100g up to 1kg |
| Bread (incl. brown, excl. bun) | 100g and multiples of 100g |
| Butter/margarine (uncanned) | 25g, 50g, 100g, 200g, 500g, 1kg, 2kg, 5kg, then multiples of 5kg |
| Cereals and pulses | 100g, 200g, 500g, 1kg, 2kg, 5kg, then multiples of 5kg |
| Coffee | 25g, 50g, 100g, 200g, 250g, 500g, 1kg, then multiples of 1kg |
| Tea | 25g, 50g, 100g, 125g, 250g, 500g, 1kg, then multiples of 1kg |
| Beverage-constituting materials | 25g, 50g, 100g, 200g, 500g, 1kg, then multiples of 1kg |
| Edible oils, vanaspati, ghee, butter oil | 50g, 100g, 200g, 500g, 1kg, 2kg, 3kg, 5kg, then multiples of 5kg (or equivalent by volume) — 🟡 **note:** 2023 Amendment Rules additionally require that if declared by volume, weight must *also* be declared (Fourth Schedule item 11 change, confirmed — see below) |
| Milk powder | Below 50g unrestricted; 50g, 100g, 200g, 500g, 1kg, then multiples of 500g |
| Non-soapy detergents (powder) | Below 50g unrestricted; 50g, 100g, 200g, 500g, 700g, 1kg, 1.5kg, 2kg, then multiples of 1kg |
| Rice (powdered), flour, atta, rawa, suji | 100g, 200g, 500g, 1kg, 2kg, 5kg, then multiples of 5kg |
| Salt | Below 50g in multiples of 10g; 50g, 100g, 200g, 500g, 750g, 1kg, 2kg, 5kg, then multiples of 5kg |
| Soaps — laundry | 50g, 75g, 100g, then multiples of 50g |
| Soaps — non-soapy detergent cakes/bars | 50g, 75g, 100g, 125g, 150g, 200g, 250g, 300g, then multiples of 100g |
| Soaps — toilet/bath (cakes) | 25g, 50g, 75g, 100g, 125g, 150g, then multiples of 50g |
| Aerated soft drinks / non-alcoholic beverages | 65ml (fruit-based only), 100ml, 125ml (fruit-based only), 150ml, 200ml, 250ml, 300ml, 330ml (cans only), 500ml, 750ml, 1L, 1.5L, 2L, 3L, 4L, 5L |
| Mineral/drinking water | 100ml, 150ml, 200ml, 250ml, 300ml, 500ml, 750ml, 1L, 1.5L, 2L, 3L, 4L, 5L |
| Cement in bags | 1kg, 2kg, 5kg, 10kg, 20kg, 25kg, 40kg (white cement only), 50kg |
| Paint/varnish/enamel | Liquid paint: 50ml–5L then multiples of 5L; paste/solid paint: 500g–7kg then multiples of 5kg; base paint: 450ml–4L fixed points, unrestricted above 4L |

**Note on the "non-standard size" declaration proviso:** the original 2011 text required a "Not a standard pack size" label for off-schedule sizes — **this specific proviso was withdrawn effective 1 July 2012** (vide G.S.R. 748(E), 24 Oct 2011), per the source document's own marginal note. Don't build a check for that declaration; it no longer applies. Worth flagging since neither draft of this document had caught it.

### Fourth Schedule — Unit-type exceptions (Rule 12(2))
*(confirmed against primary text; 26 rows — full list, since your rule engine needs it)*

Aerosol products (weight) · Acids, liquid (weight or volume) · Compressed/liquefied gas, excl. LPG (weight + equivalent volume at stated temp/pressure) · Curd (weight) · Electric cables (length or weight) · Electric wire (length or weight) · Fencing wire (number or weight) · Fruits, all kinds (number or weight) · Furnace oil (weight or volume) · Non-edible vegetable oil (weight or volume) · **Edible oil, vanaspati, ghee, butter oil — 🟢 updated 2023: "weight or volume, and if declared by volume, weight must also be declared"** (confirmed via Lexology and TeamLease RegTech coverage of the 6 Oct 2023 Amendment Rules; supersedes the plain "weight or volume" wording in the older consolidated text I pulled) · Heavy residual fuel oil (weight) · Industrial diesel fuel (volume) · Honey, malt-extract, golden syrup, treacle (weight) · Ice cream and similar frozen products (weight — changed from volume, effective 1 Jul 2012) · Liquid chemicals (weight or volume) · LPG (weight) · Nails, wood screws (number or weight) · Paints (other than paste/solid), varnish, enamels (volume) · Paste/solid paint (weight) · Rasgulla, gulabjamun, sweet preparations (weight) · Ready-made garments (number) · Sauces, all kinds (weight) · Tyres and tubes (number) · Yarn (weight or length) · Cosmetics incl. creams, shampoo, lotions, perfumes (weight or measure)

---

## 5. E-COMMERCE-SPECIFIC — Rule 6(10), 6(10A)

- All Rule 6(1) declarations required on the digital listing, **except** month & year of manufacture.
- 🟢 **Rule 6(10A) CoO filter timeline, fully confirmed:** first notified G.S.R. 128(E), 13 Feb 2026, targeting 1 Jul 2026. **Substituted** by the Second Amendment Rules, 2026 (G.S.R. 312(E), 27 Apr 2026), pushing the effective date to **1 Jul 2027**. Multiple independent sources agree, including the notification text itself. **Not in force as of 29 Aug 2026.**

---

## 6. GARMENT / LOOSE-GOODS CARVE-OUT — Rule 26(f), 26(g)
### 🟢 Both fully verified against the actual amendment text this round

**Rule 26(f) — garments/hosiery sold loose in-store.** Notified 22 Aug 2022 (Third Amendment Rules, 2022), **in force 1 Jan 2023**. Confirmed conditions:
1. Name & address of manufacturer/marketer/brand owner/importer + country of origin (if imported)
2. Consumer care email + phone number
3. Size — internationally recognizable indicators (S/M/L/XL/XXL/XXXL) plus metric notation (cm/m) — **this metric-notation detail was itself added by the 2023 Amendment Rules, in force 1 Jan 2024**, refining item (iii) of the original 2022 clause
4. MRP inclusive of all taxes, INR
- Applies to sale of **finished products only**.
- If also sold via e-commerce, the same info must be displayed on the e-commerce listing.
- Manufacturers/packers/importers may voluntarily comply early, ahead of the formal effective date.

**Rule 26(g) — loose commodities via e-commerce.** Notified 6 Oct 2023 (Amendment Rules, 2023), **in force 1 Jan 2024**. Confirmed conditions:
1. Name & address of manufacturer/marketer/brand owner/importer/seller + country of origin (if imported)
2. Consumer care contact
3. Retail price inclusive of taxes, INR
4. Net quantity in standard units (or count, if sold by number)

---

## 7. WHOLESALE PACKAGES — Rule 24
### 🟢 Confirmed verbatim against primary text

1. Name & address of manufacturer/importer/packer
2. Identity of the commodity
3. Total number of retail packages inside, OR net quantity in standard units
- Confirmed carve-out: doesn't apply if another law already requires an equivalent declaration on that wholesale package.

---

## 8. RECENT AMENDMENTS TRACKER (as of Aug 2026)

| Amendment | Effective | What changed | Status |
|---|---|---|---|
| 2017 Amendment (G.S.R. 629(E), 23 Jun 2017) | 1 Jan 2018 | Introduced e-commerce rule (6(10)); added CoO (6(1)(aa)) and best-before-date (6(1)(da)); replaced flat font rule with Table I/II | 🟢 Structure and table values now confirmed |
| 3rd Amendment 2022 (notified 22 Aug 2022) | 1 Jan 2023 | Added Rule 26(f) garment loose-sale exemption | 🟢 Fully verified this round |
| Amendment Rules 2023 (notified 6 Oct 2023) | 1 Jan 2024 | Added Rule 26(g) e-commerce loose exemption; refined 26(f)(iii) size-notation; Fourth Schedule edible-oil dual-declaration tweak | 🟢 Fully verified this round |
| Medical Devices carve-out (Amendment Rules, 2025) | 23 Oct 2025 | Full carve-out from Rule 7 font/character-width regime; Medical Devices Rules 2017 governs instead | 🟢 Verified against actual amendment excerpt |
| Pan masala exemption (G.S.R. 881(E), notified 2 Dec 2025) | 1 Feb 2026 | Rule 26(a) proviso excludes pan masala from the ≤10g/10ml exemption entirely | 🟢 Fully verified this round, 6+ independent sources |
| E-commerce CoO filter (Rule 6(10A)) | First: G.S.R. 128(E), 13 Feb 2026, targeting 1 Jul 2026. Substituted: G.S.R. 312(E), 27 Apr 2026, deferring to **1 Jul 2027** | Searchable/filterable CoO for imported goods, e-commerce | 🟢 Verified, not yet in force |
| Jan Vishwas (Amendment of Provisions) Act, 2026 | LM Act provisions enforced from **1 May 2026** per DoCA notification S.O. 2103(E), 27 Apr 2026 | Improvement-notice mechanism (new clause (ea), Section 2); first-time procedural/regulatory non-compliance gets rectification opportunity before penal proceedings; explicitly does not soften action on fraud/repeat/tampering; built-in 10%-per-3-years fine escalation (confirmed general mechanism, inherited from the 2023-era Jan Vishwas framework and continued here) | 🟢 Mechanism, dates, and general escalation clause verified. 🔴 Exact rupee figures — see §9 |
| Customary units advisory | 18 May 2026 (letter number not independently confirmed) | Customary units alongside SI, SI must remain dominant | 🟡 Existence corroborated (Dhruva Advisors alert), exact text/letter number not confirmed |
| Third Amendment Rules 2026 (G.S.R. 418(E), dated **29 May 2026** — confirmed exact date) | 29 May 2026 | AEO Tier-2/3 bonded-warehouse declaration facility; Director-level accountability/disclosure; annual registration updates; perpetual registration validity (subject to cancellation powers) — back-office, not label-scanning relevant | 🟢 Verified via Mondaq/INDIALAW legal alert quoting the notification directly |

---

## 9. PENALTIES — the one item that stays 🔴, and here's exactly why

**What's fully confirmed (both the old baseline and the new mechanism):**

**Pre-reform Section 36 text (confirmed verbatim from a primary-quality source — an Indian Institute of Legal Metrology officer-training seminar deck that reproduces the statutory text directly):**
- **Section 36(1)** (pre-packaged commodity doesn't conform to declarations): 1st offence — fine up to ₹25,000. 2nd offence — fine up to ₹50,000. 3rd/subsequent offence — fine not less than ₹50,000, up to ₹1,00,000, or imprisonment up to 1 year, or both.
- **Section 36(2)** (net quantity error beyond permissible limits): fine not less than ₹10,000 (upper bound not fully captured in the source, but corroborated elsewhere as in the same low-tens-of-thousands to ~₹1,00,000-ish band, escalating for repeat offences with possible imprisonment).

**What the Jan Vishwas Act, 2026 confirmed changed (structure):**
- First offence → improvement notice, not a fine (for the categories covered by the reform).
- Second offence → civil penalty.
- Third/subsequent → larger penalty, potentially with criminal fine retained for the most serious repeat cases.
- A built-in 10%-per-3-years escalation to fine minimums, continuing the mechanism the 2023-era Jan Vishwas Act established.

**Why I still won't give you a hard number for the new 2nd/3rd-offence figures:**

I found three different sets of figures across my searches, and none of them is the amended Section 36 text itself:
1. The prior draft (attributed to "India Code, as on 7 May 2026," not independently re-fetched this round): ₹5,00,000 for 2nd offence, ₹25,00,000–50,00,000 for 3rd+.
2. legalmetrologyindia.com (general "minor vs major offences" piece, section unspecified): ₹50,000 for 2nd offence, ₹1,00,000–2,00,000 for 3rd+.
3. iPleaders' Jan Vishwas explainer, specifically about "**non-standard weights or measures**" (which is Sections 33/34 territory, not 36): 2nd offence up to ₹1,00,000, doubling per subsequent offence, capped at ₹5,00,000.

**Here's my honest read:** figure set #1 (the one in the original draft you asked me to verify) is very likely wrong. The **pre-reform ceiling for Section 36(1) was only ₹1,00,000** (confirmed above). A decriminalization reform whose entire stated purpose is proportionate, trust-based regulation — and which explicitly preserved strict treatment only for fraud/repeat/tampering, not routine declaration slips — increasing the ceiling by 25–50x for an ordinary labeling violation would be a strange outlier against everything else the Act does (compare: the cosmetics civil penalty example is capped at ₹1,00,000 or 3x goods value; the weights/measures cap iPleaders cites is ₹5,00,000). Figures #2 and #3, while not perfectly matching each other or confirmed as Section-36-specific, are at least in the same order of magnitude as each other and consistent with the pre-reform baseline scaled up modestly. I'd treat figure set #1 as unreliable and figures #2/#3's general range (low lakhs, not tens of lakhs) as the better working assumption — **but this is still an inference from indirect evidence, not a verified number, and I want to be clear about that distinction.**

**What to actually do about this:** the primary text that would settle this is either (a) the Jan Vishwas (Amendment of Provisions) Act, 2026's own Schedule entry for the Legal Metrology Act (serial number 66, per the DoCA notification), or (b) the amended, consolidated Section 36 text on India Code post-1-May-2026. I did not find either fully reproduced in searchable form this round. **This is a half-hour task for someone with India Code access or a Manupatra/SCC subscription — pull the Schedule 66 entry verbatim.** Until then, your report generator's verdict logic should say "non-compliant — [1st/2nd/3rd+ offence] — penalty amount per current Section 36, consult Legal Metrology Officer" rather than printing any specific rupee figure.

**Rule 32 (rules-level penalty, separate from Section 36):** 🟢 now confirmed verbatim from the same primary consolidated text as §2–7 above: contravention of Rules 27–31 (registration-related) → fine ₹4,000. Contravention of any other rule with no punishment specified elsewhere → fine ₹2,000. This is the original 2011 rule-level penalty, distinct from the Act's Section 36. Whether Rule 32 itself has been amended post-Jan-Vishwas-2026 I still could not confirm — the amendments I found all targeted the Act's Section 36 area, not this Rule directly, so treat Rule 32's ₹4,000/₹2,000 figures as still the best-available answer for narrow procedural (non-declaration) rule breaches, with the same "verify before shipping to an end user" caveat as Section 36.

---

## 10. SOURCES

**Primary or near-primary, read in full or in substantial part this round:**
- Consolidated Legal Metrology (Packaged Commodities) Rules, 2011 full text (43 pages, incl. all Schedules, Rule 7 Tables I/II, Rule 32) — West Bengal Department of Consumer Affairs official mirror: wbconsumers.gov.in
- Indian Institute of Legal Metrology (Ranchi) officer-training seminar deck, reproducing Section 36(1)/(2) statutory text verbatim: via slideshare.net
- DCA Notification G.S.R. 312(E), 27 Apr 2026 (Rule 6(10A) deferral), reproduced text: worldtradescanner.com
- Mondaq / INDIALAW legal alert quoting G.S.R. 418(E), 29 May 2026, directly
- Third Amendment Rules 2022 and Amendment Rules 2023 notification text, reproduced by TaxGuru, SCC Online, Lexology, TeamLease RegTech (cross-checked across 5+ independent legal-update services, all agreeing on dates and clause text)
- CliniExperts' reproduction of the actual 2025 medical-device amendment clause text

**Secondary, corroborating but not primary text:**
- PRS India Bill Track, PIB press material, SCC Online Blog — Jan Vishwas Act 2026 mechanism and 1 May 2026 date
- Dhruva Advisors regulatory alert PDF (June 2026) — corroborates the customary-units advisory's existence
- legalmetrologyindia.com, iPleaders — penalty figures, both non-primary and not fully reconcilable with each other (see §9)

**Still not independently verified even this round:** the exact letter number and full conditions of the customary-units advisory; whether Rule 32's own figures have been amended; the precise current Section 36(1)/(2) rupee figures post-1-May-2026.

**Bottom line:** this version is materially more load-bearing than v2 — the font-size table and both Schedules were the two hardest technical blockers and both are now real data your rule engine can use. The one number I won't hand you with false confidence is the exact current Section 36 penalty figures, because I found conflicting secondary sources and no primary text, and inventing a number there would be exactly the failure mode you asked me to avoid. Get that one Schedule-66 entry from India Code or a paid legal database before it goes into a report an enforcement officer or a business might see.
