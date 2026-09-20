export default function AdminDashboard() {
  const cards = [
    { label: 'Players online', value: '—' },
    { label: 'Total accounts', value: '—' },
    { label: 'Server status', value: 'OK' },
    { label: 'Active events', value: '0' },
  ];
  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Dashboard</h1>
      <p className="mb-8 text-sm text-white/50">
        Phase 0 scaffold. Live metrics and management modules arrive in Phase 9.
      </p>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="text-3xl font-semibold">{c.value}</div>
            <div className="mt-1 text-xs text-white/50">{c.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
