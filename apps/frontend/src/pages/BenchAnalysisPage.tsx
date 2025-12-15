import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

interface BenchResource {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  designation: string;
  band: string;
  practice: string | null;
  benchDays: number;
  benchCost: number;
  skills: string[];
  lastProject: string | null;
  availableDate: string;
}

// ============================================================================
// Main Component
// ============================================================================

export default function BenchAnalysisPage() {
  const [benchResources, setBenchResources] = useState<BenchResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'benchDays' | 'benchCost' | 'name'>('benchDays');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    loadBenchData();
  }, []);

  async function loadBenchData() {
    setLoading(true);
    setError(null);

    try {
      const res = await api.get<{ data: BenchResource[] }>('/dashboard/bench-analysis');
      setBenchResources(res.data);
    } catch (err) {
      console.error('Failed to load bench data:', err);
      setError('Failed to load bench analysis');
    } finally {
      setLoading(false);
    }
  }

  // Filter and sort
  const filteredResources = benchResources
    .filter((r) => {
      const search = searchTerm.toLowerCase();
      return (
        r.firstName.toLowerCase().includes(search) ||
        r.lastName.toLowerCase().includes(search) ||
        r.employeeId.toLowerCase().includes(search) ||
        r.designation.toLowerCase().includes(search) ||
        r.skills.some((s) => s.toLowerCase().includes(search))
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

  // Summary stats
  const totalBenchCost = benchResources.reduce((sum, r) => sum + r.benchCost, 0);
  const avgBenchDays = benchResources.length > 0
    ? Math.round(benchResources.reduce((sum, r) => sum + r.benchDays, 0) / benchResources.length)
    : 0;
  const longBenchCount = benchResources.filter((r) => r.benchDays > 30).length;

  function formatCurrency(value: number): string {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
    return `₹${value}`;
  }

  function getBenchDaysBadgeColor(days: number): string {
    if (days <= 7) return 'bg-green-100 text-green-800';
    if (days <= 30) return 'bg-amber-100 text-amber-800';
    return 'bg-red-100 text-red-800';
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={loadBenchData}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bench Analysis</h1>
          <p className="text-gray-500 text-sm">
            Detailed view of resources currently on bench
          </p>
        </div>
        <Button onClick={loadBenchData} variant="outline">
          ↻ Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-amber-50 to-white border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Total on Bench</p>
            <p className="text-3xl font-bold text-amber-700">{benchResources.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-white border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Bench Cost (Month)</p>
            <p className="text-3xl font-bold text-red-700">{formatCurrency(totalBenchCost)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-white border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Avg. Bench Days</p>
            <p className="text-3xl font-bold text-blue-700">{avgBenchDays}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-white border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Long Bench (&gt;30 days)</p>
            <p className="text-3xl font-bold text-purple-700">{longBenchCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
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
              <span className="text-sm text-gray-600">Sort by:</span>
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

      {/* Bench Resources Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Bench Resources ({filteredResources.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredResources.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? 'No matching resources found' : 'No resources on bench 🎉'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-3 text-sm font-medium text-gray-600">Resource</th>
                    <th className="text-left p-3 text-sm font-medium text-gray-600">Designation</th>
                    <th className="text-left p-3 text-sm font-medium text-gray-600">Practice</th>
                    <th className="text-center p-3 text-sm font-medium text-gray-600">Bench Days</th>
                    <th className="text-right p-3 text-sm font-medium text-gray-600">Bench Cost</th>
                    <th className="text-left p-3 text-sm font-medium text-gray-600">Skills</th>
                    <th className="text-left p-3 text-sm font-medium text-gray-600">Last Project</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredResources.map((resource) => (
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
                      <td className="p-3 text-gray-900">{resource.practice || '-'}</td>
                      <td className="p-3 text-center">
                        <span
                          className={`inline-block px-2 py-1 rounded-full text-sm font-medium ${getBenchDaysBadgeColor(resource.benchDays)}`}
                        >
                          {resource.benchDays} days
                        </span>
                      </td>
                      <td className="p-3 text-right font-medium text-gray-900">
                        {formatCurrency(resource.benchCost)}
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {resource.skills.slice(0, 3).map((skill, i) => (
                            <span
                              key={i}
                              className="inline-block px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full"
                            >
                              {skill}
                            </span>
                          ))}
                          {resource.skills.length > 3 && (
                            <span className="text-xs text-gray-500">
                              +{resource.skills.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-gray-600">{resource.lastProject || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bench by Practice Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Bench by Practice</CardTitle>
        </CardHeader>
        <CardContent>
          {(() => {
            const practiceMap = new Map<string, { count: number; cost: number }>();
            for (const r of benchResources) {
              const practice = r.practice || 'Unassigned';
              const existing = practiceMap.get(practice) || { count: 0, cost: 0 };
              existing.count++;
              existing.cost += r.benchCost;
              practiceMap.set(practice, existing);
            }
            const practices = Array.from(practiceMap.entries()).sort(
              (a, b) => b[1].count - a[1].count
            );

            return (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {practices.map(([name, data]) => (
                  <div
                    key={name}
                    className="p-4 border rounded-lg flex justify-between items-center"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{name}</p>
                      <p className="text-sm text-gray-500">{data.count} resources</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-red-600">{formatCurrency(data.cost)}</p>
                      <p className="text-xs text-gray-500">monthly cost</p>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </CardContent>
      </Card>
    </div>
  );
}

