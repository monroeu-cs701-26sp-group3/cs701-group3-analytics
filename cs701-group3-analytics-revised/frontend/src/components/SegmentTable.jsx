const BADGE = {
  "High-Value": "bg-green-100 text-green-700",
  "At-Risk":    "bg-red-100   text-red-700",
  "Returning":  "bg-blue-100  text-blue-700",
  "New":        "bg-yellow-100 text-yellow-700",
  "Churned":    "bg-gray-100  text-gray-600",
};

export default function SegmentTable({ data }) {
  const { summary, list } = data;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summary.map((s) => (
          <div key={s.segment} className="bg-white border rounded-xl p-4">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${BADGE[s.segment] || "bg-gray-100 text-gray-600"}`}>
              {s.segment}
            </span>
            <p className="text-2xl font-bold text-gray-800 mt-2">{s.count}</p>
            <p className="text-xs text-gray-400">Avg Score: {s.avg_score}</p>
          </div>
        ))}
      </div>

      {/* Detail table */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b">
          <h3 className="font-semibold text-gray-700">Customer Segment Assignments</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2 text-left">Customer ID</th>
                <th className="px-4 py-2 text-left">Segment</th>
                <th className="px-4 py-2 text-left">Score</th>
                <th className="px-4 py-2 text-left">Method</th>
                <th className="px-4 py-2 text-left">Assigned</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {list.data.map((s) => (
                <tr key={s.segment_id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono text-gray-600">#{s.customer_id}</td>
                  <td className="px-4 py-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${BADGE[s.segment_label] || "bg-gray-100 text-gray-600"}`}>
                      {s.segment_label}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-700">{s.score.toFixed(1)}</td>
                  <td className="px-4 py-2 text-gray-500 capitalize">{s.method}</td>
                  <td className="px-4 py-2 text-gray-400">{s.assigned_at.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
