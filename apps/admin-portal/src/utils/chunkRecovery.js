const reloadKey = 'iedc:chunk-reload-at';
const retryWindow = 60_000;

export function isChunkLoadError(error) {
  return /failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed|loading chunk .+ failed|unable to preload css/i.test(error?.message || '');
}

export function recoverChunkLoad(error, scope = window, now = Date.now()) {
  if (!isChunkLoadError(error) || scope.navigator.onLine === false) return false;
  try {
    const previous = Number(scope.sessionStorage.getItem(reloadKey));
    if (previous > 0 && now - previous < retryWindow) return false;
    // Persist before reloading so a failed new document cannot start a refresh loop.
    scope.sessionStorage.setItem(reloadKey, String(now));
  } catch { return false; }
  scope.location.reload();
  return true;
}
