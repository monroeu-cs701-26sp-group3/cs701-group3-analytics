import { useState } from "react";

const SORT_OPTIONS = [
  { value: "revenue",   label: "Revenue" },
  { value: "orders",    label: "Orders" },
  { value: "avg_order", label: "Avg Order" },
];

const CATEGORY_COLORS = {
  Electronics:  "bg-blue-100   text-blue-700   dark:bg-blue-900/30  dark:text-blue-300",
  Accessories:  "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  Clothing:     "bg-green-100  text-green-700  dark:bg-green-900/30  dark:text-green-300",
  Books:        "bg-amber-100  text-amber-700  dark:bg-amber-900/30  dark:text-amber-300",
};

export default function TopProductsTable({ data, sortBy, onSortChange, onRefresh }) {
  const maxRevenue = data?.[0]?.revenue || 1;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-700 dark:text-gray-200">Top Performing Products</h3>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Completed transactions only</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">Sort by:</span>
          {SORT_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => onSortChange(opt.value)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                sortBy === opt.value
                  ? "bg-blue-600 text-white border-blue-600"
                  : "border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
              <th className="text-left py-2 px-2 w-8">#</th>
              <th className="text-left py-2 px-2">Product</th>
              <th className="text-left py-2 px-2">Category</th>
              <th className="text-right py-2 px-2">Revenue</th>
              <th className="text-right py-2 px-2">Orders</th>
              <th className="text-right py-2 px-2">Avg Order</th>
              <th className="py-2 px-2 w-32">Share</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
            {data?.map((row, i) => (
              <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <td className="py-2.5 px-2 text-xs text-gray-400 dark:text-gray-500 font-mono">
                  {row.rank}
                </td>
                <td className="py-2.5 px-2 font-medium text-gray-800 dark:text-gray-200">
                  {row.product}
                </td>
                <td className="py-2.5 px-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    CATEGORY_COLORS[row.category] || "bg-gray-100 text-gray-600"
                  }`}>
                    {row.category}
                  </span>
                </td>
                <td className="py-2.5 px-2 text-right font-semibold text-gray-800 dark:text-gray-200">
                  ${row.revenue.toLocaleString()}
                </td>
                <td className="py-2.5 px-2 text-right text-gray-600 dark:text-gray-400">
                  {row.orders}
                </td>
                <td className="py-2.5 px-2 text-right text-gray-600 dark:text-gray-400">
                  ${row.avg_order.toFixed(2)}
                </td>
                <td className="py-2.5 px-2">
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                      <div
                        className="bg-blue-500 h-1.5 rounded-full"
                        style={{ width: `${(row.revenue / maxRevenue) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 dark:text-gray-500 w-8 text-right">
                      {((row.revenue / maxRevenue) * 100).toFixed(0)}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
