import { useState } from 'react';
import { Link } from 'react-router-dom';

import DatasetTable from '@/components/admin/DatasetTable.jsx';
import PageHeader from '@/components/admin/PageHeader.jsx';
import StatCards from '@/components/admin/StatCards.jsx';
import Button from '@/components/ui/Button.jsx';
import Modal from '@/components/ui/Modal.jsx';
import { Select, TextInput } from '@/components/ui/Field.jsx';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States.jsx';
import {
  CHART_TYPE_META,
  DATASET_STATUS,
  DOMAIN_LIST,
  DOMAIN_META,
  STATUS_META,
} from '@/config/constants.js';
import { datasetApi } from '@/api/services.js';
import { toApiError } from '@/api/client.js';
import useAsync from '@/hooks/useAsync.js';
import { useAuth } from '@/context/AuthContext.jsx';
import { useToast } from '@/context/ToastContext.jsx';

const EMPTY_FILTERS = { status: '', domain: '', chartType: '', search: '' };

/**
 * The Admin dashboard: every dataset the signed-in user owns, in the tabular
 * format the brief requires. The Super Admin sees all datasets plus the
 * submitting Admin.
 */
const DatasetListPage = () => {
  const { isSuperAdmin } = useAuth();
  const toast = useToast();

  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const query = Object.fromEntries(Object.entries(filters).filter(([, value]) => value));

  const { data, error, isLoading, reload } = useAsync(
    () => datasetApi.list({ ...query, limit: 100 }),
    [filters.status, filters.domain, filters.chartType, filters.search],
  );
  const { data: statsData, reload: reloadStats } = useAsync(() => datasetApi.stats(), []);

  const datasets = data?.items ?? [];

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  };

  const handleDelete = async () => {
    const id = pendingDelete.id;
    setBusyId(id);
    try {
      const response = await datasetApi.remove(id);
      toast.success(response.message);
      setPendingDelete(null);
      await Promise.all([reload(), reloadStats()]);
    } catch (apiError) {
      toast.error(toApiError(apiError).message);
    } finally {
      setBusyId(null);
    }
  };

  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <>
      <PageHeader
        title={isSuperAdmin ? 'All datasets' : 'My datasets'}
        description={
          isSuperAdmin
            ? 'Every dataset submitted across the platform, with its author and approval state.'
            : 'Datasets you have uploaded and their approval status.'
        }
        actions={
          <Link
            to="/admin/datasets/new"
            className="rounded-lg bg-brand-700 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-800"
          >
            Add dataset
          </Link>
        }
      />

      <StatCards stats={statsData?.stats} />

      <div className="mb-4 grid gap-3 rounded-xl bg-white p-4 shadow-card ring-1 ring-slate-200 sm:grid-cols-2 lg:grid-cols-4">
        <TextInput
          name="search"
          placeholder="Search by chart title…"
          value={filters.search}
          onChange={handleFilterChange}
          aria-label="Search datasets"
        />
        <Select name="status" value={filters.status} onChange={handleFilterChange} aria-label="Filter by status">
          <option value="">All statuses</option>
          {Object.values(DATASET_STATUS).map((status) => (
            <option key={status} value={status}>
              {STATUS_META[status].label}
            </option>
          ))}
        </Select>
        <Select name="domain" value={filters.domain} onChange={handleFilterChange} aria-label="Filter by domain">
          <option value="">All domains</option>
          {DOMAIN_LIST.map((domain) => (
            <option key={domain} value={domain}>
              {DOMAIN_META[domain].label}
            </option>
          ))}
        </Select>
        <Select
          name="chartType"
          value={filters.chartType}
          onChange={handleFilterChange}
          aria-label="Filter by chart type"
        >
          <option value="">All chart types</option>
          {Object.entries(CHART_TYPE_META).map(([type, meta]) => (
            <option key={type} value={type}>
              {meta.short}
            </option>
          ))}
        </Select>
      </div>

      {isLoading && <LoadingState label="Loading datasets…" />}
      {error && <ErrorState message={error.message} onRetry={reload} />}

      {!isLoading && !error && datasets.length === 0 && (
        <EmptyState
          title={hasFilters ? 'No datasets match these filters' : 'No datasets yet'}
          message={
            hasFilters
              ? 'Try clearing the filters to see everything.'
              : 'Upload a CSV file to create your first visualisation.'
          }
          action={
            hasFilters ? (
              <Button variant="secondary" onClick={() => setFilters(EMPTY_FILTERS)}>
                Clear filters
              </Button>
            ) : (
              <Link
                to="/admin/datasets/new"
                className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
              >
                Add dataset
              </Link>
            )
          }
        />
      )}

      {!isLoading && !error && datasets.length > 0 && (
        <DatasetTable
          datasets={datasets}
          showAuthor={isSuperAdmin}
          busyId={busyId}
          onDelete={setPendingDelete}
        />
      )}

      <Modal
        isOpen={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        title="Delete this dataset?"
        description="This removes the dataset and its visualisation permanently."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button variant="danger" isLoading={Boolean(busyId)} onClick={handleDelete}>
              Delete dataset
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          <b className="text-slate-900">{pendingDelete?.title}</b> and its {pendingDelete?.rowCount}{' '}
          rows will be deleted. This cannot be undone.
        </p>
      </Modal>
    </>
  );
};

export default DatasetListPage;
