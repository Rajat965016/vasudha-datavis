import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import AuthShell from './AuthShell.jsx';
import Button from '@/components/ui/Button.jsx';
import Field, { PasswordInput, TextInput } from '@/components/ui/Field.jsx';
import { authApi } from '@/api/services.js';
import { toApiError } from '@/api/client.js';
import { useToast } from '@/context/ToastContext.jsx';
import { PASSWORD_HINT, validatePassword } from '@/utils/password.js';

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();

  const token = searchParams.get('token') ?? '';
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    const passwordIssue = validatePassword(form.password);
    if (passwordIssue) {
      setError(passwordIssue);
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('The two passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await authApi.resetPassword({ token, password: form.password });
      toast.success('Password updated. Please sign in with your new password.');
      navigate('/login', { replace: true });
    } catch (apiError) {
      setError(toApiError(apiError).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <AuthShell title="Invalid reset link" subtitle="This link is missing its reset token.">
        <Link
          to="/forgot-password"
          className="block rounded-lg bg-brand-700 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-brand-800"
        >
          Request a new link
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Choose a new password"
      subtitle="Reset links expire, so complete this step now."
      footer={
        <Link to="/login" className="font-medium text-brand-700 hover:text-brand-800">
          ← Back to sign in
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && (
          <div role="alert" className="rounded-lg bg-rose-50 px-3 py-2.5 text-sm text-rose-700 ring-1 ring-inset ring-rose-200">
            {error}
          </div>
        )}

        <Field label="New password" htmlFor="password" required hint={PASSWORD_HINT}>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            required
            value={form.password}
            onChange={handleChange}
          />
        </Field>

        <Field label="Confirm new password" htmlFor="confirmPassword" required>
          <PasswordInput
            id="confirmPassword"
            name="confirmPassword"
            autoComplete="new-password"
            required
            value={form.confirmPassword}
            onChange={handleChange}
          />
        </Field>

        <Button type="submit" size="lg" className="w-full" isLoading={isSubmitting}>
          Update password
        </Button>
      </form>
    </AuthShell>
  );
};

export default ResetPasswordPage;
