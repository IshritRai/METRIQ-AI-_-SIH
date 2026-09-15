// Design tokens: the single source of truth for the app's color/type/motion
// values. Consumed by:
//   - src/index.css's `@theme` block (Tailwind utilities for new components)
//   - App.jsx's injected `GlobalStyle` (the CSS custom properties every
//     legacy `.lm-*` class still references)
// The jsPDF builders (`PDF_COLORS` in App.jsx) still hold their own RGB
// arrays for now. Unifying those is scheduled for the ScanView/CaseDetail
// phase of the revamp, not this one. Until then, keep hex values here and
// in `PDF_COLORS` in sync by hand.
export const COLORS = {
  bg: "#F7F6F2",
  panel: "#FFFFFF",
  panelAlt: "#EFEDE6",
  ink: "#181B22",
  inkSoft: "#5B5F68",
  navy: "#1F2E4A",
  navyDeep: "#131C2E",
  brass: "#AD7F33",
  brassSoft: "#E9DAB8",
  brassStrong: "#C79341", // brass CTA hover, was hardcoded inline before
  green: "#2C7A55",
  greenSoft: "#E3F0E9",
  red: "#B23A34",
  redSoft: "#F6E4E2",
  border: "#DEDACD",
  paper: "#F1EEE4", // off-white used on dark navy bands (hero text, watermark strokes)
};

export const FONTS = {
  display: "'Spectral', Georgia, serif",
  body: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif",
  mono: "'IBM Plex Mono', 'SF Mono', monospace",
};

export const EASE = {
  out: "cubic-bezier(0.16, 1, 0.3, 1)",
  back: "cubic-bezier(0.34, 1.56, 0.64, 1)",
};

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// jsPDF wants plain [r, g, b] arrays, not CSS strings. Generated from
// COLORS above instead of hand-duplicated, so the PDF report and the app's
// on-screen colors can't drift apart from each other.
export const PDF_COLORS = {
  navy: hexToRgb(COLORS.navy),
  navyDeep: hexToRgb(COLORS.navyDeep),
  brass: hexToRgb(COLORS.brass),
  ink: hexToRgb(COLORS.ink),
  inkSoft: hexToRgb(COLORS.inkSoft),
  green: hexToRgb(COLORS.green),
  red: hexToRgb(COLORS.red),
  border: hexToRgb(COLORS.border),
};
