import { Navigate, useParams } from 'react-router-dom';

import VisualisationCard from '@/components/charts/VisualisationCard.jsx';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States.jsx';
import { DOMAIN_BY_SLUG, DOMAIN_META } from '@/config/constants.js';
import { publicApi } from '@/api/services.js';
import useAsync from '@/hooks/useAsync.js';

/**
 * Serves `/climate`, `/energy` and `/power` from one component — the domain is
 * read from the route, so adding a domain needs no new page.
 */
const DomainPage = () => {
  const { domainSlug } = useParams();
  const domain = DOMAIN_BY_SLUG[domainSlug];

  const { data, error, isLoading, reload } = useAsync(
    () => (domain ? publicApi.visualisations(domainSlug) : Promise.resolve({ items: [] })),
    [domainSlug, domain],
  );

  if (!domain) return <Navigate to="/" replace />;

  const meta = DOMAIN_META[domain];
  const items = data?.items ?? [];

  return (
    <>
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} aria-hidden="true" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {meta.label} domain
            </p>
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            {meta.label} datasets
          </h1>
          <p className="mt-3 max-w-2xl text-base text-slate-600">{meta.blurb}</p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {isLoading && <LoadingState label={`Loading ${meta.label.toLowerCase()} visualisations…`} />}

        {error && <ErrorState message={error.message} onRetry={reload} />}

        {!isLoading && !error && items.length === 0 && (
          <EmptyState
            title={`No ${meta.label.toLowerCase()} visualisations yet`}
            message="Approved datasets in this domain will appear here automatically."
          />
        )}

        {!isLoading && !error && items.length > 0 && (
          <>
            <p className="mb-6 text-sm text-slate-500">
              {items.length} published visualisation{items.length === 1 ? '' : 's'}
            </p>
            <div className="grid items-start gap-6 xl:grid-cols-2">
              {items.map((dataset) => (
                <VisualisationCard
                  key={dataset.id}
                  dataset={dataset}
                  showDomain={false}
                />
              ))}
            </div>
          </>
        )}
      </section>
    </>
  );
};

export default DomainPage;
