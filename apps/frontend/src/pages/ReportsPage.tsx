import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

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

export default function ReportsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [generating, setGenerating] = useState<string | null>(null);

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

  async function generateReport(reportId: string) {
    setGenerating(reportId);
    // Simulate report generation
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setGenerating(null);

    // In a real implementation, this would call the API and trigger a download
    alert(`Report "${reportId}" would be generated and downloaded.`);
  }

  return (
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
                ? 'bg-blue-600 text-white'
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
                  onClick={() => generateReport(report.id)}
                  disabled={generating === report.id}
                >
                  {generating === report.id ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin">↻</span> Generating...
                    </span>
                  ) : (
                    '📄 PDF'
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => generateReport(report.id)}
                  disabled={generating === report.id}
                >
                  📊 Excel
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
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <span className="text-xl">📊</span>
                <div>
                  <p className="font-medium text-gray-900">Utilization Summary</p>
                  <p className="text-sm text-gray-500">Generated Dec 15, 2025 at 10:30 AM</p>
                </div>
              </div>
              <Button variant="ghost" size="sm">
                ↓ Download
              </Button>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <span className="text-xl">🪑</span>
                <div>
                  <p className="font-medium text-gray-900">Bench Report</p>
                  <p className="text-sm text-gray-500">Generated Dec 14, 2025 at 3:00 PM</p>
                </div>
              </div>
              <Button variant="ghost" size="sm">
                ↓ Download
              </Button>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <span className="text-xl">📅</span>
                <div>
                  <p className="font-medium text-gray-900">Roll-off Report</p>
                  <p className="text-sm text-gray-500">Generated Dec 13, 2025 at 9:00 AM</p>
                </div>
              </div>
              <Button variant="ghost" size="sm">
                ↓ Download
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

