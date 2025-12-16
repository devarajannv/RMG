import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  Save,
  Send,
  Clock,
  Calendar,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Plus,
} from 'lucide-react';
import { format, addWeeks, subWeeks, startOfWeek, addDays } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import MainLayout from '@/components/layout/MainLayout';

// ============================================================================
// Types
// ============================================================================

interface WeeklyTimesheetData {
  period: {
    start: string;
    end: string;
    status: 'OPEN' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
    periodId?: string;
  };
  entries: Array<{
    projectId: string;
    projectName: string;
    projectCode: string;
    clientName: string;
    isBillable: boolean;
    days: { [date: string]: { id?: string; hours: number; status: string } };
  }>;
  totals: {
    daily: { [date: string]: number };
    weekly: number;
    billable: number;
    nonBillable: number;
  };
}

interface Resource {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
}

// ============================================================================
// Main Component
// ============================================================================

export default function TimesheetsPage() {
  const queryClient = useQueryClient();
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);
  const [editedHours, setEditedHours] = useState<{ [key: string]: number }>({});
  const [isSaving, setIsSaving] = useState(false);

  // Get resources for dropdown
  const { data: resourcesData } = useQuery({
    queryKey: ['resources-list'],
    queryFn: () => api.get<{ data: Resource[] }>('/resources?limit=1000&status=ACTIVE'),
  });

  const resources = resourcesData?.data ?? [];

  // Auto-select first resource
  useEffect(() => {
    if (resources.length > 0 && !selectedResourceId) {
      setSelectedResourceId(resources[0].id);
    }
  }, [resources, selectedResourceId]);

  // Get weekly timesheet data
  const weekStartStr = format(currentWeek, 'yyyy-MM-dd');
  const { data: timesheetData, isLoading } = useQuery({
    queryKey: ['weekly-timesheet', selectedResourceId, weekStartStr],
    queryFn: () =>
      api.get<{ data: WeeklyTimesheetData }>(
        `/timesheets/weekly?resourceId=${selectedResourceId}&weekStart=${weekStartStr}`
      ),
    enabled: !!selectedResourceId,
  });

  const weeklyData = timesheetData?.data;
  const periodStatus = weeklyData?.period.status || 'OPEN';
  const isEditable = periodStatus === 'OPEN' || periodStatus === 'REJECTED';

  // Generate week days
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeek, i));

  // Navigation
  const goToPreviousWeek = () => setCurrentWeek(subWeeks(currentWeek, 1));
  const goToNextWeek = () => setCurrentWeek(addWeeks(currentWeek, 1));
  const goToCurrentWeek = () => setCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 1 }));

  // Handle cell change
  const handleHoursChange = (projectId: string, date: string, hours: number) => {
    const key = `${projectId}:${date}`;
    setEditedHours((prev) => ({ ...prev, [key]: hours }));
  };

  // Get hours for a cell (edited value or original)
  const getHours = (projectId: string, date: string): number => {
    const key = `${projectId}:${date}`;
    if (editedHours[key] !== undefined) return editedHours[key];
    const entry = weeklyData?.entries.find((e) => e.projectId === projectId);
    return entry?.days[date]?.hours || 0;
  };

  // Calculate totals
  const calculateDailyTotal = (date: string): number => {
    if (!weeklyData) return 0;
    return weeklyData.entries.reduce((sum, entry) => {
      return sum + getHours(entry.projectId, date);
    }, 0);
  };

  const calculateProjectTotal = (projectId: string): number => {
    return weekDays.reduce((sum, day) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      return sum + getHours(projectId, dateStr);
    }, 0);
  };

  const calculateWeeklyTotal = (): number => {
    return weekDays.reduce((sum, day) => {
      return sum + calculateDailyTotal(format(day, 'yyyy-MM-dd'));
    }, 0);
  };

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedResourceId) throw new Error('No resource selected');
      
      const entries: Array<{ projectId: string; date: string; hours: number }> = [];
      
      for (const [key, hours] of Object.entries(editedHours)) {
        const [projectId, date] = key.split(':');
        entries.push({ projectId, date, hours });
      }

      // Also include unchanged entries
      if (weeklyData) {
        for (const entry of weeklyData.entries) {
          for (const day of weekDays) {
            const dateStr = format(day, 'yyyy-MM-dd');
            const key = `${entry.projectId}:${dateStr}`;
            if (editedHours[key] === undefined && entry.days[dateStr]) {
              entries.push({
                projectId: entry.projectId,
                date: dateStr,
                hours: entry.days[dateStr].hours,
              });
            }
          }
        }
      }

      return api.post('/timesheets/weekly/save', {
        resourceId: selectedResourceId,
        weekStart: weekStartStr,
        entries,
      });
    },
    onSuccess: () => {
      setEditedHours({});
      queryClient.invalidateQueries({ queryKey: ['weekly-timesheet'] });
    },
  });

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!selectedResourceId) throw new Error('No resource selected');
      
      // Save first
      await saveMutation.mutateAsync();
      
      return api.post('/timesheets/submit', {
        resourceId: selectedResourceId,
        weekStart: weekStartStr,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-timesheet'] });
    },
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveMutation.mutateAsync();
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (calculateWeeklyTotal() < 40) {
      if (!confirm('Weekly hours are less than 40. Submit anyway?')) return;
    }
    await submitMutation.mutateAsync();
  };

  const hasChanges = Object.keys(editedHours).length > 0;

  // Status badge
  const StatusBadge = () => {
    const statusConfig = {
      OPEN: { icon: Clock, color: 'bg-blue-100 text-blue-700', label: 'Draft' },
      SUBMITTED: { icon: Send, color: 'bg-amber-100 text-amber-700', label: 'Pending Approval' },
      APPROVED: { icon: CheckCircle, color: 'bg-emerald-100 text-emerald-700', label: 'Approved' },
      REJECTED: { icon: XCircle, color: 'bg-red-100 text-red-700', label: 'Rejected' },
    };
    const config = statusConfig[periodStatus];
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
        <Icon className="h-4 w-4" />
        {config.label}
      </span>
    );
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#1B3A5F]">Timesheets</h1>
            <p className="text-gray-500 mt-1">Log your weekly hours by project</p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge />
            {isEditable && (
              <>
                <Button
                  variant="outline"
                  onClick={handleSave}
                  disabled={!hasChanges || isSaving}
                  className="rounded-xl"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? 'Saving...' : 'Save Draft'}
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={submitMutation.isPending}
                  className="rounded-xl bg-gradient-to-r from-[#1B3A5F] to-[#2A4A6F] hover:from-[#2A4A6F] hover:to-[#1B3A5F]"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {submitMutation.isPending ? 'Submitting...' : 'Submit for Approval'}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          {/* Resource selector */}
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Resource:</label>
            <select
              value={selectedResourceId || ''}
              onChange={(e) => {
                setSelectedResourceId(e.target.value);
                setEditedHours({});
              }}
              className="px-4 py-2 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-[#F7941D]/20 focus:border-[#F7941D]"
            >
              {resources.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.firstName} {r.lastName} ({r.employeeId})
                </option>
              ))}
            </select>
          </div>

          {/* Week navigation */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={goToPreviousWeek} className="rounded-xl">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button variant="outline" onClick={goToCurrentWeek} className="rounded-xl">
              <Calendar className="h-4 w-4 mr-2" />
              Today
            </Button>
            <span className="px-4 py-2 bg-white border border-gray-200 rounded-xl font-medium text-[#1B3A5F]">
              {format(currentWeek, 'MMM d')} - {format(addDays(currentWeek, 6), 'MMM d, yyyy')}
            </span>
            <Button variant="ghost" size="icon" onClick={goToNextWeek} className="rounded-xl">
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Timesheet Grid */}
        <Card className="shadow-lg border-0 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-[#1B3A5F] to-[#2A5A8F] text-white py-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Weekly Timesheet
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="w-10 h-10 border-4 border-gray-200 border-t-[#F7941D] rounded-full animate-spin mx-auto"></div>
                  <p className="mt-3 text-gray-500">Loading timesheet...</p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-64">
                        Project
                      </th>
                      {weekDays.map((day) => (
                        <th key={day.toISOString()} className="px-2 py-3 text-center text-sm font-semibold text-gray-700 min-w-[80px]">
                          <div>{format(day, 'EEE')}</div>
                          <div className="text-xs text-gray-500 font-normal">{format(day, 'MMM d')}</div>
                        </th>
                      ))}
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 bg-gray-100 w-20">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {weeklyData?.entries.map((entry, idx) => (
                      <motion.tr
                        key={entry.projectId}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="border-b border-gray-100 hover:bg-gray-50/50"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${entry.isBillable ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
                            <div>
                              <p className="font-medium text-gray-900">{entry.projectName}</p>
                              <p className="text-xs text-gray-500">{entry.clientName} • {entry.projectCode}</p>
                            </div>
                          </div>
                        </td>
                        {weekDays.map((day) => {
                          const dateStr = format(day, 'yyyy-MM-dd');
                          const hours = getHours(entry.projectId, dateStr);
                          const entryStatus = entry.days[dateStr]?.status;
                          const isLocked = entryStatus === 'APPROVED' || entryStatus === 'SUBMITTED';
                          
                          return (
                            <td key={day.toISOString()} className="px-2 py-3 text-center">
                              <input
                                type="number"
                                min="0"
                                max="24"
                                step="0.5"
                                value={hours || ''}
                                onChange={(e) => handleHoursChange(entry.projectId, dateStr, parseFloat(e.target.value) || 0)}
                                disabled={!isEditable || isLocked}
                                className={`w-16 px-2 py-1.5 text-center text-sm rounded-lg border transition-all
                                  ${isLocked 
                                    ? 'bg-gray-100 text-gray-500 border-gray-200 cursor-not-allowed' 
                                    : hours > 0 
                                      ? 'bg-blue-50 border-blue-200 text-blue-700 font-medium' 
                                      : 'bg-white border-gray-200 text-gray-700'
                                  }
                                  ${!isLocked && 'focus:ring-2 focus:ring-[#F7941D]/20 focus:border-[#F7941D]'}
                                `}
                              />
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 text-center bg-gray-50 font-semibold text-[#1B3A5F]">
                          {calculateProjectTotal(entry.projectId).toFixed(1)}
                        </td>
                      </motion.tr>
                    ))}

                    {/* Add project row */}
                    {isEditable && (
                      <tr className="border-b border-gray-100">
                        <td colSpan={9} className="px-4 py-3">
                          <Button variant="ghost" className="text-[#F7941D] hover:text-[#E8830C] hover:bg-orange-50">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Project
                          </Button>
                        </td>
                      </tr>
                    )}

                    {/* Daily totals row */}
                    <tr className="bg-gray-100 font-semibold">
                      <td className="px-4 py-3 text-gray-700">Daily Total</td>
                      {weekDays.map((day) => {
                        const dateStr = format(day, 'yyyy-MM-dd');
                        const total = calculateDailyTotal(dateStr);
                        const isOvertime = total > 8;
                        
                        return (
                          <td key={day.toISOString()} className={`px-2 py-3 text-center ${isOvertime ? 'text-amber-600' : 'text-[#1B3A5F]'}`}>
                            {total.toFixed(1)}
                            {isOvertime && <AlertTriangle className="h-3 w-3 inline ml-1" />}
                          </td>
                        );
                      })}
                      <td className={`px-4 py-3 text-center bg-[#1B3A5F] text-white ${calculateWeeklyTotal() < 40 ? 'ring-2 ring-amber-400' : ''}`}>
                        {calculateWeeklyTotal().toFixed(1)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="shadow-md border-0">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Hours</p>
                  <p className="text-2xl font-bold text-[#1B3A5F]">{calculateWeeklyTotal().toFixed(1)}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-md border-0">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Billable Hours</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    {weeklyData?.totals.billable?.toFixed(1) || '0.0'}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-md border-0">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Non-Billable</p>
                  <p className="text-2xl font-bold text-gray-600">
                    {weeklyData?.totals.nonBillable?.toFixed(1) || '0.0'}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-gray-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-md border-0">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Target</p>
                  <p className={`text-2xl font-bold ${calculateWeeklyTotal() >= 40 ? 'text-emerald-600' : 'text-amber-600'}`}>
                    40.0
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${calculateWeeklyTotal() >= 40 ? 'bg-emerald-50' : 'bg-amber-50'}`}>
                  {calculateWeeklyTotal() >= 40 ? (
                    <CheckCircle className="h-6 w-6 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="h-6 w-6 text-amber-600" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}

