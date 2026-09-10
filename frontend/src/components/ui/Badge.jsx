import { DOMAIN_META, STATUS_META } from '@/config/constants.js';

const Badge = ({ className = '', children }) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${className}`}
  >
    {children}
  </span>
);

export const StatusBadge = ({ status }) => {
  const meta = STATUS_META[status] ?? {
    label: status,
    className: 'bg-slate-100 text-slate-700 ring-slate-200',
  };
  return <Badge className={meta.className}>{meta.label}</Badge>;
};

export const DomainBadge = ({ domain }) => {
  const meta = DOMAIN_META[domain];
  if (!meta) return <Badge className="bg-slate-100 text-slate-700 ring-slate-200">{domain}</Badge>;
  return (
    <Badge className={meta.accent}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} aria-hidden="true" />
      {meta.label}
    </Badge>
  );
};

export default Badge;
