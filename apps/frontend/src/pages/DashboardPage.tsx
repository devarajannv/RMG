import { useEffect, useState, useCallback } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Briefcase,
  AlertTriangle,
  Clock,
  DollarSign,
  Activity,
  Calendar,
  Target,
  Zap,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { api } from '@/lib/api';
import MainLayout from '@/components/layout/MainLayout';

// ============================================================================
// Types
// ============================================================================

interface DashboardMetrics {
  resources: {
    total: number;
    active: number;
    onBench: number;
    inNotice: number;
    contractors: number;
  };
  utilization: {
    current: number;
    target: number;
    billable: number;
    nonBillable: number;
    trend: 'up' | 'down' | 'stable';
  };
  projects: {
    total: number;
    active: number;
    pipeline: number;
    atRisk: number;
  };
  allocations: {
    active: number;
    pending: number;
    rolloffsNext30Days: number;
  };
  financials: {
    benchCostMonthly: number;
    potentialRevenueLoss: number;
  };
}

interface UtilizationTrend {
  date: string;
  billable: number;
  nonBillable: number;
  bench: number;
  total: number;
}

interface PracticeUtilization {
  practiceName: string;
  utilizationRate: number;
  targetUtilization: number;
  variance: number;
  totalResources: number;
}

interface CapacityForecast {
  week: string;
  currentAllocated: number;
  rolloffs: number;
  newStarts: number;
  projectedAvailable: number;
}

interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  isBase: boolean;
}

// ============================================================================
// Brand Colors
// ============================================================================

const BRAND = {
  primary: '#1B3A5F',      // Deep Navy
  secondary: '#F7941D',    // Vibrant Orange
  accent: '#00A3E0',       // Sky Blue
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  gray: '#64748B',
};

const CHART_COLORS = [BRAND.primary, BRAND.secondary, BRAND.accent, BRAND.success];

// ============================================================================
// Stat Card Component
// ============================================================================

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: { direction: 'up' | 'down' | 'stable'; value: string };
  color: 'primary' | 'orange' | 'blue' | 'green' | 'red' | 'gray';
}

function StatCard({ title, value, subtitle, icon: Icon, trend, color }: StatCardProps) {
  const colorMap = {
    primary: { bg: 'bg-gradient-to-br from-[#1B3A5F] to-[#2A4A6F]', text: 'text-white', iconBg: 'bg-white/20' },
    orange: { bg: 'bg-gradient-to-br from-[#F7941D] to-[#FF6B00]', text: 'text-white', iconBg: 'bg-white/20' },
    blue: { bg: 'bg-gradient-to-br from-[#00A3E0] to-[#0077B6]', text: 'text-white', iconBg: 'bg-white/20' },
    green: { bg: 'bg-gradient-to-br from-emerald-500 to-emerald-600', text: 'text-white', iconBg: 'bg-white/20' },
    red: { bg: 'bg-gradient-to-br from-red-500 to-red-600', text: 'text-white', iconBg: 'bg-white/20' },
    gray: { bg: 'bg-white', text: 'text-gray-900', iconBg: 'bg-gray-100' },
  };

  const styles = colorMap[color];

  return (
    <div className={`${styles.bg} rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1`}>
      <div className="flex items-start justify-between">
        <div>
          <p className={`text-sm font-medium ${styles.text} opacity-80`}>{title}</p>
          <p className={`text-3xl font-bold mt-1 ${styles.text}`}>{value}</p>
          {subtitle && (
            <p className={`text-xs mt-1 ${styles.text} opacity-70`}>{subtitle}</p>
          )}
        </div>
        <div className={`${styles.iconBg} p-3 rounded-xl`}>
          <Icon className={`h-6 w-6 ${styles.text}`} />
        </div>
      </div>
      {trend && (
        <div className={`flex items-center gap-1 mt-3 ${styles.text}`}>
          {trend.direction === 'up' ? (
            <TrendingUp className="h-4 w-4" />
          ) : trend.direction === 'down' ? (
            <TrendingDown className="h-4 w-4" />
          ) : (
            <Activity className="h-4 w-4" />
          )}
          <span className="text-sm font-medium">{trend.value}</span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [utilTrend, setUtilTrend] = useState<UtilizationTrend[]>([]);
  const [practiceUtil, setPracticeUtil] = useState<PracticeUtilization[]>([]);
  const [capacityForecast, setCapacityForecast] = useState<CapacityForecast[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Currency state
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState<Currency | null>(null);
  const [exchangeRate, setExchangeRate] = useState<number>(1);
  const [baseCurrency] = useState<string>('INR');

  // Load currencies on mount
  useEffect(() => {
    loadCurrencies();
  }, []);

  async function loadCurrencies() {
    try {
      const res = await api.get<Currency[]>('/currency/currencies');
      setCurrencies(res || []);
      const base = res?.find((c: Currency) => c.isBase) || res?.find((c: Currency) => c.code === 'INR');
      if (base) {
        setSelectedCurrency(base);
      }
    } catch (err) {
      console.error('Failed to load currencies:', err);
      setSelectedCurrency({ id: '', code: 'INR', name: 'Indian Rupee', symbol: '₹', isBase: true });
    }
  }

  // Update exchange rate when currency changes
  const loadExchangeRate = useCallback(async () => {
    if (!selectedCurrency || selectedCurrency.code === baseCurrency) {
      setExchangeRate(1);
      return;
    }
    try {
      const res = await api.post<{ convertedAmount: number; rate: number }>('/currency/exchange-rates/convert', {
        amount: 1,
        fromCurrency: baseCurrency,
        toCurrency: selectedCurrency.code,
      });
      setExchangeRate(res.rate || 1);
    } catch (err) {
      console.error('Failed to get exchange rate:', err);
      setExchangeRate(1);
    }
  }, [selectedCurrency, baseCurrency]);

  useEffect(() => {
    loadExchangeRate();
  }, [loadExchangeRate]);

  // Dynamic currency formatter
  function formatCurrency(value: number): string {
    const converted = value * exchangeRate;
    const symbol = selectedCurrency?.symbol || '₹';
    const code = selectedCurrency?.code || 'INR';
    
    if (code === 'INR') {
      if (converted >= 10000000) return `${symbol}${(converted / 10000000).toFixed(1)}Cr`;
      if (converted >= 100000) return `${symbol}${(converted / 100000).toFixed(1)}L`;
      if (converted >= 1000) return `${symbol}${(converted / 1000).toFixed(1)}K`;
      return `${symbol}${converted.toFixed(0)}`;
    } else {
      if (converted >= 1000000) return `${symbol}${(converted / 1000000).toFixed(1)}M`;
      if (converted >= 1000) return `${symbol}${(converted / 1000).toFixed(1)}K`;
      return `${symbol}${converted.toFixed(0)}`;
    }
  }

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    setLoading(true);
    setError(null);

    try {
      const [metricsRes, trendRes, practiceRes, forecastRes] = await Promise.all([
        api.get<{ data: DashboardMetrics }>('/dashboard/metrics'),
        api.get<{ data: UtilizationTrend[] }>('/dashboard/utilization-trend'),
        api.get<{ data: PracticeUtilization[] }>('/dashboard/practice-utilization'),
        api.get<{ data: CapacityForecast[] }>('/dashboard/capacity-forecast'),
      ]);

      setMetrics(metricsRes.data);
      setUtilTrend(trendRes.data);
      setPracticeUtil(practiceRes.data);
      setCapacityForecast(forecastRes.data);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="text-center">
            <div className="relative w-16 h-16 mx-auto">
              <div className="absolute inset-0 rounded-full border-4 border-gray-200"></div>
              <div className="absolute inset-0 rounded-full border-4 border-t-[#F7941D] animate-spin"></div>
            </div>
            <p className="mt-4 text-gray-500 font-medium">Loading dashboard...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error || !metrics) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)]">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
            <p className="mt-4 text-red-600 font-medium">{error || 'No data available'}</p>
            <button
              onClick={loadDashboardData}
              className="mt-4 px-6 py-2 bg-[#1B3A5F] text-white rounded-lg hover:bg-[#2A4A6F] transition-colors shadow-lg"
            >
              Try Again
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Pie chart data
  const resourceDistribution = [
    { name: 'Allocated', value: Math.max(0, metrics.resources.active - metrics.resources.onBench - metrics.resources.contractors) },
    { name: 'On Bench', value: metrics.resources.onBench },
    { name: 'Contractors', value: metrics.resources.contractors },
    { name: 'In Notice', value: metrics.resources.inNotice },
  ].filter(d => d.value > 0);

  const utilizationBreakdown = [
    { name: 'Billable', value: metrics.utilization.billable },
    { name: 'Non-Billable', value: metrics.utilization.nonBillable },
    { name: 'Available', value: Math.max(0, 100 - metrics.utilization.billable - metrics.utilization.nonBillable) },
  ];

  return (
    <MainLayout>
      <div className="space-y-6 pb-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#1B3A5F]">Dashboard</h1>
            <p className="text-gray-500 mt-1">Real-time overview of your resource management</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Currency Selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Currency:</span>
              <select
                value={selectedCurrency?.code || 'INR'}
                onChange={(e) => {
                  const curr = currencies.find(c => c.code === e.target.value);
                  if (curr) setSelectedCurrency(curr);
                }}
                className="px-3 py-1.5 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#1B3A5F] focus:border-[#1B3A5F]"
              >
                {currencies.length > 0 ? (
                  currencies.map(curr => (
                    <option key={curr.code} value={curr.code}>
                      {curr.symbol} {curr.code}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="INR">₹ INR</option>
                    <option value="USD">$ USD</option>
                    <option value="EUR">€ EUR</option>
                    <option value="GBP">£ GBP</option>
                  </>
                )}
              </select>
              {exchangeRate !== 1 && (
                <span className="text-xs text-gray-400">
                  (1 {baseCurrency} = {exchangeRate.toFixed(4)} {selectedCurrency?.code})
                </span>
              )}
            </div>
            <button
              onClick={loadDashboardData}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-700 shadow-sm hover:shadow transition-all"
            >
              <Activity className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Primary KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard
            title="Utilization Rate"
            value={`${metrics.utilization.current}%`}
            subtitle={`Target: ${metrics.utilization.target}%`}
            icon={Target}
            trend={{
              direction: metrics.utilization.trend,
              value: metrics.utilization.trend === 'up' ? '+2.5% from last month' : '-1.2% from last month',
            }}
            color={metrics.utilization.current >= metrics.utilization.target ? 'green' : 'orange'}
          />
          <StatCard
            title="Total Resources"
            value={metrics.resources.total}
            subtitle={`${metrics.resources.active} active, ${metrics.resources.onBench} on bench`}
            icon={Users}
            color="primary"
          />
          <StatCard
            title="Active Projects"
            value={metrics.projects.active}
            subtitle={`${metrics.projects.pipeline} in pipeline`}
            icon={Briefcase}
            color="blue"
          />
          <StatCard
            title="Bench Cost"
            value={formatCurrency(metrics.financials.benchCostMonthly)}
            subtitle={`${metrics.resources.onBench} resources on bench`}
            icon={DollarSign}
            color={metrics.resources.onBench > 10 ? 'red' : 'gray'}
          />
        </div>

        {/* Secondary Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-white shadow-md hover:shadow-lg transition-shadow border-0">
            <CardContent className="p-5 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-blue-50 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-[#1B3A5F]">{metrics.allocations.active}</p>
              <p className="text-sm text-gray-500 mt-1">Active Allocations</p>
            </CardContent>
          </Card>
          <Card className="bg-white shadow-md hover:shadow-lg transition-shadow border-0">
            <CardContent className="p-5 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-amber-50 flex items-center justify-center">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
              <p className="text-3xl font-bold text-[#1B3A5F]">{metrics.allocations.pending}</p>
              <p className="text-sm text-gray-500 mt-1">Pending Allocations</p>
            </CardContent>
          </Card>
          <Card className="bg-white shadow-md hover:shadow-lg transition-shadow border-0">
            <CardContent className="p-5 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-red-50 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <p className="text-3xl font-bold text-[#1B3A5F]">{metrics.allocations.rolloffsNext30Days}</p>
              <p className="text-sm text-gray-500 mt-1">Roll-offs (30 days)</p>
            </CardContent>
          </Card>
          <Card className="bg-white shadow-md hover:shadow-lg transition-shadow border-0">
            <CardContent className="p-5 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-emerald-50 flex items-center justify-center">
                <Zap className="h-6 w-6 text-emerald-600" />
              </div>
              <p className="text-3xl font-bold text-[#1B3A5F]">
                {metrics.resources.active - metrics.resources.onBench}
              </p>
              <p className="text-sm text-gray-500 mt-1">Deployed Resources</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Utilization Trend */}
          <Card className="shadow-lg border-0 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-[#1B3A5F] to-[#2A5A8F] text-white">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Utilization Trend
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 bg-white">
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={utilTrend}>
                  <defs>
                    <linearGradient id="billableGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={BRAND.primary} stopOpacity={0.8}/>
                      <stop offset="95%" stopColor={BRAND.primary} stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="nonBillableGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={BRAND.gray} stopOpacity={0.8}/>
                      <stop offset="95%" stopColor={BRAND.gray} stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickFormatter={(val) => {
                      const d = new Date(val);
                      return `${d.getDate()}/${d.getMonth() + 1}`;
                    }}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} domain={[0, 100]} />
                  <Tooltip
                    formatter={(value: number) => [`${value}%`, '']}
                    labelFormatter={(label) => new Date(label).toLocaleDateString()}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="billable"
                    stackId="1"
                    stroke={BRAND.primary}
                    fill="url(#billableGrad)"
                    name="Billable"
                  />
                  <Area
                    type="monotone"
                    dataKey="nonBillable"
                    stackId="1"
                    stroke={BRAND.gray}
                    fill="url(#nonBillableGrad)"
                    name="Non-Billable"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Practice Utilization */}
          <Card className="shadow-lg border-0 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-[#F7941D] to-[#FF6B00] text-white">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Utilization by Practice
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 bg-white">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={practiceUtil.slice(0, 6)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis
                    dataKey="practiceName"
                    type="category"
                    width={100}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                  />
                  <Tooltip
                    formatter={(value: number) => [`${value}%`, '']}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Bar
                    dataKey="utilizationRate"
                    fill={BRAND.primary}
                    name="Current"
                    radius={[0, 8, 8, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Resource Distribution */}
          <Card className="shadow-lg border-0">
            <CardHeader className="border-b border-gray-100">
              <CardTitle className="text-lg font-semibold text-[#1B3A5F] flex items-center gap-2">
                <Users className="h-5 w-5 text-[#F7941D]" />
                Resource Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={resourceDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {resourceDistribution.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Utilization Breakdown */}
          <Card className="shadow-lg border-0">
            <CardHeader className="border-b border-gray-100">
              <CardTitle className="text-lg font-semibold text-[#1B3A5F] flex items-center gap-2">
                <Target className="h-5 w-5 text-[#F7941D]" />
                Utilization Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={utilizationBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    <Cell fill={BRAND.success} />
                    <Cell fill={BRAND.gray} />
                    <Cell fill={BRAND.warning} />
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [`${value}%`, '']}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="shadow-lg border-0">
            <CardHeader className="border-b border-gray-100">
              <CardTitle className="text-lg font-semibold text-[#1B3A5F] flex items-center gap-2">
                <Zap className="h-5 w-5 text-[#F7941D]" />
                Quick Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between items-center p-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl">
                <span className="text-sm text-gray-600 font-medium">Active Allocations</span>
                <span className="text-lg font-bold text-[#1B3A5F]">{metrics.allocations.active}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gradient-to-r from-amber-50 to-amber-100 rounded-xl">
                <span className="text-sm text-gray-600 font-medium">Pending Approvals</span>
                <span className="text-lg font-bold text-[#1B3A5F]">{metrics.allocations.pending}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gradient-to-r from-red-50 to-red-100 rounded-xl">
                <span className="text-sm text-gray-600 font-medium">Projects at Risk</span>
                <span className="text-lg font-bold text-[#1B3A5F]">{metrics.projects.atRisk}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-xl">
                <span className="text-sm text-gray-600 font-medium">Revenue at Risk</span>
                <span className="text-lg font-bold text-[#1B3A5F]">
                  {formatCurrency(metrics.financials.potentialRevenueLoss)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Capacity Forecast */}
        <Card className="shadow-lg border-0 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-[#00A3E0] to-[#0077B6] text-white">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Capacity Forecast (Next 8 Weeks)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 bg-white">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={capacityForecast}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="currentAllocated"
                  stroke={BRAND.primary}
                  strokeWidth={3}
                  dot={{ r: 5, fill: BRAND.primary }}
                  name="Allocated %"
                />
                <Line
                  type="monotone"
                  dataKey="rolloffs"
                  stroke={BRAND.danger}
                  strokeWidth={2}
                  dot={{ r: 4, fill: BRAND.danger }}
                  name="Roll-offs"
                />
                <Line
                  type="monotone"
                  dataKey="newStarts"
                  stroke={BRAND.success}
                  strokeWidth={2}
                  dot={{ r: 4, fill: BRAND.success }}
                  name="New Starts"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Action Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Immediate Actions */}
          <Card className="shadow-lg border-0 border-l-4 border-l-red-500">
            <CardHeader className="border-b border-gray-100">
              <CardTitle className="text-lg font-semibold flex items-center gap-2 text-red-600">
                <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
                Immediate Actions Required
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {metrics.allocations.rolloffsNext30Days > 0 && (
                <div className="flex items-center justify-between p-4 bg-red-50 rounded-xl border border-red-100">
                  <div>
                    <p className="font-semibold text-gray-800">Roll-offs in 30 days</p>
                    <p className="text-sm text-gray-600">Review and plan replacements</p>
                  </div>
                  <span className="text-3xl font-bold text-red-600">
                    {metrics.allocations.rolloffsNext30Days}
                  </span>
                </div>
              )}
              {metrics.resources.onBench > 5 && (
                <div className="flex items-center justify-between p-4 bg-amber-50 rounded-xl border border-amber-100">
                  <div>
                    <p className="font-semibold text-gray-800">High Bench Count</p>
                    <p className="text-sm text-gray-600">Optimize resource allocation</p>
                  </div>
                  <span className="text-3xl font-bold text-amber-600">
                    {metrics.resources.onBench}
                  </span>
                </div>
              )}
              {metrics.projects.atRisk > 0 && (
                <div className="flex items-center justify-between p-4 bg-red-50 rounded-xl border border-red-100">
                  <div>
                    <p className="font-semibold text-gray-800">Projects at Risk</p>
                    <p className="text-sm text-gray-600">Immediate attention needed</p>
                  </div>
                  <span className="text-3xl font-bold text-red-600">{metrics.projects.atRisk}</span>
                </div>
              )}
              {metrics.allocations.rolloffsNext30Days === 0 &&
                metrics.resources.onBench <= 5 &&
                metrics.projects.atRisk === 0 && (
                  <div className="p-6 bg-emerald-50 rounded-xl text-center border border-emerald-100">
                    <div className="w-12 h-12 mx-auto mb-3 bg-emerald-100 rounded-full flex items-center justify-center">
                      <Zap className="h-6 w-6 text-emerald-600" />
                    </div>
                    <p className="text-emerald-700 font-semibold">All clear! No immediate actions needed.</p>
                  </div>
                )}
            </CardContent>
          </Card>

          {/* Quick Links */}
          <Card className="shadow-lg border-0 border-l-4 border-l-[#1B3A5F]">
            <CardHeader className="border-b border-gray-100">
              <CardTitle className="text-lg font-semibold text-[#1B3A5F]">Quick Navigation</CardTitle>
            </CardHeader>
            <CardContent className="p-4 grid grid-cols-2 gap-3">
              <a
                href="/resources?status=bench"
                className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl hover:shadow-md transition-all text-center group"
              >
                <p className="text-2xl font-bold text-[#1B3A5F] group-hover:text-[#F7941D] transition-colors">{metrics.resources.onBench}</p>
                <p className="text-sm text-gray-600">Bench Resources</p>
              </a>
              <a
                href="/allocations?rolloff=30"
                className="p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-xl hover:shadow-md transition-all text-center group"
              >
                <p className="text-2xl font-bold text-[#1B3A5F] group-hover:text-[#F7941D] transition-colors">
                  {metrics.allocations.rolloffsNext30Days}
                </p>
                <p className="text-sm text-gray-600">Upcoming Roll-offs</p>
              </a>
              <a
                href="/projects?status=pipeline"
                className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl hover:shadow-md transition-all text-center group"
              >
                <p className="text-2xl font-bold text-[#1B3A5F] group-hover:text-[#F7941D] transition-colors">{metrics.projects.pipeline}</p>
                <p className="text-sm text-gray-600">Pipeline Projects</p>
              </a>
              <a
                href="/resources?status=notice"
                className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl hover:shadow-md transition-all text-center group"
              >
                <p className="text-2xl font-bold text-[#1B3A5F] group-hover:text-[#F7941D] transition-colors">{metrics.resources.inNotice}</p>
                <p className="text-sm text-gray-600">In Notice</p>
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
