import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  Edit,
  Mail,
  Phone,
  MapPin,
  Building2,
  Calendar,
  Briefcase,
  Award,
  TrendingUp,
  Clock,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import { cn, formatDate } from '@/lib/utils';
import MainLayout from '@/components/layout/MainLayout';

interface ResourceDetail {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  designation: string;
  band: string;
  department?: string;
  employmentType: 'FTE' | 'CONTRACTOR' | 'INTERN';
  status: 'ACTIVE' | 'INACTIVE' | 'NOTICE';
  dateOfJoining: string;
  capacity: number;
  benchSince?: string;
  practice?: { id: string; name: string };
  location?: { id: string; name: string };
  manager?: { id: string; firstName: string; lastName: string; email: string };
  isOnBench: boolean;
  currentUtilization: number;
  availableCapacity: number;
  skills: Array<{
    proficiency: string;
    yearsExp?: number;
    certified: boolean;
    skill: {
      id: string;
      name: string;
      category?: { name: string };
    };
  }>;
  allocations: Array<{
    id: string;
    role: string;
    percentage: number;
    startDate: string;
    endDate: string;
    status: string;
    project: {
      id: string;
      code: string;
      name: string;
      client?: { name: string };
    };
  }>;
}

export default function ResourceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ['resource', id],
    queryFn: () => api.get<{ data: ResourceDetail }>(`/resources/${id}`),
    enabled: !!id,
  });

  const resource = data?.data;

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </MainLayout>
    );
  }

  if (error || !resource) {
    return (
      <MainLayout>
        <div className="flex h-64 flex-col items-center justify-center">
          <p className="text-muted-foreground">Resource not found</p>
          <Button variant="link" onClick={() => navigate('/resources')}>
            ← Back to Resources
          </Button>
        </div>
      </MainLayout>
    );
  }

  const proficiencyColors: Record<string, string> = {
    BEGINNER: 'bg-slate-100 text-slate-700',
    INTERMEDIATE: 'bg-blue-100 text-blue-700',
    ADVANCED: 'bg-purple-100 text-purple-700',
    EXPERT: 'bg-emerald-100 text-emerald-700',
  };

  return (
    <MainLayout>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            className="mb-4"
            onClick={() => navigate('/resources')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Resources
          </Button>

          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
                {resource.firstName.charAt(0)}
                {resource.lastName.charAt(0)}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-brand-charcoal">
                  {resource.firstName} {resource.lastName}
                </h1>
                <p className="text-muted-foreground">
                  {resource.designation} • {resource.band}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-xs font-medium',
                      resource.status === 'ACTIVE'
                        ? 'bg-emerald-100 text-emerald-700'
                        : resource.status === 'NOTICE'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-slate-100 text-slate-700'
                    )}
                  >
                    {resource.status}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {resource.employeeId}
                  </span>
                </div>
              </div>
            </div>
            <Button>
              <Edit className="mr-2 h-4 w-4" />
              Edit Resource
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contact & Work Info */}
            <Card>
              <CardHeader>
                <CardTitle>Information</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <InfoItem icon={Mail} label="Email" value={resource.email} />
                <InfoItem
                  icon={Phone}
                  label="Phone"
                  value={resource.phone || '-'}
                />
                <InfoItem
                  icon={Building2}
                  label="Practice"
                  value={resource.practice?.name || '-'}
                />
                <InfoItem
                  icon={MapPin}
                  label="Location"
                  value={resource.location?.name || '-'}
                />
                <InfoItem
                  icon={Calendar}
                  label="Joined"
                  value={formatDate(resource.dateOfJoining)}
                />
                <InfoItem
                  icon={Briefcase}
                  label="Type"
                  value={resource.employmentType}
                />
              </CardContent>
            </Card>

            {/* Allocations */}
            <Card>
              <CardHeader>
                <CardTitle>Current Allocations</CardTitle>
              </CardHeader>
              <CardContent>
                {resource.allocations.length === 0 ? (
                  <p className="py-8 text-center text-muted-foreground">
                    No active allocations
                  </p>
                ) : (
                  <div className="space-y-3">
                    {resource.allocations.map((alloc) => (
                      <div
                        key={alloc.id}
                        className="flex items-center justify-between rounded-lg border p-4"
                      >
                        <div>
                          <p className="font-medium">{alloc.project.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {alloc.project.client?.name || 'Internal'} • {alloc.role}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(alloc.startDate)} - {formatDate(alloc.endDate)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-primary">
                            {alloc.percentage}%
                          </p>
                          <span
                            className={cn(
                              'text-xs',
                              alloc.status === 'ACTIVE'
                                ? 'text-emerald-600'
                                : 'text-amber-600'
                            )}
                          >
                            {alloc.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Skills */}
            <Card>
              <CardHeader>
                <CardTitle>Skills</CardTitle>
              </CardHeader>
              <CardContent>
                {resource.skills.length === 0 ? (
                  <p className="py-8 text-center text-muted-foreground">
                    No skills added
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {resource.skills.map((rs, i) => (
                      <div
                        key={i}
                        className={cn(
                          'flex items-center gap-2 rounded-lg px-3 py-2',
                          proficiencyColors[rs.proficiency]
                        )}
                      >
                        <span className="font-medium">{rs.skill.name}</span>
                        {rs.certified && <Award className="h-4 w-4" />}
                        {rs.yearsExp && (
                          <span className="text-xs opacity-70">
                            {rs.yearsExp}y
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Utilization Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Utilization
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <p className="text-4xl font-bold text-primary">
                    {resource.currentUtilization}%
                  </p>
                  <p className="text-sm text-muted-foreground">
                    of {resource.capacity}% capacity
                  </p>
                  <div className="mt-4 h-3 w-full rounded-full bg-slate-200">
                    <div
                      className={cn(
                        'h-3 rounded-full',
                        resource.currentUtilization >= 80
                          ? 'bg-emerald-500'
                          : resource.currentUtilization >= 50
                          ? 'bg-amber-500'
                          : 'bg-red-500'
                      )}
                      style={{
                        width: `${Math.min(resource.currentUtilization, 100)}%`,
                      }}
                    />
                  </div>
                </div>

                {resource.isOnBench && resource.benchSince && (
                  <div className="mt-4 rounded-lg bg-amber-50 p-3 text-center">
                    <Clock className="mx-auto h-5 w-5 text-amber-600" />
                    <p className="mt-1 text-sm font-medium text-amber-700">
                      On Bench
                    </p>
                    <p className="text-xs text-amber-600">
                      Since {formatDate(resource.benchSince)}
                    </p>
                  </div>
                )}

                <div className="mt-4">
                  <p className="text-sm text-muted-foreground">
                    Available Capacity
                  </p>
                  <p className="text-2xl font-bold">
                    {resource.availableCapacity}%
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Manager */}
            {resource.manager && (
              <Card>
                <CardHeader>
                  <CardTitle>Reporting To</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-sm font-medium">
                      {resource.manager.firstName.charAt(0)}
                      {resource.manager.lastName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium">
                        {resource.manager.firstName} {resource.manager.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {resource.manager.email}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </motion.div>
    </MainLayout>
  );
}

// Info Item Component
function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-5 w-5 text-muted-foreground" />
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  );
}

