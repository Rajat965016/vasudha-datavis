import { useState } from 'react';
import { Link } from 'react-router-dom';

import AuthShell from './AuthShell.jsx';
import Button from '@/components/ui/Button.jsx';
import Field, { TextInput } from '@/components/ui/Field.jsx';
import { authApi } from '@/api/services.js';
import { toApiError } from '@/api/client.js';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await authApi.forgotPassword({ email });
      setResult(response);
    } catch (apiError) {
      setError(toApiError(apiError).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Present only when SMTP is not configured, so the flow stays testable.
  const devResetUrl = result?.data?.resetUrl;

  return (
    <AuthShell
      title="Forgot your password?"
      subtitle="Enter your email address and we'll send you a link to choose a new one."
      footer={
        <Link to="/login" className="font-medium text-brand-700 hover:text-brand-800">
          ← Back to sign in
        </Link>
      }
    >
      {result ? (
        <div className="space-y-4">
          <div className="rounded-lg bg-emerald-50 px-3 py-3 text-sm text-emerald-800 ring-1 ring-inset ring-emerald-200">
            {result.message}
          </div>

          {devResetUrl && (
            <div className="rounded-lg bg-amber-50 px-3 py-3 text-sm text-amber-900 ring-1 ring-inset ring-amber-200">
              <p className="font-semibold">Email delivery is not configured on this server.</p>
              <p className="mt-1">Use this reset link directly:</p>
              <Link
                to={devResetUrl.replace(window.location.origin, '')}
                className="mt-2 block break-all font-medium text-brand-700 underline"
              >
                {devResetUrl}
              </Link>
            </div>
          )}

          <Button variant="secondary" className="w-full" onClick={() => setResult(null)}>
            Send to a different address
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && (
            <div role="alert" className="rounded-lg bg-rose-50 px-3 py-2.5 text-sm text-rose-700 ring-1 ring-inset ring-rose-200">
              {error}
            </div>
          )}

          <Field label="Email address" htmlFor="email" required>
            <TextInput
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@vasudhaindia.org"
            />
          </Field>

          <Button type="submit" size="lg" className="w-full" isLoading={isSubmitting}>
            Send reset link
          </Button>
        </form>
      )}
    </AuthShell>
  );
};

export default ForgotPasswordPage;
