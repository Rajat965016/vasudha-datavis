const TONES = {
  slate: 'text-slate-900',
  amber: 'text-amber-600',
  emerald: 'text-emerald-600',
  rose: 'text-rose-600',
};

/** Small summary tiles shown above the dataset tables. */
const StatCards = ({ stats }) => {
  const cards = [
    { label: 'Total datasets', value: stats?.total ?? 0, tone: 'slate' },
    { label: 'Pending approval', value: stats?.pending ?? 0, tone: 'amber' },
    { label: 'Approved', value: stats?.approved ?? 0, tone: 'emerald' },
    { label: 'Rejected', value: stats?.rejected ?? 0, tone: 'rose' },
  ];

  return (
    <dl className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="rounded-xl bg-white p-4 shadow-card ring-1 ring-slate-200">
          <dt className="text-xs font-medium text-slate-500">{card.label}</dt>
          <dd className={`mt-1 text-2xl font-bold ${TONES[card.tone]}`}>{card.value}</dd>
        </div>
      ))}
    </dl>
  );
};

export default StatCards;
