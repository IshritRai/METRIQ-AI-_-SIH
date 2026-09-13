import { useState, useMemo, useRef, Component } from "react";
import {
  ShieldCheck, ShieldAlert, RotateCcw, Search, Upload, Camera, FileText,
  X, ChevronRight, ChevronLeft, MapPin, Clock, Hash, AlertTriangle,
  LayoutDashboard, Sparkles, Download, ClipboardList, Users,
  History as HistoryIcon, ScanLine, CheckCircle2, XCircle, Loader2
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from "recharts";

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
  "Bengaluru": "12.9716\u00B0 N, 77.5946\u00B0 E",
  "Chennai": "13.0827\u00B0 N, 80.2707\u00B0 E",
  "Hyderabad": "17.3850\u00B0 N, 78.4867\u00B0 E",
  "Mumbai": "19.0760\u00B0 N, 72.8777\u00B0 E",
};

const RULE_CHANGELOG = [
  { version: "v2.4", date: "2026-07-02", desc: "Tightened minimum font-size guidance for net-quantity declarations on packages under 200g.", approved: true },
  { version: "v2.3", date: "2026-05-18", desc: "Clarified that combo/bundle packs must show both the combined MRP and a legible per-unit MRP.", approved: true },
  { version: "v2.2", date: "2026-03-30", desc: "Added consumer-care e-mail as an accepted alternative to a toll-free number.", approved: true },
  { version: "v2.1", date: "2026-02-11", desc: "Extended exemption threshold review for sub-10g / 10ml sachets.", approved: true },
];

function buildFields(overrides = {}) {
  return REQUIRED_FIELDS.map((name) => {
    if (overrides[name]) {
      return { name, status: overrides[name].status, explanation: overrides[name].explanation, value: overrides[name].value ?? "\u2014" };
    }
    return { name, status: "compliant", explanation: "Present and correctly formatted.", value: "\u2014" };
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
    overrides: { "Maximum Retail Price (incl. of all taxes)": { status: "non_compliant", explanation: "MRP shown as a range, not a single fixed price as required.", value: "Rs. 99\u2013129" } } },
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
      gps: GPS_BY_REGION[d.region] + " (simulated)",
      timestamp: d.date + "T10:00:00.000Z",
      imageDataUrl: null,
    };
  });
  const retakes = RETAKE_DEFS.map((d, i) => ({
    ...d, fields: [], status: "retake_needed",
    hash: FAKE_HASHES[i % FAKE_HASHES.length],
    gps: GPS_BY_REGION[d.region] + " (simulated)",
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

async function analyzeLabelImage({ base64, mediaType }) {
  const systemPrompt = `You are assisting a Legal Metrology field inspector in India who is reviewing a photograph of a packaged commodity label under the Legal Metrology (Packaged Commodities) Rules, 2011.

First assess image quality. If the label is too blurry, too dark, glare-heavy, badly cropped, or wrinkled enough that you cannot confidently read most of the text, respond with ONLY this JSON (no markdown fences, no prose):
{"image_quality":"retake_needed","retake_reason":"<one short specific sentence about what is wrong>","fields":[],"overall_status":null}

Otherwise, check the label for exactly these five mandatory declarations, in this order, and respond with ONLY this JSON shape:
{
  "image_quality": "good",
  "retake_reason": null,
  "fields": [
    {"name": "Manufacturer / Packer / Importer Name & Address", "value": "<what you read, or null>", "status": "compliant" | "non_compliant" | "missing", "explanation": "<one short sentence>"},
    {"name": "Net Quantity", "value": "...", "status": "...", "explanation": "..."},
    {"name": "Maximum Retail Price (incl. of all taxes)", "value": "...", "status": "...", "explanation": "..."},
    {"name": "Month & Year of Manufacture / Packing", "value": "...", "status": "...", "explanation": "..."},
    {"name": "Consumer Care Details", "value": "...", "status": "...", "explanation": "..."}
  ],
  "overall_status": "compliant" | "non_compliant"
}
Mark a field "missing" if it cannot be found at all, "non_compliant" if present but incomplete or incorrectly formatted (e.g. MRP without "inclusive of all taxes" wording, or a range instead of a fixed price), and "compliant" if present and properly stated. Keep each "explanation" under 15 words. If the label has text in more than one language, base your reading on the English text only. This is for a hackathon demo, not a legal ruling \u2014 make a confident, reasonable judgment call even where the rules are ambiguous. Respond with the JSON object only, nothing else.`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
            { type: "text", text: "Analyze this packaged commodity label photo." },
          ],
        },
      ],
    }),
  });

  let data;
  try {
    data = await response.json();
  } catch (e) {
    throw new Error("The analysis service returned an unreadable response (HTTP " + response.status + ").");
  }

  if (!response.ok) {
    const apiMsg = (data && data.error && data.error.message) || ("HTTP " + response.status);
    throw new Error("Analysis request failed: " + apiMsg);
  }

  const textBlock = (data.content || []).find((b) => b.type === "text");
  if (!textBlock) {
    throw new Error("The model didn't return any readable text in its response.");
  }

  const raw = textBlock.text;
  const match = raw.match(/\{[\s\S]*\}/);
  const clean = match ? match[0] : raw.replace(/```json|```/g, "").trim();

  let parsed;
  try {
    parsed = JSON.parse(clean);
  } catch (e) {
    if (data.stop_reason === "max_tokens") {
      throw new Error("The response got cut off before it finished (this label had a lot to read). Try again.");
    }
    throw new Error("Couldn't parse the model's response as JSON.");
  }

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

/* ---------------------------------------------------------------- */
/* small UI pieces                                                    */
/* ---------------------------------------------------------------- */

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
  return (
    <div className="lm-field-row">
      <div className="lm-field-top">
        <StatusIcon status={field.status === "compliant" ? "compliant" : "non_compliant"} />
        <span className="lm-field-name">{field.name}</span>
        <span className={"lm-field-badge lm-badge-" + field.status}>{field.status.replace("_", " ")}</span>
      </div>
      {field.value && <div className="lm-field-value">Read: {field.value}</div>}
      <div className="lm-field-explain">{field.explanation}</div>
    </div>
  );
}

function IntegrityBadge({ scan }) {
  return (
    <div className="lm-integrity">
      <div className="lm-integrity-row"><Hash size={13} /><span title={scan.hash}>{scan.hash.slice(0, 16)}…</span></div>
      <div className="lm-integrity-row"><Clock size={13} /><span>{new Date(scan.timestamp).toLocaleString("en-IN")}</span></div>
      <div className="lm-integrity-row"><MapPin size={13} /><span>{scan.gps}</span></div>
    </div>
  );
}

function downloadReport(scan) {
  const lines = [
    "LEGAL METROLOGY \u2014 COMPLIANCE REPORT",
    "=====================================",
    `Brand: ${scan.brand}`,
    `Category: ${scan.category}`,
    `Region: ${scan.region}`,
    `Date: ${scan.date}`,
    `Inspector: ${scan.inspector}`,
    `Overall status: ${scan.status.replace("_", " ").toUpperCase()}`,
    "",
    "Declaration checks:",
  ];
  if (scan.status === "retake_needed") {
    lines.push(`(Not evaluated \u2014 retake required: ${scan.retakeReason})`);
  } else {
    scan.fields.forEach((f) => {
      lines.push(`- ${f.name}: ${f.status.toUpperCase()}`);
      lines.push(`  ${f.explanation}`);
    });
  }
  lines.push("", "Integrity", `SHA-256: ${scan.hash}`, `Captured: ${new Date(scan.timestamp).toLocaleString("en-IN")}`, `Location (simulated): ${scan.gps}`);
  const text = lines.join("\n");
  try {
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `compliance-report-${scan.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (e) {
    try {
      const win = window.open("", "_blank");
      if (win) {
        win.document.write("<pre style=\"white-space:pre-wrap;font-family:monospace;padding:24px;\">" + text.replace(/</g, "&lt;") + "</pre>");
        win.document.title = "Compliance report";
      } else {
        window.alert("Download was blocked by the browser. Report text:\n\n" + text);
      }
    } catch (e2) {
      window.alert("Couldn't generate a downloadable report in this preview.");
    }
  }
}

/* ---------------------------------------------------------------- */
/* scan flow                                                          */
/* ---------------------------------------------------------------- */

function ScanView({ onSave }) {
  const [phase, setPhase] = useState("idle"); // idle | analyzing | result | retake | error
  const [image, setImage] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [saveForm, setSaveForm] = useState({ brand: "", category: CATEGORIES[0], region: REGIONS[0] });
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef(null);

  async function runAnalysis(imgData) {
    setImage(imgData);
    setPhase("analyzing");
    setError("");
    setSaved(false);
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
      setError("This looks like a HEIC/HEIF photo, which browsers can't preview directly. Try \u201CUse camera\u201D instead, or export/share the photo as JPEG first.");
      setPhase("error");
      return;
    }
    try {
      const imgData = await processImageFile(file);
      runAnalysis(imgData);
    } catch (err) {
      setError("Couldn't decode that image file \u2014 it may be corrupted or in an unsupported format. Try a JPEG or PNG.");
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
    setSaveForm({ brand: "", category: CATEGORIES[0], region: REGIONS[0] });
  }

  function handleSaveCase() {
    const fields = result.fields;
    const status = computeOverallStatus(fields);
    const scan = {
      id: "live-" + Date.now(),
      brand: saveForm.brand.trim() || "Unlabeled sample",
      category: saveForm.category,
      region: saveForm.region,
      date: new Date().toISOString().slice(0, 10),
      inspector: "You (demo inspector)",
      status,
      fields,
      retakeReason: null,
      hash: image.hashHex,
      gps: GPS_BY_REGION[saveForm.region] + " (simulated)",
      timestamp: new Date().toISOString(),
      imageDataUrl: image.dataUrl,
    };
    onSave(scan);
    setSaved(true);
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
        <div className="lm-retake">
          {image && <img src={image.dataUrl} alt="Label needing retake" className="lm-preview" />}
          <Stamp status="retake_needed" />
          <p className="lm-retake-reason">{result.retake_reason}</p>
          <button className="lm-btn lm-btn-primary" onClick={reset}><RotateCcw size={15} /> Retake photo</button>
        </div>
      )}

      {phase === "result" && result && (
        <div className="lm-result">
          <div className="lm-result-top">
            {image && <img src={image.dataUrl} alt="Scanned label" className="lm-preview" />}
            <Stamp status={computeOverallStatus(result.fields)} />
          </div>
          <div className="lm-fields">
            {result.fields.map((f) => <FieldRow key={f.name} field={f} />)}
          </div>
          <IntegrityBadge scan={{ hash: image.hashHex, timestamp: new Date().toISOString(), gps: GPS_BY_REGION[saveForm.region] + " (simulated)" }} />

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
            <div className="lm-saved-row">
              <span className="lm-saved-msg"><CheckCircle2 size={15} color="var(--green)" /> Saved to repository</span>
              <button className="lm-btn" onClick={() => downloadReport({ id: "current", brand: saveForm.brand || "Unlabeled sample", category: saveForm.category, region: saveForm.region, date: new Date().toISOString().slice(0, 10), inspector: "You (demo inspector)", status: computeOverallStatus(result.fields), fields: result.fields, retakeReason: null, hash: image.hashHex, gps: GPS_BY_REGION[saveForm.region] + " (simulated)", timestamp: new Date().toISOString() })}>
                <Download size={14} /> Download report
              </button>
              <button className="lm-btn" onClick={reset}>Scan another</button>
            </div>
          )}
        </div>
      )}
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
            <tr><th>Status</th><th>Brand</th><th>Category</th><th>Region</th><th>Date</th><th>Inspector</th><th></th></tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id} className="lm-row-click" onClick={() => onSelect(s)}>
                <td><StatusIcon status={s.status} /></td>
                <td>{s.brand}</td>
                <td>{s.category}</td>
                <td>{s.region}</td>
                <td>{formatDate(s.date)}</td>
                <td>{s.inspector}</td>
                <td><ChevronRight size={15} color="var(--ink-soft)" /></td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="lm-empty">No scans match this search.</td></tr>
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

function DashboardView({ scans, onSelect }) {
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
                  {pct === null ? "\u2014" : pct + "%"}
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
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* rules modal + case detail                                          */
/* ---------------------------------------------------------------- */

function RulesModal({ onClose }) {
  return (
    <div className="lm-modal-scrim" onClick={onClose}>
      <div className="lm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="lm-modal-head">
          <h3 className="lm-h3" style={{ margin: 0 }}>Rule amendments</h3>
          <button className="lm-icon-btn" onClick={onClose}><X size={17} /></button>
        </div>
        <div className="lm-changelog">
          {RULE_CHANGELOG.map((r) => (
            <div key={r.version} className="lm-changelog-item">
              <div className="lm-changelog-top">
                <span className="lm-changelog-version">{r.version}</span>
                <span className="lm-changelog-date">{formatDate(r.date)}</span>
                {r.approved && <span className="lm-changelog-approved"><CheckCircle2 size={12} /> Human-verified</span>}
              </div>
              <div className="lm-changelog-desc">{r.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CaseDetail({ scan, onClose }) {
  return (
    <div className="lm-modal-scrim" onClick={onClose}>
      <div className="lm-modal lm-modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="lm-modal-head">
          <h3 className="lm-h3" style={{ margin: 0 }}>{scan.brand}</h3>
          <button className="lm-icon-btn" onClick={onClose}><X size={17} /></button>
        </div>
        <div className="lm-case-meta">
          <span>{scan.category}</span><span>·</span><span>{scan.region}</span><span>·</span>
          <span>{formatDate(scan.date)}</span><span>·</span><span>{scan.inspector}</span>
        </div>
        <Stamp status={scan.status} />
        {scan.imageDataUrl ? (
          <img src={scan.imageDataUrl} alt={scan.brand + " label"} className="lm-preview" style={{ marginTop: 12 }} />
        ) : (
          <div className="lm-no-image"><FileText size={18} /> Historical record — no image on file</div>
        )}
        {scan.status === "retake_needed" ? (
          <p className="lm-retake-reason">{scan.retakeReason}</p>
        ) : (
          <div className="lm-fields">{scan.fields.map((f) => <FieldRow key={f.name} field={f} />)}</div>
        )}
        <IntegrityBadge scan={scan} />
        <button className="lm-btn" onClick={() => downloadReport(scan)}><Download size={14} /> Download report</button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* app shell                                                          */
/* ---------------------------------------------------------------- */

function AppInner() {
  const [role, setRole] = useState(null);
  const [view, setView] = useState("scan");
  const [scans, setScans] = useState(seedScans);
  const [detailScan, setDetailScan] = useState(null);
  const [rulesOpen, setRulesOpen] = useState(false);

  function handleSaveScan(scan) {
    setScans((prev) => [scan, ...prev]);
  }

  return (
    <div className="lm-root">
      <GlobalStyle />

      {!role ? (
        <div className="lm-role-screen">
          <div className="lm-role-eyebrow">Legal Metrology · Field Compliance</div>
          <h1 className="lm-role-title">Packaged Commodity Compliance Checker</h1>
          <p className="lm-role-sub">Screening-round demo — scans are simulated in-session and reset on reload.</p>
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
          </div>
        </div>
      ) : (
        <div className="lm-shell">
          <header className="lm-header">
            <div className="lm-header-left">
              <ShieldCheck size={20} color="var(--brass)" />
              <div>
                <div className="lm-header-eyebrow">Legal Metrology · Field Compliance</div>
                <div className="lm-header-title">{role === "inspector" ? "Inspector console" : "Supervisor dashboard"}</div>
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
          </nav>

          <main className="lm-main">
            {view === "scan" && role === "inspector" && <ScanView onSave={handleSaveScan} />}
            {view === "history" && <HistoryView scans={scans} onSelect={setDetailScan} />}
            {view === "dashboard" && role === "supervisor" && <DashboardView scans={scans} onSelect={setDetailScan} />}
          </main>
        </div>
      )}

      {rulesOpen && <RulesModal onClose={() => setRulesOpen(false)} />}
      {detailScan && <CaseDetail scan={detailScan} onClose={() => setDetailScan(null)} />}
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
            <h1 className="lm-role-title">Something broke in this demo</h1>
            <p className="lm-role-sub">{message}</p>
            <button className="lm-btn lm-btn-primary" onClick={() => this.setState({ error: null })}>Reset demo</button>
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
      .lm-role-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 8px; }
      .lm-role-card { background: var(--panel); border: 1px solid var(--border); border-top: 3px solid var(--brass); border-radius: 4px; padding: 24px 18px; display: flex; flex-direction: column; align-items: flex-start; gap: 8px; text-align: left; transition: border-color 120ms, transform 120ms; }
      .lm-role-card:hover { border-color: var(--navy); transform: translateY(-2px); }
      .lm-role-card-title { font-family: var(--font-display); font-weight: 600; font-size: 18px; color: var(--navy-deep); }
      .lm-role-card-sub { font-size: 12.5px; color: var(--ink-soft); }

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

      .lm-integrity { background: var(--panel-alt); border-radius: 4px; padding: 10px 12px; display: flex; flex-direction: column; gap: 4px; margin-bottom: 16px; }
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

      .lm-kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 8px; }
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

      .lm-modal-scrim { position: absolute; inset: 0; background: rgba(19,28,46,0.45); display: flex; align-items: center; justify-content: center; padding: 20px; z-index: 10; }
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

      @media (max-width: 640px) {
        .lm-role-cards { grid-template-columns: 1fr; }
        .lm-kpi-grid { grid-template-columns: 1fr 1fr; }
        .lm-heatmap-row { grid-template-columns: 110px repeat(4, 1fr); }
        .lm-history-controls { flex-direction: column; }
      }
    `}</style>
  );
}
