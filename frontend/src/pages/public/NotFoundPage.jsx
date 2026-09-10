import { Link } from 'react-router-dom';

const NotFoundPage = () => (
  <section className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center">
    <p className="text-sm font-semibold text-brand-700">404</p>
    <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Page not found</h1>
    <p className="mt-3 text-sm text-slate-600">
      The page you are looking for does not exist or may have moved.
    </p>
    <Link
      to="/"
      className="mt-6 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
    >
      Back to all visualisations
    </Link>
  </section>
);

export default NotFoundPage;
