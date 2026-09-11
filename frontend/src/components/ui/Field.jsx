import { useState } from 'react';

const baseControl =
  'block w-full rounded-lg border-0 px-3 py-2 text-sm text-slate-900 shadow-sm ring-1 ring-inset ' +
  'placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-brand-600 disabled:bg-slate-50';

export const EyeIcon = ({ className = 'w-5 h-5' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    />
  </svg>
);

export const EyeSlashIcon = ({ className = 'w-5 h-5' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
    />
  </svg>
);

/** Label + control + help/error text, shared by every form in the app. */
export const Field = ({ label, htmlFor, error, hint, required, children, className = '' }) => (
  <div className={className}>
    <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-800">
      {label}
      {required && <span className="ml-0.5 text-rose-600">*</span>}
    </label>
    <div className="mt-1.5">{children}</div>
    {error ? (
      <p className="mt-1.5 text-xs text-rose-600">{error}</p>
    ) : (
      hint && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>
    )}
  </div>
);

export const TextInput = ({ error, className = '', ...props }) => (
  <input
    className={`${baseControl} ${error ? 'ring-rose-400' : 'ring-slate-300'} ${className}`}
    {...props}
  />
);

export const PasswordInput = ({ error, className = '', ...props }) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative">
      <input
        type={showPassword ? 'text' : 'password'}
        className={`${baseControl} pr-10 ${error ? 'ring-rose-400' : 'ring-slate-300'} ${className}`}
        {...props}
      />
      <button
        type="button"
        onClick={() => setShowPassword((prev) => !prev)}
        className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 focus:outline-none focus:text-brand-600 transition-colors"
        tabIndex={-1}
        aria-label={showPassword ? 'Hide password' : 'Show password'}
        title={showPassword ? 'Hide password' : 'Show password'}
      >
        {showPassword ? (
          <EyeSlashIcon className="h-5 w-5" />
        ) : (
          <EyeIcon className="h-5 w-5" />
        )}
      </button>
    </div>
  );
};

export const TextArea = ({ error, className = '', ...props }) => (
  <textarea
    className={`${baseControl} ${error ? 'ring-rose-400' : 'ring-slate-300'} ${className}`}
    {...props}
  />
);

export const Select = ({ error, className = '', children, ...props }) => (
  <select
    className={`${baseControl} bg-white ${error ? 'ring-rose-400' : 'ring-slate-300'} ${className}`}
    {...props}
  >
    {children}
  </select>
);

export default Field;
