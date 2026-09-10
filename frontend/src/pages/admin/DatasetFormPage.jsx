import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import CsvDropzone from '@/components/admin/CsvDropzone.jsx';
import CsvErrorReport from '@/components/admin/CsvErrorReport.jsx';
import PageHeader from '@/components/admin/PageHeader.jsx';
import ChartRenderer from '@/components/charts/ChartRenderer.jsx';
import Button from '@/components/ui/Button.jsx';
import Field, { Select, TextArea, TextInput } from '@/components/ui/Field.jsx';
import { ErrorState, LoadingState } from '@/components/ui/States.jsx';
import {
  CHART_TYPES,
  CHART_TYPE_META,
  CHART_VARIANTS,
  CHART_VARIANT_META,
  DOMAIN_LIST,
  DOMAIN_META,
} from '@/config/constants.js';
import { datasetApi } from '@/api/services.js';
import { toApiError } from '@/api/client.js';
import useAsync from '@/hooks/useAsync.js';
import { useToast } from '@/context/ToastContext.jsx';

const BLANK_FORM = {
  title: '',
  description: '',
  domain: '',
  chartType: '',
  chartVariant: '',
  valueUnit: '',
};

/** Column requirements shown next to the chart-type picker. */
const SchemaHint = ({ schema }) => {
  if (!schema) return null;

  return (
    <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600 ring-1 ring-inset ring-slate-200">
      <p className="font-semibold text-slate-800">{schema.label}</p>
      <p className="mt-1">{schema.description}</p>
      <p className="mt-2">
        <b>Required columns:</b>{' '}
        {schema.requiredColumns.map((column) => column.label).join(', ')}
      </p>
      {schema.optionalColumns.length > 0 && (
        <p className="mt-1">
          <b>Optional columns:</b>{' '}
          {schema.optionalColumns.map((column) => column.label).join(', ')}
        </p>
      )}
      <p className="mt-1 text-slate-500">
        Header names are matched case-insensitively and common aliases are accepted.
      </p>
    </div>
  );
};

/**
 * Add / Edit dataset. The same component serves both, because the only
 * difference is whether a CSV file is mandatory.
 */
const DatasetFormPage = () => {
  const { datasetId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const isEditMode = Boolean(datasetId);

  const [form, setForm] = useState(BLANK_FORM);
  const [file, setFile] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [preview, setPreview] = useState(null);

  const { data: schemaData } = useAsync(() => datasetApi.schemas(), []);
  const {
    data: existingData,
    error: loadError,
    isLoading: isLoadingExisting,
    reload,
  } = useAsync(
    () => (isEditMode ? datasetApi.get(datasetId) : Promise.resolve(null)),
    [datasetId],
  );

  const existing = existingData?.dataset ?? null;

  // Populate the form once the dataset being edited has loaded.
  useEffect(() => {
    if (!existing) return;
    setForm({
      title: existing.title ?? '',
      description: existing.description ?? '',
      domain: existing.domain ?? '',
      chartType: existing.chartType ?? '',
      chartVariant: existing.chartVariant ?? '',
      valueUnit: existing.valueUnit ?? '',
    });
    setPreview(existing);
  }, [existing]);

  const schemas = schemaData?.schemas ?? [];
  const activeSchema = useMemo(
    () => schemas.find((schema) => schema.chartType === form.chartType) ?? null,
    [schemas, form.chartType],
  );

  const needsVariant = form.chartType === CHART_TYPES.TIME_SERIES;

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => {
      const next = { ...current, [name]: value };
      // A variant only applies to time-series data.
      if (name === 'chartType' && value !== CHART_TYPES.TIME_SERIES) next.chartVariant = '';
      return next;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError(null);

    if (!isEditMode && !file) {
      setSubmitError({ message: 'Please choose a .csv file to upload.' });
      return;
    }

    setIsSubmitting(true);
    const payload = { ...form, file: file ?? undefined };

    try {
      const response = isEditMode
        ? await datasetApi.update(datasetId, payload)
        : await datasetApi.create(payload);

      toast.success(response.message);
      navigate('/admin/datasets');
    } catch (apiError) {
      const normalised = toApiError(apiError);
      setSubmitError(normalised);
      // Scroll the report into view — it can be long.
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isEditMode && isLoadingExisting) return <LoadingState label="Loading dataset…" />;
  if (isEditMode && loadError) {
    return <ErrorState message={loadError.message} onRetry={reload} />;
  }

  return (
    <>
      <PageHeader
        title={isEditMode ? 'Edit dataset' : 'Add dataset'}
        description={
          isEditMode
            ? 'Saving changes sends the dataset back to the Super Admin for approval.'
            : 'Upload a CSV file, choose its domain and visualisation, then submit it for approval.'
        }
        actions={
          <Link
            to="/admin/datasets"
            className="rounded-lg bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
          >
            Cancel
          </Link>
        }
      />

      {submitError && (
        <div className="mb-5">
          <CsvErrorReport error={submitError} />
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid gap-5 lg:grid-cols-3" noValidate>
        <div className="space-y-5 lg:col-span-2">
          <section className="rounded-xl bg-white p-5 shadow-card ring-1 ring-slate-200">
            <h2 className="text-sm font-semibold text-slate-900">1. Dataset details</h2>

            <div className="mt-4 space-y-4">
              <Field
                label="Chart title"
                htmlFor="title"
                required
                hint="Shown above the visualisation on the public site."
              >
                <TextInput
                  id="title"
                  name="title"
                  required
                  value={form.title}
                  onChange={handleChange}
                  placeholder="Renewable Energy Capacity – State Wise"
                />
              </Field>

              <Field label="Description" htmlFor="description" hint="Optional context for readers.">
                <TextArea
                  id="description"
                  name="description"
                  rows={3}
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Installed renewable capacity by state, as reported in 2025."
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Domain" htmlFor="domain" required>
                  <Select id="domain" name="domain" required value={form.domain} onChange={handleChange}>
                    <option value="">Select a domain…</option>
                    {DOMAIN_LIST.map((domain) => (
                      <option key={domain} value={domain}>
                        {DOMAIN_META[domain].label}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field
                  label="Value unit"
                  htmlFor="valueUnit"
                  hint="Optional, e.g. MW, °C, GWh."
                >
                  <TextInput
                    id="valueUnit"
                    name="valueUnit"
                    value={form.valueUnit}
                    onChange={handleChange}
                    placeholder="MW"
                  />
                </Field>
              </div>
            </div>
          </section>

          <section className="rounded-xl bg-white p-5 shadow-card ring-1 ring-slate-200">
            <h2 className="text-sm font-semibold text-slate-900">2. Visualisation</h2>

            <div className="mt-4 space-y-4">
              <Field label="Chart type" htmlFor="chartType" required>
                <Select
                  id="chartType"
                  name="chartType"
                  required
                  value={form.chartType}
                  onChange={handleChange}
                >
                  <option value="">Select a chart type…</option>
                  {Object.entries(CHART_TYPE_META).map(([type, meta]) => (
                    <option key={type} value={type}>
                      {meta.label}
                    </option>
                  ))}
                </Select>
              </Field>

              {needsVariant && (
                <Field
                  label="Chart style"
                  htmlFor="chartVariant"
                  required
                  hint="How the time series should be drawn."
                >
                  <Select
                    id="chartVariant"
                    name="chartVariant"
                    required
                    value={form.chartVariant}
                    onChange={handleChange}
                  >
                    <option value="">Select a chart style…</option>
                    {Object.values(CHART_VARIANTS).map((variant) => (
                      <option key={variant} value={variant}>
                        {CHART_VARIANT_META[variant].label}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}

              <SchemaHint schema={activeSchema} />
            </div>
          </section>

          <section className="rounded-xl bg-white p-5 shadow-card ring-1 ring-slate-200">
            <h2 className="text-sm font-semibold text-slate-900">
              3. CSV data{' '}
              {isEditMode && (
                <span className="font-normal text-slate-500">
                  — leave empty to keep the current {existing?.rowCount} rows
                </span>
              )}
            </h2>

            <div className="mt-4">
              <CsvDropzone
                file={file}
                onFileSelected={setFile}
                helpText={
                  activeSchema
                    ? `Needs: ${activeSchema.requiredColumns.map((column) => column.label).join(', ')}`
                    : 'Choose a chart type first to see the required columns.'
                }
              />
            </div>
          </section>

          <div className="flex flex-wrap justify-end gap-2">
            <Link
              to="/admin/datasets"
              className="rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
            >
              Cancel
            </Link>
            <Button type="submit" size="lg" isLoading={isSubmitting}>
              {isEditMode ? 'Save changes' : 'Submit for approval'}
            </Button>
          </div>
        </div>

        <aside className="lg:col-span-1">
          <div className="sticky top-24 space-y-4">
            <div className="rounded-xl bg-white p-5 shadow-card ring-1 ring-slate-200">
              <h2 className="text-sm font-semibold text-slate-900">Approval workflow</h2>
              <ol className="mt-3 space-y-2 text-xs text-slate-600">
                <li>1. You upload the dataset — it is saved as <b>Pending</b>.</li>
                <li>2. The Super Admin reviews it.</li>
                <li>
                  3. On approval it appears on the landing page and its domain page automatically.
                </li>
              </ol>
              <p className="mt-3 text-xs text-slate-500">
                Nothing is visible to the public until it has been approved.
              </p>
            </div>

            {isEditMode && preview && (
              <div className="rounded-xl bg-white p-4 shadow-card ring-1 ring-slate-200">
                <h2 className="mb-3 text-sm font-semibold text-slate-900">Current visualisation</h2>
                <ChartRenderer dataset={preview} height={240} />
              </div>
            )}
          </div>
        </aside>
      </form>
    </>
  );
};

export default DatasetFormPage;
