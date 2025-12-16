import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import MainLayout from '@/components/layout/MainLayout';

// ============================================================================
// Types
// ============================================================================

interface ReportDefinition {
  id: string;
  name: string;
  description: string;
  category: 'utilization' | 'resource' | 'financial' | 'project';
  icon: string;
}

// ============================================================================
// Report Definitions
// ============================================================================

const REPORTS: ReportDefinition[] = [
  {
    id: 'utilization-summary',
    name: 'Utilization Summary',
    description: 'Overall utilization metrics with trend analysis',
    category: 'utilization',
    icon: '📊',
  },
  {
    id: 'practice-utilization',
    name: 'Practice Utilization',
    description: 'Utilization breakdown by practice/department',
    category: 'utilization',
    icon: '📈',
  },
  {
    id: 'billable-vs-nonbillable',
    name: 'Billable vs Non-Billable',
    description: 'Analysis of billable and non-billable allocations',
    category: 'utilization',
    icon: '💹',
  },
  {
    id: 'bench-report',
    name: 'Bench Report',
    description: 'Resources on bench with aging analysis',
    category: 'resource',
    icon: '🪑',
  },
  {
    id: 'skill-matrix',
    name: 'Skill Matrix',
    description: 'Resource skills inventory and gap analysis',
    category: 'resource',
    icon: '🎯',
  },
  {
    id: 'capacity-forecast',
    name: 'Capacity Forecast',
    description: 'Predicted resource availability for upcoming weeks',
    category: 'resource',
    icon: '🔮',
  },
  {
    id: 'roll-off-report',
    name: 'Roll-off Report',
    description: 'Resources rolling off projects in the next period',
    category: 'resource',
    icon: '📅',
  },
  {
    id: 'resource-allocation',
    name: 'Resource Allocation',
    description: 'Current allocation status of all resources',
    category: 'resource',
    icon: '👥',
  },
  {
    id: 'bench-cost',
    name: 'Bench Cost Analysis',
    description: 'Financial impact of bench resources',
    category: 'financial',
    icon: '💰',
  },
  {
    id: 'revenue-potential',
    name: 'Revenue Potential',
    description: 'Lost revenue opportunity from unallocated resources',
    category: 'financial',
    icon: '📉',
  },
  {
    id: 'project-health',
    name: 'Project Health',
    description: 'Status and health of all active projects',
    category: 'project',
    icon: '🏥',
  },
  {
    id: 'project-staffing',
    name: 'Project Staffing',
    description: 'Staffing levels across all projects',
    category: 'project',
    icon: '📋',
  },
];

// ============================================================================
// Main Component
// ============================================================================

interface RecentReport {
  id: string;
  name: string;
  type: string;
  format: string;
  generatedAt: string;
  downloadUrl?: string;
}

export default function ReportsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [generating, setGenerating] = useState<string | null>(null);
  const [recentReports, setRecentReports] = useState<RecentReport[]>([]);

  const categories = [
    { id: 'all', name: 'All Reports', icon: '📁' },
    { id: 'utilization', name: 'Utilization', icon: '📊' },
    { id: 'resource', name: 'Resource', icon: '👥' },
    { id: 'financial', name: 'Financial', icon: '💰' },
    { id: 'project', name: 'Project', icon: '📋' },
  ];

  const filteredReports =
    selectedCategory === 'all'
      ? REPORTS
      : REPORTS.filter((r) => r.category === selectedCategory);

  // Load recent reports on mount
  useEffect(() => {
    // Use localStorage to track recent reports (in real app, this would be from API)
    const stored = localStorage.getItem('recentReports');
    if (stored) {
      setRecentReports(JSON.parse(stored));
    }
  }, []);

  async function generateReport(reportId: string, format: 'pdf' | 'xlsx') {
    setGenerating(`${reportId}-${format}`);
    
    try {
      // Map report ID to export endpoint
      const endpointMap: Record<string, string> = {
        'utilization-summary': '/export/utilization-report',
        'practice-utilization': '/analytics/practice',
        'bench-report': '/export/bench-report',
        'skill-matrix': '/export/skills-inventory',
        'resource-allocation': '/export/allocations',
        'bench-cost': '/export/bench-report',
        'revenue-potential': '/analytics/financial',
        'project-health': '/analytics/projects',
        'project-staffing': '/export/projects',
        'capacity-forecast': '/bench/forecast',
        'roll-off-report': '/bench/rolloffs',
        'billable-vs-nonbillable': '/analytics/executive',
      };

      const endpoint = endpointMap[reportId] || `/export/${reportId.replace('-', '_')}`;
      
      // For CSV/JSON exports
      if (endpoint.startsWith('/export')) {
        const response = await api.get<unknown>(`${endpoint}?format=${format === 'xlsx' ? 'csv' : 'json'}`);

        // Create download link
        const blob = new Blob([JSON.stringify(response)], {
          type: format === 'xlsx' ? 'text/csv' : 'application/json',
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${reportId}_${new Date().toISOString().split('T')[0]}.${format === 'xlsx' ? 'csv' : 'json'}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        // Add to recent reports
        const report = REPORTS.find(r => r.id === reportId);
        const newRecentReport: RecentReport = {
          id: `${reportId}-${Date.now()}`,
          name: report?.name || reportId,
          type: reportId,
          format: format === 'xlsx' ? 'Excel' : 'PDF',
          generatedAt: new Date().toISOString(),
        };
        const updated = [newRecentReport, ...recentReports.slice(0, 9)];
        setRecentReports(updated);
        localStorage.setItem('recentReports', JSON.stringify(updated));

        console.log(`Report ${report?.name} downloaded successfully.`);
      } else {
        // For analytics endpoints, get JSON data
        const response = await api.get<{ data: unknown }>(endpoint);
        const blob = new Blob([JSON.stringify(response.data, null, 2)], {
          type: 'application/json',
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${reportId}_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        const report = REPORTS.find(r => r.id === reportId);
        console.log(`Report ${report?.name} downloaded successfully.`);
      }
    } catch (err) {
      console.error('Failed to generate report:', err);
      alert('Failed to generate report. Please try again.');
    } finally {
      setGenerating(null);
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleString('en-IN', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  return (
    <MainLayout>
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-500 text-sm">
          Generate and download reports for analysis and decision making
        </p>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedCategory === cat.id
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {cat.icon} {cat.name}
          </button>
        ))}
      </div>

      {/* Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredReports.map((report) => (
          <Card key={report.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="text-2xl">{report.icon}</span>
                {report.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">{report.description}</p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => generateReport(report.id, 'pdf')}
                  disabled={generating !== null}
                >
                  {generating === `${report.id}-pdf` ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin">↻</span> Generating...
                    </span>
                  ) : (
                    '📄 JSON'
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => generateReport(report.id, 'xlsx')}
                  disabled={generating !== null}
                >
                  {generating === `${report.id}-xlsx` ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin">↻</span> Generating...
                    </span>
                  ) : (
                    '📊 CSV'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Scheduled Reports */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Scheduled Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <p className="text-4xl mb-2">📅</p>
            <p>No scheduled reports yet</p>
            <p className="text-sm">
              Schedule reports to be automatically generated and emailed
            </p>
            <Button className="mt-4" variant="outline">
              + Create Schedule
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Reports */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Reports</CardTitle>
        </CardHeader>
        <CardContent>
          {recentReports.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-4xl mb-2">📋</p>
              <p>No reports generated yet</p>
              <p className="text-sm">Generated reports will appear here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentReports.map((report) => {
                const reportDef = REPORTS.find(r => r.id === report.type);
                return (
                  <div key={report.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{reportDef?.icon || '📄'}</span>
                      <div>
                        <p className="font-medium text-gray-900">{report.name}</p>
                        <p className="text-sm text-gray-500">Generated {formatDate(report.generatedAt)} • {report.format}</p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400">
                      {report.format}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </MainLayout>
  );
}

