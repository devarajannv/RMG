import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import {
  BarChart,
  Bar,
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

interface ResourceMatch {
  resourceId: string;
  resourceName: string;
  employeeId: string;
  email: string;
  designation: string;
  band: string;
  practice: string | null;
  location: string | null;
  overallScore: number;
  skillScore: number;
  availabilityScore: number;
  utilizationScore: number;
  experienceScore: number;
  matchedSkills: Array<{ name: string; proficiency: string; required: boolean }>;
  missingSkills: string[];
  currentUtilization: number;
  availableCapacity: number;
  availableFrom: string;
  scoreBreakdown: Array<{
    category: string;
    score: number;
    maxScore: number;
    reason: string;
  }>;
  recommendation: string;
}

interface Skill {
  id: string;
  name: string;
  category: { name: string } | null;
}

interface UtilizationInsight {
  currentUtilization: number;
  targetUtilization: number;
  optimalUtilization: number;
  variance: number;
  benchCount: number;
  benchCost: number;
  recommendations: Array<{
    type: 'action' | 'insight' | 'warning';
    priority: 'high' | 'medium' | 'low';
    message: string;
    impact: string;
  }>;
  practiceBreakdown: Array<{
    practiceId: string;
    practiceName: string;
    utilization: number;
    target: number;
    status: 'above' | 'at' | 'below';
    recommendation: string;
  }>;
}

interface SkillInventory {
  skills: Array<{
    skillId: string;
    skillName: string;
    category: string | null;
    totalResources: number;
    availableResources: number;
    avgProficiency: number;
    demandScore: number;
    supplyDemandRatio: number;
  }>;
  topInDemand: string[];
  skillGaps: string[];
  recommendations: string[];
}

type TabType = 'search' | 'insights' | 'skills';

// ============================================================================
// Main Component
// ============================================================================

export default function SmartSearchPage() {
  const [activeTab, setActiveTab] = useState<TabType>('search');
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<ResourceMatch[]>([]);
  const [insights, setInsights] = useState<UtilizationInsight | null>(null);
  const [skillInventory, setSkillInventory] = useState<SkillInventory | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);
  
  // Search options
  const [allocationPercentage, setAllocationPercentage] = useState(100);
  const [includePartial, setIncludePartial] = useState(true);
  const [skillSearch, setSkillSearch] = useState('');

  // Load skills on mount
  useEffect(() => {
    loadSkills();
  }, []);

  async function loadSkills() {
    try {
      const res = await api.get<{ data: Skill[] }>('/skills');
      setSkills(res.data);
    } catch (err) {
      console.error('Failed to load skills:', err);
    }
  }

  async function performSearch() {
    if (selectedSkills.length === 0) return;
    
    setLoading(true);
    setSearchPerformed(true);
    
    try {
      const res = await api.post<{ data: ResourceMatch[] }>('/intelligence/match', {
        requiredSkills: selectedSkills,
        allocationPercentage,
        includePartialMatches: includePartial,
        limit: 20,
      });
      setSearchResults(res.data);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadInsights() {
    setLoading(true);
    try {
      const res = await api.get<{ data: UtilizationInsight }>('/intelligence/utilization-insights');
      setInsights(res.data);
    } catch (err) {
      console.error('Failed to load insights:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadSkillInventory() {
    setLoading(true);
    try {
      const res = await api.get<{ data: SkillInventory }>('/intelligence/skill-inventory');
      setSkillInventory(res.data);
    } catch (err) {
      console.error('Failed to load skill inventory:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (activeTab === 'insights' && !insights) {
      loadInsights();
    } else if (activeTab === 'skills' && !skillInventory) {
      loadSkillInventory();
    }
  }, [activeTab]);

  function toggleSkill(skillId: string) {
    setSelectedSkills(prev => 
      prev.includes(skillId)
        ? prev.filter(id => id !== skillId)
        : [...prev, skillId]
    );
  }

  // Filter skills by search
  const filteredSkills = skills.filter(skill => 
    skill.name.toLowerCase().includes(skillSearch.toLowerCase())
  );

  // Group skills by category
  const skillsByCategory = filteredSkills.reduce((acc, skill) => {
    const category = skill.category?.name ?? 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(skill);
    return acc;
  }, {} as Record<string, Skill[]>);

  function getScoreColor(score: number): string {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-amber-600';
    return 'text-red-600';
  }

  function getScoreBg(score: number): string {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-blue-500';
    if (score >= 40) return 'bg-amber-500';
    return 'bg-red-500';
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Smart Search & Intelligence</h1>
          <p className="text-gray-500 text-sm">
            Resource matching and utilization insights
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        {[
          { id: 'search', label: 'Smart Search', icon: '🔍' },
          { id: 'insights', label: 'Utilization Insights', icon: '📊' },
          { id: 'skills', label: 'Skill Inventory', icon: '🎯' },
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
      {activeTab === 'search' && (
        <SearchTab
          skills={skills}
          skillsByCategory={skillsByCategory}
          selectedSkills={selectedSkills}
          toggleSkill={toggleSkill}
          skillSearch={skillSearch}
          setSkillSearch={setSkillSearch}
          allocationPercentage={allocationPercentage}
          setAllocationPercentage={setAllocationPercentage}
          includePartial={includePartial}
          setIncludePartial={setIncludePartial}
          performSearch={performSearch}
          loading={loading}
          searchPerformed={searchPerformed}
          searchResults={searchResults}
          getScoreColor={getScoreColor}
          getScoreBg={getScoreBg}
        />
      )}

      {activeTab === 'insights' && (
        <InsightsTab
          insights={insights}
          loading={loading}
          loadInsights={loadInsights}
        />
      )}

      {activeTab === 'skills' && (
        <SkillInventoryTab
          inventory={skillInventory}
          loading={loading}
          loadSkillInventory={loadSkillInventory}
        />
      )}
    </div>
  );
}

// ============================================================================
// Search Tab
// ============================================================================

function SearchTab({
  skills,
  skillsByCategory,
  selectedSkills,
  toggleSkill,
  skillSearch,
  setSkillSearch,
  allocationPercentage,
  setAllocationPercentage,
  includePartial,
  setIncludePartial,
  performSearch,
  loading,
  searchPerformed,
  searchResults,
  getScoreColor,
  getScoreBg,
}: {
  skills: Skill[];
  skillsByCategory: Record<string, Skill[]>;
  selectedSkills: string[];
  toggleSkill: (id: string) => void;
  skillSearch: string;
  setSkillSearch: (v: string) => void;
  allocationPercentage: number;
  setAllocationPercentage: (v: number) => void;
  includePartial: boolean;
  setIncludePartial: (v: boolean) => void;
  performSearch: () => void;
  loading: boolean;
  searchPerformed: boolean;
  searchResults: ResourceMatch[];
  getScoreColor: (s: number) => string;
  getScoreBg: (s: number) => string;
}) {
  const [expandedResult, setExpandedResult] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Search Panel */}
      <div className="lg:col-span-1 space-y-4">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Search Criteria</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Skill Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Find Skills
              </label>
              <Input
                placeholder="Search skills..."
                value={skillSearch}
                onChange={(e) => setSkillSearch(e.target.value)}
              />
            </div>

            {/* Selected Skills */}
            {selectedSkills.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Selected Skills ({selectedSkills.length})
                </label>
                <div className="flex flex-wrap gap-1">
                  {selectedSkills.map(skillId => {
                    const skill = skills.find(s => s.id === skillId);
                    return (
                      <span
                        key={skillId}
                        onClick={() => toggleSkill(skillId)}
                        className="px-2 py-1 bg-primary text-white text-xs rounded-full cursor-pointer hover:bg-primary/80"
                      >
                        {skill?.name ?? skillId} ×
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Skill Categories */}
            <div className="max-h-64 overflow-y-auto space-y-3">
              {Object.entries(skillsByCategory).slice(0, 10).map(([category, categorySkills]) => (
                <div key={category}>
                  <p className="text-xs font-medium text-gray-500 mb-1">{category}</p>
                  <div className="flex flex-wrap gap-1">
                    {categorySkills.slice(0, 10).map(skill => (
                      <button
                        key={skill.id}
                        onClick={() => toggleSkill(skill.id)}
                        className={`px-2 py-0.5 text-xs rounded-full border transition-colors ${
                          selectedSkills.includes(skill.id)
                            ? 'bg-primary text-white border-primary'
                            : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        {skill.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Options */}
            <div className="pt-4 border-t space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Required Allocation: {allocationPercentage}%
                </label>
                <input
                  type="range"
                  min={10}
                  max={100}
                  step={10}
                  value={allocationPercentage}
                  onChange={(e) => setAllocationPercentage(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
              
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={includePartial}
                  onChange={(e) => setIncludePartial(e.target.checked)}
                  className="rounded"
                />
                Include partial matches
              </label>
            </div>

            {/* Search Button */}
            <Button
              onClick={performSearch}
              disabled={selectedSkills.length === 0 || loading}
              className="w-full bg-accent hover:bg-accent/90"
            >
              {loading ? 'Searching...' : '🔍 Find Matching Resources'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Results Panel */}
      <div className="lg:col-span-2 space-y-4">
        {!searchPerformed ? (
          <Card className="shadow-sm">
            <CardContent className="p-12 text-center">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Smart Resource Matching
              </h3>
              <p className="text-gray-500 max-w-md mx-auto">
                Select required skills from the left panel to find the best matching resources.
                The algorithm considers skills, availability, utilization, and experience.
              </p>
            </CardContent>
          </Card>
        ) : loading ? (
          <Card className="shadow-sm">
            <CardContent className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-gray-500">Finding best matches...</p>
            </CardContent>
          </Card>
        ) : searchResults.length === 0 ? (
          <Card className="shadow-sm">
            <CardContent className="p-12 text-center">
              <div className="text-6xl mb-4">😕</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                No Matches Found
              </h3>
              <p className="text-gray-500">
                Try adjusting your criteria or include partial matches.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Results Summary */}
            <Card className="shadow-sm bg-gradient-to-r from-primary/5 to-accent/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Found</p>
                    <p className="text-2xl font-bold text-primary">{searchResults.length} matches</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Top Score</p>
                    <p className={`text-2xl font-bold ${getScoreColor(searchResults[0]?.overallScore ?? 0)}`}>
                      {searchResults[0]?.overallScore ?? 0}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Results List */}
            <div className="space-y-3">
              {searchResults.map((result, index) => (
                <Card key={result.resourceId} className="shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Rank Badge */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                        index === 0 ? 'bg-amber-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-amber-700' : 'bg-gray-300'
                      }`}>
                        #{index + 1}
                      </div>

                      {/* Main Info */}
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-bold text-gray-900">{result.resourceName}</h3>
                            <p className="text-sm text-gray-500">
                              {result.designation} • {result.band} • {result.practice ?? 'No Practice'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={`text-3xl font-bold ${getScoreColor(result.overallScore)}`}>
                              {result.overallScore}%
                            </p>
                            <p className="text-xs text-gray-500">match score</p>
                          </div>
                        </div>

                        {/* Score Bars */}
                        <div className="mt-3 grid grid-cols-4 gap-2">
                          {result.scoreBreakdown.map(breakdown => (
                            <div key={breakdown.category} className="text-center">
                              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${getScoreBg(breakdown.score)}`}
                                  style={{ width: `${breakdown.score}%` }}
                                />
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                {breakdown.category}: {breakdown.score}%
                              </p>
                            </div>
                          ))}
                        </div>

                        {/* Matched Skills */}
                        <div className="mt-3 flex flex-wrap gap-1">
                          {result.matchedSkills.map((skill, i) => (
                            <span
                              key={i}
                              className={`px-2 py-0.5 text-xs rounded-full ${
                                skill.required
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {skill.name} ({skill.proficiency.slice(0, 3)})
                            </span>
                          ))}
                          {result.missingSkills.map((skill, i) => (
                            <span
                              key={`missing-${i}`}
                              className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-800"
                            >
                              ✗ {skill}
                            </span>
                          ))}
                        </div>

                        {/* Recommendation */}
                        <p className="mt-2 text-sm text-gray-600 italic">
                          💡 {result.recommendation}
                        </p>

                        {/* Expand Button */}
                        <button
                          onClick={() => setExpandedResult(expandedResult === result.resourceId ? null : result.resourceId)}
                          className="mt-2 text-sm text-primary hover:underline"
                        >
                          {expandedResult === result.resourceId ? '▲ Less details' : '▼ More details'}
                        </button>

                        {/* Expanded Details */}
                        {expandedResult === result.resourceId && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-lg space-y-2">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-gray-500">Employee ID</p>
                                <p className="font-medium">{result.employeeId}</p>
                              </div>
                              <div>
                                <p className="text-gray-500">Email</p>
                                <p className="font-medium">{result.email}</p>
                              </div>
                              <div>
                                <p className="text-gray-500">Current Utilization</p>
                                <p className="font-medium">{result.currentUtilization}%</p>
                              </div>
                              <div>
                                <p className="text-gray-500">Available Capacity</p>
                                <p className="font-medium">{result.availableCapacity}%</p>
                              </div>
                            </div>
                            <div className="pt-2 border-t">
                              <p className="text-xs font-medium text-gray-500 mb-1">Score Breakdown:</p>
                              {result.scoreBreakdown.map(b => (
                                <p key={b.category} className="text-xs text-gray-600">
                                  • {b.category}: {b.reason}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Insights Tab
// ============================================================================

function InsightsTab({
  insights,
  loading,
  loadInsights,
}: {
  insights: UtilizationInsight | null;
  loading: boolean;
  loadInsights: () => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!insights) {
    return (
      <Card className="shadow-sm">
        <CardContent className="p-12 text-center">
          <p className="text-gray-500">Failed to load insights</p>
          <Button onClick={loadInsights} className="mt-4">Retry</Button>
        </CardContent>
      </Card>
    );
  }


  return (
    <div className="space-y-6">
      {/* Utilization Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-sm bg-gradient-to-br from-primary/10 to-white">
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Current Utilization</p>
            <p className="text-3xl font-bold text-primary">{insights.currentUtilization}%</p>
            <p className={`text-sm ${insights.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {insights.variance >= 0 ? '▲' : '▼'} {Math.abs(insights.variance)}% vs target
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Target</p>
            <p className="text-3xl font-bold text-accent">{insights.targetUtilization}%</p>
            <p className="text-sm text-gray-500">organization target</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Optimal (AI Suggested)</p>
            <p className="text-3xl font-bold text-green-600">{insights.optimalUtilization}%</p>
            <p className="text-sm text-gray-500">based on your data</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm bg-gradient-to-br from-red-50 to-white">
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Bench Cost</p>
            <p className="text-3xl font-bold text-red-600">
              ₹{(insights.benchCost / 100000).toFixed(1)}L
            </p>
            <p className="text-sm text-gray-500">{insights.benchCount} on bench</p>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">AI Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {insights.recommendations.map((rec, i) => (
              <div
                key={i}
                className={`p-4 rounded-lg border-l-4 ${
                  rec.type === 'warning'
                    ? 'bg-red-50 border-l-red-500'
                    : rec.type === 'action'
                    ? 'bg-amber-50 border-l-amber-500'
                    : 'bg-blue-50 border-l-blue-500'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">
                    {rec.type === 'warning' ? '⚠️' : rec.type === 'action' ? '🎯' : '💡'}
                  </span>
                  <div>
                    <p className={`font-medium ${
                      rec.priority === 'high' ? 'text-red-800' : 
                      rec.priority === 'medium' ? 'text-amber-800' : 'text-blue-800'
                    }`}>
                      {rec.message}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">{rec.impact}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    rec.priority === 'high' ? 'bg-red-200 text-red-800' :
                    rec.priority === 'medium' ? 'bg-amber-200 text-amber-800' : 'bg-blue-200 text-blue-800'
                  }`}>
                    {rec.priority}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Practice Breakdown */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Practice Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={insights.practiceBreakdown} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis dataKey="practiceName" type="category" width={100} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="utilization" name="Current" fill="#1B3A5F" />
                <Bar dataKey="target" name="Target" fill="#F7941D" />
              </BarChart>
            </ResponsiveContainer>
            
            <div className="space-y-2">
              {insights.practiceBreakdown.map(practice => (
                <div
                  key={practice.practiceId}
                  className={`p-3 rounded-lg border ${
                    practice.status === 'above' ? 'bg-green-50 border-green-200' :
                    practice.status === 'below' ? 'bg-red-50 border-red-200' : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{practice.practiceName}</p>
                    <span className={`text-sm font-bold ${
                      practice.status === 'above' ? 'text-green-600' :
                      practice.status === 'below' ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {practice.utilization}% / {practice.target}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{practice.recommendation}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Skill Inventory Tab
// ============================================================================

function SkillInventoryTab({
  inventory,
  loading,
  loadSkillInventory,
}: {
  inventory: SkillInventory | null;
  loading: boolean;
  loadSkillInventory: () => void;
}) {
  const [skillFilter, setSkillFilter] = useState('');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!inventory) {
    return (
      <Card className="shadow-sm">
        <CardContent className="p-12 text-center">
          <p className="text-gray-500">Failed to load skill inventory</p>
          <Button onClick={loadSkillInventory} className="mt-4">Retry</Button>
        </CardContent>
      </Card>
    );
  }

  const filteredSkills = inventory.skills.filter(s => 
    s.skillName.toLowerCase().includes(skillFilter.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-600">Top In-Demand Skills</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {inventory.topInDemand.slice(0, 8).map((skill, i) => (
                <span key={i} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                  {skill}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-600">Skill Gaps</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {inventory.skillGaps.length > 0 ? inventory.skillGaps.map((skill, i) => (
                <span key={i} className="px-2 py-1 bg-red-200 text-red-800 text-xs rounded-full">
                  ⚠ {skill}
                </span>
              )) : (
                <p className="text-sm text-green-600">No critical gaps! 🎉</p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-600">AI Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            {inventory.recommendations.slice(0, 2).map((rec, i) => (
              <p key={i} className="text-xs text-gray-600 mb-1">💡 {rec}</p>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Skill Search */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <Input
            placeholder="Search skills..."
            value={skillFilter}
            onChange={(e) => setSkillFilter(e.target.value)}
          />
        </CardContent>
      </Card>

      {/* Skills Table */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Skill Inventory ({filteredSkills.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3 text-sm font-medium text-gray-600">Skill</th>
                  <th className="text-left p-3 text-sm font-medium text-gray-600">Category</th>
                  <th className="text-center p-3 text-sm font-medium text-gray-600">Total</th>
                  <th className="text-center p-3 text-sm font-medium text-gray-600">Available</th>
                  <th className="text-center p-3 text-sm font-medium text-gray-600">Avg Prof.</th>
                  <th className="text-center p-3 text-sm font-medium text-gray-600">Demand</th>
                  <th className="text-center p-3 text-sm font-medium text-gray-600">Supply/Demand</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredSkills.slice(0, 50).map(skill => (
                  <tr key={skill.skillId} className="hover:bg-gray-50">
                    <td className="p-3 font-medium">{skill.skillName}</td>
                    <td className="p-3 text-gray-600">{skill.category ?? '-'}</td>
                    <td className="p-3 text-center">{skill.totalResources}</td>
                    <td className="p-3 text-center">
                      <span className={skill.availableResources > 0 ? 'text-green-600' : 'text-gray-400'}>
                        {skill.availableResources}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="w-16 mx-auto h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${skill.avgProficiency}%` }}
                        />
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      {skill.demandScore > 0 ? (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs rounded-full">
                          {skill.demandScore}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`font-medium ${
                        skill.supplyDemandRatio < 0.5 ? 'text-red-600' :
                        skill.supplyDemandRatio > 2 ? 'text-green-600' : 'text-gray-600'
                      }`}>
                        {skill.supplyDemandRatio.toFixed(1)}
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

