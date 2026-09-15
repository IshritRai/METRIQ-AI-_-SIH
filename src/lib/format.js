// Shared date formatters, used across scan results, case history, the
// dashboard, and PDF exports so a date reads the same everywhere.

export function formatDate(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function monthLabel(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
}

// Deliberately avoids "/"-separated date formats here: jsPDF's built-in
// Helvetica metrics render a "/" right after certain digit pairs (e.g. "31")
// so tightly that text extraction reads it back as ".". Spelled-out months
// sidestep the glyph-spacing issue entirely and read more formally besides.
export function formatDateTime(date) {
  const datePart = date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const timePart = date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  return `${datePart}, ${timePart}`;
}
