import { useState, useEffect } from "react";
import { apiFetch } from "../services/authService";
import KPICard from "../components/KPICard";
import TrendChart from "../components/TrendChart";
import SegmentTable from "../components/SegmentTable";
import AuditLogTable from "../components/AuditLogTable";
import AlertsPanel from "../components/AlertsPanel";
import CustomerGrowthChart from "../components/CustomerGrowthChart";
import ForecastChart from "../components/ForecastChart";
import TopProductsTable from "../components/TopProductsTable";

const NAV_ITEMS = [
  { id: "overview",  label: "Overview",      roles: ["DataAnalyst", "SystemAdmin"] },
  { id: "segments",  label: "Segmentation",  roles: ["DataAnalyst", "SystemAdmin"] },
  { id: "products",  label: "Products",      roles: ["DataAnalyst", "SystemAdmin"] },
  { id: "alerts",    label: "Alerts",        roles: ["DataAnalyst", "SystemAdmin"] },
  { id: "audit",     label: "Audit Logs",    roles: ["SystemAdmin", "ComplianceOfficer"] },
];

export default function Dashboard({ user, token, onLogout }) {
  const [activeTab,     setActiveTab]     = useState("overview");
  const [kpiSummary,    setKpiSummary]    = useState(null);
  const [trends,        setTrends]        = useState([]);
  const [categories,    setCategories]    = useState([]);
  const [growth,        setGrowth]        = useState([]);
  const [segments,      setSegments]      = useState(null);
  const [alerts,        setAlerts]        = useState(null);
  const [auditLogs,     setAuditLogs]     = useState(null);
  const [forecast,      setForecast]      = useState(null);
  const [products,      setProducts]      = useState(null);
  const [productSort,   setProductSort]   = useState("revenue");
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState("");
  const [isDark,        setIsDark]        = useState(() => sessionStorage.getItem("darkMode") === "true");

  // Filters
  const [startDate,     setStartDate]     = useState("");
  const [endDate,       setEndDate]       = useState("");
  const [searchQuery,   setSearchQuery]   = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching,     setSearching]     = useState(false);
  const [threshold,     setThreshold]     = useState(500);

  // Dark mode effect
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) { root.classList.add("dark"); }
    else        { root.classList.remove("dark"); }
    sessionStorage.setItem("darkMode", isDark);
  }, [isDark]);

  const visibleTabs = NAV_ITEMS.filter(t => t.roles.includes(user.role));

  useEffect(() => {
    if (!visibleTabs.find(t => t.id === activeTab)) {
      setActiveTab(visibleTabs[0]?.id || "overview");
    }
  }, [user.role]);

  useEffect(() => {
    if (!activeTab) return;
    if (activeTab === "overview"  && !["DataAnalyst","SystemAdmin"].includes(user.role)) return;
    if (activeTab === "segments"  && !["DataAnalyst","SystemAdmin"].includes(user.role)) return;
    if (activeTab === "products"  && !["DataAnalyst","SystemAdmin"].includes(user.role)) return;
    if (activeTab === "alerts"    && !["DataAnalyst","SystemAdmin"].includes(user.role)) return;
    if (activeTab === "audit"     && !["SystemAdmin","ComplianceOfficer"].includes(user.role)) return;
    loadTabData(activeTab);
  }, [activeTab]);

  const loadTabData = async (tab) => {
    setLoading(true);
    setError("");
    try {
      if (tab === "overview") {
        const dateParams = buildDateParams();
        const [summary, trendData, catData, growthData] = await Promise.all([
          apiFetch(`/analytics/summary${dateParams}`, token),
          apiFetch("/analytics/monthly?months=12", token),
          apiFetch(`/analytics/by-category${dateParams}`, token),
          apiFetch("/analytics/customer-growth?months=6", token),
        ]);
        setKpiSummary(summary);
        setTrends(trendData);
        setCategories(catData);
        setGrowth(growthData);
      } else if (tab === "segments") {
        const [summary, list] = await Promise.all([
          apiFetch("/segments/summary", token),
          apiFetch("/segments/", token),
        ]);
        setSegments({ summary, list });
      } else if (tab === "products") {
        const [forecastData, productsData] = await Promise.all([
          apiFetch("/extras/forecast?periods=3", token),
          apiFetch(`/extras/top-products?sort_by=${productSort}&limit=10`, token),
        ]);
        setForecast(forecastData);
        setProducts(productsData);
      } else if (tab === "alerts") {
        const data = await apiFetch(`/analytics/alerts?revenue_threshold=${threshold}`, token);
        setAlerts(data);
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

  const buildDateParams = () => {
    const params = new URLSearchParams();
    if (startDate) params.append("start_date", startDate);
    if (endDate)   params.append("end_date",   endDate);
    return params.toString() ? `?${params}` : "";
  };

  const handleFilter      = () => loadTabData("overview");
  const handleClearFilter = () => {
    setStartDate("");
    setEndDate("");
    setTimeout(() => loadTabData("overview"), 50);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const data = await apiFetch(
        `/analytics/customers/search?q=${encodeURIComponent(searchQuery)}`, token
      );
      setSearchResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSearching(false);
    }
  };

  const handleExport = () => {
    const params = buildDateParams();
    const url    = `http://localhost:8000/api/analytics/export${params}`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const link    = document.createElement("a");
        link.href     = URL.createObjectURL(blob);
        link.download = "sales_export.csv";
        link.click();
      });
  };

  const handleProductSort = async (sortBy) => {
    setProductSort(sortBy);
    try {
      const data = await apiFetch(`/extras/top-products?sort_by=${sortBy}&limit=10`, token);
      setProducts(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const alertCount = alerts?.high || 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* Top Nav */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3 flex items-center justify-between shadow-sm">
        <div>
          <h1 className="text-lg font-bold text-gray-800 dark:text-gray-100">Customer Analytics System</h1>
          <p className="text-xs text-gray-400 dark:text-gray-500">CS701 Group 3 — Monroe University</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{user.username}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              user.role === "SystemAdmin" ? "bg-purple-100 text-purple-700" :
              user.role === "DataAnalyst" ? "bg-blue-100 text-blue-700" :
              "bg-green-100 text-green-700"
            }`}>{user.role}</span>
          </div>
          <button
            onClick={() => setIsDark(d => !d)}
            className="text-sm text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            {isDark ? "☀️ Light" : "🌙 Dark"}
          </button>
          <button
            onClick={onLogout}
            className="text-sm text-gray-500 hover:text-red-600 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1 transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Tab Nav */}
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6">
        <div className="flex gap-1">
          {visibleTabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`relative px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}>
              {tab.label}
              {tab.id === "alerts" && alertCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {alertCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>

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

        {/* OVERVIEW */}
        {!loading && !error && activeTab === "overview" && kpiSummary && (
          <OverviewTab
            kpiSummary={kpiSummary} trends={trends}
            categories={categories} growth={growth}
            startDate={startDate} endDate={endDate}
            setStartDate={setStartDate} setEndDate={setEndDate}
            onFilter={handleFilter} onClear={handleClearFilter}
            onExport={handleExport}
          />
        )}

        {/* SEGMENTATION */}
        {!loading && !error && activeTab === "segments" && segments && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">Customer Search</h3>
              <div className="flex gap-2">
                <input
                  type="text" value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSearch()}
                  placeholder="Search by name, city, or country..."
                  className="flex-1 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button onClick={handleSearch} disabled={searching}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg">
                  {searching ? "..." : "Search"}
                </button>
                {searchResults.length > 0 && (
                  <button onClick={() => { setSearchResults([]); setSearchQuery(""); }}
                    className="text-sm text-gray-500 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2">
                    Clear
                  </button>
                )}
              </div>
              {searchResults.length > 0 && (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                        <th className="text-left py-2">ID</th>
                        <th className="text-left py-2">Name</th>
                        <th className="text-left py-2">City</th>
                        <th className="text-left py-2">Country</th>
                        <th className="text-left py-2">Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {searchResults.map((c, i) => (
                        <tr key={i} className="border-b border-gray-50 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="py-2 font-mono text-gray-500 dark:text-gray-400">#{c.customer_id}</td>
                          <td className="py-2 font-medium text-gray-800 dark:text-gray-200">{c.name}</td>
                          <td className="py-2 text-gray-600 dark:text-gray-400">{c.city}</td>
                          <td className="py-2 text-gray-600 dark:text-gray-400">{c.country}</td>
                          <td className="py-2 text-gray-500 dark:text-gray-400">{c.source}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <SegmentTable data={segments} />
          </div>
        )}

        {/* PRODUCTS */}
        {!loading && !error && activeTab === "products" && (
          <div className="space-y-6">
            <ForecastChart data={forecast} />
            <TopProductsTable
              data={products}
              sortBy={productSort}
              onSortChange={handleProductSort}
            />
          </div>
        )}

        {/* ALERTS */}
        {!loading && !error && activeTab === "alerts" && alerts && (
          <AlertsPanel
            data={alerts} threshold={threshold}
            setThreshold={setThreshold}
            onRefresh={() => loadTabData("alerts")}
          />
        )}

        {/* AUDIT */}
        {!loading && !error && activeTab === "audit" && auditLogs && (
          <AuditLogTable data={auditLogs} />
        )}
      </main>
    </div>
  );
}

// ── Overview Tab ──────────────────────────────────────────────────────────────
function OverviewTab({ kpiSummary, trends, categories, growth,
  startDate, endDate, setStartDate, setEndDate, onFilter, onClear, onExport }) {
  return (
    <div className="space-y-6">
      {/* Filter bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex flex-wrap items-center gap-4">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Date range:</span>
        <div className="flex items-center gap-2">
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            className="border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <span className="text-gray-400 text-sm">to</span>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
            className="border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <button onClick={onFilter} className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-1.5 rounded-lg">
          Apply Filter
        </button>
        {(startDate || endDate) && (
          <button onClick={onClear} className="text-sm text-gray-500 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700">
            Clear
          </button>
        )}
        {(startDate || endDate) && (
          <span className="text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">
            Filtered: {startDate || "..."} → {endDate || "..."}
          </span>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard label="Total Revenue"    value={`$${(kpiSummary.total_revenue || 0).toLocaleString()}`} color="blue"   />
        <KPICard label="Total Orders"     value={kpiSummary.total_orders}                                color="green"  />
        <KPICard label="Unique Customers" value={kpiSummary.unique_customers}                            color="indigo" />
        <KPICard label="Avg Order Value"  value={`$${Number(kpiSummary.avg_order_value || 0).toFixed(2)}`} color="purple" />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TrendChart title="Monthly Revenue" data={trends} dataKey="revenue" color="#3b82f6" prefix="$" />
        <TrendChart title="Monthly Orders"  data={trends} dataKey="orders"  color="#8b5cf6" />
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <CustomerGrowthChart data={growth} />
        <CategoryDonut categories={categories} />
      </div>

      {/* Top categories + export */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-700 dark:text-gray-200">Top Categories by Revenue</h3>
          <button onClick={onExport}
            className="text-xs text-gray-500 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-1">
            ⬇ Export CSV
          </button>
        </div>
        <div className="space-y-2">
          {categories.map((c, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-xs text-gray-500 w-4">{i + 1}</span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-32">{c.category}</span>
              <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full"
                  style={{ width: `${(c.revenue / (categories[0]?.revenue || 1)) * 100}%` }} />
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400 w-24 text-right">${c.revenue.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Category Donut ────────────────────────────────────────────────────────────
function CategoryDonut({ categories }) {
  const COLORS = ["#3b82f6","#8b5cf6","#10b981","#f59e0b","#ef4444"];
  const total  = categories.reduce((s, c) => s + c.revenue, 0);
  let cumulative = 0;
  const slices = categories.map((c, i) => {
    const pct = c.revenue / total;
    const start = cumulative;
    cumulative += pct;
    return { ...c, pct, start, color: COLORS[i % COLORS.length] };
  });

  const polarToCartesian = (cx, cy, r, angle) => {
    const rad = (angle - 90) * (Math.PI / 180);
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };
  const describeArc = (cx, cy, r, startAngle, endAngle) => {
    const s = polarToCartesian(cx, cy, r, startAngle);
    const e = polarToCartesian(cx, cy, r, endAngle);
    const large = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <h3 className="font-semibold text-gray-700 dark:text-gray-200 mb-4">Revenue Distribution</h3>
      <div className="flex items-center gap-6">
        <svg viewBox="0 0 120 120" width="120" height="120" className="flex-shrink-0">
          {slices.map((s, i) => {
            const start = s.start * 360;
            const end   = (s.start + s.pct) * 360 - 0.5;
            return <path key={i} d={describeArc(60, 60, 45, start, end)} fill="none" stroke={s.color} strokeWidth="18" />;
          })}
          <circle cx="60" cy="60" r="27" fill="white" />
          <text x="60" y="56" textAnchor="middle" fontSize="8" fill="#6b7280">Total</text>
          <text x="60" y="68" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#1f2937">
            ${(total/1000).toFixed(1)}k
          </text>
        </svg>
        <div className="space-y-2 flex-1">
          {slices.map((s, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: s.color }} />
                <span className="text-gray-700 dark:text-gray-300">{s.category}</span>
              </div>
              <span className="text-gray-500 dark:text-gray-400">{(s.pct * 100).toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
