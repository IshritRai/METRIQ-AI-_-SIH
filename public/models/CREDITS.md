# 3D demo model credits

Feature 1 (PRD v2) looks up a scanned brand against 4 pre-loaded `.glb`
files in this folder — a fixed lookup, not a model generated from the
inspector's photos.

Unlike an earlier approach (generic Sketchfab downloads with no real label
content), these 4 files are **real photogrammetry scans**, captured with
[KiriEngine](https://www.kiriengine.app/) of physical products bought and
photographed for this project. The label visible on each model is the real
captured photo texture — nothing is generated or overlaid on it.

| Filename | Product | Manufacturer |
|---|---|---|
| `red-joy-cheese-corn-chakra.glb` | Red Joy Cheese Corn Chakra | Reva Food Products, Mehsana, Gujarat |
| `britannia-50-50-potazos.glb` | Britannia 50-50 Potazos | Britannia Industries Limited, Kolkata |
| `open-secret-bhuja.glb` | Open Secret Un-Junked Bhuja | Regulus Agro Organic Pvt Ltd (mfg) / ImmaculateBites Pvt Ltd (mktd), Maharashtra |
| `maggi-double-masala.glb` | Maggi 2-Minute Noodles (Double Masala) | Nestlé India Limited, Moga, Punjab |

## Reference declared values

The exact 5 mandatory declarations for each product (as printed on the
physical pack) are hand-verified and hardcoded in `DEMO_3D_PRODUCTS` in
`src/App.jsx`, and shown as a "Reference declaration" panel under the 3D
viewer — so the numbers shown are always the real, verified label content
for that exact product, not a live scan's OCR read (which can vary run to
run). See that constant for the full field-by-field values and sources.

## License note

These are original photos of physical products the team purchased, taken
specifically for this project (not third-party stock assets) — no external
attribution requirement, unlike the earlier Sketchfab-sourced placeholders
this replaced. As with any use of real trademarked product photography in a
demo, this is fine for a local/internal context; reconfirm before using this
build anywhere more public.
