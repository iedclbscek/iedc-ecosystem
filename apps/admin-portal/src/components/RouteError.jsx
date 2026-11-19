import { useEffect } from 'react';
import { useRouteError } from 'react-router-dom';
import { isChunkLoadError, recoverChunkLoad } from '../utils/chunkRecovery';

export default function RouteError() {
  const error = useRouteError();
  const missingPage = isChunkLoadError(error);

  useEffect(() => { recoverChunkLoad(error); }, [error]);

  return <main className="sign-in">
    <section className="sign-in-card" role="alert" aria-labelledby="route-error-title">
      <header className="sign-in-brand"><img src="/iedc-mark.webp" width="34" height="34" alt="" />IEDC workspace</header>
      <div className="grid gap-4 p-6">
        <h1 id="route-error-title" className="text-xl font-semibold">{missingPage ? 'This page needs a refresh' : 'This page could not open'}</h1>
        <p className="op-caption">{missingPage
          ? 'The workspace may have updated, or your connection was interrupted. Check your connection and reload to continue.'
          : 'Please reload the page and try again. If this continues, contact your workspace administrator.'}</p>
        <button type="button" className="op-primary justify-center" onClick={() => window.location.reload()}>Reload page</button>
        <a className="op-secondary justify-center" href="/">Back to workspace</a>
      </div>
    </section>
  </main>;
}
