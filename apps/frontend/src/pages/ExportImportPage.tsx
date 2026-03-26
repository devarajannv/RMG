import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useAiAssistStore } from '@/stores/aiAssistStore';

// ============================================================================
// Types
// ============================================================================

type TabType = 'export' | 'import' | 'ai-migration' | 'webhooks';

interface ImportResult {
  success: boolean;
  data: {
    totalRows: number;
    importedRows: number;
    skippedRows: number;
    errors: Array<{ row: number; field?: string; message: string }>;
  };
}

interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  isActive: boolean;
  createdAt: string;
}

// AI Migration Types
interface ImportJob {
  id: string;
  name: string;
  status: string;
  sourceFileName: string;
  sourceFileType: string;
  sourceFileSize: number;
  importPurpose: string;
  totalRecords?: number;
  importedRecords?: number;
  skippedRecords?: number;
  errorRecords?: number;
  autonomyLevel?: number;
  createdAt: string;
  completedAt?: string;
}

interface ImportMapping {
  id: string;
  sourceColumn: string;
  targetEntity: string;
  targetField: string;
  confidence: number;
  isApproved: boolean;
}

interface AnalysisResult {
  job: ImportJob;
  mappings: ImportMapping[];
  detectedEntities: string[];
  sampleData: Record<string, unknown>[];
  missingReferences: string[];
  autonomyLevel: number;
  message: string;
}

// ============================================================================
// Main Component
// ============================================================================

export default function ExportImportPage() {
  const [activeTab, setActiveTab] = useState<TabType>('export');
  const { isAiAssistEnabled } = useAiAssistStore();

  // Build tabs dynamically based on AI Assist state
  const tabs = [
    { id: 'export', label: 'Export', icon: '📤' },
    { id: 'import', label: 'Import', icon: '📥' },
    ...(isAiAssistEnabled ? [{ id: 'ai-migration', label: '✨ AI Migration', icon: '🤖' }] : []),
    { id: 'webhooks', label: 'Webhooks', icon: '🔗' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Data Management</h1>
        <p className="text-gray-500 text-sm">Export, import data and manage integrations</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        {tabs.map((tab) => (
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
      {activeTab === 'export' && <ExportTab />}
      {activeTab === 'import' && <ImportTab />}
      {activeTab === 'ai-migration' && isAiAssistEnabled && <AIMigrationTab />}
      {activeTab === 'webhooks' && <WebhooksTab />}
    </div>
  );
}

// ============================================================================
// Export Tab
// ============================================================================

function ExportTab() {
  const [loading, setLoading] = useState<string | null>(null);

  const exportOptions = [
    {
      id: 'resources',
      title: 'Resources',
      description: 'Export all resources with skills and allocations',
      icon: '👥',
      endpoint: '/export/resources',
    },
    {
      id: 'projects',
      title: 'Projects',
      description: 'Export all projects with team details',
      icon: '📁',
      endpoint: '/export/projects',
    },
    {
      id: 'allocations',
      title: 'Allocations',
      description: 'Export allocation data with resource and project info',
      icon: '📊',
      endpoint: '/export/allocations',
    },
    {
      id: 'bench-report',
      title: 'Bench Report',
      description: 'Export current bench resources with costs',
      icon: '🪑',
      endpoint: '/export/bench-report',
    },
    {
      id: 'utilization-report',
      title: 'Utilization Report',
      description: 'Export utilization metrics by resource',
      icon: '📈',
      endpoint: '/export/utilization-report',
    },
    {
      id: 'clients',
      title: 'Clients',
      description: 'Export client data with project counts',
      icon: '🏢',
      endpoint: '/export/clients',
    },
    {
      id: 'skills-inventory',
      title: 'Skills Inventory',
      description: 'Export skills with resource breakdown',
      icon: '🎯',
      endpoint: '/export/skills-inventory',
    },
  ];

  async function handleExport(option: typeof exportOptions[0], format: 'csv' | 'json') {
    setLoading(`${option.id}-${format}`);
    try {
      const response = await api.get<unknown>(`${option.endpoint}?format=${format}`);

      // Create download link
      const blob = new Blob([JSON.stringify(response)], {
        type: format === 'csv' ? 'text/csv' : 'application/json',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${option.id}_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export failed. Please try again.');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-sm bg-gradient-to-br from-blue-50 to-white">
        <CardContent className="p-4">
          <p className="text-sm text-gray-600">
            <strong>📤 Export Data</strong> - Download your data in CSV or JSON format. 
            CSV files can be opened in Excel, while JSON is ideal for integrations.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {exportOptions.map(option => (
          <Card key={option.id} className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="text-2xl">{option.icon}</span>
                {option.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-4">{option.description}</p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleExport(option, 'csv')}
                  disabled={loading !== null}
                >
                  {loading === `${option.id}-csv` ? '⏳' : '📄'} CSV
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleExport(option, 'json')}
                  disabled={loading !== null}
                >
                  {loading === `${option.id}-json` ? '⏳' : '📋'} JSON
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Import Tab
// ============================================================================

function ImportTab() {
  const [importType, setImportType] = useState<'resources' | 'allocations' | 'projects'>('resources');
  const [csvData, setCsvData] = useState('');
  const [updateExisting, setUpdateExisting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [validationResult, setValidationResult] = useState<{ valid: boolean; headers?: string[]; rowCount?: number; errors?: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvData(text);
      setResult(null);
      setValidationResult(null);
    };
    reader.readAsText(file);
  }

  async function handleValidate() {
    if (!csvData) {
      alert('Please upload or paste CSV data first');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post<{ valid: boolean; headers?: string[]; rowCount?: number; errors?: string[] }>('/import/validate', {
        type: importType,
        data: csvData,
      });
      setValidationResult(res);
    } catch (err) {
      console.error('Validation failed:', err);
      setValidationResult({ valid: false, errors: ['Validation request failed'] });
    } finally {
      setLoading(false);
    }
  }

  async function handleImport() {
    if (!csvData) {
      alert('Please upload or paste CSV data first');
      return;
    }

    if (!validationResult?.valid) {
      alert('Please validate data first');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post<ImportResult>(`/import/${importType}`, {
        data: csvData,
        updateExisting,
      });
      setResult(res);
    } catch (err) {
      console.error('Import failed:', err);
      alert('Import failed. Please check your data and try again.');
    } finally {
      setLoading(false);
    }
  }

  async function downloadTemplate() {
    try {
      const response = await api.get<unknown>(`/import/template/${importType}`);
      
      const blob = new Blob([JSON.stringify(response)], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${importType}_template.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Template download failed:', err);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-sm bg-gradient-to-br from-green-50 to-white">
        <CardContent className="p-4">
          <p className="text-sm text-gray-600">
            <strong>📥 Import Data</strong> - Upload CSV files to bulk import data. 
            Download templates for the correct format.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Import Form */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Import Data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Import Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data Type
              </label>
              <div className="flex gap-2">
                {['resources', 'allocations', 'projects'].map(type => (
                  <button
                    key={type}
                    onClick={() => {
                      setImportType(type as typeof importType);
                      setCsvData('');
                      setResult(null);
                      setValidationResult(null);
                    }}
                    className={`px-4 py-2 rounded-lg text-sm ${
                      importType === type
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Template Download */}
            <div>
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                📥 Download Template
              </Button>
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload CSV File
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/90"
              />
            </div>

            {/* CSV Preview */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CSV Data (or paste directly)
              </label>
              <textarea
                value={csvData}
                onChange={(e) => {
                  setCsvData(e.target.value);
                  setValidationResult(null);
                  setResult(null);
                }}
                placeholder="Paste CSV data here or upload a file..."
                className="w-full h-32 p-3 border rounded-lg text-sm font-mono"
              />
            </div>

            {/* Options */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="updateExisting"
                checked={updateExisting}
                onChange={(e) => setUpdateExisting(e.target.checked)}
                className="rounded border-gray-300"
              />
              <label htmlFor="updateExisting" className="text-sm text-gray-700">
                Update existing records
              </label>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleValidate}
                disabled={loading || !csvData}
              >
                {loading ? '⏳' : '✓'} Validate
              </Button>
              <Button
                onClick={handleImport}
                disabled={loading || !validationResult?.valid}
              >
                {loading ? '⏳' : '📤'} Import
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Results</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Validation Result */}
            {validationResult && (
              <div className={`p-4 rounded-lg mb-4 ${validationResult.valid ? 'bg-green-50' : 'bg-red-50'}`}>
                <p className={`font-medium ${validationResult.valid ? 'text-green-800' : 'text-red-800'}`}>
                  {validationResult.valid ? '✅ Validation Passed' : '❌ Validation Failed'}
                </p>
                {validationResult.headers && (
                  <p className="text-sm text-gray-600 mt-1">
                    Headers: {validationResult.headers.join(', ')}
                  </p>
                )}
                {validationResult.rowCount && (
                  <p className="text-sm text-gray-600">
                    Rows to import: {validationResult.rowCount}
                  </p>
                )}
                {validationResult.errors && validationResult.errors.length > 0 && (
                  <ul className="mt-2 text-sm text-red-600">
                    {validationResult.errors.map((err, i) => (
                      <li key={i}>• {err}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Import Result */}
            {result && (
              <div className={`p-4 rounded-lg ${result.success ? 'bg-green-50' : 'bg-amber-50'}`}>
                <p className={`font-medium ${result.success ? 'text-green-800' : 'text-amber-800'}`}>
                  {result.success ? '✅ Import Complete' : '⚠️ Import Complete with Warnings'}
                </p>
                <div className="mt-2 space-y-1 text-sm">
                  <p>Total rows: {result.data.totalRows}</p>
                  <p className="text-green-600">Imported: {result.data.importedRows}</p>
                  <p className="text-gray-500">Skipped: {result.data.skippedRows}</p>
                </div>
                {result.data.errors.length > 0 && (
                  <div className="mt-3">
                    <p className="font-medium text-red-700">Errors:</p>
                    <div className="max-h-40 overflow-y-auto mt-1">
                      {result.data.errors.map((err, i) => (
                        <p key={i} className="text-sm text-red-600">
                          Row {err.row}: {err.message}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {!validationResult && !result && (
              <div className="text-center text-gray-400 py-8">
                <p className="text-4xl mb-2">📋</p>
                <p>Upload and validate data to see results</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============================================================================
// AI Migration Tab
// ============================================================================

function AIMigrationTab() {
  const [step, setStep] = useState<'upload' | 'analyze' | 'review' | 'execute' | 'complete'>('upload');
  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [currentJob, setCurrentJob] = useState<ImportJob | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [mappings, setMappings] = useState<ImportMapping[]>([]);
  const [importName, setImportName] = useState('');
  const [importPurpose, setImportPurpose] = useState<'MIGRATION' | 'SYNC' | 'MANUAL'>('MIGRATION');
  const [showHistory, setShowHistory] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadJobs = useCallback(async () => {
    try {
      const res = await api.get<{ data: ImportJob[] }>('/ai-migration/jobs');
      setJobs(res.data || []);
    } catch (err) {
      console.error('Failed to load jobs:', err);
    }
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!importName) {
      alert('Please enter a name for this import');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', importName);
      formData.append('importPurpose', importPurpose);

      const res = await fetch('/api/v1/ai-migration/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      
      const data = await res.json();
      if (data.success) {
        setCurrentJob(data.data);
        setStep('analyze');
      } else {
        alert(data.error || 'Upload failed');
      }
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Upload failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleAnalyze() {
    if (!currentJob) return;

    setLoading(true);
    try {
      const res = await api.post<{ data: AnalysisResult }>(`/ai-migration/${currentJob.id}/analyze`);
      setAnalysis(res.data);
      setMappings(res.data.mappings || []);
      setCurrentJob(res.data.job);
      setStep('review');
    } catch (err) {
      console.error('Analysis failed:', err);
      alert('Analysis failed. Please check the file format.');
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove() {
    if (!currentJob) return;

    setLoading(true);
    try {
      await api.post(`/ai-migration/${currentJob.id}/approve`, {
        createReferences: true,
      });
      setStep('execute');
    } catch (err) {
      console.error('Approval failed:', err);
      alert('Approval failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleExecute() {
    if (!currentJob) return;

    setLoading(true);
    try {
      const res = await api.post<{ data: ImportJob }>(`/ai-migration/${currentJob.id}/execute`);
      setCurrentJob(res.data);
      setStep('complete');
      loadJobs();
    } catch (err) {
      console.error('Import failed:', err);
      alert('Import execution failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleRollback(jobId: string) {
    if (!confirm('Are you sure you want to rollback this import? This will delete all imported records.')) {
      return;
    }

    setLoading(true);
    try {
      await api.post(`/ai-migration/${jobId}/rollback`);
      alert('Rollback completed successfully');
      loadJobs();
    } catch (err) {
      console.error('Rollback failed:', err);
      alert('Rollback failed');
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setStep('upload');
    setCurrentJob(null);
    setAnalysis(null);
    setMappings([]);
    setImportName('');
    setImportPurpose('MIGRATION');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function getConfidenceColor(confidence: number): string {
    if (confidence >= 0.8) return 'text-green-600 bg-green-100';
    if (confidence >= 0.5) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'PROCESSING': return 'bg-blue-100 text-blue-800';
      case 'FAILED': return 'bg-red-100 text-red-800';
      case 'ROLLED_BACK': return 'bg-gray-100 text-gray-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <Card className="shadow-sm bg-gradient-to-br from-violet-50 to-white">
        <CardContent className="p-4">
          <p className="text-sm text-gray-600">
            <strong>🤖 AI-Powered Migration</strong> - Upload files in any format (CSV, Excel, JSON, PDF, Images). 
            AI automatically detects fields, maps to entities, and imports data with confidence scoring.
          </p>
        </CardContent>
      </Card>

      {/* Toggle History */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          {step !== 'upload' && (
            <Button variant="outline" size="sm" onClick={resetForm}>
              ← New Import
            </Button>
          )}
          <div className="flex gap-2 text-sm">
            {['upload', 'analyze', 'review', 'execute', 'complete'].map((s, i) => (
              <span
                key={s}
                className={`px-3 py-1 rounded-full ${
                  step === s ? 'bg-primary text-white' : 
                  ['upload', 'analyze', 'review', 'execute', 'complete'].indexOf(step) > i ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-500'
                }`}
              >
                {i + 1}. {s.charAt(0).toUpperCase() + s.slice(1)}
              </span>
            ))}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowHistory(!showHistory)}>
          📜 {showHistory ? 'Hide' : 'Show'} History
        </Button>
      </div>

      {/* History Panel */}
      {showHistory && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Import History</CardTitle>
          </CardHeader>
          <CardContent>
            {jobs.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No import history</p>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {jobs.map(job => (
                  <div key={job.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{job.name}</span>
                        <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(job.status)}`}>
                          {job.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        {job.sourceFileName} • {new Date(job.createdAt).toLocaleDateString()}
                        {job.importedRecords !== undefined && (
                          <> • {job.importedRecords} imported</>
                        )}
                      </p>
                    </div>
                    {job.status === 'COMPLETED' && (
                      <Button size="sm" variant="outline" onClick={() => handleRollback(job.id)}>
                        ↩️ Rollback
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">📤 Upload File</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Import Name *</label>
              <input
                type="text"
                value={importName}
                onChange={(e) => setImportName(e.target.value)}
                placeholder="e.g., PeopleStrong Employee Migration"
                className="w-full p-2 border rounded-lg"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Import Purpose</label>
              <div className="flex gap-2">
                {[
                  { id: 'MIGRATION', label: '🔄 Migration', desc: 'One-time data migration' },
                  { id: 'SYNC', label: '🔁 Sync', desc: 'Regular data sync' },
                  { id: 'MANUAL', label: '✋ Manual', desc: 'User-controlled import' },
                ].map(purpose => (
                  <button
                    key={purpose.id}
                    onClick={() => setImportPurpose(purpose.id as typeof importPurpose)}
                    className={`flex-1 p-3 rounded-lg border text-left ${
                      importPurpose === purpose.id
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="font-medium">{purpose.label}</p>
                    <p className="text-xs text-gray-500">{purpose.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select File</label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls,.json,.pdf,.png,.jpg,.jpeg"
                onChange={handleUpload}
                disabled={loading || !importName}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/90 disabled:opacity-50"
              />
              <p className="text-xs text-gray-400 mt-1">
                Supported formats: CSV, Excel, JSON, PDF, Images (PNG, JPG)
              </p>
            </div>

            {loading && (
              <div className="flex items-center gap-2 text-primary">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                Uploading...
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Analyze */}
      {step === 'analyze' && currentJob && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">🔍 Analyze File</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="font-medium">{currentJob.name}</p>
              <p className="text-sm text-gray-500">
                File: {currentJob.sourceFileName} ({(currentJob.sourceFileSize / 1024).toFixed(1)} KB)
              </p>
            </div>

            <p className="text-sm text-gray-600">
              Click "Analyze" to let AI examine your file, detect data types, and suggest field mappings.
            </p>

            <Button onClick={handleAnalyze} disabled={loading} className="w-full">
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Analyzing with AI...
                </>
              ) : (
                '🤖 Analyze with AI'
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Review Mappings */}
      {step === 'review' && analysis && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">📋 AI Analysis Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="text-3xl">
                  {analysis.autonomyLevel >= 3 ? '🟢' : analysis.autonomyLevel >= 2 ? '🟡' : '🟠'}
                </div>
                <div>
                  <p className="font-medium">Autonomy Level {analysis.autonomyLevel}</p>
                  <p className="text-sm text-gray-500">
                    {analysis.autonomyLevel >= 3 
                      ? 'High confidence - AI can import automatically'
                      : analysis.autonomyLevel >= 2 
                      ? 'Medium confidence - Review recommended'
                      : 'Low confidence - Manual review required'}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Detected Entities</p>
                <div className="flex flex-wrap gap-2">
                  {analysis.detectedEntities.map(entity => (
                    <span key={entity} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                      {entity}
                    </span>
                  ))}
                </div>
              </div>

              {analysis.missingReferences.length > 0 && (
                <div className="p-3 bg-amber-50 rounded-lg">
                  <p className="text-sm font-medium text-amber-800">⚠️ Missing References</p>
                  <p className="text-sm text-amber-600">
                    {analysis.missingReferences.join(', ')} will be auto-created
                  </p>
                </div>
              )}

              <p className="text-sm text-gray-500">{analysis.message}</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">🔗 Field Mappings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {mappings.map((mapping, idx) => (
                  <div key={mapping.id || idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex-1">
                      <span className="text-sm font-mono">{mapping.sourceColumn}</span>
                      <span className="mx-2 text-gray-400">→</span>
                      <span className="text-sm font-medium">{mapping.targetEntity}.{mapping.targetField}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs ${getConfidenceColor(mapping.confidence)}`}>
                      {(mapping.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t">
                <Button onClick={handleApprove} disabled={loading} className="w-full">
                  {loading ? 'Approving...' : '✓ Approve Mappings'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 4: Execute */}
      {step === 'execute' && currentJob && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">🚀 Execute Import</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-green-800 font-medium">✓ Mappings Approved</p>
              <p className="text-sm text-green-600">Ready to import data into the system</p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="font-medium">{currentJob.name}</p>
              <p className="text-sm text-gray-500">
                {currentJob.totalRecords || 'Unknown'} records to process
              </p>
            </div>

            <Button onClick={handleExecute} disabled={loading} className="w-full">
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Importing...
                </>
              ) : (
                '🚀 Start Import'
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Complete */}
      {step === 'complete' && currentJob && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">✅ Import Complete</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-6">
              <div className="text-6xl mb-4">🎉</div>
              <p className="text-xl font-medium text-gray-800">Import Successful!</p>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{currentJob.importedRecords || 0}</p>
                <p className="text-sm text-gray-500">Imported</p>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg">
                <p className="text-2xl font-bold text-yellow-600">{currentJob.skippedRecords || 0}</p>
                <p className="text-sm text-gray-500">Skipped</p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg">
                <p className="text-2xl font-bold text-red-600">{currentJob.errorRecords || 0}</p>
                <p className="text-sm text-gray-500">Errors</p>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={resetForm} className="flex-1">
                📤 New Import
              </Button>
              <Button variant="outline" onClick={() => handleRollback(currentJob.id)} className="flex-1">
                ↩️ Rollback
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================================================
// Webhooks Tab
// ============================================================================

function WebhooksTab() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    events: [] as string[],
  });

  const availableEvents = [
    'resource.created', 'resource.updated', 'resource.deleted',
    'allocation.created', 'allocation.updated', 'allocation.deleted',
    'project.created', 'project.updated', 'project.completed',
    'bench.resource_added', 'bench.resource_removed',
    'timesheet.submitted', 'timesheet.approved', 'timesheet.rejected',
  ];

  async function loadWebhooks() {
    try {
      const res = await api.get<{ data: Webhook[] }>('/webhooks');
      setWebhooks(res.data);
    } catch (err) {
      console.error('Failed to load webhooks:', err);
    } finally {
      setLoading(false);
    }
  }

  async function createWebhook() {
    if (!formData.name || !formData.url || formData.events.length === 0) {
      alert('Please fill all required fields');
      return;
    }

    try {
      await api.post('/webhooks', formData);
      setShowForm(false);
      setFormData({ name: '', url: '', events: [] });
      loadWebhooks();
    } catch (err) {
      console.error('Failed to create webhook:', err);
      alert('Failed to create webhook');
    }
  }

  async function deleteWebhook(id: string) {
    if (!confirm('Are you sure you want to delete this webhook?')) return;
    
    try {
      await api.delete(`/webhooks/${id}`);
      loadWebhooks();
    } catch (err) {
      console.error('Failed to delete webhook:', err);
    }
  }

  async function testWebhook(id: string) {
    try {
      await api.post(`/webhooks/${id}/test`);
      alert('Test webhook sent!');
    } catch (err) {
      console.error('Failed to test webhook:', err);
      alert('Failed to send test webhook');
    }
  }

  // Load webhooks on mount
  useEffect(() => {
    loadWebhooks();
  }, []);

  return (
    <div className="space-y-6">
      <Card className="shadow-sm bg-gradient-to-br from-purple-50 to-white">
        <CardContent className="p-4">
          <p className="text-sm text-gray-600">
            <strong>🔗 Webhooks</strong> - Configure webhooks to receive real-time notifications 
            when events occur in the system.
          </p>
        </CardContent>
      </Card>

      {/* Add Webhook Button */}
      <div className="flex justify-end">
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕ Cancel' : '+ Add Webhook'}
        </Button>
      </div>

      {/* Webhook Form */}
      {showForm && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">New Webhook</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="My Webhook"
                className="w-full p-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
              <input
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="https://example.com/webhook"
                className="w-full p-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Events</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {availableEvents.map(event => (
                  <label key={event} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={formData.events.includes(event)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({ ...formData, events: [...formData.events, event] });
                        } else {
                          setFormData({ ...formData, events: formData.events.filter(e => e !== event) });
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                    {event}
                  </label>
                ))}
              </div>
            </div>
            <Button onClick={createWebhook}>Create Webhook</Button>
          </CardContent>
        </Card>
      )}

      {/* Webhooks List */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Configured Webhooks</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : webhooks.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <p className="text-4xl mb-2">🔗</p>
              <p>No webhooks configured yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {webhooks.map(webhook => (
                <div
                  key={webhook.id}
                  className="p-4 border rounded-lg flex items-start justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{webhook.name}</p>
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        webhook.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {webhook.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 font-mono mt-1">{webhook.url}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {webhook.events.map(event => (
                        <span key={event} className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">
                          {event}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => testWebhook(webhook.id)}>
                      🧪 Test
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => deleteWebhook(webhook.id)}>
                      🗑️
                    </Button>
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

