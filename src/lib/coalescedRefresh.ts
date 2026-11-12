// One shared page refresh for all realtime listeners.
//
// Several components listen to the same database changes (the nav counts, the dashboard listener and each page's
// own listener). Before, each one called router.refresh() on its own, so a single change re-rendered the page on the
// server about 3 times per open tab, including tabs nobody was looking at.
//
// Now every listener calls requestRefresh() instead:
// - changes that arrive close together produce ONE refresh (it waits DELAY_MS after the last change, but never
//   longer than MAX_WAIT_MS after the first one, so a long burst still updates the page);
// - while the tab is hidden nothing is refreshed; the tab remembers that something changed and refreshes once
//   when it becomes visible again (see takePendingRefresh()).

const DELAY_MS = 1500
const MAX_WAIT_MS = 5000

let timer: ReturnType<typeof setTimeout> | null = null
let firstRequestAt = 0
let pendingWhileHidden = false
let refreshFn: (() => void) | null = null

function isHidden(): boolean {
  return typeof document !== 'undefined' && document.visibilityState === 'hidden'
}

function run() {
  timer = null
  firstRequestAt = 0
  refreshFn?.()
}

// Ask for a page refresh after a realtime change. Pass router.refresh.
export function requestRefresh(refresh: () => void): void {
  refreshFn = refresh
  if (isHidden()) {
    pendingWhileHidden = true
    return
  }
  const now = Date.now()
  if (timer) {
    clearTimeout(timer)
  } else {
    firstRequestAt = now
  }
  const waited = now - firstRequestAt
  timer = setTimeout(run, Math.max(0, Math.min(DELAY_MS, MAX_WAIT_MS - waited)))
}

// True (once) if a change arrived while the tab was hidden; the caller then refreshes the page.
export function takePendingRefresh(): boolean {
  const pending = pendingWhileHidden
  pendingWhileHidden = false
  return pending
}
