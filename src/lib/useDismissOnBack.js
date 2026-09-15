import { useEffect, useRef } from "react";

// The app is a single-page client with no router — every screen transition
// and modal is just React state, so it never told the browser it had
// "navigated" anywhere. That left the whole session as a single history
// entry: pressing the hardware/browser back button had nothing of ours to
// go back to, so it fell straight through to whatever was open before the
// app (often just closing the tab / returning to the browser's home page),
// no matter how many screens or dialogs deep the user actually was.
//
// This hook makes any dismissable layer (a modal, a picked role, an open
// case, a wizard step, ...) push one history entry for as long as it's
// open, and treats a back-button press as "close this layer" instead of
// "leave the app". Layers are tracked on a shared stack, most-recently-
// opened last, so back always closes the deepest one first — the way a
// native navigation stack behaves — even when several are nested (e.g. a
// confirmation dialog on top of a case detail view on top of a picked
// role).
//
// Only ONE popstate listener is ever installed, shared by every layer.
// Giving each layer its own listener seems simpler, but every listener
// fires on every popstate event: closing the top layer *in-app* (e.g.
// clicking its X button) has to consume its own history entry via
// history.back(), and if each layer were independently guarding against
// reacting to that synthetic back, whichever layer's guard didn't win the
// race would misread the resulting event as a real back press and close
// itself too — cascading one dismissal into two or more. Routing every
// event through one listener that only ever pops the single current top
// of the stack avoids that race by construction.
const stack = []; // { onDismiss }
let ignoreNextPopstate = false;
let listenerInstalled = false;

function ensureListener() {
  if (listenerInstalled) return;
  listenerInstalled = true;
  window.addEventListener("popstate", () => {
    if (ignoreNextPopstate) {
      // A layer closed itself (not via back) and consumed its own history
      // entry with history.back() — that synthetic pop isn't a user back
      // press, so it shouldn't dismiss anything.
      ignoreNextPopstate = false;
      return;
    }
    const top = stack.pop();
    if (top) top.onDismiss();
  });
}

export function useDismissOnBack(active, onDismiss) {
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (!active) return undefined;
    ensureListener();

    const entry = { onDismiss: () => onDismissRef.current() };
    stack.push(entry);
    window.history.pushState({ __navLayer: stack.length }, "");

    return () => {
      const idx = stack.indexOf(entry);
      if (idx === -1) return; // already popped by a real back-button press
      const wasTop = idx === stack.length - 1;
      stack.splice(idx, 1);
      // Closed via an in-app action (X / Cancel / Save) rather than the back
      // button — consume the history entry we pushed so a later back press
      // means "close the next thing down," not "re-open this one."
      if (wasTop) {
        ignoreNextPopstate = true;
        window.history.back();
      }
    };
  }, [active]);
}
