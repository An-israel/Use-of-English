/**
 * A page loaded before a new deployment can't run the new deployment's server
 * actions or load its code chunks: submitting a form then fails in the browser
 * ("Failed to find Server Action … older or newer deployment"). Reloading the
 * page fixes it, so the error pages do that once instead of showing an error.
 */
export const STALE_DEPLOY =
  /server action|older or newer deployment|ChunkLoadError|loading chunk [\w-]+ failed|failed to load chunk|importing a module script failed/i;

const KEY = "jhtcs-reloaded-for-new-version";

/** Reloads once per minute at most (so a real fault can't loop); returns whether it reloaded. */
export function reloadForNewVersion(): boolean {
  try {
    const last = Number(sessionStorage.getItem(KEY) ?? 0);
    if (Date.now() - last < 60_000) return false;
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    // Storage blocked: still reload once; the page then works normally.
  }
  window.location.reload();
  return true;
}
