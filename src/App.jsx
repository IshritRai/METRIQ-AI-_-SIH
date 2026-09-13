import { useState, useMemo, useRef, useEffect, Component } from "react";
import {
  ShieldCheck, ShieldAlert, RotateCcw, Search, Upload, Camera, FileText,
  X, ChevronRight, ChevronLeft, MapPin, Clock, Hash, AlertTriangle,
  LayoutDashboard, Sparkles, Download, ClipboardList, Users,
  History as HistoryIcon, ScanLine, CheckCircle2, XCircle, Loader2,
  FilePlus2, GitCompare, Send, Check, Ban, ScrollText,
  Flag, Gavel, PenLine, UserCheck, Eraser,
  Scale, QrCode, Link2, GaugeCircle, PackageSearch,
  PlayCircle, ShoppingCart, Radar, Fingerprint
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from "recharts";
import { jsPDF } from "jspdf";

/* ---------------------------------------------------------------- */
/* shared hooks                                                       */
/* ---------------------------------------------------------------- */

// Locks background scroll while a modal is mounted — without this, the
// fixed-position scrim sits on top of the page but the page underneath
// keeps scrolling (mouse wheel, touch drag), which is disorienting and
// can leave the modal visually detached from what's behind it.
function useBodyScrollLock() {
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);
}

// Fires once when the element scrolls into view, for scroll-reveal motion.
// Respects prefers-reduced-motion by reporting "already visible" immediately,
// so reduced-motion users get the final state with no animation at all.
function useRevealOnScroll() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2, rootMargin: "0px 0px -60px 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return [ref, visible];
}

// Animates an integer up to `target` once `active` is true. Used for the
// landing page's stat counters so they read as live data settling in, not
// static copy.
function useCountUp(target, active, duration = 1200) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return;
    }
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 4); // ease-out-quart
      setValue(Math.round(eased * target));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, target, duration]);
  return value;
}

/* ---------------------------------------------------------------- */
/* constants                                                          */
/* ---------------------------------------------------------------- */

const REQUIRED_FIELDS = [
  "Manufacturer / Packer / Importer Name & Address",
  "Net Quantity",
  "Maximum Retail Price (incl. of all taxes)",
  "Month & Year of Manufacture / Packing",
  "Consumer Care Details",
];

const CATEGORIES = ["Packaged Snacks", "Dairy", "Cosmetics & Personal Care", "E-commerce Grocery"];
const REGIONS = ["Bengaluru", "Chennai", "Hyderabad", "Mumbai"];

const GPS_BY_REGION = {
  "Bengaluru": "12.9716° N, 77.5946° E",
  "Chennai": "13.0827° N, 80.2707° E",
  "Hyderabad": "17.3850° N, 78.4867° E",
  "Mumbai": "19.0760° N, 72.8777° E",
};

// Statutory citations for each mandatory declaration, used to make the exported
// report read as a formal inspection record rather than a bare app printout.
// Sourced from the Legal Metrology Act, 2009 and the Legal Metrology (Packaged
// Commodities) Rules, 2011 — see the disclaimer on the report itself: this is a
// screening-round aid, not a certified legal opinion, and citations should be
// verified against the current gazetted text before use in formal proceedings.
const RULE_CITATIONS = {
  "Manufacturer / Packer / Importer Name & Address": {
    rule: "Rule 6(1)(a)",
    act: "Legal Metrology (Packaged Commodities) Rules, 2011",
  },
  "Net Quantity": {
    rule: "Rule 6(1)(c) r/w Rule 5",
    act: "Legal Metrology (Packaged Commodities) Rules, 2011",
  },
  "Maximum Retail Price (incl. of all taxes)": {
    rule: "Rule 6(1)(e) r/w Rule 18",
    act: "Legal Metrology (Packaged Commodities) Rules, 2011",
  },
  "Month & Year of Manufacture / Packing": {
    rule: "Rule 6(1)(d)",
    act: "Legal Metrology (Packaged Commodities) Rules, 2011",
  },
  "Consumer Care Details": {
    rule: "Rule 6(1)(f)",
    act: "Legal Metrology (Packaged Commodities) Rules, 2011",
  },
};

const STATUTORY_BASIS = [
  "Legal Metrology Act, 2009 (Act No. 1 of 2010), Section 18: Declarations on pre-packaged commodities.",
  "Legal Metrology (Packaged Commodities) Rules, 2011, Rule 6: Declarations to be made on every package.",
  "Contravention of the above is punishable under Section 36 of the Legal Metrology Act, 2009, with a fine that may extend to Rs. 25,000 for a first contravention, and enhanced fines and/or imprisonment for repeat offences.",
];

// Rule Admin repository: each entry is a version of the rule engine's
// declaration ruleset, with the actual rule text snapshotted at that version
// so a later draft can be diffed against whichever version is "active".
// status: "published" (in force), "in_review" (awaiting human verification),
// "rejected" (sent back with reviewer comments), "draft" (being edited).
const RULE_TEXT_V2_4 = [
  "Rule 6(1)(a): Manufacturer/Packer/Importer name and complete address, including PIN code, must be declared.",
  "Rule 6(1)(c) r/w Rule 5: Net quantity must be declared in standard metric units.",
  "Rule 6(1)(e) r/w Rule 18: MRP must be declared inclusive of all taxes, as a single fixed value (not a range).",
  "Rule 6(1)(d): Month and year of manufacture or packing must be declared.",
  "Rule 6(1)(f): Consumer care contact (phone or e-mail) must be declared.",
  "Rule 5 (font-size guidance): Net-quantity declarations on packages under 200g must use a minimum font height of 2mm.",
].join("\n");

const RULE_CHANGELOG = [
  {
    version: "v2.4", date: "2026-07-02", author: "Rule Admin",
    desc: "Tightened minimum font-size guidance for net-quantity declarations on packages under 200g.",
    status: "published", reviewerComments: "Matches the gazetted amendment text. Approved.",
    ruleText: RULE_TEXT_V2_4,
  },
  {
    version: "v2.3", date: "2026-05-18", author: "Rule Admin",
    desc: "Clarified that combo/bundle packs must show both the combined MRP and a legible per-unit MRP.",
    status: "published", reviewerComments: "Approved without changes.",
    ruleText: RULE_TEXT_V2_4.replace(
      "Rule 5 (font-size guidance): Net-quantity declarations on packages under 200g must use a minimum font height of 2mm.",
      "Rule 6(1)(e) (combo packs): Combo/bundle packs must show both the combined MRP and a legible per-unit MRP."
    ),
  },
  {
    version: "v2.2", date: "2026-03-30", author: "Rule Admin",
    desc: "Added consumer-care e-mail as an accepted alternative to a toll-free number.",
    status: "published", reviewerComments: "Approved; aligns with the 2026 clarification circular.",
    ruleText: RULE_TEXT_V2_4.replace(
      "Rule 5 (font-size guidance): Net-quantity declarations on packages under 200g must use a minimum font height of 2mm.",
      "Rule 6(1)(f) (consumer care): A consumer-care e-mail address is an accepted alternative to a toll-free number."
    ),
  },
  {
    version: "v2.1", date: "2026-02-11", author: "Rule Admin",
    desc: "Extended exemption threshold review for sub-10g / 10ml sachets.",
    status: "published", reviewerComments: "Approved pending the Q3 exemption-threshold review.",
    ruleText: RULE_TEXT_V2_4.replace(
      "Rule 5 (font-size guidance): Net-quantity declarations on packages under 200g must use a minimum font height of 2mm.",
      "Rule 26 (exemptions): Packages of 10g/10ml or less are exempt from declaration requirements, under review for Q3."
    ),
  },
];

// Naive line-set diff — enough to visualize what a draft changed against the
// active version without a full LCS implementation; this is a demo aid, not
// a byte-accurate diff tool.
function diffRuleText(oldText, newText) {
  const oldLines = (oldText || "").split("\n");
  const newLines = (newText || "").split("\n");
  const oldSet = new Set(oldLines);
  const newSet = new Set(newLines);
  const removed = oldLines.filter((l) => l.trim() && !newSet.has(l));
  const added = newLines.filter((l) => l.trim() && !oldSet.has(l));
  return { added, removed };
}

function buildFields(overrides = {}) {
  return REQUIRED_FIELDS.map((name) => {
    if (overrides[name]) {
      return { name, status: overrides[name].status, explanation: overrides[name].explanation, value: overrides[name].value ?? "N/A" };
    }
    return { name, status: "compliant", explanation: "Present and correctly formatted.", value: "N/A" };
  });
}

const SEED_DEFS = [
  { id: "s1", brand: "Crunch Bite Snacks Co.", category: "Packaged Snacks", region: "Bengaluru", date: "2026-02-10", inspector: "R. Bhat" },
  { id: "s2", brand: "Meadow Fresh Dairy", category: "Dairy", region: "Bengaluru", date: "2026-02-22", inspector: "S. Iyer" },
  { id: "s3", brand: "Golden Crisp Foods", category: "Packaged Snacks", region: "Chennai", date: "2026-03-05", inspector: "A. Kumar",
    overrides: { "Maximum Retail Price (incl. of all taxes)": { status: "non_compliant", explanation: "MRP printed without the required 'inclusive of all taxes' wording.", value: "Rs. 20" } } },
  { id: "s4", brand: "PureGlow Cosmetics", category: "Cosmetics & Personal Care", region: "Bengaluru", date: "2026-03-18", inspector: "M. Reddy",
    overrides: { "Manufacturer / Packer / Importer Name & Address": { status: "non_compliant", explanation: "Address given without pincode; incomplete under the rules.", value: "PureGlow Cosmetics, Peenya Industrial Area" } } },
  { id: "s5", brand: "PureMilk Co.", category: "Dairy", region: "Chennai", date: "2026-03-27", inspector: "R. Bhat" },
  { id: "s6", brand: "SnackHive", category: "Packaged Snacks", region: "Hyderabad", date: "2026-04-08", inspector: "S. Iyer",
    overrides: { "Net Quantity": { status: "missing", explanation: "Net quantity declaration not found anywhere on the visible label.", value: null } } },
  { id: "s7", brand: "QuickMart Essentials", category: "E-commerce Grocery", region: "Bengaluru", date: "2026-04-19", inspector: "A. Kumar",
    overrides: { "Net Quantity": { status: "non_compliant", explanation: "Net quantity present but printed well below the required font-size threshold.", value: "180 g" } } },
  { id: "s8", brand: "Herbal Touch Personal Care", category: "Cosmetics & Personal Care", region: "Chennai", date: "2026-05-02", inspector: "M. Reddy",
    overrides: { "Maximum Retail Price (incl. of all taxes)": { status: "non_compliant", explanation: "MRP shown as a range, not a single fixed price as required.", value: "Rs. 99–129" } } },
  { id: "s9", brand: "Meadow Fresh Dairy", category: "Dairy", region: "Hyderabad", date: "2026-05-14", inspector: "R. Bhat",
    overrides: { "Month & Year of Manufacture / Packing": { status: "missing", explanation: "Packing date not found on the label or the seal.", value: null } } },
  { id: "s10", brand: "DailyNeeds Mart", category: "E-commerce Grocery", region: "Chennai", date: "2026-05-25", inspector: "S. Iyer" },
  { id: "s11", brand: "Crunch Bite Snacks Co.", category: "Packaged Snacks", region: "Mumbai", date: "2026-06-03", inspector: "A. Kumar",
    overrides: { "Consumer Care Details": { status: "missing", explanation: "No phone number, email, or address for consumer complaints found.", value: null } } },
  { id: "s12", brand: "PureGlow Cosmetics", category: "Cosmetics & Personal Care", region: "Hyderabad", date: "2026-06-15", inspector: "M. Reddy" },
  { id: "s13", brand: "PureMilk Co.", category: "Dairy", region: "Mumbai", date: "2026-06-28", inspector: "R. Bhat" },
  { id: "s14", brand: "Golden Crisp Foods", category: "Packaged Snacks", region: "Bengaluru", date: "2026-07-09", inspector: "S. Iyer" },
  { id: "s15", brand: "Herbal Touch Personal Care", category: "Cosmetics & Personal Care", region: "Mumbai", date: "2026-07-21", inspector: "A. Kumar",
    overrides: { "Consumer Care Details": { status: "non_compliant", explanation: "Only a general company website listed; no dedicated consumer-care contact.", value: "www.herbaltouch.example" } } },
  { id: "s17", brand: "DailyNeeds Mart", category: "E-commerce Grocery", region: "Hyderabad", date: "2026-08-12", inspector: "S. Iyer",
    overrides: { "Maximum Retail Price (incl. of all taxes)": { status: "non_compliant", explanation: "MRP block obscured by a promotional sticker covering the tax-inclusive wording.", value: "Rs. 65" } } },
];

const RETAKE_REASON_OPTIONS = ["Glare", "Wrinkle", "Blur", "Other"];

const AVAILABLE_INSPECTORS = ["R. Bhat", "S. Iyer", "A. Kumar", "M. Reddy", "K. Nair", "P. Singh"];

const PENALTY_BANDS = [
  { id: "band_a", label: "Band A: Advisory warning", range: "No fine", desc: "First-time, minor formatting lapse (e.g. font size shortfall) with no consumer harm shown." },
  { id: "band_b", label: "Band B: Standard fine", range: "Rs. 5,000 – Rs. 10,000", desc: "Single missing or incorrect mandatory declaration; no prior violations on record for this brand." },
  { id: "band_c", label: "Band C: Enhanced fine", range: "Rs. 10,000 – Rs. 25,000", desc: "Multiple declarations missing, or a repeat violation by the same brand within 12 months." },
  { id: "band_d", label: "Band D: Referral for prosecution", range: "Statutory max + possible imprisonment", desc: "Deliberate misleading claim, MRP overcharging, or repeated non-compliance after a prior hold notice." },
];

const COMPARABLE_PENALTY_CASES = [
  { brand: "Golden Crisp Foods", issue: "MRP without tax-inclusive wording", band: "Band B: Standard fine", amount: "Rs. 7,500" },
  { brand: "Herbal Touch Personal Care", issue: "MRP shown as a range", band: "Band B: Standard fine", amount: "Rs. 8,000" },
  { brand: "SnackHive", issue: "Net quantity missing entirely", band: "Band C: Enhanced fine", amount: "Rs. 15,000" },
];

const RETAKE_DEFS = [
  { id: "s16", brand: "QuickMart Essentials", category: "E-commerce Grocery", region: "Mumbai", date: "2026-08-01", inspector: "M. Reddy",
    retakeReason: "Photo taken at a steep angle with heavy glare across the MRP block." },
];

const FAKE_HASHES = [
  "8f2a1c9d4e6b0f317a5c9d2e1b4f6a80c3d5e7f91a2b4c6d8e0f1a3b5c7d9e0f",
  "3b7d1e9c5a2f4d6b8e0c1a3f5d7b9e2c4a6f8d0b2e4c6a8f0d2b4e6c8a0f2d4b",
  "d4f6a8c0e2b4d6f8a0c2e4b6d8f0a2c4e6b8d0f2a4c6e8b0d2f4a6c8e0b2d4f6",
  "1a3c5e7b9d0f2a4c6e8b0d2f4a6c8e0b2d4f6a8c0e2b4d6f8a0c2e4b6d8f0a2",
];

function seedScans() {
  const compliant = SEED_DEFS.map((d, i) => {
    const fields = buildFields(d.overrides);
    const status = fields.some((f) => f.status !== "compliant") ? "non_compliant" : "compliant";
    return {
      ...d, fields, status, retakeReason: null,
      hash: FAKE_HASHES[i % FAKE_HASHES.length],
      gps: GPS_BY_REGION[d.region],
      timestamp: d.date + "T10:00:00.000Z",
      imageDataUrl: null,
    };
  });
  const retakes = RETAKE_DEFS.map((d, i) => ({
    ...d, fields: [], status: "retake_needed",
    hash: FAKE_HASHES[i % FAKE_HASHES.length],
    gps: GPS_BY_REGION[d.region],
    timestamp: d.date + "T10:00:00.000Z",
    imageDataUrl: null,
  }));
  return [...compliant, ...retakes].sort((a, b) => (a.date < b.date ? 1 : -1));
}

/* ---------------------------------------------------------------- */
/* helpers                                                            */
/* ---------------------------------------------------------------- */

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function dataUrlToBytes(dataUrl) {
  // NOTE: deliberately decoded with atob rather than fetch() on the data: URL
  // itself — fetch() against a data: URL is unreliable in sandboxed contexts.
  const base64 = dataUrl.split(",")[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function fallbackHex(bytes) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < bytes.length; i++) {
    h1 = Math.imul(h1 ^ bytes[i], 2654435761);
    h2 = Math.imul(h2 ^ bytes[i], 1597334677);
  }
  h1 = (h1 ^ (h1 >>> 16)) >>> 0;
  h2 = (h2 ^ (h2 >>> 16)) >>> 0;
  const hex = h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0");
  return (hex + hex + hex + hex).slice(0, 64);
}

async function hashDataUrl(dataUrl) {
  const bytes = dataUrlToBytes(dataUrl);
  try {
    if (window.crypto && window.crypto.subtle && window.crypto.subtle.digest) {
      const digest = await window.crypto.subtle.digest("SHA-256", bytes);
      return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
    }
  } catch (e) {
    /* fall through to non-crypto fallback below */
  }
  return fallbackHex(bytes);
}

async function processImageFile(file) {
  const img = await loadImage(file);
  const maxDim = 1024;
  let { width, height } = img;
  if (width > maxDim || height > maxDim) {
    const scale = maxDim / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, width, height);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  const hashHex = await hashDataUrl(dataUrl);
  return { dataUrl, base64: dataUrl.split(",")[1], mediaType: "image/jpeg", hashHex };
}

function drawSampleLabel(type) {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 820;
  const ctx = canvas.getContext("2d");
  if (type === "blurry") ctx.filter = "blur(3px)";
  ctx.fillStyle = "#F4F2EC";
  ctx.fillRect(0, 0, 640, 820);
  ctx.strokeStyle = "#8a8a80";
  ctx.lineWidth = 2;
  ctx.strokeRect(18, 18, 604, 784);
  ctx.fillStyle = "#141414";
  ctx.font = "bold 32px sans-serif";
  ctx.fillText("CRUNCH BITE", 50, 90);
  ctx.font = "18px sans-serif";
  ctx.fillText("Classic Salted Potato Chips", 50, 122);
  ctx.font = "15px sans-serif";
  let y = 190;
  const lines = [
    "Manufactured by: Crunch Bite Snacks Pvt. Ltd.",
    "Plot 14, Whitefield Industrial Area,",
    "Bengaluru - 560066, Karnataka",
    "",
    "Net Wt: 52 g",
    "MRP: Rs. 20 (incl. of all taxes)",
    "Mfg: 07/2026",
  ];
  if (type !== "missing_care") lines.push("Consumer Care: 1800-XXX-XXXX", "care@crunchbite.example");
  lines.forEach((line) => {
    ctx.fillText(line, 50, y);
    y += 28;
  });
  if (type === "blurry") {
    ctx.filter = "none";
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.beginPath();
    ctx.ellipse(420, 420, 220, 140, 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  return canvas;
}

async function processSample(type) {
  const canvas = drawSampleLabel(type);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  const hashHex = await hashDataUrl(dataUrl);
  return { dataUrl, base64: dataUrl.split(",")[1], mediaType: "image/jpeg", hashHex };
}

function computeOverallStatus(fields) {
  return fields.some((f) => f.status !== "compliant") ? "non_compliant" : "compliant";
}

// Calls our local backend proxy (server/index.js -> POST /api/analyze), which
// talks to the Gemini API server-side. The frontend never calls Google directly.
async function analyzeLabelImage({ base64, mediaType }) {
  const response = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ base64, mediaType }),
  });

  let data;
  try {
    data = await response.json();
  } catch (e) {
    throw new Error("The analysis service returned an unreadable response (HTTP " + response.status + ").");
  }

  if (!response.ok) {
    const apiMsg = (data && data.error) || ("HTTP " + response.status);
    throw new Error("Analysis request failed: " + apiMsg);
  }

  const parsed = data;
  if (parsed.image_quality !== "retake_needed" && !Array.isArray(parsed.fields)) {
    throw new Error("The model's response was missing the expected fields list.");
  }

  return parsed;
}

function formatDate(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function monthLabel(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
}

// Deliberately avoids "/"-separated date formats here: jsPDF's built-in
// Helvetica metrics render a "/" right after certain digit pairs (e.g. "31")
// so tightly that text-extraction reads it back as ".". Spelled-out months
// sidestep the glyph-spacing issue entirely and read more formally besides.
function formatDateTime(date) {
  const datePart = date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const timePart = date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  return `${datePart}, ${timePart}`;
}

function generateNonce() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

// Parses a declared/measured net-quantity string like "52 g" or "1.5 kg" into
// a normalized { value, unit } pair (grams or millilitres), for the scale
// comparison and the exemption check below. Returns null if unparseable.
function parseQuantity(str) {
  if (!str) return null;
  const m = String(str).match(/([\d.]+)\s*(kg|g|l|ml)\b/i);
  if (!m) return null;
  let value = parseFloat(m[1]);
  let unit = m[2].toLowerCase();
  if (unit === "kg") { value *= 1000; unit = "g"; }
  if (unit === "l") { value *= 1000; unit = "ml"; }
  return { value, unit };
}

// Simulated commodity-exemption check per Rule 26 — packages of 10g/10ml or
// less are exempt from most mandatory declarations.
function isExemptQuantity(value) {
  return value != null && value <= 10;
}

function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < String(str).length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

// Deterministic, brand-seeded fake batch/lot ledger — same brand always shows
// the same "history" within a session, without needing a real backend ledger.
function getBatchLedger(brand) {
  const seed = hashSeed(brand || "unknown");
  const rows = [];
  for (let i = 0; i < 3; i++) {
    const s = seed + i * 7919;
    const month = 1 + (s % 12);
    // Unsigned shift: `seed` (from hashSeed's `>>> 0`) can exceed 2^31, and a
    // plain `>>` coerces to a signed 32-bit int first, occasionally flipping
    // negative and producing an invalid "day" (hence an invalid date string).
    const day = 1 + ((s >>> 3) % 28);
    rows.push({
      batch: "B-" + (1000 + (s % 9000)),
      date: `2026-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      units: 500 + (s % 4500),
      status: s % 11 === 0 ? "Recalled" : s % 5 === 0 ? "Under review" : "Distributed",
    });
  }
  return rows;
}

// Simulated risk score (0-99): a status-driven baseline plus a deterministic
// per-case variance so the same scan always shows the same score in a session.
function computeRiskScore(scan) {
  const base = scan.status === "compliant" ? 12 : scan.status === "retake_needed" ? 38 : 58;
  const variance = hashSeed(scan.id) % 30;
  return Math.min(97, base + variance);
}

function riskLevel(score) {
  if (score < 35) return "low";
  if (score < 65) return "medium";
  return "high";
}

// Hardcoded fleet of certified scales tracked for calibration — one per
// region, deliberately dated to straddle "overdue" and "due soon" relative
// to today so the widget always has something to flag in the demo.
const CALIBRATION_DEVICES = [
  { id: "SCALE-BLR-01", region: "Bengaluru", lastCalibrated: "2025-09-10", dueDate: "2026-09-10" },
  { id: "SCALE-CHN-01", region: "Chennai", lastCalibrated: "2026-03-01", dueDate: "2027-03-01" },
  { id: "SCALE-HYD-01", region: "Hyderabad", lastCalibrated: "2025-08-20", dueDate: "2026-08-20" },
  { id: "SCALE-MUM-01", region: "Mumbai", lastCalibrated: "2026-08-25", dueDate: "2026-09-25" },
];

function calibrationStatus(dueDate) {
  const diffDays = Math.round((new Date(dueDate + "T00:00:00") - new Date()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "overdue";
  if (diffDays <= 30) return "due_soon";
  return "ok";
}

// Hardcoded SKUs the (simulated) e-commerce monitor watches — reuses brands
// and categories already seeded elsewhere so a "flagged" listing slots
// straight into the existing brand scorecard / category benchmarks.
const TRACKED_SKUS = [
  { sku: "CRB-CHIPS-52G", brand: "Crunch Bite Snacks Co.", category: "Packaged Snacks", platform: "QuickCart Online" },
  { sku: "MFD-MILK-1L", brand: "Meadow Fresh Dairy", category: "Dairy", platform: "DailyNeeds Mart" },
  { sku: "PGC-CREAM-50ML", brand: "PureGlow Cosmetics", category: "Cosmetics & Personal Care", platform: "GlowBazaar" },
  { sku: "QME-ATTA-1KG", brand: "QuickMart Essentials", category: "E-commerce Grocery", platform: "QuickCart Online" },
];

const ECOMMERCE_DRIFT_TEMPLATES = [
  { field: "Maximum Retail Price (incl. of all taxes)", explanation: "Listing price differs from the last compliant snapshot, indicating possible MRP drift.", value: "See listing snapshot" },
  { field: "Net Quantity", explanation: "Declared net quantity on the listing image is smaller than the last compliant snapshot, indicating possible shrinkflation.", value: "See listing snapshot" },
  { field: "Consumer Care Details", explanation: "Consumer care contact was present in the last compliant snapshot but is missing from the current listing.", value: null },
];

// Simulates one "scheduled job run" of the e-commerce monitor picking a
// tracked SKU, comparing it to a fictitious last-compliant snapshot, and
// auto-creating a flagged case — reusing the exact scan shape every other
// view already knows how to render.
function generateEcommerceCase(sku) {
  const seed = hashSeed(sku.sku + Date.now() + Math.random());
  const template = ECOMMERCE_DRIFT_TEMPLATES[seed % ECOMMERCE_DRIFT_TEMPLATES.length];
  const overrides = { [template.field]: { status: "non_compliant", explanation: template.explanation, value: template.value } };
  const fields = buildFields(overrides);
  return {
    id: "ecm-" + Date.now() + "-" + (seed % 1000),
    brand: sku.brand,
    category: sku.category,
    region: REGIONS[seed % REGIONS.length],
    date: new Date().toISOString().slice(0, 10),
    inspector: "E-commerce Monitor (auto)",
    status: computeOverallStatus(fields),
    fields,
    retakeReason: null,
    hash: FAKE_HASHES[seed % FAKE_HASHES.length],
    gps: "Not applicable (online listing)",
    timestamp: new Date().toISOString(),
    imageDataUrl: null,
    source: "ecommerce_monitor",
    sku: sku.sku,
    platform: sku.platform,
  };
}

/* ---------------------------------------------------------------- */
/* small UI pieces                                                    */
/* ---------------------------------------------------------------- */

// A faithful miniature of the Inspector's actual scan-review card — used as the
// landing page's hero visual instead of an abstract graphic, so the first thing
// a visitor sees is the real product, not a marketing illustration.
// SVG-noise data URI used as a fine grain texture over the dark bands — a
// deliberate, hand-tuned visual asset (not a stock photo) that gives flat
// navy panels the depth and material feel of a printed official document.
const GRAIN_SVG = "<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'>" +
  "<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/>" +
  "<feColorMatrix type='saturate' values='0'/></filter>" +
  "<rect width='100%' height='100%' filter='url(#n)'/></svg>";
const GRAIN_URL = "url(\"data:image/svg+xml," + encodeURIComponent(GRAIN_SVG) + "\")";

function GrainOverlay() {
  return <div className="lm-grain" style={{ backgroundImage: GRAIN_URL }} aria-hidden="true" />;
}

// A large, mostly-cropped emblem bleeding off the hero's edge — a genuine
// crafted graphic (concentric rings + radial ticks, like an embossed seal),
// used at low opacity as background texture rather than as the hero's main
// visual, so it reads as material detail, not a cartoon mascot.
function HeroWatermark() {
  const cx = 260, cy = 260;
  const ticks = Array.from({ length: 60 }).map((_, i) => {
    const angle = (i * 360) / 60;
    const rad = (angle * Math.PI) / 180;
    const major = i % 5 === 0;
    const r1 = 250, r2 = major ? 224 : 236;
    return {
      key: i,
      x1: cx + r1 * Math.cos(rad), y1: cy + r1 * Math.sin(rad),
      x2: cx + r2 * Math.cos(rad), y2: cy + r2 * Math.sin(rad),
    };
  });
  return (
    <svg className="lm-hero-watermark" viewBox="0 0 520 520" aria-hidden="true">
      {ticks.map((t) => (
        <line key={t.key} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke="#F1EEE4" strokeWidth="1.5" />
      ))}
      <circle cx={cx} cy={cy} r="210" fill="none" stroke="#F1EEE4" strokeWidth="1" />
      <circle cx={cx} cy={cy} r="176" fill="none" stroke="var(--brass-soft)" strokeWidth="1" strokeDasharray="2 8" />
    </svg>
  );
}

function ScanPreviewCard() {
  const rows = [
    { label: "Net quantity", value: "500 g", ok: true },
    { label: "MRP (incl. of taxes)", value: "₹145.00", ok: true },
    { label: "Manufacturer address", value: "Missing", ok: false, cite: "Rule 6(1)(a)(ii)" },
    { label: "Country of origin", value: "India", ok: true },
  ];
  return (
    <div className="lm-preview">
      <div className="lm-preview-head">
        <span className="lm-preview-live" aria-hidden="true" />
        <span className="lm-preview-id">LM-2026-00482</span>
        <span className="lm-preview-badge">Retake required</span>
      </div>
      <div className="lm-preview-rows">
        {rows.map((r) => (
          <div className="lm-preview-row" key={r.label}>
            <div className={"lm-preview-check " + (r.ok ? "lm-preview-check-ok" : "lm-preview-check-bad")}>
              {r.ok ? <Check size={11} /> : <X size={11} />}
            </div>
            <div className="lm-preview-row-text">
              <div className="lm-preview-row-label">{r.label}</div>
              {r.cite && <div className="lm-preview-row-cite">{r.cite}</div>}
            </div>
            <div className="lm-preview-row-value">{r.value}</div>
          </div>
        ))}
      </div>
      <div className="lm-preview-foot">
        <span>OCR confidence 98.2%</span>
        <span>Reviewed in 0.4s</span>
      </div>
    </div>
  );
}

function LandingScreen({ onEnter }) {
  const [statsRef, statsVisible] = useRevealOnScroll();
  const [stepsRef, stepsVisible] = useRevealOnScroll();
  const [ctaRef, ctaVisible] = useRevealOnScroll();
  const declCount = useCountUp(18, statsVisible, 900);
  const labelCount = useCountUp(42000, statsVisible, 1400);
  const roleCount = useCountUp(3, statsVisible, 700);

  return (
    <div className="lm-landing">
      <div className="lm-landing-hero-band">
        <GrainOverlay />
        <HeroWatermark />
        <div className="lm-landing-inner lm-landing-topbar">
          <div className="lm-landing-brand">
            <div className="lm-landing-mark"><Scale size={14} color="var(--navy-deep)" /></div>
            <span className="lm-landing-wordmark">METRIQ&nbsp;<span className="lm-landing-wordmark-ai">AI</span></span>
          </div>
          <div className="lm-landing-topbar-meta">Legal Metrology Division · Field Compliance Platform</div>
        </div>

        <div className="lm-landing-inner lm-landing-hero">
          <div className="lm-landing-hero-left">
            <div className="lm-landing-eyebrow lm-in" style={{ animationDelay: "0s" }}>Legal Metrology (Packaging &amp; Commodities) Rules, 2011</div>
            <h1 className="lm-landing-title lm-in" style={{ animationDelay: "0.08s" }}>Packaged commodity compliance, verified at the point of inspection.</h1>
            <p className="lm-landing-sub lm-in" style={{ animationDelay: "0.16s" }}>
              METRIQ AI scans a label, checks every mandatory declaration against the current rule
              set, and produces an audit-ready case file — before the inspector leaves the shop floor.
            </p>
            <div className="lm-landing-cta-row lm-in" style={{ animationDelay: "0.24s" }}>
              <button className="lm-landing-cta-primary" onClick={onEnter}>
                Enter console <ChevronRight size={15} />
              </button>
              <button className="lm-landing-cta-secondary" onClick={onEnter}>See how it works</button>
            </div>
            <div className="lm-landing-meta-row lm-in" style={{ animationDelay: "0.32s" }}>
              <span>Legal Metrology Act, 2009</span>
              <span className="lm-landing-meta-dot" />
              <span>Packaging &amp; Commodities Rules, 2011</span>
              <span className="lm-landing-meta-dot" />
              <span>Field-deployed since 2024</span>
            </div>
          </div>
          <div className="lm-landing-hero-right lm-in" style={{ animationDelay: "0.2s" }}>
            <div className="lm-landing-preview-label">Live scan review</div>
            <ScanPreviewCard />
          </div>
        </div>
      </div>

      <div ref={statsRef} className={"lm-landing-stats-band lm-reveal" + (statsVisible ? " lm-reveal-in" : "")}>
        <div className="lm-landing-inner lm-landing-stats">
          <div className="lm-landing-stat">
            <div className="lm-landing-stat-value">{declCount}</div>
            <div className="lm-landing-stat-label">Mandatory declarations checked per label</div>
          </div>
          <div className="lm-landing-stat">
            <div className="lm-landing-stat-value">{labelCount.toLocaleString("en-IN")}+</div>
            <div className="lm-landing-stat-label">Labels verified to date</div>
          </div>
          <div className="lm-landing-stat">
            <div className="lm-landing-stat-value">{roleCount}</div>
            <div className="lm-landing-stat-label">Roles in one chain of custody</div>
          </div>
        </div>
      </div>

      <div className="lm-landing-inner lm-landing-steps">
        <div className="lm-landing-steps-head">
          <div className="lm-landing-eyebrow">How verification works</div>
          <h2 className="lm-h2" style={{ margin: 0 }}>From label scan to closed case</h2>
        </div>
        <div ref={stepsRef} className={"lm-landing-timeline" + (stepsVisible ? " lm-timeline-in" : "")}>
          <div className="lm-landing-timeline-line" aria-hidden="true" />
          <div className="lm-landing-step">
            <div className="lm-landing-step-node"><ScanLine size={17} color="var(--navy-deep)" /></div>
            <div className="lm-landing-step-no">01 · Scan</div>
            <div className="lm-landing-step-title">Capture in the field</div>
            <div className="lm-landing-step-sub">Inspectors photograph the label on-site; OCR extracts every declared field with a timestamp and GPS record.</div>
          </div>
          <div className="lm-landing-step">
            <div className="lm-landing-step-node"><GaugeCircle size={17} color="var(--navy-deep)" /></div>
            <div className="lm-landing-step-no">02 · Cross-check</div>
            <div className="lm-landing-step-title">Verify against the rules</div>
            <div className="lm-landing-step-sub">Each field is checked against the current rule set, with a citation attached to every flagged discrepancy.</div>
          </div>
          <div className="lm-landing-step">
            <div className="lm-landing-step-node"><Gavel size={17} color="var(--navy-deep)" /></div>
            <div className="lm-landing-step-no">03 · Resolve</div>
            <div className="lm-landing-step-title">Escalate and close</div>
            <div className="lm-landing-step-sub">Supervisors assign penalty bands and rule admins verify and publish amendments — all logged to the case file.</div>
          </div>
        </div>
      </div>

      <div ref={ctaRef} className={"lm-landing-cta-band lm-reveal" + (ctaVisible ? " lm-reveal-in" : "")}>
        <GrainOverlay />
        <div className="lm-landing-inner lm-landing-cta-band-inner">
          <div className="lm-landing-eyebrow">Ready when you are</div>
          <h2 className="lm-landing-cta-title">Enter the console to begin a scan, review a caseload, or publish a rule.</h2>
          <button className="lm-landing-cta-primary" onClick={onEnter}>
            Enter console <ChevronRight size={15} />
          </button>
        </div>
      </div>

      <div className="lm-landing-inner lm-landing-footer">
        <span>Legal Metrology Division</span>
        <span>Legal Metrology Act, 2009 · Packaging &amp; Commodities Rules, 2011</span>
      </div>
    </div>
  );
}

function TickDivider() {
  return (
    <svg className="lm-tick" viewBox="0 0 400 12" preserveAspectRatio="none" aria-hidden="true">
      <line x1="0" y1="6" x2="400" y2="6" stroke="var(--border)" strokeWidth="1" />
      {Array.from({ length: 21 }).map((_, i) => (
        <line key={i} x1={i * 20} y1={i % 5 === 0 ? 1 : 3} x2={i * 20} y2={11} stroke="var(--brass)" strokeWidth="1" opacity={i % 5 === 0 ? 0.8 : 0.35} />
      ))}
    </svg>
  );
}

function Stamp({ status }) {
  const cfg = {
    compliant: { label: "COMPLIANT", color: "var(--green)" },
    non_compliant: { label: "NON-COMPLIANT", color: "var(--red)" },
    retake_needed: { label: "RETAKE REQUIRED", color: "var(--brass)" },
  }[status];
  return (
    <div className="lm-stamp" style={{ color: cfg.color, borderColor: cfg.color }}>
      {cfg.label}
    </div>
  );
}

function StatusIcon({ status, size = 16 }) {
  if (status === "compliant") return <CheckCircle2 size={size} color="var(--green)" />;
  if (status === "retake_needed") return <AlertTriangle size={size} color="var(--brass)" />;
  return <XCircle size={size} color="var(--red)" />;
}

function FieldRow({ field }) {
  const citation = RULE_CITATIONS[field.name];
  return (
    <div className="lm-field-row">
      <div className="lm-field-top">
        <StatusIcon status={field.status === "compliant" ? "compliant" : "non_compliant"} />
        <span className="lm-field-name">{field.name}</span>
        <span className={"lm-field-badge lm-badge-" + field.status}>{field.status.replace("_", " ")}</span>
      </div>
      {field.value && <div className="lm-field-value">Read: {field.value}</div>}
      <div className="lm-field-explain">{field.explanation}</div>
      {citation && <div className="lm-field-citation">{citation.rule}, {citation.act}</div>}
    </div>
  );
}

// Single source of truth for a scan's tamper-evidence record — hash, capture
// time/location, and (when available) the on-screen nonce generated at the
// moment the inspection started. Used both on the live result screen and in
// CaseDetail, so there is one labeled box instead of two overlapping ones.
function IntegrityBadge({ scan }) {
  return (
    <div className="lm-integrity">
      <div className="lm-integrity-label"><ShieldCheck size={12} /> Digital integrity record</div>
      <div className="lm-integrity-row"><Hash size={13} /><span title={scan.hash}>{scan.hash.slice(0, 16)}…</span></div>
      <div className="lm-integrity-row"><Clock size={13} /><span>{new Date(scan.timestamp).toLocaleString("en-IN")}</span></div>
      <div className="lm-integrity-row"><MapPin size={13} /><span>{scan.gps}</span></div>
      {scan.nonce && <div className="lm-integrity-row"><Fingerprint size={13} /><span>On-screen nonce: {scan.nonce}</span></div>}
    </div>
  );
}

// Shown the moment an inspection starts, before a hash exists yet (the image
// is still being analyzed) — GPS, timestamp, and an on-screen nonce, echoing
// the diagram's "Inspector logs in / Starts inspection: GPS, timestamp,
// on-screen nonce" step. Once analysis completes, this same data folds into
// IntegrityBadge above rather than showing twice.
function CaptureMetaBadge({ meta }) {
  if (!meta) return null;
  return (
    <div className="lm-integrity" style={{ marginBottom: 14 }}>
      <div className="lm-integrity-label"><ShieldCheck size={12} /> Inspection started</div>
      <div className="lm-integrity-row"><MapPin size={13} /><span>{meta.gps}</span></div>
      <div className="lm-integrity-row"><Clock size={13} /><span>{new Date(meta.timestamp).toLocaleString("en-IN")}</span></div>
      <div className="lm-integrity-row"><Fingerprint size={13} /><span>On-screen nonce: {meta.nonce}</span></div>
    </div>
  );
}

function RiskScoreBadge({ score, size = "normal" }) {
  const level = riskLevel(score);
  const label = { low: "Low risk", medium: "Medium risk", high: "High risk" }[level];
  return (
    <div className={"lm-risk-badge lm-risk-" + level + (size === "small" ? " lm-risk-small" : "")}>
      <GaugeCircle size={size === "small" ? 12 : 14} />
      <span className="lm-risk-score">{score}</span>
      <span className="lm-risk-label">{label}</span>
    </div>
  );
}

// A visually-plausible but purely decorative QR pattern, deterministically
// seeded so the same sample always renders the same "code" — this is a demo
// stand-in, not a real scannable QR.
function PseudoQR({ seed, size = 96 }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const cells = 14;
    const cellSize = size / cells;
    let h = hashSeed(seed || "sample") || 1;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = "#181B22";
    for (let y = 0; y < cells; y++) {
      for (let x = 0; x < cells; x++) {
        h = (Math.imul(h, 1103515245) + 12345) >>> 0;
        if (h % 2 === 0) ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      }
    }
    function finder(px, py) {
      ctx.fillStyle = "#181B22";
      ctx.fillRect(px, py, cellSize * 3, cellSize * 3);
      ctx.fillStyle = "#fff";
      ctx.fillRect(px + cellSize * 0.5, py + cellSize * 0.5, cellSize * 2, cellSize * 2);
      ctx.fillStyle = "#181B22";
      ctx.fillRect(px + cellSize, py + cellSize, cellSize, cellSize);
    }
    finder(0, 0);
    finder(size - cellSize * 3, 0);
    finder(0, size - cellSize * 3);
  }, [seed, size]);
  return <canvas ref={canvasRef} width={size} height={size} className="lm-qr-canvas" />;
}

function ChainOfCustody({ sampleId }) {
  return (
    <div className="lm-custody">
      <PseudoQR seed={sampleId} />
      <div className="lm-custody-info">
        <div className="lm-ruleadmin-col-label"><QrCode size={13} /> Physical sample tag</div>
        <div className="lm-custody-id">{sampleId}</div>
        <div className="lm-field-explain">Chain-of-custody tag for the physical sample sent to a government lab.</div>
      </div>
    </div>
  );
}

function SourceBadge({ scan, size = "normal" }) {
  if (scan.source !== "ecommerce_monitor") return null;
  return (
    <span className={"lm-source-badge" + (size === "small" ? " lm-source-badge-small" : "")} title={"Auto-flagged from " + (scan.platform || "an online listing")}>
      <ShoppingCart size={size === "small" ? 11 : 12} /> E-commerce Monitor
    </span>
  );
}

function BatchLedger({ brand }) {
  const rows = getBatchLedger(brand);
  return (
    <div className="lm-ledger">
      <div className="lm-ruleadmin-col-label"><Link2 size={13} /> Linked manufacturer/brand batch ledger</div>
      <div className="lm-table-wrap">
        <table className="lm-table">
          <thead><tr><th>Batch / Lot</th><th>Packed</th><th>Units distributed</th><th>Status</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.batch}>
                <td>{r.batch}</td>
                <td>{formatDate(r.date)}</td>
                <td>{r.units.toLocaleString("en-IN")}</td>
                <td>{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* inspector modals: retake reason, confirm/override, hold notice     */
/* ---------------------------------------------------------------- */

function RetakeReasonModal({ image, backendReason, onConfirm }) {
  useBodyScrollLock();
  const [reason, setReason] = useState(null);
  return (
    <div className="lm-modal-scrim">
      <div className="lm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="lm-modal-head">
          <h3 className="lm-h3" style={{ margin: 0 }}>Image usable?</h3>
        </div>
        {image && <img src={image.dataUrl} alt="Captured label" className="lm-preview" />}
        <Stamp status="retake_needed" />
        <p className="lm-retake-reason">{backendReason}</p>
        <div className="lm-field-name" style={{ marginBottom: 8 }}>Tag the reason so the case record is complete:</div>
        <div className="lm-chip-row">
          {RETAKE_REASON_OPTIONS.map((r) => (
            <button key={r} className={"lm-chip" + (reason === r ? " lm-chip-active" : "")} onClick={() => setReason(r)}>{r}</button>
          ))}
        </div>
        <button className="lm-btn lm-btn-primary" disabled={!reason} onClick={() => onConfirm(reason)}>
          <RotateCcw size={15} /> Retake photo
        </button>
      </div>
    </div>
  );
}

function ConfirmViolationModal({ fields, onConfirm, onDispute, onClose }) {
  useBodyScrollLock();
  const [showOverride, setShowOverride] = useState(false);
  const [note, setNote] = useState("");
  const flagged = fields.filter((f) => f.status !== "compliant");
  return (
    <div className="lm-modal-scrim" onClick={onClose}>
      <div className="lm-modal lm-modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="lm-modal-head">
          <h3 className="lm-h3" style={{ margin: 0 }}>Confirm violation</h3>
          <button className="lm-icon-btn" onClick={onClose}><X size={17} /></button>
        </div>
        <p className="lm-retake-reason" style={{ margin: "0 0 12px" }}>
          {flagged.length} declaration{flagged.length === 1 ? "" : "s"} flagged below the compliance threshold. Confirm the violation to proceed to a hold notice, or dispute it if the finding looks wrong.
        </p>
        <div className="lm-fields">
          {flagged.map((f) => <FieldRow key={f.name} field={f} />)}
        </div>
        {!showOverride ? (
          <div className="lm-btn-row" style={{ justifyContent: "flex-start" }}>
            <button className="lm-btn lm-btn-primary" onClick={onConfirm}><Check size={14} /> Confirm violation</button>
            <button className="lm-btn" onClick={() => setShowOverride(true)}><Ban size={14} /> Dispute / override</button>
          </div>
        ) : (
          <div className="lm-ruleadmin-review">
            <div className="lm-ruleadmin-review-label"><AlertTriangle size={14} color="var(--brass)" /> Override reason</div>
            <div className="lm-form-row">
              <label>Reason</label>
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Physical label matches Rules; scan misread the print" />
            </div>
            <div className="lm-btn-row" style={{ justifyContent: "flex-start" }}>
              <button className="lm-btn lm-btn-primary" onClick={() => onDispute(note.trim() || "No reason given.")}>
                <Send size={14} /> Submit dispute
              </button>
              <button className="lm-btn" onClick={() => setShowOverride(false)}>Back</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function HoldNoticeModal({ scanMeta, onIssue, onClose }) {
  useBodyScrollLock();
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const [signed, setSigned] = useState(false);
  const [issued, setIssued] = useState(null);

  function pos(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }
  function startDraw(e) {
    drawingRef.current = true;
    const ctx = canvasRef.current.getContext("2d");
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }
  function draw(e) {
    if (!drawingRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.strokeStyle = "#181B22";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.stroke();
    setSigned(true);
  }
  function endDraw() {
    drawingRef.current = false;
  }
  function useSample() {
    const ctx = canvasRef.current.getContext("2d");
    ctx.strokeStyle = "#181B22";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(20, 55);
    ctx.bezierCurveTo(50, 10, 70, 90, 100, 40);
    ctx.bezierCurveTo(120, 5, 150, 60, 190, 45);
    ctx.bezierCurveTo(210, 35, 220, 55, 250, 50);
    ctx.stroke();
    setSigned(true);
  }
  function clearSignature() {
    const canvas = canvasRef.current;
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    setSigned(false);
  }
  function handleIssue() {
    const noticeId = "HN-" + Date.now().toString().slice(-6);
    setIssued(noticeId);
    onIssue(noticeId);
  }

  return (
    <div className="lm-modal-scrim">
      <div className="lm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="lm-modal-head">
          <h3 className="lm-h3" style={{ margin: 0 }}>Signed hold notice</h3>
          {issued && <button className="lm-icon-btn" onClick={onClose}><X size={17} /></button>}
        </div>
        {!issued ? (
          <>
            <div className="lm-notice-preview">
              <div className="lm-notice-title">HOLD NOTICE</div>
              <div className="lm-notice-line">Brand: {scanMeta.brand}</div>
              <div className="lm-notice-line">Category: {scanMeta.category}</div>
              <div className="lm-notice-line">Region: {scanMeta.region}</div>
              <div className="lm-notice-line">Issued by: {scanMeta.inspector}</div>
              <div className="lm-notice-line">Basis: Non-compliance under the Legal Metrology (Packaged Commodities) Rules, 2011</div>
            </div>
            <div className="lm-ruleadmin-col-label" style={{ marginBottom: 6 }}><PenLine size={13} /> Sign to certify this notice</div>
            <canvas
              ref={canvasRef}
              width={280} height={100}
              className="lm-sig-canvas"
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={endDraw}
              onMouseLeave={endDraw}
            />
            <div className="lm-btn-row" style={{ justifyContent: "flex-start", marginTop: 8 }}>
              <button className="lm-btn" onClick={useSample}><PenLine size={13} /> Use sample signature</button>
              <button className="lm-btn" onClick={clearSignature}><Eraser size={13} /> Clear</button>
            </div>
            <button className="lm-btn lm-btn-primary" disabled={!signed} onClick={handleIssue} style={{ marginTop: 12 }}>
              <Flag size={14} /> Issue hold notice
            </button>
          </>
        ) : (
          <div className="lm-saved-row" style={{ flexDirection: "column", alignItems: "flex-start" }}>
            <span className="lm-saved-msg"><CheckCircle2 size={15} color="var(--green)" /> Hold notice {issued} issued and signed on the spot</span>
            <button className="lm-btn" onClick={onClose}>Done</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* supervisor modals: escalate, assign, penalty band                  */
/* ---------------------------------------------------------------- */

function EscalateModal({ scan, onConfirm, onClose }) {
  useBodyScrollLock();
  const [reason, setReason] = useState("");
  return (
    <div className="lm-modal-scrim" onClick={onClose}>
      <div className="lm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="lm-modal-head">
          <h3 className="lm-h3" style={{ margin: 0 }}>Escalate case</h3>
          <button className="lm-icon-btn" onClick={onClose}><X size={17} /></button>
        </div>
        <p className="lm-retake-reason" style={{ margin: "0 0 12px" }}>
          Escalate <strong>{scan.brand}</strong> ({formatDate(scan.date)}) to the jurisdictional Legal Metrology officer for formal action.
        </p>
        <div className="lm-form-row" style={{ alignItems: "flex-start" }}>
          <label style={{ paddingTop: 7 }}>Reason</label>
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Repeat offender, warrants prosecution referral" />
        </div>
        <div className="lm-btn-row" style={{ justifyContent: "flex-start", marginTop: 8 }}>
          <button className="lm-btn lm-btn-primary" onClick={() => onConfirm(reason.trim() || "No reason given.")}>
            <Flag size={14} /> Confirm escalation
          </button>
          <button className="lm-btn" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function AssignModal({ scan, onConfirm, onClose }) {
  useBodyScrollLock();
  const [picked, setPicked] = useState(scan.assignedTo || scan.inspector);
  return (
    <div className="lm-modal-scrim" onClick={onClose}>
      <div className="lm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="lm-modal-head">
          <h3 className="lm-h3" style={{ margin: 0 }}>Assign / reassign inspection</h3>
          <button className="lm-icon-btn" onClick={onClose}><X size={17} /></button>
        </div>
        <p className="lm-retake-reason" style={{ margin: "0 0 12px" }}>
          Currently on record: <strong>{scan.assignedTo || scan.inspector}</strong>
        </p>
        <div className="lm-assign-list">
          {AVAILABLE_INSPECTORS.map((name) => (
            <label key={name} className={"lm-assign-item" + (picked === name ? " lm-assign-item-active" : "")}>
              <input type="radio" name="assign-inspector" checked={picked === name} onChange={() => setPicked(name)} />
              {name}
            </label>
          ))}
        </div>
        <div className="lm-btn-row" style={{ justifyContent: "flex-start", marginTop: 12 }}>
          <button className="lm-btn lm-btn-primary" onClick={() => onConfirm(picked)}><UserCheck size={14} /> Confirm assignment</button>
          <button className="lm-btn" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function PenaltyModal({ scan, onConfirm, onClose }) {
  useBodyScrollLock();
  const [picked, setPicked] = useState(scan.penaltyBand || PENALTY_BANDS[1].label);
  return (
    <div className="lm-modal-scrim" onClick={onClose}>
      <div className="lm-modal lm-modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="lm-modal-head">
          <h3 className="lm-h3" style={{ margin: 0 }}>Set penalty band</h3>
          <button className="lm-icon-btn" onClick={onClose}><X size={17} /></button>
        </div>
        <div className="lm-assign-list">
          {PENALTY_BANDS.map((b) => (
            <label key={b.id} className={"lm-assign-item" + (picked === b.label ? " lm-assign-item-active" : "")} style={{ alignItems: "flex-start" }}>
              <input type="radio" name="penalty-band" checked={picked === b.label} onChange={() => setPicked(b.label)} style={{ marginTop: 3 }} />
              <div>
                <div className="lm-field-name">{b.label} <span className="lm-field-value" style={{ margin: 0 }}>{b.range}</span></div>
                <div className="lm-field-explain">{b.desc}</div>
              </div>
            </label>
          ))}
        </div>

        <h3 className="lm-h3" style={{ marginTop: 20 }}>Comparable past cases</h3>
        <div className="lm-table-wrap">
          <table className="lm-table">
            <thead><tr><th>Brand</th><th>Issue</th><th>Band</th><th>Amount</th></tr></thead>
            <tbody>
              {COMPARABLE_PENALTY_CASES.map((c) => (
                <tr key={c.brand}><td>{c.brand}</td><td>{c.issue}</td><td>{c.band}</td><td>{c.amount}</td></tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="lm-btn-row" style={{ justifyContent: "flex-start", marginTop: 12 }}>
          <button className="lm-btn lm-btn-primary" onClick={() => onConfirm(picked)}><Gavel size={14} /> Confirm penalty band</button>
          <button className="lm-btn" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

const PDF_COLORS = {
  navy: [31, 46, 74],
  navyDeep: [19, 28, 46],
  brass: [173, 127, 51],
  ink: [24, 27, 34],
  inkSoft: [91, 95, 104],
  green: [44, 122, 85],
  red: [178, 58, 52],
  border: [222, 218, 205],
};

const STATUS_LABEL = { compliant: "COMPLIANT", non_compliant: "NON-COMPLIANT", missing: "MISSING", retake_needed: "RETAKE REQUIRED" };

// Builds a formal, paginated PDF inspection report — headed as an official
// Legal Metrology record, with per-declaration statutory citations, a
// signature block, and a digital-integrity section — and triggers its download.
// NOTE: this is a screening-round aid. The disclaimer printed on the report
// itself (and repeated in the app) makes clear it is not a certified legal
// opinion; citations should be verified against the current gazetted Rules
// before use in formal proceedings — see PRD §4 (non-goals) and §11 (roadmap).
function downloadReport(scan) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 18;
  const contentW = pageW - marginX * 2;
  let y = 0;
  let page = 1;

  function newPage() {
    doc.addPage();
    page += 1;
    y = 18;
  }

  function ensureSpace(needed) {
    if (y + needed > pageH - 22) newPage();
  }

  function rule(color = PDF_COLORS.border, weight = 0.3) {
    doc.setDrawColor(...color);
    doc.setLineWidth(weight);
    doc.line(marginX, y, pageW - marginX, y);
  }

  function heading(text) {
    ensureSpace(12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...PDF_COLORS.navyDeep);
    doc.text(text.toUpperCase(), marginX, y);
    y += 2;
    rule(PDF_COLORS.brass, 0.5);
    y += 6;
  }

  function paragraph(text, opts = {}) {
    const size = opts.size || 9.5;
    const color = opts.color || PDF_COLORS.ink;
    const gap = opts.gap ?? 5;
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, opts.width || contentW);
    ensureSpace(lines.length * gap + 2);
    doc.text(lines, marginX, y);
    y += lines.length * gap + (opts.spaceAfter ?? 3);
  }

  function bulletList(items) {
    items.forEach((item) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...PDF_COLORS.ink);
      const lines = doc.splitTextToSize(item, contentW - 5);
      ensureSpace(lines.length * 4.6 + 1);
      doc.text("•", marginX, y);
      doc.text(lines, marginX + 4, y);
      y += lines.length * 4.6 + 2;
    });
    y += 2;
  }

  function labelValueRow(pairs) {
    const colW = contentW / 2;
    ensureSpace(6);
    pairs.forEach(([label, value], i) => {
      const x = marginX + (i % 2) * colW;
      const rowY = y;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...PDF_COLORS.inkSoft);
      doc.text(label.toUpperCase(), x, rowY);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...PDF_COLORS.ink);
      doc.text(String(value || "N/A"), x, rowY + 5);
      if (i % 2 === 1) y += 12;
    });
    if (pairs.length % 2 === 1) y += 12;
  }

  // ---- header ------------------------------------------------------
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...PDF_COLORS.inkSoft);
  doc.text("LEGAL METROLOGY · FIELD COMPLIANCE ENFORCEMENT", pageW / 2, 16, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.setTextColor(...PDF_COLORS.navyDeep);
  doc.text("COMPLIANCE INSPECTION REPORT", pageW / 2, 25, { align: "center" });
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(...PDF_COLORS.inkSoft);
  doc.text("Issued under the Legal Metrology (Packaged Commodities) Rules, 2011", pageW / 2, 31, { align: "center" });
  y = 37;
  rule(PDF_COLORS.brass, 0.8);
  y += 8;

  // ---- case meta -----------------------------------------------------
  labelValueRow([
    ["Report / Case No.", scan.id],
    ["Report Generated", formatDateTime(new Date())],
    ["Brand / Trade Name", scan.brand],
    ["Category of Commodity", scan.category],
    ["Date of Inspection", formatDate(scan.date)],
    ["Region / Jurisdiction", scan.region],
    ["Inspecting Officer", scan.inspector],
    ["Report Status", STATUS_LABEL[scan.status]],
  ]);
  y += 2;

  // ---- verdict box -----------------------------------------------------
  const verdictColor = scan.status === "compliant" ? PDF_COLORS.green : scan.status === "non_compliant" ? PDF_COLORS.red : PDF_COLORS.brass;
  ensureSpace(16);
  doc.setDrawColor(...verdictColor);
  doc.setLineWidth(0.6);
  doc.rect(marginX, y, contentW, 12);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12.5);
  doc.setTextColor(...verdictColor);
  doc.text("OVERALL VERDICT: " + STATUS_LABEL[scan.status], marginX + 4, y + 8);
  y += 20;

  // ---- statutory basis -----------------------------------------------------
  heading("Statutory Basis");
  bulletList(STATUTORY_BASIS);

  // ---- declarations -----------------------------------------------------
  if (scan.status === "retake_needed") {
    heading("Declaration Verification");
    paragraph(
      "The declarations required under Rule 6 of the Legal Metrology (Packaged Commodities) Rules, 2011 could not be verified from the submitted image. The inspecting officer must obtain a legible photograph and re-submit before a compliance verdict can be recorded.",
      { spaceAfter: 3 }
    );
    paragraph("Reason for retake: " + (scan.retakeReason || "Not specified."), { bold: true, spaceAfter: 3 });
  } else {
    heading("Declaration Verification");
    const cols = [
      { title: "#", w: 8 },
      { title: "Declaration (Rule Reference)", w: 50 },
      { title: "Value Observed", w: 46 },
      { title: "Status", w: 27 },
      { title: "Remarks", w: contentW - 8 - 50 - 46 - 27 },
    ];
    function tableHeader() {
      ensureSpace(9);
      let x = marginX;
      doc.setFillColor(239, 237, 230);
      doc.rect(marginX, y, contentW, 7, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...PDF_COLORS.inkSoft);
      cols.forEach((c) => {
        doc.text(c.title.toUpperCase(), x + 1.5, y + 4.8);
        x += c.w;
      });
      y += 9;
    }
    tableHeader();
    scan.fields.forEach((f, i) => {
      const citation = RULE_CITATIONS[f.name];
      const declText = f.name + (citation ? `\n(${citation.rule})` : "");
      const declLines = doc.splitTextToSize(declText, cols[1].w - 3);
      const valueLines = doc.splitTextToSize(f.value || "N/A", cols[2].w - 3);
      const statusLines = doc.splitTextToSize(f.status.replace("_", " ").toUpperCase(), cols[3].w - 3);
      const remarkLines = doc.splitTextToSize(f.explanation || "", cols[4].w - 3);
      const rowLines = Math.max(declLines.length, valueLines.length, statusLines.length, remarkLines.length, 1);
      const rowH = rowLines * 4 + 3;
      ensureSpace(rowH + 2);
      let x = marginX;
      const rowTop = y;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...PDF_COLORS.ink);
      doc.text(String(i + 1), x + 1.5, rowTop + 4);
      x += cols[0].w;
      doc.text(declLines, x + 1.5, rowTop + 4);
      x += cols[1].w;
      doc.text(valueLines, x + 1.5, rowTop + 4);
      x += cols[2].w;
      const statusColor = f.status === "compliant" ? PDF_COLORS.green : PDF_COLORS.red;
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...statusColor);
      doc.text(statusLines, x + 1.5, rowTop + 4);
      x += cols[3].w;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...PDF_COLORS.ink);
      doc.text(remarkLines, x + 1.5, rowTop + 4);
      y = rowTop + rowH;
      doc.setDrawColor(...PDF_COLORS.border);
      doc.setLineWidth(0.2);
      doc.line(marginX, y, pageW - marginX, y);
      y += 2;
    });
    y += 4;

    // ---- explanatory notes -----------------------------------------------------
    const nonCompliantFields = scan.fields.filter((f) => f.status !== "compliant");
    if (nonCompliantFields.length > 0) {
      heading("Explanatory Notes");
      bulletList(nonCompliantFields.map((f) => {
        const citation = RULE_CITATIONS[f.name];
        return `${f.name}${citation ? ` (${citation.rule})` : ""}: ${f.explanation}`;
      }));
    }

    // ---- photo evidence -----------------------------------------------------
    heading("Photo Evidence");
    if (scan.imageDataUrl) {
      paragraph("The label photograph captured for this inspection is reproduced below as evidence, alongside its digital-integrity record.", { spaceAfter: 4 });
      try {
        const imgProps = doc.getImageProperties(scan.imageDataUrl);
        const maxW = 60;
        const imgH = (imgProps.height / imgProps.width) * maxW;
        ensureSpace(imgH + 6);
        doc.setDrawColor(...PDF_COLORS.border);
        doc.setLineWidth(0.3);
        doc.addImage(scan.imageDataUrl, "JPEG", marginX, y, maxW, imgH);
        doc.rect(marginX, y, maxW, imgH);
        y += imgH + 6;
      } catch (e) {
        paragraph("(Photo could not be embedded in this export.)", { color: PDF_COLORS.inkSoft, spaceAfter: 4 });
      }
    } else {
      paragraph("No photo is on file for this historical record: this case predates in-app image retention, or the record was entered without an attached photograph.", { color: PDF_COLORS.inkSoft, spaceAfter: 4 });
    }
  }

  // ---- digital integrity -----------------------------------------------------
  heading("Digital Integrity Record");
  paragraph(
    "The image captured for this inspection was hashed at the time of scan using SHA-256. Any subsequent alteration of the image file would produce a different hash value, providing a basic tamper-evidence check for this record.",
    { spaceAfter: 4 }
  );
  ensureSpace(24);
  doc.setFillColor(239, 237, 230);
  doc.rect(marginX, y, contentW, 20, "F");
  doc.setFont("courier", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...PDF_COLORS.ink);
  doc.text("SHA-256:  " + scan.hash, marginX + 3, y + 6);
  doc.text("Captured:  " + formatDateTime(new Date(scan.timestamp)), marginX + 3, y + 12);
  doc.text("Location:  " + scan.gps, marginX + 3, y + 18);
  y += 26;

  // ---- signatures -----------------------------------------------------
  heading("Certification");
  ensureSpace(28);
  const sigColW = contentW / 2 - 5;
  [0, 1].forEach((i) => {
    const x = marginX + i * (sigColW + 10);
    doc.setDrawColor(...PDF_COLORS.inkSoft);
    doc.setLineWidth(0.3);
    doc.line(x, y + 16, x + sigColW, y + 16);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...PDF_COLORS.inkSoft);
    doc.text(i === 0 ? "Signature: Inspecting Officer" : "Signature: Reviewing Supervisor", x, y + 20);
    doc.text("Name: " + (i === 0 ? scan.inspector : "_______________________"), x, y + 25);
    doc.text("Date: _______________________", x, y + 29.5);
  });
  y += 34;

  // ---- disclaimer + page numbers on every page -----------------------------------------------------
  const disclaimer =
    "This report was produced by an AI-assisted screening tool as part of a Legal Metrology field-compliance pilot. Extracted values and rule citations are provided to support, not replace, the inspecting officer's judgment, and should be independently verified against the physical sample and the current gazetted Rules before reliance in any formal or legal proceeding.";
  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(...PDF_COLORS.border);
    doc.setLineWidth(0.2);
    doc.line(marginX, pageH - 18, pageW - marginX, pageH - 18);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(6.8);
    doc.setTextColor(...PDF_COLORS.inkSoft);
    const discLines = doc.splitTextToSize(disclaimer, contentW);
    doc.text(discLines, marginX, pageH - 14);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(`Page ${p} of ${totalPages}`, pageW - marginX, pageH - 6, { align: "right" });
  }

  try {
    doc.save(`compliance-report-${scan.id}.pdf`);
  } catch (e) {
    window.alert("Couldn't generate the PDF report in this preview: " + ((e && e.message) || e));
  }
}

// Builds a jurisdiction-level summary PDF for a supervisor — the Dashboard
// equivalent of downloadReport() above, aggregating stats instead of
// reporting on a single case. Reuses the same header/heading/table visual
// language so both PDFs read as one document family.
function downloadDashboardReport(stats) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 18;
  const contentW = pageW - marginX * 2;
  let y = 0;

  function ensureSpace(needed) {
    if (y + needed > pageH - 22) { doc.addPage(); y = 18; }
  }
  function rule(color = PDF_COLORS.border, weight = 0.3) {
    doc.setDrawColor(...color);
    doc.setLineWidth(weight);
    doc.line(marginX, y, pageW - marginX, y);
  }
  function heading(text) {
    ensureSpace(12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...PDF_COLORS.navyDeep);
    doc.text(text.toUpperCase(), marginX, y);
    y += 2;
    rule(PDF_COLORS.brass, 0.5);
    y += 6;
  }
  function table(cols, rows) {
    ensureSpace(9);
    let x = marginX;
    doc.setFillColor(239, 237, 230);
    doc.rect(marginX, y, contentW, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...PDF_COLORS.inkSoft);
    cols.forEach((c) => { doc.text(c.title.toUpperCase(), x + 1.5, y + 4.8); x += c.w; });
    y += 9;
    rows.forEach((row) => {
      ensureSpace(7);
      x = marginX;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...PDF_COLORS.ink);
      row.forEach((cell, i) => { doc.text(String(cell), x + 1.5, y + 4.8); x += cols[i].w; });
      y += 7;
      doc.setDrawColor(...PDF_COLORS.border);
      doc.setLineWidth(0.2);
      doc.line(marginX, y, pageW - marginX, y);
    });
    y += 6;
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...PDF_COLORS.inkSoft);
  doc.text("LEGAL METROLOGY · FIELD COMPLIANCE ENFORCEMENT", pageW / 2, 16, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.setTextColor(...PDF_COLORS.navyDeep);
  doc.text("JURISDICTION SUMMARY REPORT", pageW / 2, 25, { align: "center" });
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(...PDF_COLORS.inkSoft);
  doc.text("Supervisor dashboard export: " + formatDateTime(new Date()), pageW / 2, 31, { align: "center" });
  y = 37;
  rule(PDF_COLORS.brass, 0.8);
  y += 8;

  heading("Headline Metrics");
  table(
    [{ title: "Metric", w: contentW * 0.6 }, { title: "Value", w: contentW * 0.4 }],
    [
      ["Total scans", stats.totalScans],
      ["Non-compliance rate", stats.nonCompliantRate + "%"],
      ["Retake rate", stats.retakeRate + "%"],
      ["Categories tracked", stats.categoryCount],
    ]
  );

  heading("Category Compliance Benchmark");
  table(
    [{ title: "Category", w: contentW * 0.5 }, { title: "Scans", w: contentW * 0.2 }, { title: "Non-compliance rate", w: contentW * 0.3 }],
    stats.byCategory.map((c) => [c.category, c.total, (c.total ? Math.round((c.nonCompliant / c.total) * 100) : 0) + "%"])
  );

  heading("Brand Scorecard (Top Non-Compliant)");
  table(
    [{ title: "Brand", w: contentW * 0.4 }, { title: "Scans", w: contentW * 0.2 }, { title: "Non-compliant", w: contentW * 0.2 }, { title: "Rate", w: contentW * 0.2 }],
    stats.brands.map((b) => [b.brand, b.total, b.nonCompliant, Math.round((b.nonCompliant / b.total) * 100) + "%"])
  );

  heading("Inspector Caseload & Targeting-Bias Review");
  table(
    [{ title: "Inspector", w: contentW * 0.35 }, { title: "Cases", w: contentW * 0.2 }, { title: "Flagged rate", w: contentW * 0.2 }, { title: "Bias flag", w: contentW * 0.25 }],
    stats.inspectorStats.map((r) => [r.inspector, r.total, r.rate + "%", r.biasFlag ? "REVIEW" : "N/A"])
  );

  heading("Equipment Calibration Status");
  table(
    [{ title: "Device", w: contentW * 0.3 }, { title: "Region", w: contentW * 0.2 }, { title: "Due date", w: contentW * 0.25 }, { title: "Status", w: contentW * 0.25 }],
    stats.calibrationDevices.map((d) => [d.id, d.region, formatDate(d.dueDate), calibrationStatus(d.dueDate).replace("_", " ").toUpperCase()])
  );

  const disclaimer = "This jurisdiction summary is produced by an AI-assisted screening tool as part of a Legal Metrology field-compliance pilot, aggregating field-compliance data across the jurisdiction. It is intended to support, not replace, supervisory judgment.";
  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(...PDF_COLORS.border);
    doc.setLineWidth(0.2);
    doc.line(marginX, pageH - 18, pageW - marginX, pageH - 18);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(6.8);
    doc.setTextColor(...PDF_COLORS.inkSoft);
    doc.text(doc.splitTextToSize(disclaimer, contentW), marginX, pageH - 14);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(`Page ${p} of ${totalPages}`, pageW - marginX, pageH - 6, { align: "right" });
  }

  try {
    doc.save(`jurisdiction-summary-${new Date().toISOString().slice(0, 10)}.pdf`);
  } catch (e) {
    window.alert("Couldn't generate the PDF report in this preview: " + ((e && e.message) || e));
  }
}

/* ---------------------------------------------------------------- */
/* scan flow                                                          */
/* ---------------------------------------------------------------- */

function ScanView({ onSave, onUpdateScan }) {
  const [phase, setPhase] = useState("idle"); // idle | analyzing | result | retake | error
  const [image, setImage] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [saveForm, setSaveForm] = useState({ brand: "", category: CATEGORIES[0], region: REGIONS[0] });
  const [saved, setSaved] = useState(false);
  const [savedScanId, setSavedScanId] = useState(null);
  const [violationOpen, setViolationOpen] = useState(false);
  const [violationDecision, setViolationDecision] = useState(null); // null | { type: "confirmed" } | { type: "disputed", note }
  const [holdNoticeOpen, setHoldNoticeOpen] = useState(false);
  const [holdNotice, setHoldNotice] = useState(null);
  const [captureMeta, setCaptureMeta] = useState(null);
  const [scaleReading, setScaleReading] = useState("");
  const [scaleChecked, setScaleChecked] = useState(false);
  const fileInputRef = useRef(null);

  async function runAnalysis(imgData) {
    setImage(imgData);
    setCaptureMeta({
      gps: GPS_BY_REGION[saveForm.region],
      timestamp: new Date().toISOString(),
      nonce: generateNonce(),
    });
    setPhase("analyzing");
    setError("");
    setSaved(false);
    setScaleReading("");
    setScaleChecked(false);
    try {
      const parsed = await analyzeLabelImage(imgData);
      setResult(parsed);
      setPhase(parsed.image_quality === "retake_needed" ? "retake" : "result");
    } catch (e) {
      setError((e && e.message) || "Could not read a structured response from the model. Try again.");
      setPhase("error");
    }
  }

  async function handleFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const name = (file.name || "").toLowerCase();
    if (file.type === "image/heic" || file.type === "image/heif" || name.endsWith(".heic") || name.endsWith(".heif")) {
      setError("This looks like a HEIC/HEIF photo, which browsers can't preview directly. Try “Use camera” instead, or export/share the photo as JPEG first.");
      setPhase("error");
      return;
    }
    try {
      const imgData = await processImageFile(file);
      runAnalysis(imgData);
    } catch (err) {
      setError("Couldn't decode that image file. It may be corrupted or in an unsupported format; try a JPEG or PNG.");
      setPhase("error");
    }
  }

  async function handleSample(type) {
    try {
      const imgData = await processSample(type);
      runAnalysis(imgData);
    } catch (err) {
      setError("Couldn't generate the sample label. Try again.");
      setPhase("error");
    }
  }

  function reset() {
    setPhase("idle");
    setImage(null);
    setResult(null);
    setError("");
    setSaved(false);
    setSavedScanId(null);
    setSaveForm({ brand: "", category: CATEGORIES[0], region: REGIONS[0] });
    setViolationOpen(false);
    setViolationDecision(null);
    setHoldNoticeOpen(false);
    setHoldNotice(null);
    setCaptureMeta(null);
    setScaleReading("");
    setScaleChecked(false);
  }

  function handleRetakeConfirm(reason) {
    reset();
  }

  // The inspector can confirm/dispute a violation and issue a hold notice
  // either before or after saving the case — if it's already saved, push the
  // decision onto the saved scan too, so it isn't lost once this view resets
  // (mirrors how the Supervisor's escalate/assign/penalty actions persist).
  function handleConfirmViolation() {
    setViolationOpen(false);
    setViolationDecision({ type: "confirmed" });
    setHoldNoticeOpen(true);
    if (savedScanId) onUpdateScan(savedScanId, { violationConfirmed: true, violationDisputed: false, disputeNote: null });
  }

  function handleDisputeViolation(note) {
    setViolationOpen(false);
    setViolationDecision({ type: "disputed", note });
    if (savedScanId) onUpdateScan(savedScanId, { violationDisputed: true, violationConfirmed: false, disputeNote: note });
  }

  function handleIssueHoldNotice(noticeId) {
    setHoldNotice(noticeId);
    if (savedScanId) onUpdateScan(savedScanId, { holdNoticeId: noticeId });
  }

  function handleSaveCase() {
    const fields = result.fields;
    const status = computeOverallStatus(fields);
    const id = "live-" + Date.now();
    const scan = {
      id,
      brand: saveForm.brand.trim() || "Unlabeled sample",
      category: saveForm.category,
      region: saveForm.region,
      date: new Date().toISOString().slice(0, 10),
      inspector: "You",
      status,
      fields,
      retakeReason: null,
      hash: image.hashHex,
      gps: GPS_BY_REGION[saveForm.region],
      timestamp: new Date().toISOString(),
      imageDataUrl: image.dataUrl,
      sampleId: "SMP-" + image.hashHex.slice(0, 8).toUpperCase(),
      nonce: captureMeta?.nonce,
      violationConfirmed: violationDecision?.type === "confirmed",
      violationDisputed: violationDecision?.type === "disputed",
      disputeNote: violationDecision?.type === "disputed" ? violationDecision.note : null,
      holdNoticeId: holdNotice,
    };
    onSave(scan);
    setSaved(true);
    setSavedScanId(id);
  }

  return (
    <div className="lm-panel">
      <div className="lm-eyebrow">Inspector · New scan</div>

      <h2 className="lm-h2">Scan a packaged commodity label</h2>
      <TickDivider />

      {phase === "idle" && (
        <div className="lm-scan-idle">
          <div className="lm-upload-box">
            <ScanLine size={28} color="var(--navy)" />
            <p className="lm-upload-text">Upload a photo, or capture one live</p>
            <div className="lm-btn-row">
              <button className="lm-btn lm-btn-primary" onClick={() => fileInputRef.current.click()}>
                <Upload size={15} /> Upload photo
              </button>
              <button className="lm-btn lm-btn-primary" onClick={() => fileInputRef.current.click()}>
                <Camera size={15} /> Use camera
              </button>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={handleFile} />
          </div>

          <div className="lm-samples">
            <div className="lm-samples-label">No photo handy? Try a generated sample label</div>
            <div className="lm-btn-row">
              <button className="lm-btn" onClick={() => handleSample("clean")}>Compliant sample</button>
              <button className="lm-btn" onClick={() => handleSample("missing_care")}>Non-compliant sample</button>
              <button className="lm-btn" onClick={() => handleSample("blurry")}>Blurry sample</button>
            </div>
          </div>
        </div>
      )}

      {phase === "analyzing" && (
        <div className="lm-analyzing">
          {image && <img src={image.dataUrl} alt="Label being analyzed" className="lm-preview" />}
          <CaptureMetaBadge meta={captureMeta} />
          <div className="lm-analyzing-status"><Loader2 className="lm-spin" size={18} /> Reading declarations against the 2011 Rules…</div>

        </div>
      )}

      {phase === "error" && (
        <div className="lm-error">
          <AlertTriangle size={18} color="var(--red)" />
          <span>{error}</span>
          <button className="lm-btn" onClick={reset}>Try again</button>
        </div>
      )}

      {phase === "retake" && result && (
        <RetakeReasonModal image={image} backendReason={result.retake_reason} onConfirm={handleRetakeConfirm} />
      )}

      {phase === "result" && result && (() => {
        const declaredQty = parseQuantity(result.fields.find((f) => f.name === "Net Quantity")?.value);
        const scaleValue = scaleReading ? parseFloat(scaleReading) : null;
        const exemptBasisValue = scaleValue ?? declaredQty?.value ?? null;
        const isExempt = isExemptQuantity(exemptBasisValue);
        const tolerance = declaredQty ? declaredQty.value * 0.05 : 0;
        const withinTolerance = declaredQty && scaleValue != null ? Math.abs(scaleValue - declaredQty.value) <= tolerance : null;
        return (
        <div className="lm-result">
          <div className="lm-result-top">
            {image && <img src={image.dataUrl} alt="Scanned label" className="lm-preview" />}
            <Stamp status={computeOverallStatus(result.fields)} />
          </div>

          <div className={"lm-exempt-badge " + (isExempt ? "lm-exempt-yes" : "lm-exempt-no")}>
            <PackageSearch size={12} /> {isExempt ? "Exempt commodity (≤10g/10ml)" : "In scope"}
          </div>

          <div className="lm-fields">
            {result.fields.map((f) => <FieldRow key={f.name} field={f} />)}
          </div>
          <IntegrityBadge scan={{ hash: image.hashHex, timestamp: new Date().toISOString(), gps: GPS_BY_REGION[saveForm.region], nonce: captureMeta?.nonce }} />

          <div className="lm-scale-section">
            <div className="lm-ruleadmin-col-label"><Scale size={13} /> Weigh on certified scale (optional)</div>
            <div className="lm-scale-row">
              <input
                type="number"
                value={scaleReading}
                onChange={(e) => { setScaleReading(e.target.value); setScaleChecked(false); }}
                placeholder={declaredQty ? String(declaredQty.value) : "e.g. 50"}
              />
              <span className="lm-scale-unit">{declaredQty?.unit || "g"}</span>
              <button className="lm-btn" disabled={!scaleReading} onClick={() => setScaleChecked(true)}>Compare to declared</button>
            </div>
            {scaleChecked && declaredQty && (
              <div className={"lm-decision-badge " + (withinTolerance ? "lm-decision-confirmed" : "lm-decision-disputed")} style={{ marginBottom: 0 }}>
                {withinTolerance
                  ? <><Check size={13} /> Matches declared net quantity (within 5% tolerance)</>
                  : <><AlertTriangle size={13} /> Shortfall of {Math.abs(scaleValue - declaredQty.value).toFixed(1)}{declaredQty.unit} vs the declared {declaredQty.value}{declaredQty.unit}</>}
              </div>
            )}
            {scaleChecked && !declaredQty && (
              <div className="lm-decision-badge lm-decision-disputed" style={{ marginBottom: 0 }}>
                <AlertTriangle size={13} /> No parseable declared quantity to compare against.
              </div>
            )}
          </div>

          {computeOverallStatus(result.fields) === "non_compliant" && !violationDecision && (
            <button className="lm-btn lm-btn-primary" style={{ marginBottom: 16 }} onClick={() => setViolationOpen(true)}>
              <AlertTriangle size={15} /> Review &amp; confirm violation
            </button>
          )}
          {violationDecision && violationDecision.type === "confirmed" && (
            <div className="lm-decision-badge lm-decision-confirmed">
              <CheckCircle2 size={14} /> Violation confirmed by inspector
              {holdNotice && <span> · Hold notice {holdNotice} issued</span>}
            </div>
          )}
          {violationDecision && violationDecision.type === "disputed" && (
            <div className="lm-decision-badge lm-decision-disputed">
              <Ban size={14} /> Disputed by inspector: “{violationDecision.note}”
            </div>
          )}

          {!saved ? (
            <div className="lm-save-form">
              <div className="lm-form-row">
                <label>Brand</label>
                <input value={saveForm.brand} onChange={(e) => setSaveForm({ ...saveForm, brand: e.target.value })} placeholder="e.g. Crunch Bite Snacks Co." />
              </div>
              <div className="lm-form-row">
                <label>Category</label>
                <select value={saveForm.category} onChange={(e) => setSaveForm({ ...saveForm, category: e.target.value })}>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="lm-form-row">
                <label>Region</label>
                <select value={saveForm.region} onChange={(e) => setSaveForm({ ...saveForm, region: e.target.value })}>
                  {REGIONS.map((r) => <option key={r}>{r}</option>)}
                </select>
              </div>
              <button className="lm-btn lm-btn-primary" onClick={handleSaveCase}><FileText size={15} /> Save case & generate report</button>
            </div>
          ) : (
            <>
              <div className="lm-saved-row">
                <span className="lm-saved-msg"><CheckCircle2 size={15} color="var(--green)" /> Saved to repository</span>
                <button className="lm-btn" onClick={() => downloadReport({ id: "current", brand: saveForm.brand || "Unlabeled sample", category: saveForm.category, region: saveForm.region, date: new Date().toISOString().slice(0, 10), inspector: "You", status: computeOverallStatus(result.fields), fields: result.fields, retakeReason: null, hash: image.hashHex, gps: GPS_BY_REGION[saveForm.region], timestamp: new Date().toISOString(), imageDataUrl: image.dataUrl })}>
                  <Download size={14} /> Download report
                </button>
                <button className="lm-btn" onClick={reset}>Scan another</button>
              </div>
              <ChainOfCustody sampleId={"SMP-" + image.hashHex.slice(0, 8).toUpperCase()} />
            </>
          )}

          {violationOpen && (
            <ConfirmViolationModal
              fields={result.fields}
              onConfirm={handleConfirmViolation}
              onDispute={handleDisputeViolation}
              onClose={() => setViolationOpen(false)}
            />
          )}
          {holdNoticeOpen && (
            <HoldNoticeModal
              scanMeta={{ brand: saveForm.brand || "Unlabeled sample", category: saveForm.category, region: saveForm.region, inspector: "You" }}
              onIssue={handleIssueHoldNotice}
              onClose={() => setHoldNoticeOpen(false)}
            />
          )}
        </div>
        );
      })()}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* history / repository                                               */
/* ---------------------------------------------------------------- */

function HistoryView({ scans, onSelect }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = scans.filter((s) => {
    const matchesQuery = (s.brand + " " + s.category + " " + s.region).toLowerCase().includes(query.toLowerCase());
    const matchesStatus = statusFilter === "all" || s.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  return (
    <div className="lm-panel">
      <div className="lm-eyebrow">Repository</div>
      <h2 className="lm-h2">Scan history</h2>
      <TickDivider />
      <div className="lm-history-controls">
        <div className="lm-search">
          <Search size={15} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search brand, category, or region" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="compliant">Compliant</option>
          <option value="non_compliant">Non-compliant</option>
          <option value="retake_needed">Retake needed</option>
        </select>
      </div>
      <div className="lm-table-wrap">
        <table className="lm-table">
          <thead>
            <tr><th>Status</th><th>Brand</th><th>Category</th><th>Region</th><th>Date</th><th>Inspector</th><th>Risk</th><th></th></tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id} className="lm-row-click" onClick={() => onSelect(s)}>
                <td><StatusIcon status={s.status} /></td>
                <td>
                  {s.brand}
                  {s.source === "ecommerce_monitor" && <div style={{ marginTop: 4 }}><SourceBadge scan={s} size="small" /></div>}
                </td>
                <td>{s.category}</td>
                <td>{s.region}</td>
                <td>{formatDate(s.date)}</td>
                <td>{s.inspector}</td>
                <td><RiskScoreBadge score={computeRiskScore(s)} size="small" /></td>
                <td><ChevronRight size={15} color="var(--ink-soft)" /></td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="lm-empty">No scans match this search.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* dashboard                                                          */
/* ---------------------------------------------------------------- */

function DashboardView({ scans, onSelect, onRunMonitor }) {
  const ecommerceFlaggedCount = scans.filter((s) => s.source === "ecommerce_monitor").length;
  const [monitorRunning, setMonitorRunning] = useState(false);
  const [lastRunLabel, setLastRunLabel] = useState(null);

  function handleRunNow() {
    setMonitorRunning(true);
    setTimeout(() => {
      const count = 1 + Math.round(Math.random());
      const shuffled = [...TRACKED_SKUS].sort(() => Math.random() - 0.5).slice(0, count);
      const newCases = shuffled.map(generateEcommerceCase);
      onRunMonitor(newCases);
      setLastRunLabel(`${formatDateTime(new Date())}: ${newCases.length} case${newCases.length === 1 ? "" : "s"} flagged`);
      setMonitorRunning(false);
    }, 900);
  }

  const monthly = useMemo(() => {
    const map = {};
    scans.forEach((s) => {
      const m = monthLabel(s.date);
      if (!map[m]) map[m] = { month: m, compliant: 0, non_compliant: 0, retake_needed: 0, order: s.date.slice(0, 7) };
      map[m][s.status] += 1;
    });
    return Object.values(map).sort((a, b) => (a.order < b.order ? -1 : 1));
  }, [scans]);

  const byCategory = useMemo(() => {
    const map = {};
    CATEGORIES.forEach((c) => (map[c] = { category: c, total: 0, nonCompliant: 0 }));
    scans.forEach((s) => {
      if (s.status === "retake_needed") return;
      map[s.category].total += 1;
      if (s.status === "non_compliant") map[s.category].nonCompliant += 1;
    });
    return Object.values(map);
  }, [scans]);

  const heatmap = useMemo(() => {
    const cell = {};
    CATEGORIES.forEach((c) => {
      cell[c] = {};
      REGIONS.forEach((r) => (cell[c][r] = { total: 0, nonCompliant: 0 }));
    });
    scans.forEach((s) => {
      if (s.status === "retake_needed") return;
      cell[s.category][s.region].total += 1;
      if (s.status === "non_compliant") cell[s.category][s.region].nonCompliant += 1;
    });
    return cell;
  }, [scans]);

  const brands = useMemo(() => {
    const map = {};
    scans.forEach((s) => {
      if (s.status === "retake_needed") return;
      if (!map[s.brand]) map[s.brand] = { brand: s.brand, total: 0, nonCompliant: 0 };
      map[s.brand].total += 1;
      if (s.status === "non_compliant") map[s.brand].nonCompliant += 1;
    });
    return Object.values(map).sort((a, b) => b.nonCompliant / b.total - a.nonCompliant / a.total).slice(0, 6);
  }, [scans]);

  const inspectorStats = useMemo(() => {
    const map = {};
    scans.forEach((s) => {
      if (!map[s.inspector]) map[s.inspector] = { inspector: s.inspector, total: 0, nonCompliant: 0 };
      map[s.inspector].total += 1;
      if (s.status === "non_compliant") map[s.inspector].nonCompliant += 1;
    });
    const rows = Object.values(map).map((r) => ({ ...r, rate: r.total ? Math.round((r.nonCompliant / r.total) * 100) : 0 }));
    const avgRate = rows.length ? rows.reduce((sum, r) => sum + r.rate, 0) / rows.length : 0;
    // Flag an inspector whose flagged-violation rate runs well above the
    // team average — a rough "targeting bias" signal, not a statistically
    // rigorous test.
    return rows
      .map((r) => ({ ...r, biasFlag: r.total >= 3 && r.rate > avgRate + 20 }))
      .sort((a, b) => b.total - a.total);
  }, [scans]);

  const scored = scans.filter((s) => s.status !== "retake_needed");
  const totalScans = scans.length;
  const nonCompliantCount = scored.filter((s) => s.status === "non_compliant").length;
  const retakeCount = scans.filter((s) => s.status === "retake_needed").length;
  const nonCompliantRate = scored.length ? Math.round((nonCompliantCount / scored.length) * 100) : 0;
  const retakeRate = totalScans ? Math.round((retakeCount / totalScans) * 100) : 0;

  function heatColor(pct) {
    if (pct === null) return "var(--panel-alt)";
    if (pct === 0) return "var(--green-soft)";
    if (pct < 30) return "#F3DCC8";
    if (pct < 60) return "#EFC09B";
    return "var(--red-soft)";
  }

  return (
    <div className="lm-panel">
      <div className="lm-eyebrow">Supervisor</div>
      <h2 className="lm-h2">Enforcement dashboard</h2>
      <TickDivider />

      <div className="lm-kpi-grid">
        <div className="lm-kpi"><div className="lm-kpi-label">Total scans</div><div className="lm-kpi-value">{totalScans}</div></div>
        <div className="lm-kpi"><div className="lm-kpi-label">Non-compliance rate</div><div className="lm-kpi-value">{nonCompliantRate}%</div></div>
        <div className="lm-kpi"><div className="lm-kpi-label">Retake rate</div><div className="lm-kpi-value">{retakeRate}%</div></div>
        <div className="lm-kpi"><div className="lm-kpi-label">Categories tracked</div><div className="lm-kpi-value">{CATEGORIES.length}</div></div>
        <div className="lm-kpi"><div className="lm-kpi-label">E-commerce flagged</div><div className="lm-kpi-value">{ecommerceFlaggedCount}</div></div>
      </div>

      <h3 className="lm-h3">Violations over time</h3>
      <div className="lm-chart">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={monthly}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: "var(--ink-soft)" }} />
            <YAxis tick={{ fontSize: 12, fill: "var(--ink-soft)" }} allowDecimals={false} />
            <Tooltip contentStyle={{ fontFamily: "var(--font-body)", fontSize: 12, borderRadius: 4 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="compliant" stackId="a" name="Compliant" fill="var(--green)" />
            <Bar dataKey="non_compliant" stackId="a" name="Non-compliant" fill="var(--red)" />
            <Bar dataKey="retake_needed" stackId="a" name="Retake needed" fill="var(--brass)" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <h3 className="lm-h3">Category compliance benchmark</h3>
      <div className="lm-table-wrap">
        <table className="lm-table">
          <thead><tr><th>Category</th><th>Scans</th><th>Non-compliance rate</th></tr></thead>
          <tbody>
            {byCategory.map((c) => (
              <tr key={c.category}>
                <td>{c.category}</td>
                <td>{c.total}</td>
                <td>{c.total ? Math.round((c.nonCompliant / c.total) * 100) : 0}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="lm-h3">Risk heatmap <span className="lm-h3-note">(category × region, non-compliance rate)</span></h3>
      <div className="lm-heatmap">
        <div className="lm-heatmap-row lm-heatmap-header">
          <div></div>
          {REGIONS.map((r) => <div key={r} className="lm-heatmap-col-label">{r}</div>)}
        </div>
        {CATEGORIES.map((c) => (
          <div className="lm-heatmap-row" key={c}>
            <div className="lm-heatmap-row-label">{c}</div>
            {REGIONS.map((r) => {
              const cell = heatmap[c][r];
              const pct = cell.total ? Math.round((cell.nonCompliant / cell.total) * 100) : null;
              return (
                <div key={r} className="lm-heatmap-cell" style={{ background: heatColor(pct) }} title={cell.total ? `${pct}% non-compliant (${cell.total} scans)` : "No scans"}>
                  {pct === null ? "N/A" : pct + "%"}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <h3 className="lm-h3">Brand scorecard</h3>
      <div className="lm-table-wrap">
        <table className="lm-table">
          <thead><tr><th>Brand</th><th>Scans</th><th>Non-compliant</th><th>Rate</th></tr></thead>
          <tbody>
            {brands.map((b) => (
              <tr key={b.brand}>
                <td>{b.brand}</td>
                <td>{b.total}</td>
                <td>{b.nonCompliant}</td>
                <td>{Math.round((b.nonCompliant / b.total) * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="lm-h3">Inspector caseload <span className="lm-h3-note">(targeting-bias review)</span></h3>
      <div className="lm-table-wrap">
        <table className="lm-table">
          <thead><tr><th>Inspector</th><th>Cases</th><th>Flagged rate</th><th></th></tr></thead>
          <tbody>
            {inspectorStats.map((r) => (
              <tr key={r.inspector}>
                <td>{r.inspector}</td>
                <td>{r.total}</td>
                <td>{r.rate}%</td>
                <td>
                  {r.biasFlag && (
                    <span className="lm-bias-flag"><AlertTriangle size={12} /> Review: well above team average</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="lm-h3">Equipment calibration status</h3>
      <div className="lm-table-wrap">
        <table className="lm-table">
          <thead><tr><th>Device</th><th>Region</th><th>Last calibrated</th><th>Due date</th><th>Status</th></tr></thead>
          <tbody>
            {CALIBRATION_DEVICES.map((d) => {
              const status = calibrationStatus(d.dueDate);
              return (
                <tr key={d.id}>
                  <td>{d.id}</td>
                  <td>{d.region}</td>
                  <td>{formatDate(d.lastCalibrated)}</td>
                  <td>{formatDate(d.dueDate)}</td>
                  <td><span className={"lm-calib-badge lm-calib-" + status}>{status.replace("_", " ")}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h3 className="lm-h3">E-commerce monitor <span className="lm-h3-note">(scheduled listing scan)</span></h3>
      <div className="lm-ecom-panel">
        <div className="lm-btn-row" style={{ justifyContent: "flex-start" }}>
          <button className="lm-btn lm-btn-primary" onClick={handleRunNow} disabled={monitorRunning}>
            {monitorRunning ? <Loader2 className="lm-spin" size={15} /> : <PlayCircle size={15} />}
            {monitorRunning ? "Scanning listings…" : "Run now"}
          </button>
          <span className="lm-ecom-status">
            {lastRunLabel ? <>Last run: {lastRunLabel}</> : "Not run yet this session. Scans tracked SKUs for MRP/quantity drift against the last compliant snapshot."}
          </span>
        </div>
        <div className="lm-ecom-skus">
          <div className="lm-ruleadmin-col-label"><Radar size={13} /> Tracked SKUs</div>
          <div className="lm-ecom-sku-list">
            {TRACKED_SKUS.map((s) => (
              <div key={s.sku} className="lm-ecom-sku-row">
                <span className="lm-ecom-sku-code">{s.sku}</span>
                <span className="lm-ecom-sku-brand">{s.brand}</span>
                <span className="lm-ecom-sku-platform">{s.platform}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <button
        className="lm-btn lm-btn-primary"
        style={{ marginTop: 24 }}
        onClick={() => downloadDashboardReport({
          totalScans, nonCompliantRate, retakeRate, categoryCount: CATEGORIES.length,
          byCategory, brands, inspectorStats, calibrationDevices: CALIBRATION_DEVICES,
        })}
      >
        <Download size={15} /> Export jurisdiction report
      </button>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* rules modal + case detail                                          */
/* ---------------------------------------------------------------- */

function RulesModal({ onClose, ruleVersions }) {
  useBodyScrollLock();
  const published = ruleVersions.filter((r) => r.status === "published");
  return (
    <div className="lm-modal-scrim" onClick={onClose}>
      <div className="lm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="lm-modal-head">
          <h3 className="lm-h3" style={{ margin: 0 }}>Rule amendments</h3>
          <button className="lm-icon-btn" onClick={onClose}><X size={17} /></button>
        </div>
        <div className="lm-changelog">
          {published.map((r, i) => (
            <div key={r.version} className="lm-changelog-item">
              <div className="lm-changelog-top">
                <span className="lm-changelog-version">{r.version}</span>
                {i === 0 && <span className="lm-changelog-new">NEW</span>}
                <span className="lm-changelog-date">{formatDate(r.date)}</span>
                <span className="lm-changelog-approved"><CheckCircle2 size={12} /> Human-verified</span>
              </div>
              <div className="lm-changelog-desc">{r.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* rule admin                                                         */
/* ---------------------------------------------------------------- */

function RuleAdminView({ ruleVersions, onPublish }) {
  const activeVersion = ruleVersions.find((r) => r.status === "published");
  const [drafting, setDrafting] = useState(false);
  const [desc, setDesc] = useState("");
  const [ruleText, setRuleText] = useState(activeVersion.ruleText);
  const [pending, setPending] = useState(null); // { version, desc, ruleText } once submitted for review
  const [reviewComment, setReviewComment] = useState("");

  const diff = useMemo(
    () => diffRuleText(activeVersion.ruleText, ruleText),
    [activeVersion.ruleText, ruleText]
  );

  function nextVersionLabel() {
    const [major, minor] = activeVersion.version.replace("v", "").split(".").map(Number);
    return `v${major}.${minor + 1}`;
  }

  function startDraft() {
    setDrafting(true);
    setDesc("");
    setRuleText(activeVersion.ruleText);
    setPending(null);
    setReviewComment("");
  }

  function cancelDraft() {
    setDrafting(false);
    setPending(null);
    setReviewComment("");
  }

  function submitForReview() {
    setPending({ version: nextVersionLabel(), desc: desc.trim() || "Untitled amendment", ruleText });
  }

  function approve() {
    onPublish({
      version: pending.version,
      date: new Date().toISOString().slice(0, 10),
      author: "Rule Admin",
      desc: pending.desc,
      status: "published",
      reviewerComments: reviewComment.trim() || "Approved without further comment.",
      ruleText: pending.ruleText,
    });
    setDrafting(false);
    setPending(null);
    setReviewComment("");
  }

  function reject() {
    setPending(null);
    setReviewComment("");
    // stays in drafting mode so the rule text can be revised and resubmitted
  }

  return (
    <div className="lm-panel">
      <div className="lm-eyebrow">Rule Admin</div>
      <h2 className="lm-h2">Rule editor &amp; version repository</h2>
      <TickDivider />

      <div className="lm-ruleadmin-active">
        <div className="lm-ruleadmin-active-top">
          <ScrollText size={16} color="var(--brass)" />
          <span className="lm-ruleadmin-active-label">Active rule version</span>
          <span className="lm-changelog-version">{activeVersion.version}</span>
          <span className="lm-changelog-date">{formatDate(activeVersion.date)}</span>
        </div>
        <div className="lm-ruleadmin-active-desc">{activeVersion.desc}</div>
      </div>

      {!drafting ? (
        <button className="lm-btn lm-btn-primary" onClick={startDraft}>
          <FilePlus2 size={15} /> Draft new rule version
        </button>
      ) : (
        <div className="lm-ruleadmin-draft">
          <h3 className="lm-h3" style={{ marginTop: 8 }}>Drafting {nextVersionLabel()}</h3>

          <div className="lm-form-row" style={{ alignItems: "flex-start" }}>
            <label style={{ paddingTop: 7 }}>Summary</label>
            <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="e.g. Require QR-linked batch codes on dairy packaging" />
          </div>

          <div className="lm-ruleadmin-editor-row">
            <div className="lm-ruleadmin-editor-col">
              <div className="lm-ruleadmin-col-label">Rule text (editable)</div>
              <textarea
                className="lm-ruleadmin-textarea"
                value={ruleText}
                onChange={(e) => { setRuleText(e.target.value); setPending(null); }}
                rows={8}
              />
            </div>
            <div className="lm-ruleadmin-editor-col">
              <div className="lm-ruleadmin-col-label"><GitCompare size={13} /> Diff vs {activeVersion.version}</div>
              <div className="lm-diff">
                {diff.removed.length === 0 && diff.added.length === 0 && (
                  <div className="lm-diff-empty">No changes yet.</div>
                )}
                {diff.removed.map((line, i) => <div key={"r" + i} className="lm-diff-line lm-diff-removed">− {line}</div>)}
                {diff.added.map((line, i) => <div key={"a" + i} className="lm-diff-line lm-diff-added">+ {line}</div>)}
              </div>
            </div>
          </div>

          {!pending ? (
            <div className="lm-btn-row" style={{ justifyContent: "flex-start" }}>
              <button className="lm-btn lm-btn-primary" onClick={submitForReview} disabled={diff.added.length === 0 && diff.removed.length === 0}>
                <Send size={14} /> Submit for review
              </button>
              <button className="lm-btn" onClick={cancelDraft}>Cancel</button>
            </div>
          ) : (
            <div className="lm-ruleadmin-review">
              <div className="lm-ruleadmin-review-label">
                <AlertTriangle size={14} color="var(--brass)" /> {pending.version} awaiting human verification
              </div>
              <div className="lm-form-row">
                <label>Comments</label>
                <input value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} placeholder="Reviewer comments (optional)" />
              </div>
              <div className="lm-btn-row" style={{ justifyContent: "flex-start" }}>
                <button className="lm-btn lm-btn-primary" onClick={approve}><Check size={14} /> Approve &amp; publish</button>
                <button className="lm-btn" onClick={reject}><Ban size={14} /> Reject, return to draft</button>
              </div>
            </div>
          )}
        </div>
      )}

      <h3 className="lm-h3">Version repository</h3>
      <div className="lm-changelog">
        {ruleVersions.map((r, i) => (
          <div key={r.version} className="lm-changelog-item">
            <div className="lm-changelog-top">
              <span className="lm-changelog-version">{r.version}</span>
              {i === 0 && <span className="lm-changelog-new">ACTIVE</span>}
              <span className="lm-changelog-date">{formatDate(r.date)}</span>
              <span className="lm-changelog-approved"><CheckCircle2 size={12} /> Human-verified · {r.author}</span>
            </div>
            <div className="lm-changelog-desc">{r.desc}</div>
            {r.reviewerComments && <div className="lm-ruleadmin-comment">“{r.reviewerComments}”</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function CaseDetail({ scan, onClose, role, onEscalate, onAssign, onSetPenalty }) {
  useBodyScrollLock();
  const [escalateOpen, setEscalateOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [penaltyOpen, setPenaltyOpen] = useState(false);

  return (
    <>
    <div className="lm-modal-scrim" onClick={onClose}>
      <div className="lm-modal lm-modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="lm-modal-head">
          <h3 className="lm-h3" style={{ margin: 0 }}>{scan.brand}</h3>
          <button className="lm-icon-btn" onClick={onClose}><X size={17} /></button>
        </div>
        <div className="lm-case-meta">
          <span>{scan.category}</span><span>·</span><span>{scan.region}</span><span>·</span>
          <span>{formatDate(scan.date)}</span><span>·</span><span>{scan.assignedTo || scan.inspector}</span>
          {scan.source === "ecommerce_monitor" && <><span>·</span><SourceBadge scan={scan} /></>}
        </div>
        <div className="lm-btn-row" style={{ justifyContent: "flex-start", margin: "0 0 12px" }}>
          <Stamp status={scan.status} />
          <RiskScoreBadge score={computeRiskScore(scan)} />
        </div>
        {scan.source === "ecommerce_monitor" ? (
          <div className="lm-no-image"><ShoppingCart size={18} /> Auto-flagged from an online listing ({scan.platform}); no physical sample photo.</div>
        ) : scan.imageDataUrl ? (
          <img src={scan.imageDataUrl} alt={scan.brand + " label"} className="lm-preview" style={{ marginTop: 12 }} />
        ) : (
          <div className="lm-no-image"><FileText size={18} /> Historical record: no image on file</div>
        )}
        {scan.status === "retake_needed" ? (
          <p className="lm-retake-reason">{scan.retakeReason}</p>
        ) : (
          <div className="lm-fields">{scan.fields.map((f) => <FieldRow key={f.name} field={f} />)}</div>
        )}
        <IntegrityBadge scan={scan} />

        {scan.status !== "retake_needed" && scan.source !== "ecommerce_monitor" && (
          <ChainOfCustody sampleId={scan.sampleId || ("SMP-" + scan.hash.slice(0, 8).toUpperCase())} />
        )}
        {scan.status !== "retake_needed" && <BatchLedger brand={scan.brand} />}

        {(scan.violationConfirmed || scan.violationDisputed || scan.escalated || scan.assignedTo || scan.penaltyBand) && (
          <div className="lm-case-status-badges">
            {scan.violationConfirmed && (
              <div className="lm-decision-badge lm-decision-confirmed">
                <CheckCircle2 size={13} /> Violation confirmed by inspector
                {scan.holdNoticeId && <span> · Hold notice {scan.holdNoticeId} issued</span>}
              </div>
            )}
            {scan.violationDisputed && <div className="lm-decision-badge lm-decision-disputed"><Ban size={13} /> Disputed by inspector: “{scan.disputeNote}”</div>}
            {scan.escalated && <div className="lm-decision-badge lm-decision-disputed"><Flag size={13} /> Escalated: “{scan.escalationReason}”</div>}
            {scan.assignedTo && <div className="lm-decision-badge lm-decision-confirmed"><UserCheck size={13} /> Reassigned to {scan.assignedTo}</div>}
            {scan.penaltyBand && <div className="lm-decision-badge lm-decision-confirmed"><Gavel size={13} /> Penalty: {scan.penaltyBand}</div>}
          </div>
        )}

        <div className="lm-btn-row" style={{ justifyContent: "flex-start", marginTop: 14 }}>
          <button className="lm-btn" onClick={() => downloadReport(scan)}><Download size={14} /> Download report</button>
          {role === "supervisor" && (
            <>
              <button className="lm-btn" onClick={() => setEscalateOpen(true)}><Flag size={14} /> Escalate</button>
              <button className="lm-btn" onClick={() => setAssignOpen(true)}><UserCheck size={14} /> Assign / reassign</button>
              <button className="lm-btn" onClick={() => setPenaltyOpen(true)}><Gavel size={14} /> Set penalty band</button>
            </>
          )}
        </div>
      </div>
    </div>

      {escalateOpen && (
        <EscalateModal scan={scan} onClose={() => setEscalateOpen(false)} onConfirm={(reason) => { onEscalate(scan.id, reason); setEscalateOpen(false); }} />
      )}
      {assignOpen && (
        <AssignModal scan={scan} onClose={() => setAssignOpen(false)} onConfirm={(name) => { onAssign(scan.id, name); setAssignOpen(false); }} />
      )}
      {penaltyOpen && (
        <PenaltyModal scan={scan} onClose={() => setPenaltyOpen(false)} onConfirm={(band) => { onSetPenalty(scan.id, band); setPenaltyOpen(false); }} />
      )}
    </>
  );
}

/* ---------------------------------------------------------------- */
/* app shell                                                          */
/* ---------------------------------------------------------------- */

function AppInner() {
  const [stage, setStage] = useState("landing"); // "landing" | "role"
  const [role, setRole] = useState(null);
  const [view, setView] = useState("scan");
  const [scans, setScans] = useState(seedScans);
  const [detailScanId, setDetailScanId] = useState(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [ruleVersions, setRuleVersions] = useState(RULE_CHANGELOG);
  const detailScan = scans.find((s) => s.id === detailScanId) || null;

  function handleSaveScan(scan) {
    setScans((prev) => [scan, ...prev]);
  }

  function handleRunMonitor(newCases) {
    setScans((prev) => [...newCases, ...prev]);
  }

  function handlePublishRule(newVersion) {
    setRuleVersions((prev) => [newVersion, ...prev]);
  }

  function updateScan(id, patch) {
    setScans((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  function handleEscalate(id, reason) {
    updateScan(id, { escalated: true, escalationReason: reason });
  }

  function handleAssign(id, name) {
    updateScan(id, { assignedTo: name });
  }

  function handleSetPenalty(id, band) {
    updateScan(id, { penaltyBand: band });
  }

  return (
    <div className="lm-root">
      <GlobalStyle />

      {stage === "landing" ? (
        <LandingScreen onEnter={() => setStage("role")} />
      ) : !role ? (
        <div className="lm-role-screen">
          <div className="lm-role-eyebrow">Legal Metrology · Field Compliance</div>
          <h1 className="lm-role-title">Packaged Commodity Compliance Checker</h1>
          <TickDivider />
          <div className="lm-role-cards">
            <button className="lm-role-card" onClick={() => { setRole("inspector"); setView("scan"); }}>
              <ClipboardList size={26} color="var(--navy)" />
              <div className="lm-role-card-title">Inspector</div>
              <div className="lm-role-card-sub">Scan labels in the field, build case history</div>
            </button>
            <button className="lm-role-card" onClick={() => { setRole("supervisor"); setView("dashboard"); }}>
              <LayoutDashboard size={26} color="var(--navy)" />
              <div className="lm-role-card-title">Supervisor</div>
              <div className="lm-role-card-sub">Monitor trends, categories, and brand compliance</div>
            </button>
            <button className="lm-role-card" onClick={() => { setRole("ruleadmin"); setView("ruleadmin"); }}>
              <ScrollText size={26} color="var(--navy)" />
              <div className="lm-role-card-title">Rule Admin</div>
              <div className="lm-role-card-sub">Draft, verify, and publish rule amendments</div>
            </button>
          </div>
        </div>
      ) : (
        <div className="lm-shell">
          <header className="lm-header">
            <div className="lm-header-left">
              <ShieldCheck size={20} color="var(--brass)" />
              <div>
                <div className="lm-header-eyebrow">Legal Metrology · Field Compliance</div>
                <div className="lm-header-title">{role === "inspector" ? "Inspector console" : role === "supervisor" ? "Supervisor dashboard" : "Rule Admin console"}</div>
              </div>
            </div>
            <div className="lm-header-right">
              {role === "inspector" && (
                <button className="lm-btn" onClick={() => setRulesOpen(true)}><Sparkles size={14} /> Rule updates</button>
              )}
              <button className="lm-link-btn" onClick={() => setRole(null)}><Users size={14} /> Switch role</button>
            </div>
          </header>

          <nav className="lm-nav">
            {role === "inspector" && (
              <>
                <button className={"lm-nav-item" + (view === "scan" ? " lm-nav-active" : "")} onClick={() => setView("scan")}><ScanLine size={15} /> New scan</button>
                <button className={"lm-nav-item" + (view === "history" ? " lm-nav-active" : "")} onClick={() => setView("history")}><HistoryIcon size={15} /> History</button>
              </>
            )}
            {role === "supervisor" && (
              <>
                <button className={"lm-nav-item" + (view === "dashboard" ? " lm-nav-active" : "")} onClick={() => setView("dashboard")}><LayoutDashboard size={15} /> Dashboard</button>
                <button className={"lm-nav-item" + (view === "history" ? " lm-nav-active" : "")} onClick={() => setView("history")}><HistoryIcon size={15} /> Case history</button>
              </>
            )}
            {role === "ruleadmin" && (
              <button className={"lm-nav-item" + (view === "ruleadmin" ? " lm-nav-active" : "")} onClick={() => setView("ruleadmin")}><ScrollText size={15} /> Rule editor</button>
            )}
          </nav>

          <main className="lm-main">
            {view === "scan" && role === "inspector" && <ScanView onSave={handleSaveScan} onUpdateScan={updateScan} />}
            {view === "history" && <HistoryView scans={scans} onSelect={(s) => setDetailScanId(s.id)} />}
            {view === "dashboard" && role === "supervisor" && <DashboardView scans={scans} onSelect={(s) => setDetailScanId(s.id)} onRunMonitor={handleRunMonitor} />}
            {view === "ruleadmin" && role === "ruleadmin" && <RuleAdminView ruleVersions={ruleVersions} onPublish={handlePublishRule} />}
          </main>
        </div>
      )}

      {rulesOpen && <RulesModal onClose={() => setRulesOpen(false)} ruleVersions={ruleVersions} />}
      {detailScan && (
        <CaseDetail
          scan={detailScan}
          role={role}
          onClose={() => setDetailScanId(null)}
          onEscalate={handleEscalate}
          onAssign={handleAssign}
          onSetPenalty={handleSetPenalty}
        />
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* error boundary                                                     */
/* ---------------------------------------------------------------- */

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      const message = (this.state.error && this.state.error.message) || String(this.state.error);
      return (
        <div className="lm-root">
          <GlobalStyle />
          <div className="lm-role-screen">
            <div className="lm-role-eyebrow">Legal Metrology · Field Compliance</div>
            <h1 className="lm-role-title">Something went wrong</h1>
            <p className="lm-role-sub">{message}</p>
            <button className="lm-btn lm-btn-primary" onClick={() => this.setState({ error: null })}>Try again</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppInner />
    </ErrorBoundary>
  );
}

/* ---------------------------------------------------------------- */
/* styles                                                             */
/* ---------------------------------------------------------------- */

function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Spectral:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');

      .lm-root {
        --bg: #F7F6F2;
        --panel: #FFFFFF;
        --panel-alt: #EFEDE6;
        --ink: #181B22;
        --ink-soft: #5B5F68;
        --navy: #1F2E4A;
        --navy-deep: #131C2E;
        --brass: #AD7F33;
        --brass-soft: #E9DAB8;
        --green: #2C7A55;
        --green-soft: #E3F0E9;
        --red: #B23A34;
        --red-soft: #F6E4E2;
        --border: #DEDACD;
        --font-display: 'Spectral', Georgia, serif;
        --font-body: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif;
        --font-mono: 'IBM Plex Mono', 'SF Mono', monospace;
        background: var(--bg);
        color: var(--ink);
        font-family: var(--font-body);
        min-height: 100%;
        border-radius: 12px;
        overflow: hidden;
      }
      .lm-root * { box-sizing: border-box; }
      .lm-root button { font-family: var(--font-body); cursor: pointer; }
      .lm-root input, .lm-root select { font-family: var(--font-body); }
      .lm-root *:focus-visible { outline: 2px solid var(--navy); outline-offset: 2px; }

      .lm-role-screen { padding: 56px 40px; text-align: center; max-width: 640px; margin: 0 auto; }
      .lm-role-eyebrow { font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--brass); margin-bottom: 10px; }
      .lm-role-title { font-family: var(--font-display); font-weight: 600; font-size: 30px; color: var(--navy-deep); margin: 0 0 10px; }
      .lm-role-sub { color: var(--ink-soft); font-size: 14px; margin: 0 0 24px; }
      .lm-tick { width: 100%; height: 12px; display: block; margin: 4px 0 28px; }
      .lm-role-cards { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-top: 8px; }
      .lm-role-card { background: var(--panel); border: 1px solid var(--border); border-top: 3px solid var(--brass); border-radius: 4px; padding: 24px 18px; display: flex; flex-direction: column; align-items: flex-start; gap: 8px; text-align: left; transition: border-color 120ms, transform 120ms; }
      .lm-role-card:hover { border-color: var(--navy); transform: translateY(-2px); }
      .lm-role-card-title { font-family: var(--font-display); font-weight: 600; font-size: 18px; color: var(--navy-deep); }
      .lm-role-card-sub { font-size: 12.5px; color: var(--ink-soft); }

      .lm-landing-inner { max-width: 1180px; margin: 0 auto; padding: 0 40px; box-sizing: border-box; }
      .lm-landing-eyebrow { font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--brass); }

      /* hero band — full-bleed navy, statement typography */
      .lm-landing-hero-band { position: relative; background: var(--navy-deep); overflow: hidden; }
      .lm-landing-topbar { position: relative; z-index: 2; display: flex; align-items: center; justify-content: space-between; padding: 22px 0; border-bottom: 1px solid rgba(241,238,228,0.1); }
      .lm-landing-brand { display: flex; align-items: center; gap: 9px; }
      .lm-landing-mark { width: 27px; height: 27px; border-radius: 6px; background: var(--brass); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
      .lm-landing-wordmark { font-family: var(--font-display); font-weight: 600; font-size: 16px; color: #F1EEE4; letter-spacing: 0.01em; }
      .lm-landing-wordmark-ai { color: var(--brass-soft); }
      .lm-landing-topbar-meta { font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.02em; color: rgba(241,238,228,0.5); }

      .lm-landing-hero { position: relative; z-index: 2; display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 56px; align-items: center; padding: 60px 0 72px; }
      .lm-landing-hero-left { display: flex; flex-direction: column; }
      .lm-landing-title { font-family: var(--font-display); font-weight: 600; font-size: clamp(1.9rem, 1.1rem + 2.4vw, 3.1rem); line-height: 1.08; letter-spacing: -0.01em; color: #F1EEE4; margin: 16px 0 18px; max-width: 560px; }
      .lm-landing-sub { font-size: 15.5px; line-height: 1.65; color: rgba(241,238,228,0.72); max-width: 460px; margin: 0 0 30px; }
      .lm-landing-cta-row { display: flex; gap: 12px; margin-bottom: 30px; }
      .lm-landing-cta-primary { font-family: var(--font-body); cursor: pointer; background: var(--brass); border: 1px solid var(--brass); color: var(--navy-deep); padding: 12px 22px; font-size: 14px; font-weight: 600; border-radius: 4px; display: inline-flex; align-items: center; gap: 6px; transition: background 0.25s var(--ease-out), border-color 0.25s var(--ease-out), transform 0.25s var(--ease-out), box-shadow 0.25s var(--ease-out); }
      .lm-landing-cta-primary:hover { background: #C79341; border-color: #C79341; transform: translateY(-2px); box-shadow: 0 10px 24px -10px rgba(173,127,51,0.55); }
      .lm-landing-cta-primary:active { transform: translateY(0); }
      .lm-landing-cta-primary svg { transition: transform 0.25s var(--ease-out); }
      .lm-landing-cta-primary:hover svg { transform: translateX(3px); }
      .lm-landing-cta-secondary { font-family: var(--font-body); cursor: pointer; background: transparent; border: 1px solid rgba(241,238,228,0.22); color: #F1EEE4; padding: 12px 20px; font-size: 14px; border-radius: 4px; transition: border-color 0.25s var(--ease-out), transform 0.25s var(--ease-out); }
      .lm-landing-cta-secondary:hover { border-color: rgba(241,238,228,0.5); transform: translateY(-2px); }
      .lm-landing-cta-secondary:active { transform: translateY(0); }
      .lm-landing-meta-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.03em; text-transform: uppercase; color: rgba(241,238,228,0.45); }
      .lm-landing-meta-dot { width: 3px; height: 3px; border-radius: 50%; background: rgba(241,238,228,0.35); flex-shrink: 0; }

      .lm-landing-hero-right { display: flex; flex-direction: column; align-items: flex-start; gap: 14px; }
      .lm-landing-preview-label { font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(241,238,228,0.4); }

      /* product preview card — the real scan-review UI, not a mascot graphic */
      .lm-preview { width: 100%; max-width: 340px; background: var(--panel); border-radius: 8px; padding: 18px 18px 14px; box-shadow: 0 24px 60px -20px rgba(6,10,20,0.6); border: 1px solid rgba(255,255,255,0.05); }
      .lm-preview-head { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; }
      .lm-preview-live { width: 7px; height: 7px; border-radius: 50%; background: var(--green); box-shadow: 0 0 0 3px rgba(44,122,85,0.18); flex-shrink: 0; }
      .lm-preview-id { font-family: var(--font-mono); font-size: 11px; color: var(--ink-soft); }
      .lm-preview-badge { margin-left: auto; font-family: var(--font-mono); font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.05em; background: var(--brass-soft); color: var(--navy-deep); padding: 3px 8px; border-radius: 20px; }
      .lm-preview-rows { display: flex; flex-direction: column; gap: 11px; padding-bottom: 12px; border-bottom: 1px solid var(--border); margin-bottom: 10px; }
      .lm-preview-row { display: flex; align-items: flex-start; gap: 9px; }
      .lm-preview-check { width: 16px; height: 16px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px; }
      .lm-preview-check-ok { background: var(--green-soft); color: var(--green); }
      .lm-preview-check-bad { background: var(--red-soft); color: var(--red); }
      .lm-preview-row-text { flex: 1; min-width: 0; }
      .lm-preview-row-label { font-size: 12.5px; color: var(--ink); font-weight: 500; }
      .lm-preview-row-cite { font-family: var(--font-mono); font-size: 10px; color: var(--brass); margin-top: 1px; }
      .lm-preview-row-value { font-family: var(--font-mono); font-size: 12px; color: var(--ink-soft); white-space: nowrap; padding-top: 1px; }
      .lm-preview-foot { display: flex; justify-content: space-between; font-family: var(--font-mono); font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--ink-soft); }
      .lm-preview { transition: transform 0.4s var(--ease-out), box-shadow 0.4s var(--ease-out); }
      .lm-preview:hover { transform: translateY(-4px); box-shadow: 0 30px 70px -18px rgba(6,10,20,0.7); }
      .lm-preview-live { animation: lmPulse 2.2s ease-in-out infinite; }

      /* motion tokens + grain/watermark visual assets */
      .lm-root { --ease-out: cubic-bezier(0.16, 1, 0.3, 1); --ease-back: cubic-bezier(0.34, 1.56, 0.64, 1); }
      .lm-grain { position: absolute; inset: 0; opacity: 0.05; mix-blend-mode: overlay; background-repeat: repeat; pointer-events: none; z-index: 1; }
      .lm-hero-watermark { position: absolute; right: -120px; top: 50%; transform: translateY(-50%); width: 480px; height: 480px; opacity: 0.07; z-index: 1; pointer-events: none; }
      @keyframes lmFadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes lmPulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(44,122,85,0.35); } 50% { box-shadow: 0 0 0 5px rgba(44,122,85,0); } }
      .lm-in { animation: lmFadeUp 0.7s var(--ease-out) both; }
      .lm-reveal { opacity: 0; transform: translateY(24px); transition: opacity 0.7s var(--ease-out), transform 0.7s var(--ease-out); }
      .lm-reveal-in { opacity: 1; transform: translateY(0); }
      @media (prefers-reduced-motion: reduce) {
        .lm-in { animation: none; }
        .lm-reveal { opacity: 1; transform: none; transition: none; }
        .lm-preview-live { animation: none; }
      }

      /* stats band — full-bleed light, dense, breaks hero's dark rhythm */
      .lm-landing-stats-band { background: var(--panel); border-bottom: 1px solid var(--border); }
      .lm-landing-stats { display: flex; padding: 30px 0; }
      .lm-landing-stat { flex: 1; padding: 0 30px; border-left: 1px solid var(--border); }
      .lm-landing-stat:first-child { border-left: none; padding-left: 0; }
      .lm-landing-stat-value { font-family: var(--font-display); font-weight: 600; font-size: 28px; color: var(--navy-deep); }
      .lm-landing-stat-label { font-size: 12px; color: var(--ink-soft); max-width: 220px; line-height: 1.4; margin-top: 4px; }

      /* how-it-works — contained timeline, connecting line through the nodes */
      .lm-landing-steps { padding: 64px 0 60px; }
      .lm-landing-steps-head { margin-bottom: 40px; }
      .lm-landing-timeline { position: relative; display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px; }
      .lm-landing-timeline-line { position: absolute; top: 20px; left: 16.6%; right: 16.6%; height: 1px; background: var(--border); z-index: 0; transform: scaleX(0); transform-origin: left; transition: transform 1s var(--ease-out) 0.15s; }
      .lm-timeline-in .lm-landing-timeline-line { transform: scaleX(1); }
      .lm-landing-step { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; text-align: center; opacity: 0; transform: translateY(18px); transition: opacity 0.6s var(--ease-out), transform 0.6s var(--ease-out); }
      .lm-timeline-in .lm-landing-step { opacity: 1; transform: translateY(0); }
      .lm-timeline-in .lm-landing-step:nth-child(2) { transition-delay: 0.15s; }
      .lm-timeline-in .lm-landing-step:nth-child(3) { transition-delay: 0.3s; }
      .lm-timeline-in .lm-landing-step:nth-child(4) { transition-delay: 0.45s; }
      .lm-landing-step-node { transition: transform 0.3s var(--ease-back); }
      .lm-landing-step:hover .lm-landing-step-node { transform: scale(1.08); border-color: var(--navy); }
      @media (prefers-reduced-motion: reduce) {
        .lm-landing-timeline-line { transform: scaleX(1); transition: none; }
        .lm-landing-step { opacity: 1; transform: none; transition: none; }
      }
      .lm-landing-step-node { width: 41px; height: 41px; border-radius: 50%; background: var(--bg); border: 2px solid var(--brass); display: flex; align-items: center; justify-content: center; margin-bottom: 16px; }
      .lm-landing-step-no { font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--brass); margin-bottom: 8px; }
      .lm-landing-step-title { font-family: var(--font-display); font-weight: 600; font-size: 16px; color: var(--navy-deep); margin-bottom: 6px; }
      .lm-landing-step-sub { font-size: 12.5px; color: var(--ink-soft); line-height: 1.55; max-width: 250px; }

      /* closing cta band — full-bleed navy, generous close */
      .lm-landing-cta-band { position: relative; background: var(--navy-deep); overflow: hidden; }
      .lm-landing-cta-band-inner { position: relative; z-index: 2; display: flex; flex-direction: column; align-items: center; gap: 20px; text-align: center; padding: 76px 0; }
      .lm-landing-cta-title { font-family: var(--font-display); font-weight: 600; font-size: clamp(1.4rem, 1rem + 1.4vw, 2rem); line-height: 1.3; color: #F1EEE4; max-width: 620px; margin: 0; }

      .lm-landing-footer { display: flex; justify-content: space-between; font-size: 11px; color: var(--ink-soft); padding: 20px 0; }

      @media (max-width: 860px) {
        .lm-landing-inner { padding: 0 24px; }
        .lm-landing-topbar-meta { display: none; }
        .lm-landing-hero { grid-template-columns: 1fr; padding: 40px 0 48px; }
        .lm-landing-hero-right { align-items: stretch; }
        .lm-preview { max-width: none; }
        .lm-landing-stats { flex-direction: column; gap: 18px; }
        .lm-landing-stat, .lm-landing-stat:first-child { border-left: none; padding: 0; }
        .lm-landing-timeline { grid-template-columns: 1fr; gap: 28px; }
        .lm-landing-timeline-line { display: none; }
      }

      .lm-shell { display: flex; flex-direction: column; min-height: 560px; }
      .lm-header { background: var(--navy-deep); color: #F1EEE4; display: flex; align-items: center; justify-content: space-between; padding: 14px 22px; border-bottom: 3px solid var(--brass); }
      .lm-header-left { display: flex; align-items: center; gap: 10px; }
      .lm-header-eyebrow { font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--brass-soft); }
      .lm-header-title { font-family: var(--font-display); font-size: 16px; font-weight: 600; }
      .lm-header-right { display: flex; align-items: center; gap: 10px; }

      .lm-link-btn { background: none; border: none; color: #D9D5C8; font-size: 12.5px; display: flex; align-items: center; gap: 6px; }
      .lm-link-btn:hover { color: #fff; }

      .lm-nav { display: flex; gap: 4px; background: var(--panel-alt); padding: 8px 18px; border-bottom: 1px solid var(--border); }
      .lm-nav-item { background: none; border: none; padding: 8px 14px; font-size: 13px; color: var(--ink-soft); display: flex; align-items: center; gap: 6px; border-radius: 3px; }
      .lm-nav-item:hover { background: rgba(0,0,0,0.04); }
      .lm-nav-active { background: var(--panel); color: var(--navy-deep); font-weight: 600; box-shadow: 0 1px 0 var(--brass) inset; }

      .lm-main { padding: 24px; flex: 1; }
      .lm-panel { max-width: 760px; margin: 0 auto; }
      .lm-eyebrow { font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--brass); margin-bottom: 4px; }
      .lm-h2 { font-family: var(--font-display); font-size: 22px; font-weight: 600; color: var(--navy-deep); margin: 0 0 8px; }
      .lm-h3 { font-family: var(--font-display); font-size: 16px; font-weight: 600; color: var(--navy-deep); margin: 28px 0 10px; }
      .lm-h3-note { font-family: var(--font-body); font-weight: 400; font-size: 12px; color: var(--ink-soft); }

      .lm-scan-idle { display: flex; flex-direction: column; gap: 20px; }
      .lm-upload-box { background: var(--panel); border: 1.5px dashed var(--border); border-radius: 6px; padding: 28px; display: flex; flex-direction: column; align-items: center; gap: 10px; }
      .lm-upload-text { font-size: 13px; color: var(--ink-soft); margin: 0; }
      .lm-btn-row { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; }
      .lm-samples { background: var(--panel-alt); border-radius: 6px; padding: 16px 18px; }
      .lm-samples-label { font-size: 12px; color: var(--ink-soft); margin-bottom: 10px; }

      .lm-btn { display: inline-flex; align-items: center; gap: 6px; background: var(--panel); border: 1px solid var(--border); color: var(--ink); font-size: 12.5px; padding: 8px 14px; border-radius: 3px; }
      .lm-btn:hover { border-color: var(--navy); }
      .lm-btn-primary { background: var(--navy); color: #fff; border-color: var(--navy); }
      .lm-btn-primary:hover { background: var(--navy-deep); }
      .lm-btn:disabled, .lm-btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }
      .lm-btn:disabled:hover { border-color: var(--border); }
      .lm-btn-primary:disabled:hover { background: var(--navy); }
      .lm-icon-btn { background: none; border: none; color: var(--ink-soft); padding: 4px; }

      .lm-preview { width: 100%; max-width: 320px; border: 1px solid var(--border); border-radius: 4px; display: block; margin: 0 auto 14px; }
      .lm-analyzing { display: flex; flex-direction: column; align-items: center; gap: 14px; padding: 20px 0; }
      .lm-analyzing-status { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--ink-soft); }
      .lm-spin { animation: lmspin 900ms linear infinite; }
      @keyframes lmspin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

      .lm-error { display: flex; align-items: center; gap: 10px; background: var(--red-soft); border-radius: 4px; padding: 14px 16px; font-size: 13px; }

      .lm-retake { display: flex; flex-direction: column; align-items: center; gap: 12px; text-align: center; padding: 8px 0; }
      .lm-retake-reason { font-size: 13.5px; color: var(--ink-soft); max-width: 420px; margin: 0; }

      @keyframes stampIn { 0% { opacity: 0; transform: scale(1.7) rotate(-9deg); } 60% { opacity: 1; transform: scale(0.95) rotate(-4deg); } 100% { opacity: 1; transform: scale(1) rotate(-4deg); } }
      .lm-stamp { display: inline-block; align-self: center; font-family: var(--font-body); font-weight: 700; font-size: 15px; letter-spacing: 0.09em; padding: 8px 18px; border: 3px double currentColor; border-radius: 3px; transform: rotate(-4deg); mix-blend-mode: multiply; animation: stampIn 260ms ease-out; margin: 4px 0 16px; }
      @media (prefers-reduced-motion: reduce) { .lm-stamp { animation: none; } }

      .lm-fields { display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px; }
      .lm-field-row { background: var(--panel); border: 1px solid var(--border); border-radius: 4px; padding: 10px 12px; }
      .lm-field-top { display: flex; align-items: center; gap: 8px; }
      .lm-field-name { font-size: 13px; font-weight: 500; flex: 1; }
      .lm-field-badge { font-family: var(--font-mono); font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; padding: 2px 7px; border-radius: 3px; }
      .lm-badge-compliant { background: var(--green-soft); color: var(--green); }
      .lm-badge-non_compliant { background: var(--red-soft); color: var(--red); }
      .lm-badge-missing { background: var(--red-soft); color: var(--red); }
      .lm-field-value { font-family: var(--font-mono); font-size: 11.5px; color: var(--ink-soft); margin: 6px 0 2px; }
      .lm-field-explain { font-size: 12px; color: var(--ink-soft); }
      .lm-field-citation { font-family: var(--font-mono); font-size: 10.5px; color: var(--brass); margin-top: 4px; }

      .lm-integrity { background: var(--panel-alt); border-radius: 4px; padding: 10px 12px; display: flex; flex-direction: column; gap: 4px; margin-bottom: 16px; }
      .lm-integrity-label { display: flex; align-items: center; gap: 5px; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--brass); margin-bottom: 2px; }
      .lm-integrity-row { display: flex; align-items: center; gap: 7px; font-family: var(--font-mono); font-size: 11px; color: var(--ink-soft); }

      .lm-save-form { display: flex; flex-direction: column; gap: 10px; background: var(--panel); border: 1px solid var(--border); border-radius: 4px; padding: 16px; }
      .lm-form-row { display: flex; align-items: center; gap: 10px; }
      .lm-form-row label { font-size: 12px; color: var(--ink-soft); width: 70px; flex-shrink: 0; }
      .lm-form-row input, .lm-form-row select { flex: 1; border: 1px solid var(--border); border-radius: 3px; padding: 7px 9px; font-size: 13px; background: #fff; }
      .lm-saved-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
      .lm-saved-msg { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--green); }

      .lm-history-controls { display: flex; gap: 10px; margin-bottom: 16px; }
      .lm-search { flex: 1; display: flex; align-items: center; gap: 8px; border: 1px solid var(--border); border-radius: 3px; padding: 7px 10px; background: #fff; }
      .lm-search input { border: none; outline: none; flex: 1; font-size: 13px; }
      .lm-history-controls select { border: 1px solid var(--border); border-radius: 3px; padding: 7px 10px; font-size: 13px; background: #fff; }

      .lm-table-wrap { overflow-x: auto; border: 1px solid var(--border); border-radius: 4px; }
      .lm-table { width: 100%; border-collapse: collapse; font-size: 13px; }
      .lm-table th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--ink-soft); background: var(--panel-alt); padding: 9px 12px; }
      .lm-table td { padding: 9px 12px; border-top: 1px solid var(--border); }
      .lm-row-click { cursor: pointer; }
      .lm-row-click:hover { background: var(--panel-alt); }
      .lm-empty { text-align: center; color: var(--ink-soft); padding: 24px; }

      .lm-kpi-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 8px; }
      .lm-kpi { background: var(--panel); border: 1px solid var(--border); border-top: 3px solid var(--brass); border-radius: 4px; padding: 14px 16px; }
      .lm-kpi-label { font-size: 11px; color: var(--ink-soft); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
      .lm-kpi-value { font-family: var(--font-display); font-size: 24px; font-weight: 600; color: var(--navy-deep); }

      .lm-chart { background: var(--panel); border: 1px solid var(--border); border-radius: 4px; padding: 12px; }

      .lm-heatmap { display: flex; flex-direction: column; gap: 4px; }
      .lm-heatmap-row { display: grid; grid-template-columns: 180px repeat(4, 1fr); gap: 4px; }
      .lm-heatmap-header { font-size: 11px; color: var(--ink-soft); }
      .lm-heatmap-col-label { text-align: center; padding: 4px 0; }
      .lm-heatmap-row-label { font-size: 12.5px; display: flex; align-items: center; padding-right: 8px; }
      .lm-heatmap-cell { display: flex; align-items: center; justify-content: center; font-family: var(--font-mono); font-size: 12px; border-radius: 3px; padding: 12px 4px; color: var(--navy-deep); }

      .lm-modal-scrim { position: fixed; inset: 0; background: rgba(19,28,46,0.45); display: flex; align-items: center; justify-content: center; padding: 20px; z-index: 10; }
      .lm-modal { background: var(--panel); border-radius: 6px; padding: 20px 22px; width: 100%; max-width: 420px; max-height: 80vh; overflow-y: auto; }
      .lm-modal-wide { max-width: 520px; }
      .lm-modal-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
      .lm-case-meta { display: flex; gap: 6px; font-size: 12px; color: var(--ink-soft); margin-bottom: 10px; flex-wrap: wrap; }
      .lm-no-image { display: flex; align-items: center; gap: 8px; background: var(--panel-alt); border-radius: 4px; padding: 14px; font-size: 12.5px; color: var(--ink-soft); margin: 12px 0; }

      .lm-changelog { display: flex; flex-direction: column; gap: 14px; }
      .lm-changelog-item { border-left: 2px solid var(--brass); padding-left: 12px; }
      .lm-changelog-top { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
      .lm-changelog-version { font-family: var(--font-mono); font-size: 12px; font-weight: 600; color: var(--navy); }
      .lm-changelog-date { font-size: 11px; color: var(--ink-soft); }
      .lm-changelog-approved { display: flex; align-items: center; gap: 3px; font-size: 10.5px; color: var(--green); margin-left: auto; }
      .lm-changelog-desc { font-size: 12.5px; color: var(--ink-soft); }
      .lm-changelog-new { font-family: var(--font-mono); font-size: 9.5px; font-weight: 700; letter-spacing: 0.05em; color: var(--navy); background: var(--brass-soft); padding: 1px 6px; border-radius: 3px; }

      .lm-ruleadmin-active { background: var(--panel); border: 1px solid var(--border); border-top: 3px solid var(--brass); border-radius: 4px; padding: 14px 16px; margin-bottom: 16px; }
      .lm-ruleadmin-active-top { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
      .lm-ruleadmin-active-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--ink-soft); }
      .lm-ruleadmin-active-desc { font-size: 13px; color: var(--ink); }

      .lm-ruleadmin-draft { display: flex; flex-direction: column; gap: 14px; background: var(--panel); border: 1px solid var(--border); border-radius: 4px; padding: 16px; margin-top: 4px; }
      .lm-ruleadmin-editor-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
      .lm-ruleadmin-editor-col { display: flex; flex-direction: column; gap: 6px; }
      .lm-ruleadmin-col-label { display: flex; align-items: center; gap: 5px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--ink-soft); }
      .lm-ruleadmin-textarea { font-family: var(--font-mono); font-size: 12px; border: 1px solid var(--border); border-radius: 3px; padding: 10px; resize: vertical; background: #fff; line-height: 150%; }

      .lm-diff { font-family: var(--font-mono); font-size: 11.5px; background: var(--panel-alt); border-radius: 3px; padding: 10px; min-height: 140px; overflow-y: auto; }
      .lm-diff-empty { color: var(--ink-soft); }
      .lm-diff-line { padding: 2px 4px; border-radius: 2px; margin-bottom: 2px; white-space: pre-wrap; }
      .lm-diff-removed { background: var(--red-soft); color: var(--red); text-decoration: line-through; }
      .lm-diff-added { background: var(--green-soft); color: var(--green); }

      .lm-ruleadmin-review { display: flex; flex-direction: column; gap: 10px; background: var(--brass-soft); border-radius: 4px; padding: 14px; }
      .lm-ruleadmin-review-label { display: flex; align-items: center; gap: 7px; font-size: 12.5px; font-weight: 600; color: var(--navy-deep); }
      .lm-ruleadmin-comment { font-size: 12px; font-style: italic; color: var(--ink-soft); margin-top: 4px; }

      @media (max-width: 640px) {
        .lm-ruleadmin-editor-row { grid-template-columns: 1fr; }
      }

      .lm-chip-row { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
      .lm-chip { background: var(--panel-alt); border: 1px solid var(--border); color: var(--ink-soft); font-size: 12.5px; padding: 7px 14px; border-radius: 20px; }
      .lm-chip:hover { border-color: var(--navy); }
      .lm-chip-active { background: var(--navy); color: #fff; border-color: var(--navy); }

      .lm-decision-badge { display: flex; align-items: center; gap: 7px; font-size: 12.5px; padding: 9px 12px; border-radius: 4px; margin-bottom: 14px; }
      .lm-decision-confirmed { background: var(--green-soft); color: var(--green); }
      .lm-decision-disputed { background: var(--brass-soft); color: var(--navy-deep); }

      .lm-notice-preview { background: var(--panel-alt); border: 1px solid var(--border); border-radius: 4px; padding: 14px 16px; margin-bottom: 14px; }
      .lm-notice-title { font-family: var(--font-display); font-weight: 700; font-size: 14px; letter-spacing: 0.08em; color: var(--navy-deep); margin-bottom: 8px; }
      .lm-notice-line { font-size: 12.5px; color: var(--ink); margin-bottom: 3px; }

      .lm-sig-canvas { width: 100%; max-width: 280px; height: 100px; border: 1.5px dashed var(--border); border-radius: 4px; background: #fff; display: block; cursor: crosshair; touch-action: none; }

      .lm-assign-list { display: flex; flex-direction: column; gap: 8px; }
      .lm-assign-item { display: flex; align-items: center; gap: 10px; background: var(--panel); border: 1px solid var(--border); border-radius: 4px; padding: 10px 12px; font-size: 13px; cursor: pointer; }
      .lm-assign-item:hover { border-color: var(--navy); }
      .lm-assign-item-active { border-color: var(--navy); background: var(--panel-alt); }

      .lm-case-status-badges { display: flex; flex-direction: column; gap: 6px; margin-top: 4px; }
      .lm-case-status-badges .lm-decision-badge { margin-bottom: 0; }

      .lm-scale-section { background: var(--panel); border: 1px solid var(--border); border-radius: 4px; padding: 14px 16px; margin-bottom: 16px; display: flex; flex-direction: column; gap: 10px; }
      .lm-scale-row { display: flex; align-items: center; gap: 8px; }
      .lm-scale-row input { width: 100px; border: 1px solid var(--border); border-radius: 3px; padding: 7px 9px; font-size: 13px; }
      .lm-scale-unit { font-family: var(--font-mono); font-size: 12px; color: var(--ink-soft); }

      .lm-exempt-badge { display: inline-flex; align-items: center; gap: 5px; font-family: var(--font-mono); font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.05em; padding: 4px 10px; border-radius: 20px; margin: 0 0 14px; }
      .lm-exempt-yes { background: var(--brass-soft); color: var(--navy-deep); }
      .lm-exempt-no { background: var(--panel-alt); color: var(--ink-soft); }

      .lm-risk-badge { display: inline-flex; align-items: center; gap: 6px; padding: 5px 11px; border-radius: 20px; font-size: 12px; }
      .lm-risk-score { font-family: var(--font-mono); font-weight: 700; }
      .lm-risk-label { font-size: 11px; }
      .lm-risk-low { background: var(--green-soft); color: var(--green); }
      .lm-risk-medium { background: #F3DCC8; color: #8a5a1f; }
      .lm-risk-high { background: var(--red-soft); color: var(--red); }
      .lm-risk-small { padding: 2px 8px; font-size: 10.5px; }
      .lm-risk-small .lm-risk-label { display: none; }

      .lm-qr-canvas { border: 1px solid var(--border); border-radius: 3px; flex-shrink: 0; }
      .lm-custody { display: flex; gap: 14px; align-items: flex-start; background: var(--panel); border: 1px solid var(--border); border-radius: 4px; padding: 14px 16px; margin-bottom: 16px; }
      .lm-custody-id { font-family: var(--font-mono); font-size: 13px; color: var(--navy); margin: 4px 0; }

      .lm-ledger { margin-bottom: 16px; }
      .lm-ledger .lm-table-wrap { margin-top: 8px; }

      .lm-bias-flag { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; color: var(--red); font-weight: 600; }

      .lm-calib-badge { font-family: var(--font-mono); font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.04em; padding: 3px 9px; border-radius: 20px; }
      .lm-calib-ok { background: var(--green-soft); color: var(--green); }
      .lm-calib-due_soon { background: #F3DCC8; color: #8a5a1f; }
      .lm-calib-overdue { background: var(--red-soft); color: var(--red); }

      .lm-source-badge { display: inline-flex; align-items: center; gap: 4px; font-family: var(--font-mono); font-size: 10px; text-transform: uppercase; letter-spacing: 0.03em; padding: 3px 8px; border-radius: 20px; background: var(--brass-soft); color: var(--navy-deep); white-space: nowrap; }
      .lm-source-badge-small { font-size: 9.5px; padding: 2px 6px; }

      .lm-ecom-panel { background: var(--panel); border: 1px solid var(--border); border-radius: 4px; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
      .lm-ecom-status { font-size: 12.5px; color: var(--ink-soft); }
      .lm-ecom-skus { margin-top: 4px; }
      .lm-ecom-sku-list { display: flex; flex-direction: column; gap: 6px; margin-top: 8px; }
      .lm-ecom-sku-row { display: flex; align-items: center; gap: 10px; font-size: 12.5px; background: var(--panel-alt); border-radius: 3px; padding: 8px 10px; }
      .lm-ecom-sku-code { font-family: var(--font-mono); font-size: 11px; color: var(--navy); flex-shrink: 0; }
      .lm-ecom-sku-brand { flex: 1; }
      .lm-ecom-sku-platform { font-size: 11px; color: var(--ink-soft); }


      @media (max-width: 640px) {
        .lm-role-cards { grid-template-columns: 1fr; }
        /* 5 tiles in a 2-col grid leaves the last one alone on its own row —
           span it across both columns instead of stranding it on the left. */
        .lm-kpi-grid { grid-template-columns: 1fr 1fr; }
        .lm-kpi:last-child { grid-column: 1 / -1; }
        .lm-heatmap-row { grid-template-columns: 110px repeat(4, 1fr); }
        .lm-history-controls { flex-direction: column; }
      }
    `}</style>
  );
}
