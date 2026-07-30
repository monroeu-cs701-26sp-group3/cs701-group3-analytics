import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from "recharts";

export default function CustomerGrowthChart({ data }) {
  return (
    <div className="bg-white rounded-xl border p-4">
      <h3 className="font-semibold text-gray-700 mb-4">Customer Growth</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="new"       name="New"       fill="#3b82f6" radius={[3,3,0,0]} />
          <Bar dataKey="returning" name="Returning" fill="#10b981" radius={[3,3,0,0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
