export default function AlertsPanel({ data, threshold, setThreshold, onRefresh }) {
  const SEVERITY = {
    high:   { bg: "bg-red-50",    border: "border-red-200",    text: "text-red-700",    badge: "bg-red-100 text-red-700",    icon: "🔴" },
    medium: { bg: "bg-amber-50",  border: "border-amber-200",  text: "text-amber-700",  badge: "bg-amber-100 text-amber-700",  icon: "🟡" },
    info:   { bg: "bg-blue-50",   border: "border-blue-200",   text: "text-blue-700",   badge: "bg-blue-100 text-blue-700",   icon: "🔵" },
  };

  const TYPE_LABEL = {
    churn_risk:    "Churn Risk",
    low_revenue:   "Low Revenue",
    high_churn:    "High Churn Rate",
    new_customers: "New Customers",
  };

  return (
    <div className="space-y-4">
      {/* Header + controls */}
      <div className="bg-white rounded-xl border p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-gray-800">System Alerts</h2>
          <p className="text-xs text-gray-400 mt-0.5">Live alerts based on current data</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-600">Revenue threshold: $</label>
          <input
            type="number" value={threshold} min={0}
            onChange={e => setThreshold(Number(e.target.value))}
            className="border rounded-lg px-3 py-1.5 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button onClick={onRefresh}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-1.5 rounded-lg">
            Refresh
          </button>
        </div>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-red-700">{data.high}</p>
          <p className="text-xs text-red-500 mt-1">High Severity</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-amber-700">{data.medium}</p>
          <p className="text-xs text-amber-500 mt-1">Medium Severity</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-blue-700">{data.info}</p>
          <p className="text-xs text-blue-500 mt-1">Informational</p>
        </div>
      </div>

      {/* Alert cards */}
      {data.alerts.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
          <div className="text-4xl mb-3">✅</div>
          <p className="font-medium">No alerts — all metrics look healthy</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.alerts.map((alert, i) => {
            const s = SEVERITY[alert.severity] || SEVERITY.info;
            return (
              <div key={i} className={`${s.bg} border ${s.border} rounded-xl p-4`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <span className="text-lg mt-0.5">{s.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-sm font-semibold ${s.text}`}>{alert.title}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.badge}`}>
                          {TYPE_LABEL[alert.type] || alert.type}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{alert.message}</p>
                      <p className="text-xs text-gray-500 mt-1.5">
                        <span className="font-medium">Recommended action:</span> {alert.action}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
