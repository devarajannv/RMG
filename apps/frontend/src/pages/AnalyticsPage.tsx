import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

// ============================================================================
// Types
// ============================================================================

interface ExecutiveMetrics {
  summary: {
    totalResources: number;
    activeResources: number;
    utilizationRate: number;
    benchCount: number;
    benchCostMonthly: number;
    activeProjects: number;
    activeClients: number;
    healthyProjects: number;
    atRiskProjects: number;
  };
  trends: {
    utilizationTrend: Array<{ month: string; rate: number }>;
    benchTrend: Array<{ month: string; count: number; cost: number }>;
    headcountTrend: Array<{ month: string; count: number }>;
  };
  highlights: Array<{
    type: 'success' | 'warning' | 'info';
    title: string;
    value: string;
    change?: string;
    changeType?: 'positive' | 'negative' | 'neutral';
  }>;
}

interface PracticeMetrics {
  practices: Array<{
    id: string;
    name: string;
    code: string;
    headCount: number;
    activeCount: number;
    benchCount: number;
    utilizationRate: number;
    targetUtilization: number;
    variance: number;
    billableHours: number;
    benchCost: number;
    topSkills: string[];
    trend: 'up' | 'down' | 'stable';
  }>;
  summary: {
    totalPractices: number;
    aboveTarget: number;
    atTarget: number;
    belowTarget: number;
    bestPerforming: string;
    needsAttention: string;
  };
}

interface FinancialMetrics {
  summary: {
    monthlyBenchCost: number;
    projectedQuarterlyBenchCost: number;
    potentialRevenueLoss: number;
    avgBillRate: number;
    avgCostRate: number;
    grossMarginPotential: number;
  };
  costBreakdown: {
    byPractice: Array<{ name: string; cost: number; percentage: number }>;
    byBand: Array<{ band: string; cost: number; count: number }>;
    byLocation: Array<{ name: string; cost: number; count: number }>;
  };
  trends: {
    benchCostTrend: Array<{ month: string; cost: number }>;
    utilizationImpact: Array<{ month: string; potentialRevenue: number; actualRevenue: number }>;
  };
  projections: {
    next30Days: { benchCount: number; cost: number };
    next60Days: { benchCount: number; cost: number };
    next90Days: { benchCount: number; cost: number };
  };
}

interface ProjectHealthMetrics {
  summary: {
    total: number;
    active: number;
    pipeline: number;
    completed: number;
    atRisk: number;
    onTrack: number;
    understaffed: number;
    overstaffed: number;
  };
  projects: Array<{
    id: string;
    name: string;
    code: string;
    client: string | null;
    status: string;
    healthStatus: string | null;
    startDate: string;
    endDate: string | null;
    teamSize: number;
    requiredSize: number;
    staffingStatus: 'understaffed' | 'optimal' | 'overstaffed';
    utilizationRate: number;
    daysRemaining: number | null;
    risks: string[];
  }>;
  byStatus: Array<{ status: string; count: number }>;
  byHealth: Array<{ health: string; count: number }>;
}

type TabType = 'executive' | 'practice' | 'financial' | 'projects';

// ============================================================================
// Main Component
// ============================================================================

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('executive');
  const [executive, setExecutive] = useState<ExecutiveMetrics | null>(null);
  const [practice, setPractice] = useState<PracticeMetrics | null>(null);
  const [financial, setFinancial] = useState<FinancialMetrics | null>(null);
  const [projects, setProjects] = useState<ProjectHealthMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  async function loadData() {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'executive':
          if (!executive) {
            const res = await api.get<{ data: ExecutiveMetrics }>('/analytics/executive');
            setExecutive(res.data);
          }
          break;
        case 'practice':
          if (!practice) {
            const res = await api.get<{ data: PracticeMetrics }>('/analytics/practice');
            setPractice(res.data);
          }
          break;
        case 'financial':
          if (!financial) {
            const res = await api.get<{ data: FinancialMetrics }>('/analytics/financial');
            setFinancial(res.data);
          }
          break;
        case 'projects':
          if (!projects) {
            const res = await api.get<{ data: ProjectHealthMetrics }>('/analytics/projects');
            setProjects(res.data);
          }
          break;
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  }

  function formatCurrency(value: number): string {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
    return `₹${value}`;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics & Dashboards</h1>
          <p className="text-gray-500 text-sm">
            Comprehensive insights across organization
          </p>
        </div>
        <Button onClick={() => { setExecutive(null); setPractice(null); setFinancial(null); setProjects(null); loadData(); }} variant="outline">
          ↻ Refresh All
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        {[
          { id: 'executive', label: 'Executive', icon: '👔' },
          { id: 'practice', label: 'Practice', icon: '🏢' },
          { id: 'financial', label: 'Financial', icon: '💰' },
          { id: 'projects', label: 'Projects', icon: '📊' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`px-4 py-2 rounded-t-lg font-medium text-sm transition-colors ${
              activeTab === tab.id
                ? 'bg-primary text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      )}

      {/* Tab Content */}
      {!loading && activeTab === 'executive' && executive && (
        <ExecutiveTab data={executive} formatCurrency={formatCurrency} />
      )}

      {!loading && activeTab === 'practice' && practice && (
        <PracticeTab data={practice} formatCurrency={formatCurrency} />
      )}

      {!loading && activeTab === 'financial' && financial && (
        <FinancialTab data={financial} formatCurrency={formatCurrency} />
      )}

      {!loading && activeTab === 'projects' && projects && (
        <ProjectsTab data={projects} />
      )}
    </div>
  );
}

// ============================================================================
// Executive Tab
// ============================================================================

function ExecutiveTab({ data, formatCurrency }: { data: ExecutiveMetrics; formatCurrency: (v: number) => string }) {
  const COLORS = ['#1B3A5F', '#F7941D', '#22C55E', '#EF4444'];

  return (
    <div className="space-y-6">
      {/* Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {data.highlights.map((highlight, i) => (
          <Card
            key={i}
            className={`shadow-sm ${
              highlight.type === 'success' ? 'bg-gradient-to-br from-green-50 to-white border-l-4 border-l-green-500' :
              highlight.type === 'warning' ? 'bg-gradient-to-br from-amber-50 to-white border-l-4 border-l-amber-500' :
              'bg-gradient-to-br from-blue-50 to-white border-l-4 border-l-blue-500'
            }`}
          >
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">{highlight.title}</p>
              <p className="text-3xl font-bold text-gray-900">{highlight.value}</p>
              {highlight.change && (
                <p className={`text-sm ${
                  highlight.changeType === 'positive' ? 'text-green-600' :
                  highlight.changeType === 'negative' ? 'text-red-600' : 'text-gray-500'
                }`}>
                  {highlight.change}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-4xl font-bold text-primary">{data.summary.totalResources}</p>
            <p className="text-sm text-gray-500">Total Resources</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-4xl font-bold text-green-600">{data.summary.utilizationRate}%</p>
            <p className="text-sm text-gray-500">Utilization Rate</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-4xl font-bold text-amber-600">{data.summary.benchCount}</p>
            <p className="text-sm text-gray-500">On Bench</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-4xl font-bold text-blue-600">{data.summary.activeProjects}</p>
            <p className="text-sm text-gray-500">Active Projects</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-4xl font-bold text-purple-600">{data.summary.activeClients}</p>
            <p className="text-sm text-gray-500">Active Clients</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Utilization Trend */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Utilization Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={data.trends.utilizationTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis domain={[0, 100]} />
                <Tooltip formatter={(v: number) => [`${v.toFixed(1)}%`, 'Utilization']} />
                <Area type="monotone" dataKey="rate" stroke="#1B3A5F" fill="#1B3A5F" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Bench Trend */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Bench Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.trends.benchTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(v: number, name: string) => [name === 'count' ? v : formatCurrency(v), name === 'count' ? 'Count' : 'Cost']} />
                <Legend />
                <Bar dataKey="count" name="Bench Count" fill="#F7941D" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Headcount Trend */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Headcount Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={data.trends.headcountTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#22C55E" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Project Health Pie */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Project Health Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Healthy', value: data.summary.healthyProjects, fill: '#22C55E' },
                    { name: 'At Risk', value: data.summary.atRiskProjects, fill: '#EF4444' },
                    { name: 'Other', value: Math.max(0, data.summary.activeProjects - data.summary.healthyProjects - data.summary.atRiskProjects), fill: '#F59E0B' },
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============================================================================
// Practice Tab
// ============================================================================

function PracticeTab({ data, formatCurrency }: { data: PracticeMetrics; formatCurrency: (v: number) => string }) {
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-primary">{data.summary.totalPractices}</p>
            <p className="text-sm text-gray-500">Total Practices</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm bg-green-50">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-green-600">{data.summary.aboveTarget}</p>
            <p className="text-sm text-gray-500">Above Target</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-blue-600">{data.summary.atTarget}</p>
            <p className="text-sm text-gray-500">At Target</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm bg-red-50">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-red-600">{data.summary.belowTarget}</p>
            <p className="text-sm text-gray-500">Below Target</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm bg-amber-50">
          <CardContent className="p-4 text-center">
            <p className="text-xl font-bold text-amber-700">{data.summary.needsAttention}</p>
            <p className="text-sm text-gray-500">Needs Attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Practice Chart */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Practice Utilization vs Target</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={data.practices.slice(0, 10)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 100]} />
              <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => `${v}%`} />
              <Legend />
              <Bar dataKey="utilizationRate" name="Current" fill="#1B3A5F" />
              <Bar dataKey="targetUtilization" name="Target" fill="#F7941D" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Practice Details Table */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Practice Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3 text-sm font-medium text-gray-600">Practice</th>
                  <th className="text-center p-3 text-sm font-medium text-gray-600">Headcount</th>
                  <th className="text-center p-3 text-sm font-medium text-gray-600">Active</th>
                  <th className="text-center p-3 text-sm font-medium text-gray-600">Bench</th>
                  <th className="text-center p-3 text-sm font-medium text-gray-600">Utilization</th>
                  <th className="text-center p-3 text-sm font-medium text-gray-600">Variance</th>
                  <th className="text-right p-3 text-sm font-medium text-gray-600">Bench Cost</th>
                  <th className="text-center p-3 text-sm font-medium text-gray-600">Trend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.practices.map(practice => (
                  <tr key={practice.id} className="hover:bg-gray-50">
                    <td className="p-3">
                      <p className="font-medium">{practice.name}</p>
                      <p className="text-xs text-gray-500">{practice.code}</p>
                    </td>
                    <td className="p-3 text-center font-bold">{practice.headCount}</td>
                    <td className="p-3 text-center text-green-600">{practice.activeCount}</td>
                    <td className="p-3 text-center text-amber-600">{practice.benchCount}</td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${practice.utilizationRate >= practice.targetUtilization ? 'bg-green-500' : 'bg-amber-500'}`}
                            style={{ width: `${Math.min(100, practice.utilizationRate)}%` }}
                          />
                        </div>
                        <span className="text-sm">{practice.utilizationRate}%</span>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`font-medium ${practice.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {practice.variance >= 0 ? '+' : ''}{practice.variance}%
                      </span>
                    </td>
                    <td className="p-3 text-right text-red-600">{formatCurrency(practice.benchCost)}</td>
                    <td className="p-3 text-center">
                      <span className={`text-xl ${
                        practice.trend === 'up' ? 'text-green-500' :
                        practice.trend === 'down' ? 'text-red-500' : 'text-gray-400'
                      }`}>
                        {practice.trend === 'up' ? '↑' : practice.trend === 'down' ? '↓' : '→'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Financial Tab
// ============================================================================

function FinancialTab({ data, formatCurrency }: { data: FinancialMetrics; formatCurrency: (v: number) => string }) {
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="shadow-sm bg-gradient-to-br from-red-50 to-white border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Monthly Bench Cost</p>
            <p className="text-3xl font-bold text-red-700">{formatCurrency(data.summary.monthlyBenchCost)}</p>
            <p className="text-xs text-gray-500">current month</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm bg-gradient-to-br from-amber-50 to-white border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Quarterly Projection</p>
            <p className="text-3xl font-bold text-amber-700">{formatCurrency(data.summary.projectedQuarterlyBenchCost)}</p>
            <p className="text-xs text-gray-500">next 3 months</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm bg-gradient-to-br from-purple-50 to-white border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Revenue Loss Potential</p>
            <p className="text-3xl font-bold text-purple-700">{formatCurrency(data.summary.potentialRevenueLoss)}</p>
            <p className="text-xs text-gray-500">if bench allocated</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm bg-gradient-to-br from-green-50 to-white border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Gross Margin Potential</p>
            <p className="text-3xl font-bold text-green-700">{formatCurrency(data.summary.grossMarginPotential)}</p>
            <p className="text-xs text-gray-500">opportunity</p>
          </CardContent>
        </Card>
      </div>

      {/* Projections */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Bench Cost Projections</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg text-center">
              <p className="text-sm text-gray-600">30 Days</p>
              <p className="text-2xl font-bold text-blue-700">{data.projections.next30Days.benchCount}</p>
              <p className="text-sm text-gray-500">bench • {formatCurrency(data.projections.next30Days.cost)}</p>
            </div>
            <div className="p-4 bg-amber-50 rounded-lg text-center">
              <p className="text-sm text-gray-600">60 Days</p>
              <p className="text-2xl font-bold text-amber-700">{data.projections.next60Days.benchCount}</p>
              <p className="text-sm text-gray-500">bench • {formatCurrency(data.projections.next60Days.cost)}</p>
            </div>
            <div className="p-4 bg-red-50 rounded-lg text-center">
              <p className="text-sm text-gray-600">90 Days</p>
              <p className="text-2xl font-bold text-red-700">{data.projections.next90Days.benchCount}</p>
              <p className="text-sm text-gray-500">bench • {formatCurrency(data.projections.next90Days.cost)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost by Practice */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Bench Cost by Practice</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={data.costBreakdown.byPractice.slice(0, 6)}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="cost"
                  nameKey="name"
                  label={({ name, percentage }) => `${name}: ${percentage}%`}
                >
                  {data.costBreakdown.byPractice.slice(0, 6).map((_, i) => (
                    <Cell key={i} fill={['#1B3A5F', '#F7941D', '#22C55E', '#EF4444', '#8B5CF6', '#06B6D4'][i % 6]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Cost Trend */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Bench Cost Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={data.trends.benchCostTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Area type="monotone" dataKey="cost" stroke="#EF4444" fill="#EF4444" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Cost by Band */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Bench Cost by Band</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {data.costBreakdown.byBand.map(band => (
              <div key={band.band} className="p-4 bg-gray-50 rounded-lg text-center">
                <p className="font-bold text-primary text-lg">{band.band}</p>
                <p className="text-2xl font-bold text-gray-900">{band.count}</p>
                <p className="text-sm text-red-600">{formatCurrency(band.cost)}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Projects Tab
// ============================================================================

function ProjectsTab({ data }: { data: ProjectHealthMetrics }) {
  const [filter, setFilter] = useState<'all' | 'at-risk' | 'understaffed'>('all');

  const filteredProjects = data.projects.filter(p => {
    if (filter === 'at-risk') return p.healthStatus === 'RED' || p.risks.length > 0;
    if (filter === 'understaffed') return p.staffingStatus === 'understaffed';
    return true;
  });

  const HEALTH_COLORS: Record<string, string> = {
    GREEN: '#22C55E',
    AMBER: '#F59E0B',
    RED: '#EF4444',
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-primary">{data.summary.total}</p>
            <p className="text-sm text-gray-500">Total Projects</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm bg-green-50">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-green-600">{data.summary.onTrack}</p>
            <p className="text-sm text-gray-500">On Track</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm bg-red-50">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-red-600">{data.summary.atRisk}</p>
            <p className="text-sm text-gray-500">At Risk</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm bg-amber-50">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-amber-600">{data.summary.understaffed}</p>
            <p className="text-sm text-gray-500">Understaffed</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Projects by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.byStatus}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#1B3A5F" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Projects by Health</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={data.byHealth}
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  dataKey="count"
                  nameKey="health"
                  label={({ health, count }) => `${health}: ${count}`}
                >
                  {data.byHealth.map((entry) => (
                    <Cell key={entry.health} fill={HEALTH_COLORS[entry.health] ?? '#9CA3AF'} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {[
          { id: 'all', label: 'All Projects' },
          { id: 'at-risk', label: 'At Risk' },
          { id: 'understaffed', label: 'Understaffed' },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id as typeof filter)}
            className={`px-4 py-2 rounded-lg text-sm ${
              filter === f.id
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Projects Table */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Project Details ({filteredProjects.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3 text-sm font-medium text-gray-600">Project</th>
                  <th className="text-left p-3 text-sm font-medium text-gray-600">Client</th>
                  <th className="text-center p-3 text-sm font-medium text-gray-600">Status</th>
                  <th className="text-center p-3 text-sm font-medium text-gray-600">Health</th>
                  <th className="text-center p-3 text-sm font-medium text-gray-600">Team</th>
                  <th className="text-center p-3 text-sm font-medium text-gray-600">Staffing</th>
                  <th className="text-center p-3 text-sm font-medium text-gray-600">Days Left</th>
                  <th className="text-left p-3 text-sm font-medium text-gray-600">Risks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredProjects.slice(0, 20).map(project => (
                  <tr key={project.id} className="hover:bg-gray-50">
                    <td className="p-3">
                      <p className="font-medium">{project.name}</p>
                      <p className="text-xs text-gray-500">{project.code}</p>
                    </td>
                    <td className="p-3 text-gray-600">{project.client ?? '-'}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs ${
                        project.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                        project.status === 'PIPELINE' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {project.status}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      {project.healthStatus && (
                        <span className={`inline-block w-3 h-3 rounded-full`} style={{ backgroundColor: HEALTH_COLORS[project.healthStatus] ?? '#9CA3AF' }} />
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <span className="font-medium">{project.teamSize}</span>
                      <span className="text-gray-400">/{project.requiredSize}</span>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs ${
                        project.staffingStatus === 'understaffed' ? 'bg-red-100 text-red-800' :
                        project.staffingStatus === 'overstaffed' ? 'bg-amber-100 text-amber-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {project.staffingStatus}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      {project.daysRemaining !== null ? (
                        <span className={`font-medium ${
                          project.daysRemaining < 0 ? 'text-red-600' :
                          project.daysRemaining < 30 ? 'text-amber-600' : 'text-gray-600'
                        }`}>
                          {project.daysRemaining < 0 ? 'Overdue' : `${project.daysRemaining}d`}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {project.risks.map((risk, i) => (
                          <span key={i} className="px-2 py-0.5 bg-red-100 text-red-800 text-xs rounded-full">
                            {risk}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

