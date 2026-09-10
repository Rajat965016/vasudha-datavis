import { Link } from 'react-router-dom';

import VisualisationCard from '@/components/charts/VisualisationCard.jsx';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States.jsx';
import { DOMAIN_LIST, DOMAIN_META } from '@/config/constants.js';
import { publicApi } from '@/api/services.js';
import useAsync from '@/hooks/useAsync.js';

const DomainCard = ({ domain, count }) => {
  const meta = DOMAIN_META[domain];
  return (
    <Link
      to={`/${meta.slug}`}
      className="group rounded-xl bg-white p-5 shadow-card ring-1 ring-slate-200 transition hover:ring-brand-300"
    >
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${meta.dot}`} aria-hidden="true" />
        <h3 className="text-sm font-semibold text-slate-900">{meta.label}</h3>
      </div>
      <p className="mt-2 text-sm text-slate-500">{meta.blurb}</p>
      <p className="mt-4 text-sm font-semibold text-brand-700 group-hover:text-brand-800">
        {count ?? 0} published visualisation{count === 1 ? '' : 's'} →
      </p>
    </Link>
  );
};

/**
 * Public landing page. Shows every approved visualisation in the exact order
 * the Super Admin approved them, which is the order the API returns.
 */
const LandingPage = () => {
  const { data, error, isLoading, reload } = useAsync(() => publicApi.visualisations(), []);
  const { data: statsData } = useAsync(() => publicApi.stats(), []);

  const items = data?.items ?? [];
  const byDomain = statsData?.stats?.byDomain ?? {};

  return (
    <>
      <section className="border-b border-slate-200 bg-gradient-to-b from-white to-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">
            Open data portal
          </p>
          <h1 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Climate, Energy and Power data for India
          </h1>
          <p className="mt-4 max-w-2xl text-base text-slate-600">
            Explore interactive maps and charts built from datasets published by the Vasudha
            Foundation. Everything here is free to browse — no sign-up needed.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {DOMAIN_LIST.map((domain) => (
              <DomainCard key={domain} domain={domain} count={byDomain[domain]} />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-xl font-bold text-slate-900">All published visualisations</h2>
          {items.length > 0 && (
            <p className="text-sm text-slate-500">
              {items.length} visualisation{items.length === 1 ? '' : 's'}, in the order they were
              published
            </p>
          )}
        </div>

        <div className="mt-6">
          {isLoading && <LoadingState label="Loading visualisations…" />}

          {error && <ErrorState message={error.message} onRetry={reload} />}

          {!isLoading && !error && items.length === 0 && (
            <EmptyState
              title="Nothing published yet"
              message="Datasets appear here as soon as the Super Admin approves them."
            />
          )}

          {!isLoading && !error && items.length > 0 && (
            <div className="grid items-start gap-6 xl:grid-cols-2">
              {items.map((dataset) => (
                <VisualisationCard key={dataset.id} dataset={dataset} />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
};

export default LandingPage;
