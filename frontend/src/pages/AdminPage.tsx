import { useEffect, useState, useMemo } from "react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useNavigate } from "react-router-dom";
import API from "@/services/api";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Users,
  ShoppingBag,
  IndianRupee,
  Clock,
  Store,
  Warehouse,
  CheckCircle2,
  Banknote,
  LogOut,
  LayoutDashboard,
  ShieldCheck,
  ClipboardList,
  Search,
  RefreshCw,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  Ban,
  Eye,
  X,
  FileText,
  Phone,
  MapPin,
  Hash,
  Calendar,
  Filter,
} from "lucide-react";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
interface Supplier {
  id: number;
  business_name: string;
  verification_status: string;
  name: string;
  email: string;
  gst_number: string;
  phone?: string;
  address?: string;
  pan_number?: string;
  aadhaar_number?: string;
  created_at?: string;
}

interface Order {
  id: number;
  vendor_name: string;
  business_name: string;
  total_amount: number;
  payment_method: string;
  payment_status: string;
  order_status: string;
  created_at: string;
}

interface Stats {
  totalUsers: number;
  totalVendors: number;
  totalSuppliers: number;
  totalOrders: number;
  totalRevenue: number;
  pendingVerifications: number;
  deliveredOrders: number;
  pendingCOD: number;
}

type NavTab = "overview" | "suppliers" | "orders";
type SupplierFilter = "all" | "pending" | "verified" | "rejected" | "suspended";

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);

const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const statusColor: Record<string, string> = {
  pending:      "bg-amber-100 text-amber-700 border border-amber-200",
  under_review: "bg-blue-100 text-blue-700 border border-blue-200",
  verified:     "bg-emerald-100 text-emerald-700 border border-emerald-200",
  rejected:     "bg-red-100 text-red-700 border border-red-200",
  suspended:    "bg-slate-100 text-slate-600 border border-slate-200",
  placed:       "bg-blue-100 text-blue-700 border border-blue-200",
  accepted:     "bg-violet-100 text-violet-700 border border-violet-200",
  delivered:    "bg-emerald-100 text-emerald-700 border border-emerald-200",
  cancelled:    "bg-red-100 text-red-700 border border-red-200",
  paid:         "bg-emerald-100 text-emerald-700 border border-emerald-200",
  cod:          "bg-amber-100 text-amber-700 border border-amber-200",
  online:       "bg-sky-100 text-sky-700 border border-sky-200",
};

interface WeeklyPoint {
  day: string;       // "Mon", "Tue" …
  orders: number;
  revenue: number;
}

// ─────────────────────────────────────────────
// STAT CARD
// ─────────────────────────────────────────────
const StatCard = ({
  label,
  value,
  icon: Icon,
  accent,
  delay,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  accent: string;
  delay: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.35, ease: "easeOut" }}
    className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-start gap-4 hover:shadow-md transition-shadow"
  >
    <div className={`p-3 rounded-xl ${accent}`}>
      <Icon size={20} className="text-white" />
    </div>
    <div>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-slate-800 mt-0.5 leading-none">{value}</p>
    </div>
  </motion.div>
);

// ─────────────────────────────────────────────
// SUPPLIER DETAIL DRAWER
// ─────────────────────────────────────────────
const SupplierDrawer = ({
  supplier,
  onClose,
  onApprove,
  onReject,
  onSuspend,
  actionLoading,
}: {
  supplier: Supplier;
  onClose: () => void;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  onSuspend: (id: number) => void;
  actionLoading: number | null;
}) => {
  const busy = actionLoading === supplier.id;
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* backdrop */}
        <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
        {/* panel */}
        <motion.div
          initial={{ x: 420 }}
          animate={{ x: 0 }}
          exit={{ x: 420 }}
          transition={{ type: "spring", damping: 28, stiffness: 260 }}
          className="w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl flex flex-col"
        >
          {/* header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-800">{supplier.business_name}</h2>
              <p className="text-sm text-slate-500">{supplier.email}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-100 transition text-slate-400"
            >
              <X size={18} />
            </button>
          </div>

          {/* body */}
          <div className="flex-1 p-6 space-y-6">
            {/* status badge */}
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColor[supplier.verification_status] ?? "bg-gray-100 text-gray-600"}`}>
                {supplier.verification_status}
              </span>
              {supplier.created_at && (
                <span className="text-xs text-slate-400">
                  Joined {new Date(supplier.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              )}
            </div>

            {/* details grid */}
            <div className="grid grid-cols-1 gap-3">
              {[
                { icon: Users, label: "Owner", value: supplier.name },
                { icon: Phone, label: "Phone", value: supplier.phone || "—" },
                { icon: MapPin, label: "Address", value: supplier.address || "—" },
                { icon: Hash, label: "GST Number", value: supplier.gst_number || "—" },
                { icon: FileText, label: "PAN Number", value: supplier.pan_number || "—" },
                { icon: FileText, label: "Aadhaar", value: supplier.aadhaar_number ? "••••••" + supplier.aadhaar_number.slice(-4) : "—" },
              ].map(({ icon: Ic, label, value }) => (
                <div key={label} className="flex items-start gap-3 bg-slate-50 rounded-xl p-3">
                  <Ic size={15} className="text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400 font-medium">{label}</p>
                    <p className="text-sm text-slate-700 font-medium">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* actions */}
          <div className="p-6 border-t border-slate-100 flex flex-col gap-2">
            {supplier.verification_status !== "verified" && (
              <button
                onClick={() => onApprove(supplier.id)}
                disabled={busy}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-semibold text-sm transition flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={15} />
                {busy ? "Processing…" : "Approve Supplier"}
              </button>
            )}
            {supplier.verification_status !== "rejected" && (
              <button
                onClick={() => onReject(supplier.id)}
                disabled={busy}
                className="w-full py-2.5 bg-red-50 hover:bg-red-100 disabled:opacity-50 text-red-700 rounded-xl font-semibold text-sm transition flex items-center justify-center gap-2 border border-red-200"
              >
                <X size={15} />
                {busy ? "Processing…" : "Reject Supplier"}
              </button>
            )}
            {supplier.verification_status !== "suspended" && (
              <button
                onClick={() => onSuspend(supplier.id)}
                disabled={busy}
                className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 disabled:opacity-50 text-slate-600 rounded-xl font-semibold text-sm transition flex items-center justify-center gap-2 border border-slate-200"
              >
                <Ban size={15} />
                {busy ? "Processing…" : "Suspend Account"}
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
const AdminPage = () => {
  const navigate = useNavigate();

  // state
  const [activeTab, setActiveTab] = useState<NavTab>("overview");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const [stats, setStats] = useState<Stats>({
    totalUsers: 0, totalVendors: 0, totalSuppliers: 0,
    totalOrders: 0, totalRevenue: 0, pendingVerifications: 0,
    deliveredOrders: 0, pendingCOD: 0,
  });

  // supplier features
  const [supplierFilter, setSupplierFilter] = useState<SupplierFilter>("all");
  const [supplierSearch, setSupplierSearch] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // chart data
  const [weeklyRevenue, setWeeklyRevenue] = useState<WeeklyPoint[]>([]);

  // order features
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");

  // ── fetch ──
  const fetchDashboard = async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const [statsRes, ordersRes, suppliersRes, weeklyRes] = await Promise.allSettled([
        API.get("/admin/stats"),
        API.get("/admin/orders"),
        API.get("/admin/suppliers"),
        API.get("/admin/weekly-revenue"),
      ]);

      // Core data — show error only if these fail
      if (statsRes.status === "fulfilled") setStats(statsRes.value.data.stats);
      if (ordersRes.status === "fulfilled") setRecentOrders(ordersRes.value.data.orders);
      if (suppliersRes.status === "fulfilled") setSuppliers(suppliersRes.value.data.suppliers);

      // Chart data — optional, fail silently with empty array
      if (weeklyRes.status === "fulfilled") {
        setWeeklyRevenue(
          (weeklyRes.value.data.weeklyRevenue as any[]).map((r) => ({
            day: r.day_name?.slice(0, 3) ?? String(r.day).slice(5),
            orders: Number(r.orders),
            revenue: Number(r.revenue),
          }))
        );
      }

      const coreFailed = [statsRes, ordersRes, suppliersRes].some(r => r.status === "rejected");
      setError(coreFailed ? "Some dashboard data failed to load. Retrying…" : null);
      setLastRefreshed(new Date());
    } catch {
      setError("Failed to load dashboard. Check your connection.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(() => fetchDashboard(true), 30000);
    return () => clearInterval(interval);
  }, []);

  // ── supplier actions ──
  const doSupplierAction = async (id: number, action: "approve" | "reject" | "suspend") => {
    if (action === "reject" && !confirm("Reject this supplier?")) return;
    if (action === "suspend" && !confirm("Suspend this supplier account?")) return;
    setActionLoading(id);
    try {
      const endpoint =
        action === "approve" ? `/admin/suppliers/${id}/approve`
        : action === "reject" ? `/admin/suppliers/${id}/reject`
        : `/admin/suppliers/${id}/suspend`;
      const method = action === "suspend" ? "patch" : "patch";
      await API[method](endpoint);
      const newStatus = action === "approve" ? "verified" : action === "reject" ? "rejected" : "suspended";
      setSuppliers(prev => prev.map(s => s.id === id ? { ...s, verification_status: newStatus } : s));
      if (selectedSupplier?.id === id) setSelectedSupplier(prev => prev ? { ...prev, verification_status: newStatus } : null);
      toast.success(
        action === "approve" ? "Supplier approved ✓"
        : action === "reject" ? "Supplier rejected"
        : "Account suspended"
      );
    } catch {
      toast.error("Action failed. Please try again.");
    } finally {
      setActionLoading(null);
    }
  };

  // ── derived data ──
  const filteredSuppliers = useMemo(() => {
    let list = supplierFilter === "all" ? suppliers : suppliers.filter(s => s.verification_status === supplierFilter);
    if (supplierSearch.trim()) {
      const q = supplierSearch.toLowerCase();
      list = list.filter(s =>
        s.business_name.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        (s.gst_number ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [suppliers, supplierFilter, supplierSearch]);

  const filteredOrders = useMemo(() => {
    let list = orderStatusFilter === "all" ? recentOrders : recentOrders.filter(o => o.order_status === orderStatusFilter);
    if (orderSearch.trim()) {
      const q = orderSearch.toLowerCase();
      list = list.filter(o =>
        o.vendor_name?.toLowerCase().includes(q) ||
        o.business_name?.toLowerCase().includes(q) ||
        String(o.id).includes(q)
      );
    }
    return list;
  }, [recentOrders, orderStatusFilter, orderSearch]);

  const pieData = [
    { name: "Vendors", value: stats.totalVendors, color: "#3b82f6" },
    { name: "Wholesalers", value: stats.totalSuppliers, color: "#8b5cf6" },
  ];

  const ordersPieData = [
    { name: "Delivered", value: stats.deliveredOrders, color: "#10b981" },
    { name: "Other", value: stats.totalOrders - stats.deliveredOrders, color: "#e2e8f0" },
  ];

  // ── nav items ──
  const navItems: { id: NavTab; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: "overview",   label: "Overview",     icon: LayoutDashboard },
    { id: "suppliers",  label: "Verification", icon: ShieldCheck, badge: stats.pendingVerifications },
    { id: "orders",     label: "Orders",       icon: ClipboardList },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 text-sm font-medium">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">

      {/* ── SIDEBAR ── */}
      <aside className="w-60 shrink-0 bg-slate-900 flex flex-col min-h-screen fixed left-0 top-0 z-30">
        {/* logo */}
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">SL</div>
            <div>
              <p className="text-white font-bold text-sm leading-none">StreetLink</p>
              <p className="text-slate-400 text-xs mt-0.5">Admin Console</p>
            </div>
          </div>
        </div>

        {/* nav */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ id, label, icon: Icon, badge }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === id
                  ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              <Icon size={16} />
              <span className="flex-1 text-left">{label}</span>
              {badge != null && badge > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                  {badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* bottom */}
        <div className="p-4 border-t border-slate-800 space-y-2">
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold">A</div>
            <div>
              <p className="text-white text-xs font-semibold">Admin</p>
              <p className="text-slate-500 text-xs">Super User</p>
            </div>
          </div>
          <button
            onClick={async () => { await signOut(auth); navigate("/login"); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl text-sm transition"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main className="ml-60 flex-1 min-h-screen">

        {/* top bar */}
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-slate-100 px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-800 capitalize">{activeTab === "overview" ? "Dashboard Overview" : activeTab === "suppliers" ? "Supplier Verification" : "Order Management"}</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Last updated {timeAgo(lastRefreshed.toISOString())}
            </p>
          </div>
          <button
            onClick={() => fetchDashboard()}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-700 text-white text-sm rounded-xl transition disabled:opacity-60"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </header>

        <div className="p-8">

          {/* error banner */}
          {error && (
            <div className="mb-6 flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
              <AlertTriangle size={16} />
              <span className="flex-1">{error}</span>
              <button onClick={() => fetchDashboard()} className="underline text-xs font-semibold">Retry</button>
            </div>
          )}

          {/* ─────────────── OVERVIEW TAB ─────────────── */}
          {activeTab === "overview" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">

              {/* stat cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Users"           value={stats.totalUsers}          icon={Users}         accent="bg-slate-700"   delay={0}    />
                <StatCard label="Total Orders"          value={stats.totalOrders}         icon={ShoppingBag}   accent="bg-blue-500"    delay={0.05} />
                <StatCard label="Total Revenue"         value={formatINR(Number(stats.totalRevenue))} icon={IndianRupee} accent="bg-emerald-500" delay={0.1} />
                <StatCard label="Pending Verification"  value={stats.pendingVerifications} icon={Clock}         accent="bg-orange-500"  delay={0.15} />
                <StatCard label="Vendors"               value={stats.totalVendors}        icon={Store}         accent="bg-sky-500"     delay={0.2}  />
                <StatCard label="Wholesalers"           value={stats.totalSuppliers}      icon={Warehouse}     accent="bg-violet-500"  delay={0.25} />
                <StatCard label="Delivered Orders"      value={stats.deliveredOrders}     icon={CheckCircle2}  accent="bg-teal-500"    delay={0.3}  />
                <StatCard label="Pending COD"           value={stats.pendingCOD}          icon={Banknote}      accent="bg-amber-500"   delay={0.35} />
              </div>

              {/* charts row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* area chart */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                  className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6"
                >
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="font-bold text-slate-800">Weekly Revenue</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Orders & revenue trend (sample)</p>
                    </div>
                    <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                      <TrendingUp size={12} /> +12% this week
                    </div>
                  </div>
                  {weeklyRevenue.length === 0 ? (
                    <div className="h-[200px] flex items-center justify-center text-slate-400 text-sm">
                      No order data for the past 7 days
                    </div>
                  ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={weeklyRevenue} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f97316" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                      <Tooltip
                        contentStyle={{ border: "none", borderRadius: 12, boxShadow: "0 4px 24px rgba(0,0,0,0.08)", fontSize: 12 }}
                        formatter={(v: number) => [formatINR(v), "Revenue"]}
                      />
                      <Area type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={2} fill="url(#revGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                  )}
                </motion.div>

                {/* pie charts */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col gap-6"
                >
                  <h3 className="font-bold text-slate-800">User Split</h3>
                  <div className="flex items-center justify-center">
                    <PieChart width={160} height={160}>
                      <Pie data={pieData} cx={75} cy={75} innerRadius={48} outerRadius={70} paddingAngle={4} dataKey="value">
                        {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(v: number, n: string) => [v, n]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    </PieChart>
                  </div>
                  <div className="space-y-2">
                    {pieData.map(d => (
                      <div key={d.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                          <span className="text-slate-600">{d.name}</span>
                        </div>
                        <span className="font-semibold text-slate-800">{d.value}</span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-slate-100 pt-4">
                    <p className="text-xs text-slate-400 mb-2 font-medium">Delivery rate</p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                          style={{ width: `${stats.totalOrders ? Math.round((stats.deliveredOrders / stats.totalOrders) * 100) : 0}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-slate-700">
                        {stats.totalOrders ? Math.round((stats.deliveredOrders / stats.totalOrders) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* quick actions */}
              <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6"
              >
                <h3 className="font-bold text-slate-800 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: "Review Pending", sub: `${stats.pendingVerifications} awaiting`, icon: ShieldCheck, color: "bg-orange-50 text-orange-600 border-orange-100", onClick: () => { setActiveTab("suppliers"); setSupplierFilter("pending"); } },
                    { label: "View Orders",    sub: `${stats.totalOrders} total`,            icon: ClipboardList, color: "bg-blue-50 text-blue-600 border-blue-100",   onClick: () => setActiveTab("orders") },
                    { label: "COD Pending",    sub: `${stats.pendingCOD} uncleared`,         icon: Banknote,      color: "bg-amber-50 text-amber-600 border-amber-100", onClick: () => { setActiveTab("orders"); setOrderStatusFilter("placed"); } },
                    { label: "Verified List",  sub: `${suppliers.filter(s => s.verification_status === "verified").length} approved`, icon: CheckCircle2, color: "bg-emerald-50 text-emerald-600 border-emerald-100", onClick: () => { setActiveTab("suppliers"); setSupplierFilter("verified"); } },
                  ].map(({ label, sub, icon: Ic, color, onClick }) => (
                    <button key={label} onClick={onClick} className={`flex items-center gap-3 p-4 rounded-xl border ${color} hover:opacity-80 transition text-left`}>
                      <Ic size={18} />
                      <div>
                        <p className="text-sm font-semibold">{label}</p>
                        <p className="text-xs opacity-70">{sub}</p>
                      </div>
                      <ChevronRight size={14} className="ml-auto opacity-50" />
                    </button>
                  ))}
                </div>
              </motion.div>

            </motion.div>
          )}

          {/* ─────────────── SUPPLIERS TAB ─────────────── */}
          {activeTab === "suppliers" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">

              {/* summary row */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {(["all", "pending", "verified", "rejected", "suspended"] as SupplierFilter[]).map(f => {
                  const count = f === "all" ? suppliers.length : suppliers.filter(s => s.verification_status === f).length;
                  const colors: Record<string, string> = {
                    all: "border-slate-200 bg-white",
                    pending: "border-amber-200 bg-amber-50",
                    verified: "border-emerald-200 bg-emerald-50",
                    rejected: "border-red-200 bg-red-50",
                    suspended: "border-slate-200 bg-slate-50",
                  };
                  return (
                    <button
                      key={f}
                      onClick={() => setSupplierFilter(f)}
                      className={`border rounded-xl p-3 text-left transition ${colors[f]} ${supplierFilter === f ? "ring-2 ring-orange-400" : "hover:opacity-80"}`}
                    >
                      <p className="text-lg font-bold text-slate-800">{count}</p>
                      <p className="text-xs text-slate-500 capitalize">{f}</p>
                    </button>
                  );
                })}
              </div>

              {/* search */}
              <div className="relative">
                <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name, email, business or GST…"
                  value={supplierSearch}
                  onChange={e => setSupplierSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent shadow-sm"
                />
              </div>

              {/* table */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                  <h3 className="font-bold text-slate-800">
                    {supplierFilter === "all" ? "All Suppliers" : `${supplierFilter.charAt(0).toUpperCase() + supplierFilter.slice(1)} Suppliers`}
                  </h3>
                  <span className="text-xs text-slate-400">{filteredSuppliers.length} results</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        <th className="px-6 py-3 text-left">Business</th>
                        <th className="px-6 py-3 text-left">Owner</th>
                        <th className="px-6 py-3 text-left">Email</th>
                        <th className="px-6 py-3 text-left">GST</th>
                        <th className="px-6 py-3 text-left">Status</th>
                        <th className="px-6 py-3 text-left">Joined</th>
                        <th className="px-6 py-3 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredSuppliers.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-6 py-12 text-center text-slate-400 text-sm">
                            No suppliers match your filter
                          </td>
                        </tr>
                      )}
                      {filteredSuppliers.map(supplier => (
                        <tr key={supplier.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-6 py-3.5 font-medium text-slate-800">{supplier.business_name}</td>
                          <td className="px-6 py-3.5 text-slate-600">{supplier.name}</td>
                          <td className="px-6 py-3.5 text-slate-500">{supplier.email}</td>
                          <td className="px-6 py-3.5">
                            <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">
                              {supplier.gst_number || "—"}
                            </span>
                          </td>
                          <td className="px-6 py-3.5">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColor[supplier.verification_status] ?? "bg-gray-100 text-gray-600"}`}>
                              {supplier.verification_status}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 text-slate-400 text-xs">
                            {supplier.created_at ? new Date(supplier.created_at).toLocaleDateString("en-IN") : "—"}
                          </td>
                          <td className="px-6 py-3.5">
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => setSelectedSupplier(supplier)}
                                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
                                title="View details"
                              >
                                <Eye size={14} />
                              </button>
                              {supplier.verification_status !== "verified" && (
                                <button
                                  onClick={() => doSupplierAction(supplier.id, "approve")}
                                  disabled={actionLoading === supplier.id}
                                  className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600 transition disabled:opacity-40"
                                  title="Approve"
                                >
                                  <CheckCircle2 size={14} />
                                </button>
                              )}
                              {supplier.verification_status !== "rejected" && (
                                <button
                                  onClick={() => doSupplierAction(supplier.id, "reject")}
                                  disabled={actionLoading === supplier.id}
                                  className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition disabled:opacity-40"
                                  title="Reject"
                                >
                                  <X size={14} />
                                </button>
                              )}
                              {supplier.verification_status !== "suspended" && (
                                <button
                                  onClick={() => doSupplierAction(supplier.id, "suspend")}
                                  disabled={actionLoading === supplier.id}
                                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition disabled:opacity-40"
                                  title="Suspend"
                                >
                                  <Ban size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* ─────────────── ORDERS TAB ─────────────── */}
          {activeTab === "orders" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">

              {/* order status filter bar */}
              <div className="flex flex-wrap items-center gap-2">
                <Filter size={14} className="text-slate-400" />
                {["all", "placed", "accepted", "delivered", "cancelled"].map(f => (
                  <button
                    key={f}
                    onClick={() => setOrderStatusFilter(f)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${
                      orderStatusFilter === f
                        ? "bg-slate-900 text-white"
                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                    {f !== "all" && (
                      <span className="ml-1.5 opacity-60">
                        {recentOrders.filter(o => o.order_status === f).length}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* search */}
              <div className="relative">
                <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by order ID, vendor or wholesaler…"
                  value={orderSearch}
                  onChange={e => setOrderSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent shadow-sm"
                />
              </div>

              {/* orders table */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                  <h3 className="font-bold text-slate-800">Recent Orders</h3>
                  <span className="text-xs text-slate-400">{filteredOrders.length} orders</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        <th className="px-6 py-3 text-left">Order ID</th>
                        <th className="px-6 py-3 text-left">Vendor</th>
                        <th className="px-6 py-3 text-left">Wholesaler</th>
                        <th className="px-6 py-3 text-right">Amount</th>
                        <th className="px-6 py-3 text-left">Payment</th>
                        <th className="px-6 py-3 text-left">Status</th>
                        <th className="px-6 py-3 text-left">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredOrders.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-6 py-12 text-center text-slate-400 text-sm">
                            No orders match your filter
                          </td>
                        </tr>
                      )}
                      {filteredOrders.map(order => (
                        <tr key={order.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-6 py-3.5">
                            <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded font-semibold text-slate-600">
                              #{order.id}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 font-medium text-slate-700">{order.vendor_name}</td>
                          <td className="px-6 py-3.5 text-slate-600">{order.business_name}</td>
                          <td className="px-6 py-3.5 text-right font-semibold text-slate-800">
                            {formatINR(Number(order.total_amount))}
                          </td>
                          <td className="px-6 py-3.5">
                            <div className="flex items-center gap-1.5">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor[order.payment_method] ?? "bg-gray-100 text-gray-600"}`}>
                                {order.payment_method?.toUpperCase()}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor[order.payment_status] ?? "bg-gray-100 text-gray-600"}`}>
                                {order.payment_status}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-3.5">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColor[order.order_status] ?? "bg-gray-100 text-gray-600"}`}>
                              {order.order_status}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 text-slate-400 text-xs">
                            <div className="flex items-center gap-1">
                              <Calendar size={11} />
                              {timeAgo(order.created_at)}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </main>

      {/* ── SUPPLIER DETAIL DRAWER ── */}
      {selectedSupplier && (
        <SupplierDrawer
          supplier={selectedSupplier}
          onClose={() => setSelectedSupplier(null)}
          onApprove={id => doSupplierAction(id, "approve")}
          onReject={id => doSupplierAction(id, "reject")}
          onSuspend={id => doSupplierAction(id, "suspend")}
          actionLoading={actionLoading}
        />
      )}
    </div>
  );
};

export default AdminPage;
