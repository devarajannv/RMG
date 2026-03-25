import { useEffect, useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useCurrency } from '@/contexts/CurrencyContext';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from 'recharts';

// ============================================================================
// Types
// ============================================================================

interface BenchResource {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  designation: string;
  band: string;
  practice: { id: string; name: string } | null;
  location: { id: string; name: string } | null;
  benchDays: number;
  benchSince: string | null;
  benchCost: number;
  costPerHour: number;
  skills: Array<{ id: string; name: string; category: string | null; proficiency: string }>;
  lastProject: { id: string; name: string; client: string | null } | null;
  lastAllocationEnd: string | null;
  agingCategory: 'fresh' | 'moderate' | 'critical' | 'severe';
}

interface BenchSummary {
  totalOnBench: number;
  totalBenchCost: number;
  avgBenchDays: number;
  benchByAging: {
    fresh: number;
    moderate: number;
    critical: number;
    severe: number;
  };
  benchByPractice: Array<{
    practiceId: string;
    practiceName: string;
    count: number;
    cost: number;
    avgDays: number;
  }>;
  benchByBand: Array<{ band: string; count: number; cost: number }>;
  upcomingRolloffs: number;
  willBeOnBenchIn30Days: number;
}

interface UpcomingRolloff {
  id: string;
  resourceId: string;
  resourceName: string;
  resourceEmail: string;
  employeeId: string;
  band: string;
  designation: string;
  practice: string | null;
  project: { id: string; name: string; client: string | null };
  allocationPercentage: number;
  endDate: string;
  daysUntilRolloff: number;
  hasNextAllocation: boolean;
  nextAllocation: { project: string; startDate: string; percentage: number } | null;
  skills: string[];
}

interface BenchForecast {
  date: string;
  projectedBenchCount: number;
  projectedBenchCost: number;
  rolloffsCount: number;
  newAllocationsCount: number;
  cumulativeChange: number;
}

interface MatchingProject {
  project: { id: string; name: string; code: string; client: string | null };
  matchScore: number;
  matchedSkills: string[];
  requiredSkills: string[];
  startDate: string;
  endDate: string | null;
}

type TabType = 'overview' | 'resources' | 'rolloffs' | 'forecast' | 'alerts';

// ============================================================================
// Main Component
// ============================================================================

export default function BenchAnalysisPage() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [summary, setSummary] = useState<BenchSummary | null>(null);
  const [benchResources, setBenchResources] = useState<BenchResource[]>([]);
  const [rolloffs, setRolloffs] = useState<UpcomingRolloff[]>([]);
  const [alerts, setAlerts] = useState<UpcomingRolloff[]>([]);
  const [forecast, setForecast] = useState<BenchForecast[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [agingFilter, setAgingFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'benchDays' | 'benchCost' | 'name'>('benchDays');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Quick Allocate Modal
  const [showQuickAllocate, setShowQuickAllocate] = useState(false);
  const [selectedResource, setSelectedResource] = useState<BenchResource | null>(null);
  const [matchingProjects, setMatchingProjects] = useState<MatchingProject[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);

  // Rolloff days filter
  const [rolloffDays, setRolloffDays] = useState(30);
  
  // Get currency formatting from context
  const { formatCompact } = useCurrency();

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [summaryRes, resourcesRes, rolloffsRes, alertsRes, forecastRes] = await Promise.all([
        api.get<{ data: BenchSummary }>('/bench/summary'),
        api.get<{ data: BenchResource[] }>(`/bench/resources?limit=100`),
        api.get<{ data: UpcomingRolloff[] }>(`/bench/rolloffs?days=${rolloffDays}&includeWithNextAllocation=true`),
        api.get<{ data: UpcomingRolloff[] }>(`/bench/alerts?days=30`),
        api.get<{ data: BenchForecast[] }>(`/bench/forecast?days=90&granularity=weekly`),
      ]);

      setSummary(summaryRes.data);
      setBenchResources(resourcesRes.data);
      setRolloffs(rolloffsRes.data);
      setAlerts(alertsRes.data);
      setForecast(forecastRes.data);
    } catch (err) {
      console.error('Failed to load bench data:', err);
      setError('Failed to load bench analysis');
    } finally {
      setLoading(false);
    }
  }, [rolloffDays]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function loadMatchingProjects(resourceId: string) {
    setLoadingMatches(true);
    try {
      const res = await api.get<{ data: MatchingProject[] }>(`/bench/matching-projects/${resourceId}`);
      setMatchingProjects(res.data);
    } catch (err) {
      console.error('Failed to load matching projects:', err);
    } finally {
      setLoadingMatches(false);
    }
  }

  function openQuickAllocate(resource: BenchResource) {
    setSelectedResource(resource);
    setShowQuickAllocate(true);
    loadMatchingProjects(resource.id);
  }

  // Filter and sort resources
  const filteredResources = benchResources
    .filter((r) => {
      if (agingFilter !== 'all' && r.agingCategory !== agingFilter) return false;
      if (!searchTerm) return true;
      const search = searchTerm.toLowerCase();
      return (
        r.firstName.toLowerCase().includes(search) ||
        r.lastName.toLowerCase().includes(search) ||
        r.employeeId.toLowerCase().includes(search) ||
        r.designation.toLowerCase().includes(search) ||
        r.skills.some((s) => s.name.toLowerCase().includes(search))
      );
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'benchDays':
          comparison = a.benchDays - b.benchDays;
          break;
        case 'benchCost':
          comparison = a.benchCost - b.benchCost;
          break;
        case 'name':
          comparison = `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  // Use formatCompact from currency context as formatCurrency
  const formatCurrency = formatCompact;

  function getAgingColor(category: string): string {
    switch (category) {
      case 'fresh': return 'bg-green-100 text-green-800 border-green-300';
      case 'moderate': return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'critical': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'severe': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800';
    }
  }


  const AGING_COLORS = {
    fresh: '#22C55E',
    moderate: '#F59E0B',
    critical: '#F97316',
    severe: '#EF4444',
  };

  if (loading) {
    return (
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
    );
  }

  if (error) {
    return (
        <div className="flex flex-col items-center justify-center h-full">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={loadData}>Retry</Button>
        </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bench Management</h1>
          <p className="text-gray-500 text-sm">
            Comprehensive view of bench resources, forecasts, and alerts
          </p>
        </div>
        <Button onClick={loadData} variant="outline">
          ↻ Refresh
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        {[
          { id: 'overview', label: 'Overview', icon: '📊' },
          { id: 'resources', label: `Bench (${summary?.totalOnBench || 0})`, icon: '👥' },
          { id: 'rolloffs', label: `Rolloffs (${rolloffs.length})`, icon: '📅' },
          { id: 'alerts', label: `Alerts (${alerts.length})`, icon: '⚠️' },
          { id: 'forecast', label: 'Forecast', icon: '📈' },
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

      {/* Tab Content */}
      {activeTab === 'overview' && summary && (
        <OverviewTab
          summary={summary}
          formatCurrency={formatCurrency}
          AGING_COLORS={AGING_COLORS}
        />
      )}

      {activeTab === 'resources' && (
        <ResourcesTab
          resources={filteredResources}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          agingFilter={agingFilter}
          setAgingFilter={setAgingFilter}
          sortBy={sortBy}
          setSortBy={setSortBy}
          sortOrder={sortOrder}
          setSortOrder={setSortOrder}
          formatCurrency={formatCurrency}
          getAgingColor={getAgingColor}
          onQuickAllocate={openQuickAllocate}
        />
      )}

      {activeTab === 'rolloffs' && (
        <RolloffsTab
          rolloffs={rolloffs}
          rolloffDays={rolloffDays}
          setRolloffDays={setRolloffDays}
          loadData={loadData}
        />
      )}

      {activeTab === 'alerts' && (
        <AlertsTab alerts={alerts} onQuickAllocate={(r) => {
          // Find full resource data
          const resource = benchResources.find(br => br.id === r.resourceId);
          if (resource) openQuickAllocate(resource);
        }} />
      )}

      {activeTab === 'forecast' && (
        <ForecastTab forecast={forecast} formatCurrency={formatCurrency} />
      )}

      {/* Quick Allocate Modal */}
      {showQuickAllocate && selectedResource && (
        <QuickAllocateModal
          resource={selectedResource}
          matchingProjects={matchingProjects}
          loadingMatches={loadingMatches}
          onClose={() => {
            setShowQuickAllocate(false);
            setSelectedResource(null);
            setMatchingProjects([]);
          }}
          onAllocate={async (projectId, data) => {
            try {
              await api.post('/bench/quick-allocate', {
                resourceId: selectedResource.id,
                projectId,
                ...data,
              });
              setShowQuickAllocate(false);
              setSelectedResource(null);
              loadData();
            } catch (err) {
              console.error('Failed to allocate:', err);
            }
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// Overview Tab
// ============================================================================

function OverviewTab({
  summary,
  formatCurrency,
  AGING_COLORS,
}: {
  summary: BenchSummary;
  formatCurrency: (v: number) => string;
  AGING_COLORS: Record<string, string>;
}) {
  const agingData = [
    { name: 'Fresh (0-7d)', value: summary.benchByAging.fresh, color: AGING_COLORS.fresh },
    { name: 'Moderate (8-30d)', value: summary.benchByAging.moderate, color: AGING_COLORS.moderate },
    { name: 'Critical (31-60d)', value: summary.benchByAging.critical, color: AGING_COLORS.critical },
    { name: 'Severe (60+d)', value: summary.benchByAging.severe, color: AGING_COLORS.severe },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-amber-50 to-white border-l-4 border-l-amber-500 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-gray-600 font-medium">Total on Bench</p>
            <p className="text-3xl font-bold text-amber-700">{summary.totalOnBench}</p>
            <p className="text-xs text-gray-500 mt-1">resources available</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-white border-l-4 border-l-red-500 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-gray-600 font-medium">Monthly Bench Cost</p>
            <p className="text-3xl font-bold text-red-700">{formatCurrency(summary.totalBenchCost)}</p>
            <p className="text-xs text-gray-500 mt-1">potential savings</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-white border-l-4 border-l-blue-500 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-gray-600 font-medium">Avg. Bench Days</p>
            <p className="text-3xl font-bold text-blue-700">{summary.avgBenchDays}</p>
            <p className="text-xs text-gray-500 mt-1">days on average</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-white border-l-4 border-l-purple-500 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-gray-600 font-medium">Upcoming Rolloffs</p>
            <p className="text-3xl font-bold text-purple-700">{summary.upcomingRolloffs}</p>
            <p className="text-xs text-gray-500 mt-1">in next 30 days</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-50 to-white border-l-4 border-l-orange-500 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-gray-600 font-medium">Will Be on Bench</p>
            <p className="text-3xl font-bold text-orange-700">{summary.willBeOnBenchIn30Days}</p>
            <p className="text-xs text-gray-500 mt-1">no next project</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Aging Distribution Pie Chart */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Bench Aging Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {agingData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={agingData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {agingData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[280px] text-gray-500">
                No bench data to display
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bench by Practice Bar Chart */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Bench by Practice</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={summary.benchByPractice.slice(0, 8)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis 
                  dataKey="practiceName" 
                  type="category" 
                  width={120}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    name === 'count' ? value : formatCurrency(value),
                    name === 'count' ? 'Resources' : 'Cost'
                  ]}
                />
                <Bar dataKey="count" fill="#1B3A5F" name="Resources" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bench by Band */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Bench by Band</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {summary.benchByBand.map((band) => (
              <div
                key={band.band}
                className="p-4 bg-gray-50 rounded-lg border border-gray-100"
              >
                <p className="font-bold text-lg text-primary">{band.band}</p>
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
// Resources Tab
// ============================================================================

function ResourcesTab({
  resources,
  searchTerm,
  setSearchTerm,
  agingFilter,
  setAgingFilter,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  formatCurrency,
  getAgingColor,
  onQuickAllocate,
}: {
  resources: BenchResource[];
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  agingFilter: string;
  setAgingFilter: (v: string) => void;
  sortBy: 'benchDays' | 'benchCost' | 'name';
  setSortBy: (v: 'benchDays' | 'benchCost' | 'name') => void;
  sortOrder: 'asc' | 'desc';
  setSortOrder: (v: 'asc' | 'desc') => void;
  formatCurrency: (v: number) => string;
  getAgingColor: (c: string) => string;
  onQuickAllocate: (r: BenchResource) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search by name, ID, designation, or skills..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Aging:</span>
              <select
                className="border rounded-lg px-3 py-2 text-sm"
                value={agingFilter}
                onChange={(e) => setAgingFilter(e.target.value)}
              >
                <option value="all">All</option>
                <option value="fresh">Fresh (0-7d)</option>
                <option value="moderate">Moderate (8-30d)</option>
                <option value="critical">Critical (31-60d)</option>
                <option value="severe">Severe (60+d)</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Sort:</span>
              <select
                className="border rounded-lg px-3 py-2 text-sm"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              >
                <option value="benchDays">Bench Days</option>
                <option value="benchCost">Bench Cost</option>
                <option value="name">Name</option>
              </select>
              <button
                className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-50"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resources Table */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">
            Bench Resources ({resources.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {resources.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm || agingFilter !== 'all'
                ? 'No matching resources found'
                : 'No resources on bench 🎉'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-3 text-sm font-medium text-gray-600">Resource</th>
                    <th className="text-left p-3 text-sm font-medium text-gray-600">Role / Band</th>
                    <th className="text-left p-3 text-sm font-medium text-gray-600">Practice</th>
                    <th className="text-center p-3 text-sm font-medium text-gray-600">Aging</th>
                    <th className="text-right p-3 text-sm font-medium text-gray-600">Cost/Month</th>
                    <th className="text-left p-3 text-sm font-medium text-gray-600">Skills</th>
                    <th className="text-left p-3 text-sm font-medium text-gray-600">Last Project</th>
                    <th className="text-center p-3 text-sm font-medium text-gray-600">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {resources.map((resource) => (
                    <tr key={resource.id} className="hover:bg-gray-50">
                      <td className="p-3">
                        <div>
                          <p className="font-medium text-gray-900">
                            {resource.firstName} {resource.lastName}
                          </p>
                          <p className="text-sm text-gray-500">{resource.employeeId}</p>
                        </div>
                      </td>
                      <td className="p-3">
                        <div>
                          <p className="text-gray-900">{resource.designation}</p>
                          <p className="text-sm text-gray-500">{resource.band}</p>
                        </div>
                      </td>
                      <td className="p-3 text-gray-900">
                        {resource.practice?.name || '-'}
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`inline-block px-2 py-1 rounded-full text-sm font-medium border ${getAgingColor(resource.agingCategory)}`}
                        >
                          {resource.benchDays} days
                        </span>
                      </td>
                      <td className="p-3 text-right font-medium text-red-600">
                        {formatCurrency(resource.benchCost)}
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {resource.skills.slice(0, 3).map((skill) => (
                            <span
                              key={skill.id}
                              className="inline-block px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full"
                            >
                              {skill.name}
                            </span>
                          ))}
                          {resource.skills.length > 3 && (
                            <span className="text-xs text-gray-500">
                              +{resource.skills.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-gray-600 text-sm">
                        {resource.lastProject ? (
                          <div>
                            <p>{resource.lastProject.name}</p>
                            {resource.lastProject.client && (
                              <p className="text-gray-400 text-xs">{resource.lastProject.client}</p>
                            )}
                          </div>
                        ) : '-'}
                      </td>
                      <td className="p-3 text-center">
                        <Button
                          size="sm"
                          onClick={() => onQuickAllocate(resource)}
                          className="bg-accent hover:bg-accent/90 text-white"
                        >
                          Allocate
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Rolloffs Tab
// ============================================================================

function RolloffsTab({
  rolloffs,
  rolloffDays,
  setRolloffDays,
  loadData,
}: {
  rolloffs: UpcomingRolloff[];
  rolloffDays: number;
  setRolloffDays: (v: number) => void;
  loadData: () => void;
}) {
  return (
    <div className="space-y-4">
      {/* Filter */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">Show rolloffs in next:</span>
            <select
              className="border rounded-lg px-3 py-2 text-sm"
              value={rolloffDays}
              onChange={(e) => {
                setRolloffDays(parseInt(e.target.value));
                setTimeout(loadData, 100);
              }}
            >
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
              <option value={90}>90 days</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Rolloffs Calendar View */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">
            Upcoming Rolloffs ({rolloffs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rolloffs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No rolloffs in the selected period
            </div>
          ) : (
            <div className="space-y-4">
              {rolloffs.map((rolloff) => (
                <div
                  key={rolloff.id}
                  className={`p-4 rounded-lg border ${
                    rolloff.hasNextAllocation
                      ? 'bg-green-50 border-green-200'
                      : rolloff.daysUntilRolloff <= 7
                      ? 'bg-red-50 border-red-200'
                      : 'bg-amber-50 border-amber-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <p className="font-bold text-gray-900">{rolloff.resourceName}</p>
                        <span className="text-sm text-gray-500">({rolloff.employeeId})</span>
                        <span className="px-2 py-0.5 bg-gray-200 text-gray-700 text-xs rounded">
                          {rolloff.band}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {rolloff.designation} • {rolloff.practice || 'No Practice'}
                      </p>
                      <div className="mt-2 flex items-center gap-4">
                        <div>
                          <span className="text-xs text-gray-500">Current Project:</span>
                          <p className="text-sm font-medium">{rolloff.project.name}</p>
                          {rolloff.project.client && (
                            <p className="text-xs text-gray-500">{rolloff.project.client}</p>
                          )}
                        </div>
                        <div>
                          <span className="text-xs text-gray-500">Allocation:</span>
                          <p className="text-sm font-medium">{rolloff.allocationPercentage}%</p>
                        </div>
                      </div>
                      {rolloff.skills.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {rolloff.skills.slice(0, 5).map((skill, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">End Date</p>
                      <p className="font-bold text-gray-900">
                        {new Date(rolloff.endDate).toLocaleDateString()}
                      </p>
                      <p
                        className={`text-sm font-medium ${
                          rolloff.daysUntilRolloff <= 7 ? 'text-red-600' : 'text-amber-600'
                        }`}
                      >
                        in {rolloff.daysUntilRolloff} days
                      </p>
                      {rolloff.hasNextAllocation && rolloff.nextAllocation && (
                        <div className="mt-2 p-2 bg-green-100 rounded text-left">
                          <p className="text-xs text-green-700 font-medium">✓ Next allocation:</p>
                          <p className="text-xs text-green-800">{rolloff.nextAllocation.project}</p>
                        </div>
                      )}
                      {!rolloff.hasNextAllocation && (
                        <p className="mt-2 text-xs text-red-600 font-medium">
                          ⚠ No next allocation
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Alerts Tab
// ============================================================================

function AlertsTab({
  alerts,
  onQuickAllocate,
}: {
  alerts: UpcomingRolloff[];
  onQuickAllocate: (r: UpcomingRolloff) => void;
}) {
  return (
    <div className="space-y-4">
      <Card className="bg-amber-50 border-amber-200 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-bold text-amber-800">
                {alerts.length} resource{alerts.length !== 1 ? 's' : ''} will be on bench soon
              </p>
              <p className="text-sm text-amber-700">
                These resources are rolling off projects with no next allocation scheduled
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {alerts.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="p-8 text-center text-gray-500">
            🎉 No proactive alerts. All resources rolling off have next allocations.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {alerts.map((alert) => (
            <Card key={alert.id} className="shadow-sm border-l-4 border-l-red-500">
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-gray-900">{alert.resourceName}</p>
                    <p className="text-sm text-gray-500">
                      {alert.designation} • {alert.band}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      Rolling off: <strong>{alert.project.name}</strong>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-red-600 font-bold">
                      {alert.daysUntilRolloff} days
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(alert.endDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {alert.skills.slice(0, 4).map((skill, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
                <div className="mt-3">
                  <Button
                    size="sm"
                    className="w-full bg-accent hover:bg-accent/90"
                    onClick={() => onQuickAllocate(alert)}
                  >
                    Find Project
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Forecast Tab
// ============================================================================

function ForecastTab({
  forecast,
  formatCurrency,
}: {
  forecast: BenchForecast[];
  formatCurrency: (v: number) => string;
}) {
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">30-Day Projection</p>
            <p className="text-2xl font-bold text-gray-900">
              {forecast[4]?.projectedBenchCount ?? '-'}
            </p>
            <p className="text-sm text-gray-500">resources on bench</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">60-Day Projection</p>
            <p className="text-2xl font-bold text-gray-900">
              {forecast[8]?.projectedBenchCount ?? '-'}
            </p>
            <p className="text-sm text-gray-500">resources on bench</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">90-Day Projection</p>
            <p className="text-2xl font-bold text-gray-900">
              {forecast[12]?.projectedBenchCount ?? '-'}
            </p>
            <p className="text-sm text-gray-500">resources on bench</p>
          </CardContent>
        </Card>
      </div>

      {/* Forecast Chart */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Bench Forecast (90 days)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={forecast}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(v) => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
              <YAxis />
              <Tooltip
                labelFormatter={(v) => new Date(v).toLocaleDateString()}
                formatter={(value: number, name: string) => [
                  name === 'projectedBenchCost' ? formatCurrency(value) : value,
                  name === 'projectedBenchCount' ? 'Bench Count' :
                  name === 'rolloffsCount' ? 'Rolloffs' :
                  name === 'newAllocationsCount' ? 'New Allocations' : name
                ]}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="projectedBenchCount"
                name="Bench Count"
                stroke="#1B3A5F"
                fill="#1B3A5F"
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Weekly Breakdown Table */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Weekly Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3 text-sm font-medium text-gray-600">Week</th>
                  <th className="text-center p-3 text-sm font-medium text-gray-600">Rolloffs</th>
                  <th className="text-center p-3 text-sm font-medium text-gray-600">New Allocations</th>
                  <th className="text-center p-3 text-sm font-medium text-gray-600">Net Change</th>
                  <th className="text-center p-3 text-sm font-medium text-gray-600">Projected Bench</th>
                  <th className="text-right p-3 text-sm font-medium text-gray-600">Projected Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {forecast.map((week, i) => (
                  <tr key={week.date} className="hover:bg-gray-50">
                    <td className="p-3 font-medium">
                      Week {i + 1}
                      <span className="text-gray-500 text-sm ml-2">
                        ({new Date(week.date).toLocaleDateString()})
                      </span>
                    </td>
                    <td className="p-3 text-center text-amber-600">
                      +{week.rolloffsCount}
                    </td>
                    <td className="p-3 text-center text-green-600">
                      -{week.newAllocationsCount}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`font-medium ${
                          week.rolloffsCount - week.newAllocationsCount > 0
                            ? 'text-red-600'
                            : week.rolloffsCount - week.newAllocationsCount < 0
                            ? 'text-green-600'
                            : 'text-gray-600'
                        }`}
                      >
                        {week.rolloffsCount - week.newAllocationsCount > 0 ? '+' : ''}
                        {week.rolloffsCount - week.newAllocationsCount}
                      </span>
                    </td>
                    <td className="p-3 text-center font-bold">{week.projectedBenchCount}</td>
                    <td className="p-3 text-right text-red-600">
                      {formatCurrency(week.projectedBenchCost)}
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
// Quick Allocate Modal
// ============================================================================

function QuickAllocateModal({
  resource,
  matchingProjects,
  loadingMatches,
  onClose,
  onAllocate,
}: {
  resource: BenchResource;
  matchingProjects: MatchingProject[];
  loadingMatches: boolean;
  onClose: () => void;
  onAllocate: (projectId: string, data: { role: string; percentage: number; startDate: Date; endDate: Date }) => void;
}) {
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [role, setRole] = useState(resource.designation);
  const [percentage, setPercentage] = useState(100);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [allocating, setAllocating] = useState(false);

  async function handleAllocate() {
    if (!selectedProject) return;
    setAllocating(true);
    try {
      await onAllocate(selectedProject, {
        role,
        percentage,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      });
    } finally {
      setAllocating(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b bg-primary text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Quick Allocate</h2>
              <p className="text-sm opacity-80">
                {resource.firstName} {resource.lastName} • {resource.designation}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Resource Skills */}
          <div className="mb-6">
            <p className="text-sm font-medium text-gray-600 mb-2">Resource Skills:</p>
            <div className="flex flex-wrap gap-1">
              {resource.skills.map((skill) => (
                <span
                  key={skill.id}
                  className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                >
                  {skill.name}
                </span>
              ))}
            </div>
          </div>

          {/* Matching Projects */}
          <div className="mb-6">
            <p className="text-sm font-medium text-gray-600 mb-2">Matching Projects:</p>
            {loadingMatches ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : matchingProjects.length === 0 ? (
              <p className="text-gray-500 text-sm">No matching projects found</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {matchingProjects.map((match) => (
                  <div
                    key={match.project.id}
                    onClick={() => setSelectedProject(match.project.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedProject === match.project.id
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{match.project.name}</p>
                        {match.project.client && (
                          <p className="text-sm text-gray-500">{match.project.client}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <span
                          className={`inline-block px-2 py-1 rounded text-sm font-medium ${
                            match.matchScore >= 70
                              ? 'bg-green-100 text-green-800'
                              : match.matchScore >= 40
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {match.matchScore}% match
                        </span>
                      </div>
                    </div>
                    {match.matchedSkills.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {match.matchedSkills.slice(0, 4).map((skill, i) => (
                          <span
                            key={i}
                            className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Allocation Details */}
          {selectedProject && (
            <div className="space-y-4 border-t pt-4">
              <p className="text-sm font-medium text-gray-600">Allocation Details:</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Role</label>
                  <Input
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="e.g., Developer"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Percentage</label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={percentage}
                    onChange={(e) => setPercentage(parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Start Date</label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">End Date</label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleAllocate}
            disabled={!selectedProject || allocating}
            className="bg-accent hover:bg-accent/90"
          >
            {allocating ? 'Allocating...' : 'Allocate Resource'}
          </Button>
        </div>
      </div>
    </div>
  );
}
