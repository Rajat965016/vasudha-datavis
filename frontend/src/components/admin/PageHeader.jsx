const PageHeader = ({ title, description, actions }) => (
  <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
    <div className="min-w-0">
      <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{title}</h1>
      {description && <p className="mt-1 max-w-2xl text-sm text-slate-500">{description}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

export default PageHeader;
