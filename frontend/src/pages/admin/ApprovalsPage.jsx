import { useState } from 'react';

import DatasetTable from '@/components/admin/DatasetTable.jsx';
import PageHeader from '@/components/admin/PageHeader.jsx';
import StatCards from '@/components/admin/StatCards.jsx';
import ChartRenderer from '@/components/charts/ChartRenderer.jsx';
import Button from '@/components/ui/Button.jsx';
import Modal from '@/components/ui/Modal.jsx';
import Field, { Select, TextArea } from '@/components/ui/Field.jsx';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States.jsx';
import { DATASET_STATUS, STATUS_META } from '@/config/constants.js';
import { datasetApi } from '@/api/services.js';
import { toApiError } from '@/api/client.js';
import useAsync from '@/hooks/useAsync.js';
import { useToast } from '@/context/ToastContext.jsx';

/**
 * Super Admin review queue. Datasets awaiting approval are shown first, each
 * one previewable exactly as it will appear publicly before a decision is made.
 */
const ApprovalsPage = () => {
  const toast = useToast();

  const [statusFilter, setStatusFilter] = useState(DATASET_STATUS.PENDING);
  const [busyId, setBusyId] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [previewing, setPreviewing] = useState(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const { data, error, isLoading, reload } = useAsync(
    () => datasetApi.list({ status: statusFilter || undefined, limit: 100 }),
    [statusFilter],
  );
  const { data: statsData, reload: reloadStats } = useAsync(() => datasetApi.stats(), []);

  const datasets = data?.items ?? [];

  const refresh = () => Promise.all([reload(), reloadStats()]);

  const handleApprove = async (dataset) => {
    const id = dataset.id;
    setBusyId(id);
    try {
      const response = await datasetApi.approve(id);
      toast.success(response.message);
      await refresh();
    } catch (apiError) {
      toast.error(toApiError(apiError).message);
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async () => {
    const id = rejecting.id;
    setBusyId(id);
    try {
      const response = await datasetApi.reject(id, rejectionReason);
      toast.success(response.message);
      setRejecting(null);
      setRejectionReason('');
      await refresh();
    } catch (apiError) {
      toast.error(toApiError(apiError).message);
    } finally {
      setBusyId(null);
    }
  };

  /** The list endpoint omits rows for speed, so fetch the full record to preview. */
  const openPreview = async (dataset) => {
    const id = dataset.id;
    setIsLoadingPreview(true);
    setPreviewing({ ...dataset, rows: [] });
    try {
      const { dataset: full } = await datasetApi.get(id);
      setPreviewing(full);
    } catch (apiError) {
      toast.error(toApiError(apiError).message);
      setPreviewing(null);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Dataset approvals"
        description="Review datasets submitted by Admins. Approving one publishes it to the public site immediately."
        actions={
          <Select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Filter by approval status"
            className="w-48"
          >
            <option value="">All datasets</option>
            {Object.values(DATASET_STATUS).map((status) => (
              <option key={status} value={status}>
                {STATUS_META[status].label}
              </option>
            ))}
          </Select>
        }
      />

      <StatCards stats={statsData?.stats} />

      {isLoading && <LoadingState label="Loading submissions…" />}
      {error && <ErrorState message={error.message} onRetry={reload} />}

      {!isLoading && !error && datasets.length === 0 && (
        <EmptyState
          title="Nothing to review"
          message={
            statusFilter === DATASET_STATUS.PENDING
              ? 'There are no datasets waiting for approval right now.'
              : 'No datasets match this filter.'
          }
        />
      )}

      {!isLoading && !error && datasets.length > 0 && (
        <div className="space-y-4">
          <DatasetTable
            datasets={datasets}
            showAuthor
            busyId={busyId}
            onApprove={handleApprove}
            onReject={(dataset) => {
              setRejecting(dataset);
              setRejectionReason('');
            }}
          />

          <div className="rounded-xl bg-white p-4 shadow-card ring-1 ring-slate-200">
            <h2 className="text-sm font-semibold text-slate-900">Preview before deciding</h2>
            <p className="mt-1 text-xs text-slate-500">
              Open a submission to see exactly how it will look on the public site.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {datasets.map((dataset) => (
                <Button
                  key={dataset.id}
                  size="sm"
                  variant="secondary"
                  onClick={() => openPreview(dataset)}
                >
                  {dataset.title}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      <Modal
        isOpen={Boolean(previewing)}
        onClose={() => setPreviewing(null)}
        title={previewing?.title ?? 'Preview'}
        description={`${previewing?.rowCount ?? 0} rows · submitted by ${previewing?.createdBy?.name ?? 'an Admin'}`}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPreviewing(null)}>
              Close
            </Button>
            {previewing?.status !== DATASET_STATUS.REJECTED && (
              <Button
                variant="danger"
                onClick={() => {
                  setRejecting(previewing);
                  setRejectionReason('');
                  setPreviewing(null);
                }}
              >
                Reject
              </Button>
            )}
            {previewing?.status !== DATASET_STATUS.APPROVED && (
              <Button
                onClick={() => {
                  handleApprove(previewing);
                  setPreviewing(null);
                }}
              >
                Approve &amp; publish
              </Button>
            )}
          </>
        }
      >
        {isLoadingPreview ? (
          <LoadingState label="Loading visualisation…" />
        ) : (
          previewing && <ChartRenderer dataset={previewing} height={320} />
        )}
      </Modal>

      <Modal
        isOpen={Boolean(rejecting)}
        onClose={() => setRejecting(null)}
        title="Reject this dataset?"
        description="The Admin will see your reason on their dashboard."
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejecting(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              isLoading={Boolean(busyId)}
              disabled={rejectionReason.trim().length < 3}
              onClick={handleReject}
            >
              Reject dataset
            </Button>
          </>
        }
      >
        <p className="mb-4 text-sm text-slate-600">
          <b className="text-slate-900">{rejecting?.title}</b> will stay hidden from the public site.
        </p>
        <Field label="Reason for rejection" htmlFor="rejectionReason" required>
          <TextArea
            id="rejectionReason"
            rows={3}
            value={rejectionReason}
            onChange={(event) => setRejectionReason(event.target.value)}
            placeholder="e.g. The value column is missing its unit."
          />
        </Field>
      </Modal>
    </>
  );
};

export default ApprovalsPage;
