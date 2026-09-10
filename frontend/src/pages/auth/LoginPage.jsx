import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';

import AuthShell from './AuthShell.jsx';
import Button from '@/components/ui/Button.jsx';
import Field, { TextInput } from '@/components/ui/Field.jsx';
import { useAuth } from '@/context/AuthContext.jsx';
import { LoadingState } from '@/components/ui/States.jsx';

const LoginPage = () => {
  const { signIn, isAuthenticated, isRestoring } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectTo = location.state?.from?.pathname ?? '/admin/datasets';

  if (isRestoring) return <LoadingState label="Checking your session…" />;
  if (isAuthenticated) return <Navigate to={redirectTo} replace />;

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await signIn(form);
    setIsSubmitting(false);

    if (result.ok) navigate(redirectTo, { replace: true });
    else setError(result.error.message);
  };

  return (
    <AuthShell
      title="Sign in"
      subtitle="For Vasudha Foundation Admins and the Super Admin."
      footer={
        <Link to="/" className="font-medium text-brand-700 hover:text-brand-800">
          ← Back to the public site
        </Link>
      }
    >
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
            value={form.email}
            onChange={handleChange}
            placeholder="you@vasudhaindia.org"
          />
        </Field>

        <Field label="Password" htmlFor="password" required>
          <TextInput
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={form.password}
            onChange={handleChange}
            placeholder="••••••••"
          />
        </Field>

        <div className="flex justify-end">
          <Link
            to="/forgot-password"
            className="text-sm font-medium text-brand-700 hover:text-brand-800"
          >
            Forgot your password?
          </Link>
        </div>

        <Button type="submit" size="lg" className="w-full" isLoading={isSubmitting}>
          Sign in
        </Button>
      </form>
    </AuthShell>
  );
};

export default LoginPage;
