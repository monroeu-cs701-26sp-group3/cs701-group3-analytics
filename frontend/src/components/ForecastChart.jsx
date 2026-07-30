import {
  ComposedChart, Bar, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from "recharts";

export default function ForecastChart({ data }) {
  if (!data) return null;

  const { historical, forecast, trend, avg_monthly, slope } = data;

  // Combine historical + forecast into one array for the chart
  const combined = [
    ...historical.map(d => ({ month: d.month, actual: d.revenue, forecast: null })),
    ...forecast.map(d => ({ month: d.month, actual: null, forecast: d.revenue })),
  ];

  const trendColor = trend === "upward" ? "#10b981" : trend === "downward" ? "#ef4444" : "#6b7280";
  const trendLabel = trend === "upward" ? "↑ Upward trend" : trend === "downward" ? "↓ Downward trend" : "→ Flat trend";

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-700 dark:text-gray-200">Revenue Forecast</h3>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            Historical data + {forecast.length}-month projection
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="font-medium" style={{ color: trendColor }}>{trendLabel}</span>
          <span className="text-gray-400 dark:text-gray-500">
            Avg: ${avg_monthly?.toLocaleString()}
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={combined} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="month" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${(v/1000).toFixed(1)}k`} />
          <Tooltip
            formatter={(val, name) => [`$${Number(val).toLocaleString()}`, name === "actual" ? "Actual" : "Forecast"]}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <ReferenceLine
            x={historical[historical.length - 1]?.month}
            stroke="#94a3b8"
            strokeDasharray="4 2"
            label={{ value: "Today", position: "top", fontSize: 10, fill: "#94a3b8" }}
          />
          <Bar dataKey="actual"   name="Actual"   fill="#3b82f6" radius={[3,3,0,0]} />
          <Line
            dataKey="forecast" name="Forecast"
            stroke="#f59e0b" strokeWidth={2}
            strokeDasharray="5 3"
            dot={{ r: 4, fill: "#f59e0b" }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Forecast summary cards */}
      <div className="grid grid-cols-3 gap-3 mt-4">
        {forecast.map((f, i) => (
          <div key={i} className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-center">
            <p className="text-xs text-amber-600 dark:text-amber-400 mb-1">{f.month}</p>
            <p className="text-base font-bold text-amber-700 dark:text-amber-300">
              ${f.revenue.toLocaleString()}
            </p>
            <p className="text-xs text-amber-500 dark:text-amber-400">projected</p>
          </div>
        ))}
      </div>
    </div>
  );
}
