import { useState } from 'react';

import PageHeader from '@/components/admin/PageHeader.jsx';
import Button from '@/components/ui/Button.jsx';
import Modal from '@/components/ui/Modal.jsx';
import Field, { TextInput } from '@/components/ui/Field.jsx';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States.jsx';
import { adminApi } from '@/api/services.js';
import { toApiError } from '@/api/client.js';
import useAsync from '@/hooks/useAsync.js';
import { useToast } from '@/context/ToastContext.jsx';
import { formatDateTime } from '@/utils/format.js';
import { PASSWORD_HINT, validatePassword } from '@/utils/password.js';

const BLANK_ADMIN = { name: '', email: '', password: '', sendCredentialsEmail: true };

/** Shown once after creation when credentials could not be emailed. */
const CredentialsNotice = ({ credentials, onDismiss }) => (
  <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
    <p className="font-semibold">Share these credentials securely</p>
    <p className="mt-1 text-xs">
      Email delivery is not configured on this server, so the temporary password is shown here once.
    </p>
    <dl className="mt-3 grid gap-1 text-xs sm:grid-cols-2">
      <div>
        <dt className="text-amber-700">Email</dt>
        <dd className="font-mono font-semibold">{credentials.email}</dd>
      </div>
      <div>
        <dt className="text-amber-700">Temporary password</dt>
        <dd className="font-mono font-semibold">{credentials.password}</dd>
      </div>
    </dl>
    <button
      type="button"
      onClick={onDismiss}
      className="mt-3 text-xs font-semibold text-amber-800 underline"
    >
      Dismiss
    </button>
  </div>
);

const UserManagementPage = () => {
  const toast = useToast();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState(BLANK_ADMIN);
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [credentials, setCredentials] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  const { data, error, isLoading, reload } = useAsync(() => adminApi.list(), []);
  const admins = data?.items ?? [];

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
  };

  const closeCreate = () => {
    setIsCreateOpen(false);
    setForm(BLANK_ADMIN);
    setFormError(null);
  };

  const handleCreate = async () => {
    setFormError(null);

    if (form.password && validatePassword(form.password)) {
      setFormError(validatePassword(form.password));
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: form.name,
        email: form.email,
        sendCredentialsEmail: form.sendCredentialsEmail,
        ...(form.password ? { password: form.password } : {}),
      };
      const response = await adminApi.create(payload);
      toast.success(response.message);

      const temporaryPassword = response.data?.temporaryPassword;
      if (temporaryPassword) {
        setCredentials({ email: form.email, password: temporaryPassword });
      }

      closeCreate();
      await reload();
    } catch (apiError) {
      setFormError(toApiError(apiError).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (admin) => {
    setBusyId(admin.id);
    try {
      const response = await adminApi.update(admin.id, { isActive: !admin.isActive });
      toast.success(response.message);
      await reload();
    } catch (apiError) {
      toast.error(toApiError(apiError).message);
    } finally {
      setBusyId(null);
    }
  };

  const handleResetPassword = async (admin) => {
    setBusyId(admin.id);
    try {
      const response = await adminApi.resetPassword(admin.id, {
        sendCredentialsEmail: true,
      });
      toast.success(response.message);
      const temporaryPassword = response.data?.temporaryPassword;
      if (temporaryPassword) setCredentials({ email: admin.email, password: temporaryPassword });
    } catch (apiError) {
      toast.error(toApiError(apiError).message);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    const id = pendingDelete.id;
    setBusyId(id);
    try {
      const response = await adminApi.remove(id);
      toast.success(response.message);
      setPendingDelete(null);
      await reload();
    } catch (apiError) {
      toast.error(toApiError(apiError).message);
      setPendingDelete(null);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Admin accounts"
        description="Create Admin accounts, control their access and reset their passwords."
        actions={<Button onClick={() => setIsCreateOpen(true)}>Create admin</Button>}
      />

      {credentials && (
        <CredentialsNotice credentials={credentials} onDismiss={() => setCredentials(null)} />
      )}

      {isLoading && <LoadingState label="Loading admin accounts…" />}
      {error && <ErrorState message={error.message} onRetry={reload} />}

      {!isLoading && !error && admins.length === 0 && (
        <EmptyState
          title="No admin accounts yet"
          message="Create an Admin so they can start uploading datasets."
          action={<Button onClick={() => setIsCreateOpen(true)}>Create admin</Button>}
        />
      )}

      {!isLoading && !error && admins.length > 0 && (
        <div className="overflow-hidden rounded-xl bg-white shadow-card ring-1 ring-slate-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {['Admin', 'Datasets', 'Status', 'Last sign-in', 'Actions'].map((heading, index) => (
                    <th
                      key={heading}
                      scope="col"
                      className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 ${
                        index === 4 ? 'text-right' : 'text-left'
                      }`}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {admins.map((admin) => {
                  const id = admin.id;
                  const isBusy = busyId === id;
                  const counts = admin.datasetCounts ?? {};

                  return (
                    <tr key={id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{admin.name}</p>
                        <p className="text-xs text-slate-500">{admin.email}</p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">
                        <span className="text-emerald-700">{counts.APPROVED ?? 0} approved</span>
                        {' · '}
                        <span className="text-amber-700">{counts.PENDING ?? 0} pending</span>
                        {' · '}
                        <span className="text-rose-700">{counts.REJECTED ?? 0} rejected</span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
                            admin.isActive
                              ? 'bg-emerald-50 text-emerald-800 ring-emerald-200'
                              : 'bg-slate-100 text-slate-600 ring-slate-200'
                          }`}
                        >
                          {admin.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                        {admin.lastLoginAt ? formatDateTime(admin.lastLoginAt) : 'Never'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={isBusy}
                            onClick={() => handleToggleActive(admin)}
                          >
                            {admin.isActive ? 'Disable' : 'Enable'}
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={isBusy}
                            onClick={() => handleResetPassword(admin)}
                          >
                            Reset password
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={isBusy}
                            className="text-rose-600 hover:bg-rose-50"
                            onClick={() => setPendingDelete(admin)}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        isOpen={isCreateOpen}
        onClose={closeCreate}
        title="Create an Admin account"
        description="The Admin can sign in immediately and start uploading datasets."
        footer={
          <>
            <Button variant="secondary" onClick={closeCreate}>
              Cancel
            </Button>
            <Button
              isLoading={isSubmitting}
              disabled={!form.name.trim() || !form.email.trim()}
              onClick={handleCreate}
            >
              Create admin
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {formError && (
            <div role="alert" className="rounded-lg bg-rose-50 px-3 py-2.5 text-sm text-rose-700 ring-1 ring-inset ring-rose-200">
              {formError}
            </div>
          )}

          <Field label="Full name" htmlFor="name" required>
            <TextInput id="name" name="name" value={form.name} onChange={handleChange} placeholder="Priya Sharma" />
          </Field>

          <Field label="Email address" htmlFor="adminEmail" required>
            <TextInput
              id="adminEmail"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="priya@vasudhaindia.org"
            />
          </Field>

          <Field
            label="Temporary password"
            htmlFor="adminPassword"
            hint={`Leave empty to generate a strong password automatically. ${PASSWORD_HINT}`}
          >
            <TextInput
              id="adminPassword"
              name="password"
              type="text"
              autoComplete="off"
              value={form.password}
              onChange={handleChange}
              placeholder="Auto-generated if left blank"
            />
          </Field>

          <label className="flex items-start gap-2.5 text-sm text-slate-700">
            <input
              type="checkbox"
              name="sendCredentialsEmail"
              checked={form.sendCredentialsEmail}
              onChange={handleChange}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-600"
            />
            <span>
              Email the credentials to the new Admin
              <span className="block text-xs text-slate-500">
                Requires SMTP settings on the server; otherwise the password is shown to you once.
              </span>
            </span>
          </label>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        title="Delete this admin account?"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button variant="danger" isLoading={Boolean(busyId)} onClick={handleDelete}>
              Delete account
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          <b className="text-slate-900">{pendingDelete?.name}</b> will lose access immediately.
          Accounts that still own datasets cannot be deleted — disable them instead.
        </p>
      </Modal>
    </>
  );
};

export default UserManagementPage;
