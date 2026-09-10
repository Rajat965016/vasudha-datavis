import { useState } from 'react';

import PageHeader from '@/components/admin/PageHeader.jsx';
import Button from '@/components/ui/Button.jsx';
import Field, { TextInput } from '@/components/ui/Field.jsx';
import { ROLES } from '@/config/constants.js';
import { authApi } from '@/api/services.js';
import { toApiError } from '@/api/client.js';
import { useAuth } from '@/context/AuthContext.jsx';
import { useToast } from '@/context/ToastContext.jsx';
import { formatDateTime } from '@/utils/format.js';
import { PASSWORD_HINT, validatePassword } from '@/utils/password.js';

const BLANK_FORM = { currentPassword: '', newPassword: '', confirmPassword: '' };

const AccountPage = () => {
  const { user } = useAuth();
  const toast = useToast();

  const [form, setForm] = useState(BLANK_FORM);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    const passwordIssue = validatePassword(form.newPassword);
    if (passwordIssue) {
      setError(passwordIssue);
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError('The two new passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await authApi.changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      toast.success(response.message);
      setForm(BLANK_FORM);
    } catch (apiError) {
      setError(toApiError(apiError).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader title="My account" description="Your profile and password." />

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl bg-white p-5 shadow-card ring-1 ring-slate-200">
          <h2 className="text-sm font-semibold text-slate-900">Profile</h2>
          <dl className="mt-4 space-y-3 text-sm">
            {[
              ['Name', user?.name],
              ['Email', user?.email],
              ['Role', user?.role === ROLES.SUPER_ADMIN ? 'Super Admin' : 'Admin'],
              ['Last sign-in', user?.lastLoginAt ? formatDateTime(user.lastLoginAt) : '—'],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 border-b border-slate-100 pb-2">
                <dt className="text-slate-500">{label}</dt>
                <dd className="text-right font-medium text-slate-900">{value ?? '—'}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="rounded-xl bg-white p-5 shadow-card ring-1 ring-slate-200">
          <h2 className="text-sm font-semibold text-slate-900">Change password</h2>

          {user?.mustChangePassword && (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-inset ring-amber-200">
              You are still using the temporary password issued by the Super Admin. Please choose
              your own.
            </p>
          )}

          <form onSubmit={handleSubmit} className="mt-4 space-y-4" noValidate>
            {error && (
              <div role="alert" className="rounded-lg bg-rose-50 px-3 py-2.5 text-sm text-rose-700 ring-1 ring-inset ring-rose-200">
                {error}
              </div>
            )}

            <Field label="Current password" htmlFor="currentPassword" required>
              <TextInput
                id="currentPassword"
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
                value={form.currentPassword}
                onChange={handleChange}
              />
            </Field>

            <Field label="New password" htmlFor="newPassword" required hint={PASSWORD_HINT}>
              <TextInput
                id="newPassword"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                required
                value={form.newPassword}
                onChange={handleChange}
              />
            </Field>

            <Field label="Confirm new password" htmlFor="confirmPassword" required>
              <TextInput
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={form.confirmPassword}
                onChange={handleChange}
              />
            </Field>

            <Button type="submit" isLoading={isSubmitting}>
              Update password
            </Button>
          </form>
        </section>
      </div>
    </>
  );
};

export default AccountPage;
