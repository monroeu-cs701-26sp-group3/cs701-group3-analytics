const STATUS_BADGE = {
  success: "bg-green-100 text-green-700",
  denied:  "bg-red-100   text-red-700",
  error:   "bg-yellow-100 text-yellow-700",
};

export default function AuditLogTable({ data }) {
  return (
    <div className="bg-white border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <h3 className="font-semibold text-gray-700">Audit Log</h3>
        <span className="text-sm text-gray-400">{data.total} total records</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2 text-left">Timestamp</th>
              <th className="px-4 py-2 text-left">User ID</th>
              <th className="px-4 py-2 text-left">Action</th>
              <th className="px-4 py-2 text-left">Resource</th>
              <th className="px-4 py-2 text-left">IP</th>
              <th className="px-4 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.data.map((log) => (
              <tr key={log.log_id} className="hover:bg-gray-50">
                <td className="px-4 py-2 text-gray-400 whitespace-nowrap">
                  {log.logged_at?.slice(0, 19).replace("T", " ")}
                </td>
                <td className="px-4 py-2 font-mono text-gray-500">
                  {log.user_id ?? "—"}
                </td>
                <td className="px-4 py-2 font-medium text-gray-700">{log.action}</td>
                <td className="px-4 py-2 text-gray-500 font-mono text-xs">{log.resource}</td>
                <td className="px-4 py-2 text-gray-400 font-mono text-xs">
                  {log.ip_address ?? "—"}
                </td>
                <td className="px-4 py-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[log.status] || "bg-gray-100 text-gray-500"}`}>
                    {log.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
