import { ChevronRight, Gavel, GaugeCircle, Scale, ScanLine } from "lucide-react";
import {
  CubeTransparent, FileMagnifyingGlass, FilePdf, Fingerprint, Scroll, SquaresFour,
} from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "../components/ui/Button.jsx";
import { cn } from "../lib/utils.js";
import { COLORS } from "../lib/theme.js";
import heroBg from "../assets/hero-bg.jpg";
import inspectorPhoto from "../assets/inspector-photo.jpg";

// SVG-noise data URI used as a fine grain texture over the dark bands. A
// deliberate, hand-tuned visual asset (not a stock photo) that gives flat
// navy panels the depth and material feel of a printed official document.
const GRAIN_SVG = "<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'>" +
  "<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/>" +
  "<feColorMatrix type='saturate' values='0'/></filter>" +
  "<rect width='100%' height='100%' filter='url(#n)'/></svg>";
const GRAIN_URL = "url(\"data:image/svg+xml," + encodeURIComponent(GRAIN_SVG) + "\")";

function GrainOverlay() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-overlay"
      style={{ backgroundImage: GRAIN_URL }}
    />
  );
}

// Real photograph of an Indian kirana (neighborhood grocery) storefront,
// see src/assets/CREDITS.md, dimmed under a navy gradient so it reads as
// material texture behind the type, not a competing visual. Indian context
// on purpose: the rules this app implements are the Legal Metrology
// (Packaged Commodities) Rules, 2011, an Indian statute.
function HeroPhotoBackdrop() {
  return (
    <div aria-hidden="true" className="absolute inset-0">
      <img src={heroBg} alt="" className="h-full w-full object-cover opacity-40" />
      <div className="absolute inset-0 bg-gradient-to-b from-navy-deep/90 via-navy-deep/85 to-navy-deep" />
    </div>
  );
}

// A large, mostly-cropped emblem bleeding off the hero's edge: a genuine
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
    <svg
      aria-hidden="true"
      viewBox="0 0 520 520"
      className="pointer-events-none absolute -right-24 top-1/2 h-[420px] w-[420px] -translate-y-1/2 opacity-25 md:h-[520px] md:w-[520px]"
    >
      {ticks.map((t) => (
        <line key={t.key} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke={COLORS.paper} strokeWidth="1.5" />
      ))}
      <circle cx={cx} cy={cy} r="210" fill="none" stroke={COLORS.paper} strokeWidth="1" />
      <circle cx={cx} cy={cy} r="176" fill="none" stroke="var(--brass-soft)" strokeWidth="1" strokeDasharray="2 8" />
    </svg>
  );
}

// Real photograph, supplied by the user (see src/assets/CREDITS.md), of an
// inspector checking packaged goods against a manual checklist: the exact
// job this app digitizes.
function FieldPhoto() {
  return (
    <img
      src={inspectorPhoto}
      alt="An inspector checking packaged goods on a store shelf against a paper checklist"
      className="aspect-[4/3] w-full rounded-md border border-white/10 object-cover shadow-[0_24px_60px_-20px_rgba(6,10,20,0.6)]"
    />
  );
}

// Real, checkable facts about the app (matches REQUIRED_FIELDS.length and
// the 3-role model in App.jsx), not a usage or adoption number, which this
// project has no real deployment data to back up.
const FACTS = [
  { value: "5", label: "Declarations checked on every label, no shortcuts" },
  { value: "3", label: "Roles working off one shared case file" },
  { value: "2011", label: "The Rules this app reads from, cited on every line" },
];

const STEPS = [
  {
    icon: ScanLine,
    title: "Photograph, don't paraphrase",
    body: "Snap the label where it sits on the shelf. OCR lifts every declared field straight off the pack, timestamped and geotagged, so nobody can argue about where or when the photo was taken.",
  },
  {
    icon: GaugeCircle,
    title: "Let the rulebook argue, not you",
    body: "Every field gets checked against the live Rule 6 text. A mismatch doesn't just get flagged: it gets named, with the exact sub-clause it breaks attached to it.",
  },
  {
    icon: Gavel,
    title: "Close the loop, on paper",
    body: "A supervisor sets the penalty band. A rule admin signs off on any amendment. Both actions land in the same case file, dated and traceable back to the original photo.",
  },
];

// What the platform actually does, screen by screen: kept literal (real
// capabilities, not marketing abstractions) so the page doubles as
// documentation. `tone` picks the icon tile's color; `big` and `wide` mark
// the two featured tiles in the bento grid below.
const FEATURES = [
  {
    icon: FileMagnifyingGlass, tone: "navy", big: true,
    title: "Reads the label so you don't have to",
    body: "OCR lifts net quantity, MRP, manufacturer address, packing date and consumer care details straight off the photo. Nobody types a single field in by hand.",
  },
  {
    icon: Scroll, tone: "brass",
    title: "Every flag points to a clause",
    body: "\"Non-compliant\" is never the whole sentence. Each violation names the exact sub-rule it breaks.",
  },
  {
    icon: Fingerprint, tone: "green",
    title: "A photo that can't be quietly swapped",
    body: "GPS, a timestamp, and a device hash travel with every capture, so a case file still holds up months later.",
  },
  {
    icon: SquaresFour, tone: "brass", wide: true,
    title: "The same numbers, three different jobs",
    body: "Supervisors track brands and categories. Rule admins track published amendments. One database, a different lens for each role.",
  },
  {
    icon: FilePdf, tone: "navy",
    title: "One click, one signed report",
    body: "Verdict, statutory basis, evidence photo, and signature block, formatted and ready to hand to a court or a manufacturer.",
  },
  {
    icon: CubeTransparent, tone: "green",
    title: "Check the pack, not just the photo",
    body: "High-risk SKUs get cross-checked against a real 3D scan of the physical product, not a flat image that's easy to fake.",
  },
];

const TONE_CLASSES = {
  navy: "bg-navy-deep text-brass-soft",
  brass: "bg-brass-soft text-brass",
  green: "bg-green-soft text-green",
};

const EASE_OUT = [0.16, 1, 0.3, 1];

export function Landing({ onEnter }) {
  const reduceMotion = useReducedMotion();

  const fadeUp = (delay = 0) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 14 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, margin: "-60px" },
          transition: { duration: 0.6, ease: EASE_OUT, delay },
        };

  return (
    <div className="text-ink">
      {/* Hero band */}
      <div className="relative overflow-hidden bg-navy-deep">
        <HeroPhotoBackdrop />
        <GrainOverlay />
        <HeroWatermark />

        <div className="relative z-10 mx-auto flex max-w-[1180px] items-center justify-between border-b border-white/10 px-6 py-5 md:px-10">
          <div className="flex items-center gap-2.5">
            <div className="flex h-[27px] w-[27px] items-center justify-center rounded-md bg-brass">
              <Scale size={14} color={COLORS.navyDeep} />
            </div>
            <span className="font-display text-[16px] font-semibold tracking-tight text-paper">
              METRIQ&nbsp;<span className="text-brass-soft">AI</span>
            </span>
          </div>
          <div className="hidden font-mono text-[11px] tracking-wide text-paper/50 md:block">
            Legal Metrology Division · Field Compliance Platform
          </div>
        </div>

        <div className="relative z-10 mx-auto grid max-w-[1180px] grid-cols-1 items-center gap-16 px-6 py-14 md:grid-cols-[1.15fr_0.85fr] md:px-10 md:py-20">
          <div className="flex flex-col">
            <motion.div {...fadeUp(0)} className="font-mono text-[11px] uppercase tracking-[0.14em] text-brass">
              Legal Metrology (Packaged Commodities) Rules, 2011
            </motion.div>
            <motion.h1
              {...fadeUp(0.08)}
              className="mt-4 max-w-[560px] font-display text-[clamp(1.9rem,1.1rem+2.4vw,3.1rem)] font-semibold leading-[1.08] tracking-tight text-paper"
            >
              Five things a label must say. One photo to check them all.
            </motion.h1>
            <motion.p {...fadeUp(0.16)} className="mt-5 max-w-[460px] text-[15.5px] leading-[1.65] text-paper/70">
              Point a phone at any packaged label. METRIQ AI reads the manufacturer address, net
              quantity, MRP, packing date, and consumer care line, checks each one against Rule 6,
              and hands back a signed case file before you've moved to the next shelf.
            </motion.p>
            <motion.div {...fadeUp(0.24)} className="mt-7 flex flex-wrap gap-3">
              <Button variant="primary" onClick={onEnter}>
                Enter console <ChevronRight size={15} />
              </Button>
              <Button variant="dark" onClick={onEnter}>See how it works</Button>
            </motion.div>

            {/* Real, checkable facts, folded into the hero itself rather than
                a separate showy stats band, with no invented usage number. */}
            <motion.dl {...fadeUp(0.32)} className="mt-9 grid grid-cols-3 gap-5 border-t border-white/10 pt-6">
              {FACTS.map((f) => (
                <div key={f.label}>
                  <dt className="font-display text-[26px] font-semibold text-paper">{f.value}</dt>
                  <dd className="mt-1 text-[11.5px] leading-snug text-paper/50">{f.label}</dd>
                </div>
              ))}
            </motion.dl>
          </div>

          <motion.div {...fadeUp(0.2)}>
            <FieldPhoto />
          </motion.div>
        </div>
      </div>

      {/* How it works: a numbered timeline, not a 3-up card grid */}
      <div className="mx-auto max-w-[1180px] px-6 py-16 md:px-10">
        <div className="mb-12 max-w-[520px]">
          <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-brass">How verification works</div>
          <h2 className="mt-2 font-display text-[26px] font-semibold text-navy-deep">Three steps, no paperwork lost in between</h2>
        </div>
        <div className="relative flex flex-col gap-10">
          <div className="absolute bottom-2 left-[27px] top-2 hidden w-px bg-border sm:block" aria-hidden="true" />
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div key={step.title} {...fadeUp(i * 0.12)} className="relative flex gap-6">
                <div className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-brass bg-panel font-mono text-[15px] font-semibold text-navy-deep">
                  0{i + 1}
                </div>
                <div className="pt-1.5">
                  <div className="flex items-center gap-2">
                    <Icon size={16} color={COLORS.brass} />
                    <div className="font-display text-[19px] font-semibold text-navy-deep">{step.title}</div>
                  </div>
                  <div className="mt-2 max-w-[480px] text-[13.5px] leading-relaxed text-ink-soft">{step.body}</div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Feature bento: what each screen actually does */}
      <div className="border-t border-border bg-panel-alt">
        <div className="mx-auto max-w-[1180px] px-6 py-16 md:px-10">
          <div className="mb-10 max-w-[560px]">
            <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-brass">Inside the platform</div>
            <h2 className="mt-2 font-display text-[26px] font-semibold text-navy-deep">More than a scan-and-flag tool</h2>
            <p className="mt-3 text-[14px] leading-relaxed text-ink-soft">
              A full record from first photo to published amendment, not a single verdict that
              vanishes once you close the tab.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-flow-dense lg:grid-cols-4">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.title}
                  {...fadeUp((i % 3) * 0.08)}
                  className={cn(
                    "flex flex-col rounded border border-border bg-panel p-6",
                    f.big && "lg:col-span-2 lg:p-8",
                    f.wide && "lg:col-span-2"
                  )}
                >
                  <div className={cn("flex items-center justify-center rounded-2xl", TONE_CLASSES[f.tone], f.big ? "h-14 w-14" : "h-11 w-11")}>
                    <Icon size={f.big ? 28 : 20} weight="duotone" />
                  </div>
                  <div className={cn("mt-5 font-display font-semibold text-navy-deep", f.big ? "text-[21px]" : "text-[16px]")}>{f.title}</div>
                  <div className={cn("mt-2 leading-relaxed text-ink-soft", f.big ? "max-w-[360px] text-[14px]" : "text-[13px]")}>{f.body}</div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Closing CTA */}
      <motion.div {...fadeUp(0)} className="relative overflow-hidden bg-navy-deep">
        <GrainOverlay />
        <div className="relative z-10 mx-auto flex max-w-[1180px] flex-col items-start gap-5 px-6 py-16 md:px-10">
          <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-brass">Ready when you are</div>
          <h2 className="max-w-[620px] font-display text-[clamp(1.4rem,1rem+1.4vw,2rem)] font-semibold leading-[1.3] text-paper">
            Pick up your phone. The next label is already waiting on the shelf.
          </h2>
          <Button variant="primary" onClick={onEnter}>
            Enter console <ChevronRight size={15} />
          </Button>
        </div>
      </motion.div>

      <div className="mx-auto flex max-w-[1180px] flex-col gap-1 px-6 py-6 font-mono text-[11px] text-ink-soft md:flex-row md:items-center md:justify-between md:px-10">
        <span>Legal Metrology Division</span>
        <span>Legal Metrology Act, 2009 · Packaged Commodities Rules, 2011</span>
      </div>
    </div>
  );
}
