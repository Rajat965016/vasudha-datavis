import { Link } from 'react-router-dom';

import Button from '@/components/ui/Button.jsx';
import { DomainBadge, StatusBadge } from '@/components/ui/Badge.jsx';
import {
  CHART_TYPES,
  CHART_TYPE_META,
  CHART_VARIANT_META,
  DATASET_STATUS,
} from '@/config/constants.js';
import { formatDateTime } from '@/utils/format.js';

const describeChart = (dataset) => {
  const base = CHART_TYPE_META[dataset.chartType]?.short ?? dataset.chartType;
  if (dataset.chartType !== CHART_TYPES.TIME_SERIES || !dataset.chartVariant) return base;
  return `${base} · ${CHART_VARIANT_META[dataset.chartVariant]?.label ?? dataset.chartVariant}`;
};

/**
 * The tabular dataset view required of both dashboards: chart title, domain,
 * chart type, row/status information, approval state and — for the Super
 * Admin — which Admin submitted each dataset.
 */
const DatasetTable = ({
  datasets = [],
  showAuthor = false,
  onApprove,
  onReject,
  onDelete,
  busyId = null,
}) => (
  <div className="overflow-hidden rounded-xl bg-white shadow-card ring-1 ring-slate-200">
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Chart title
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Domain
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Chart type
            </th>
            {showAuthor && (
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Added by
              </th>
            )}
            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Approval status
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Last updated
            </th>
            {/* Sticky so the action buttons stay reachable when the table scrolls. */}
            <th
              scope="col"
              className="sticky right-0 bg-slate-50 px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500"
            >
              Actions
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {datasets.map((dataset) => {
            const id = dataset.id;
            const isBusy = busyId === id;

            return (
              <tr key={id} className="group bg-white hover:bg-slate-50/60">
                <td className="max-w-xs px-4 py-3">
                  <p className="font-medium text-slate-900">{dataset.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {dataset.rowCount} rows
                    {dataset.sourceFileName ? ` · ${dataset.sourceFileName}` : ''}
                  </p>
                  {dataset.status === DATASET_STATUS.REJECTED && dataset.rejectionReason && (
                    <p className="mt-1 text-xs text-rose-600">
                      Reason: {dataset.rejectionReason}
                    </p>
                  )}
                </td>

                <td className="px-4 py-3">
                  <DomainBadge domain={dataset.domain} />
                </td>

                <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                  {describeChart(dataset)}
                </td>

                {showAuthor && (
                  <td className="px-4 py-3">
                    <p className="text-slate-900">{dataset.createdBy?.name ?? '—'}</p>
                    <p className="text-xs text-slate-500">{dataset.createdBy?.email}</p>
                  </td>
                )}

                <td className="px-4 py-3">
                  <StatusBadge status={dataset.status} />
                </td>

                <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                  {formatDateTime(dataset.updatedAt)}
                </td>

                <td className="sticky right-0 bg-inherit px-4 py-3 shadow-[-8px_0_8px_-8px_rgba(15,23,42,0.12)]">
                  <div className="flex flex-wrap justify-end gap-1.5">
                    {onApprove && dataset.status !== DATASET_STATUS.APPROVED && (
                      <Button size="sm" isLoading={isBusy} onClick={() => onApprove(dataset)}>
                        Approve
                      </Button>
                    )}
                    {onReject && dataset.status !== DATASET_STATUS.REJECTED && (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={isBusy}
                        onClick={() => onReject(dataset)}
                      >
                        Reject
                      </Button>
                    )}
                    <Link
                      to={`/admin/datasets/${id}/edit`}
                      className="inline-flex items-center rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
                    >
                      Edit
                    </Link>
                    {onDelete && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={isBusy}
                        className="text-rose-600 hover:bg-rose-50"
                        onClick={() => onDelete(dataset)}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
);

export default DatasetTable;
