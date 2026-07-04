const COLOR_MAP = {
  blue:   "bg-blue-50   text-blue-700   border-blue-200",
  green:  "bg-green-50  text-green-700  border-green-200",
  indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
  purple: "bg-purple-50 text-purple-700 border-purple-200",
  teal:   "bg-teal-50   text-teal-700   border-teal-200",
  red:    "bg-red-50    text-red-700    border-red-200",
  yellow: "bg-yellow-50 text-yellow-700 border-yellow-200",
  orange: "bg-orange-50 text-orange-700 border-orange-200",
};

export default function KPICard({ label, value, color = "blue" }) {
  return (
    <div className={`rounded-xl border p-4 ${COLOR_MAP[color]}`}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</p>
      <p className="text-2xl font-bold mt-1">{value ?? "—"}</p>
    </div>
  );
}
