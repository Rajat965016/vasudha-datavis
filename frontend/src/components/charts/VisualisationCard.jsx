import { useState } from 'react';

import ChartRenderer from './ChartRenderer.jsx';
import DataTable from './DataTable.jsx';
import { CHART_TYPES, CHART_TYPE_META, CHART_VARIANT_META } from '@/config/constants.js';
import { DomainBadge } from '@/components/ui/Badge.jsx';
import { formatDate } from '@/utils/format.js';

const describeVisualisation = (dataset) => {
  const base = CHART_TYPE_META[dataset.chartType]?.short ?? dataset.chartType;
  if (dataset.chartType !== CHART_TYPES.TIME_SERIES || !dataset.chartVariant) return base;
  return `${base} · ${CHART_VARIANT_META[dataset.chartVariant]?.label ?? dataset.chartVariant}`;
};

/**
 * A published visualisation as it appears on the public site: title, domain,
 * the rendered chart or map, and a toggleable data table underneath.
 */
const VisualisationCard = ({ dataset, showDomain = true, height }) => {
  const [showTable, setShowTable] = useState(false);

  return (
    <article className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-slate-200">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-slate-900 sm:text-lg">{dataset.title}</h3>
          {dataset.description && (
            <p className="mt-1 max-w-2xl text-sm text-slate-500">{dataset.description}</p>
          )}
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
            <span>{describeVisualisation(dataset)}</span>
            <span aria-hidden="true">·</span>
            <span>
              {dataset.rowCount} row{dataset.rowCount === 1 ? '' : 's'}
            </span>
            {dataset.publishedAt && (
              <>
                <span aria-hidden="true">·</span>
                <span>Published {formatDate(dataset.publishedAt)}</span>
              </>
            )}
          </p>
        </div>
        {showDomain && <DomainBadge domain={dataset.domain} />}
      </header>

      <div className="px-3 py-4 sm:px-5">
        <ChartRenderer dataset={dataset} height={height} />
      </div>

      <footer className="border-t border-slate-100 px-5 py-3">
        <button
          type="button"
          onClick={() => setShowTable((open) => !open)}
          aria-expanded={showTable}
          className="text-xs font-semibold text-brand-700 hover:text-brand-800"
        >
          {showTable ? 'Hide underlying data' : 'View underlying data'}
        </button>
        {showTable && (
          <div className="mt-3">
            <DataTable columns={dataset.columns} rows={dataset.rows} />
          </div>
        )}
      </footer>
    </article>
  );
};

export default VisualisationCard;
