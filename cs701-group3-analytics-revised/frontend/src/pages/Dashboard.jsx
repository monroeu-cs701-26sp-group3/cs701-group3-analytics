import { useState, useEffect } from "react";
import { apiFetch, API_BASE } from "../services/authService";
import KPICard from "../components/KPICard";
import TrendChart from "../components/TrendChart";
import SegmentTable from "../components/SegmentTable";
import AuditLogTable from "../components/AuditLogTable";

const NAV_ITEMS = [
  { id: "overview",   label: "Overview",        roles: ["DataAnalyst", "SystemAdmin"] },
  { id: "segments",   label: "Segmentation",    roles: ["DataAnalyst", "SystemAdmin"] },
  { id: "audit",      label: "Audit Logs",       roles: ["SystemAdmin", "ComplianceOfficer"] },
];

export default function Dashboard({ user, token, onLogout }) {
  const [activeTab,   setActiveTab]   = useState("overview");
  const [kpiSummary,  setKpiSummary]  = useState(null);
  const [trends,      setTrends]      = useState([]);
  const [categories,  setCategories]  = useState([]);
  const [segments,    setSegments]    = useState(null);
  const [auditLogs,   setAuditLogs]   = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState("");

  const visibleTabs = NAV_ITEMS.filter(n => n.roles.includes(user.role));

  // Ensure active tab is visible for this role
  useEffect(() => {
    if (!visibleTabs.find(t => t.id === activeTab)) {
      setActiveTab(visibleTabs[0]?.id || "overview");
    }
  }, [user.role]);

  useEffect(() => {
    loadTabData(activeTab);
  }, [activeTab]);

  const loadTabData = async (tab) => {
    setLoading(true);
    setError("");
    try {
      if (tab === "overview") {
        const [summary, trendData, catData] = await Promise.all([
          apiFetch("/kpi/summary",        token),
          apiFetch("/kpi/trends?months=6", token),
          apiFetch("/kpi/top-categories", token),
        ]);
        setKpiSummary(summary);
        setTrends(trendData);
        setCategories(catData);
      } else if (tab === "segments") {
        const [summary, list] = await Promise.all([
          apiFetch("/segments/summary", token),
          apiFetch("/segments/",        token),
        ]);
        setSegments({ summary, list });
      } else if (tab === "audit") {
        const data = await apiFetch("/audit/?limit=50", token);
        setAuditLogs(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Nav */}
      <header className="bg-white border-b px-6 py-3 flex items-center justify-between shadow-sm">
        <div>
          <h1 className="text-lg font-bold text-gray-800">Customer Analytics System</h1>
          <p className="text-xs text-gray-400">CS701 Group 3 — Monroe University</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-700">{user.username}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              user.role === "SystemAdmin"       ? "bg-purple-100 text-purple-700" :
              user.role === "DataAnalyst"       ? "bg-blue-100 text-blue-700" :
              "bg-green-100 text-green-700"
            }`}>{user.role}</span>
          </div>
          <button
            onClick={onLogout}
            className="text-sm text-gray-500 hover:text-red-600 border rounded-lg px-3 py-1 transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="bg-white border-b px-6">
        <div className="flex gap-1">
          {visibleTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="p-6 max-w-7xl mx-auto">
        {loading && (
          <div className="text-center py-20 text-gray-400">
            <div className="text-4xl mb-3">⏳</div>
            <p>Loading data...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-4">
            <strong>Error:</strong> {error}
          </div>
        )}

        {!loading && !error && activeTab === "overview" && kpiSummary && (
          <OverviewTab kpiSummary={kpiSummary} trends={trends} categories={categories} />
        )}

        {!loading && !error && activeTab === "segments" && segments && (
          <SegmentTable data={segments} />
        )}

        {!loading && !error && activeTab === "audit" && auditLogs && (
          <AuditLogTable data={auditLogs} />
        )}
      </main>
    </div>
  );
}

function OverviewTab({ kpiSummary, trends, categories }) {
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard label="Total Revenue"     value={`$${kpiSummary.total_revenue?.toLocaleString()}`} color="blue"   />
        <KPICard label="Transactions"      value={kpiSummary.transaction_count}                     color="green"  />
        <KPICard label="Unique Customers"  value={kpiSummary.unique_customers}                      color="indigo" />
        <KPICard label="Avg Order Value"   value={`$${kpiSummary.avg_order_value}`}                 color="purple" />
        <KPICard label="Retention Rate"    value={`${kpiSummary.retention_rate}%`}                  color="teal"   />
        <KPICard label="Churn Rate"        value={`${kpiSummary.churn_rate}%`}                      color="red"    />
        <KPICard label="New Customers"     value={kpiSummary.new_customers}                         color="yellow" />
        <KPICard label="Top Category"      value={kpiSummary.top_category}                          color="orange" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TrendChart title="Revenue Trend (6 months)" data={trends} dataKey="total_revenue" color="#3b82f6" prefix="$" />
        <TrendChart title="Customer Retention (%)"   data={trends} dataKey="retention_rate" color="#10b981" suffix="%" />
      </div>

      {/* Top Categories */}
      <div className="bg-white rounded-xl border p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-700">Top Categories by Revenue</h3>
          {categories.length > 0 && (
            <button
              onClick={() => exportTopCategoriesCsv()}
              className="text-xs text-gray-500 border rounded px-2 py-1 hover:bg-gray-50"
            >
              Export CSV
            </button>
          )}
        </div>
        {categories.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">No category data yet.</p>
        ) : (
          <div className="space-y-2">
            {categories.map((c, i) => {
              const maxRevenue = Math.max(categories[0].revenue, 1);
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-4">{i + 1}</span>
                  <span className="text-sm font-medium text-gray-700 w-32">{c.category}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${(c.revenue / maxRevenue) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-600 w-24 text-right">${c.revenue.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function exportTopCategoriesCsv() {
  const token = sessionStorage.getItem("token");
  fetch(`${API_BASE}/kpi/top-categories/export`, {
    headers: { Authorization: `Bearer ${token}` },
  })
    .then((r) => r.blob())
    .then((blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "top_categories.csv";
      link.click();
      URL.revokeObjectURL(url);
    });
}
