/**
 * Workflow Templates Component
 * Pre-built workflow templates for common approval processes
 */

import { useState } from 'react';
import { 
  FileCheck, 
  Users, 
  DollarSign, 
  Clock, 
  GitBranch,
  Building2,
  Shield,
  Briefcase,
  CheckCircle,
  ArrowRight,
  Copy,
  Edit,
  Eye,
  Zap,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider 
} from '@/components/ui/tooltip';

// Template Types
export interface WorkflowStep {
  id: string;
  name: string;
  type: 'approval' | 'notification' | 'conditional' | 'parallel' | 'auto';
  description?: string;
  approverType?: 'user' | 'role' | 'manager' | 'dynamic';
  approverValue?: string;
  condition?: string;
  timeoutHours?: number;
  escalationEnabled?: boolean;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: 'hr' | 'finance' | 'operations' | 'it' | 'general';
  complexity: 'simple' | 'moderate' | 'complex';
  estimatedTime: string;
  icon: React.ElementType;
  steps: WorkflowStep[];
  tags: string[];
  usageCount?: number;
}

// Pre-built Templates
const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'simple-approval',
    name: 'Simple Approval',
    description: 'Single-step approval workflow for straightforward requests',
    category: 'general',
    complexity: 'simple',
    estimatedTime: '1-2 days',
    icon: CheckCircle,
    tags: ['basic', 'single-approver'],
    usageCount: 245,
    steps: [
      {
        id: 'step-1',
        name: 'Manager Approval',
        type: 'approval',
        approverType: 'manager',
        timeoutHours: 48,
        escalationEnabled: true,
      },
    ],
  },
  {
    id: 'two-level-approval',
    name: 'Two-Level Approval',
    description: 'Sequential approval by manager and then department head',
    category: 'general',
    complexity: 'simple',
    estimatedTime: '2-3 days',
    icon: GitBranch,
    tags: ['multi-level', 'sequential'],
    usageCount: 189,
    steps: [
      {
        id: 'step-1',
        name: 'Direct Manager Approval',
        type: 'approval',
        approverType: 'manager',
        timeoutHours: 24,
      },
      {
        id: 'step-2',
        name: 'Department Head Approval',
        type: 'approval',
        approverType: 'role',
        approverValue: 'DEPARTMENT_HEAD',
        timeoutHours: 48,
      },
    ],
  },
  {
    id: 'budget-approval',
    name: 'Budget-Based Approval',
    description: 'Approval chain based on request value with escalation thresholds',
    category: 'finance',
    complexity: 'moderate',
    estimatedTime: '2-5 days',
    icon: DollarSign,
    tags: ['budget', 'conditional', 'finance'],
    usageCount: 156,
    steps: [
      {
        id: 'step-1',
        name: 'Manager Approval',
        type: 'approval',
        approverType: 'manager',
        timeoutHours: 24,
      },
      {
        id: 'step-2',
        name: 'Finance Review',
        type: 'conditional',
        condition: 'request.value > 50000',
        description: 'Required for requests over ₹50,000',
      },
      {
        id: 'step-3',
        name: 'CFO Approval',
        type: 'conditional',
        condition: 'request.value > 500000',
        description: 'Required for requests over ₹5,00,000',
      },
    ],
  },
  {
    id: 'resource-allocation',
    name: 'Resource Allocation',
    description: 'Multi-stakeholder approval for resource allocation requests',
    category: 'hr',
    complexity: 'moderate',
    estimatedTime: '3-5 days',
    icon: Users,
    tags: ['allocation', 'multi-stakeholder'],
    usageCount: 134,
    steps: [
      {
        id: 'step-1',
        name: 'Project Manager Approval',
        type: 'approval',
        approverType: 'dynamic',
        approverValue: 'request.projectManager',
        timeoutHours: 24,
      },
      {
        id: 'step-2',
        name: 'Resource Manager Approval',
        type: 'approval',
        approverType: 'role',
        approverValue: 'RESOURCE_MANAGER',
        timeoutHours: 24,
      },
      {
        id: 'step-3',
        name: 'Notify Stakeholders',
        type: 'notification',
        description: 'Send notification to all stakeholders',
      },
    ],
  },
  {
    id: 'contract-approval',
    name: 'Contract Approval',
    description: 'Comprehensive contract review with legal and finance sign-off',
    category: 'operations',
    complexity: 'complex',
    estimatedTime: '5-10 days',
    icon: FileCheck,
    tags: ['contract', 'legal', 'finance', 'compliance'],
    usageCount: 98,
    steps: [
      {
        id: 'step-1',
        name: 'Account Manager Review',
        type: 'approval',
        approverType: 'dynamic',
        approverValue: 'contract.accountManager',
        timeoutHours: 24,
      },
      {
        id: 'step-2',
        name: 'Parallel Review',
        type: 'parallel',
        description: 'Legal and Finance review simultaneously',
      },
      {
        id: 'step-2a',
        name: 'Legal Review',
        type: 'approval',
        approverType: 'role',
        approverValue: 'LEGAL_TEAM',
        timeoutHours: 72,
      },
      {
        id: 'step-2b',
        name: 'Finance Review',
        type: 'approval',
        approverType: 'role',
        approverValue: 'FINANCE_TEAM',
        timeoutHours: 72,
      },
      {
        id: 'step-3',
        name: 'Executive Sign-off',
        type: 'conditional',
        condition: 'contract.value > 1000000',
        description: 'Required for contracts over ₹10L',
      },
    ],
  },
  {
    id: 'leave-request',
    name: 'Leave Request',
    description: 'Standard leave approval workflow with auto-update',
    category: 'hr',
    complexity: 'simple',
    estimatedTime: '1-2 days',
    icon: Clock,
    tags: ['leave', 'hr', 'time-off'],
    usageCount: 312,
    steps: [
      {
        id: 'step-1',
        name: 'Manager Approval',
        type: 'approval',
        approverType: 'manager',
        timeoutHours: 24,
        escalationEnabled: true,
      },
      {
        id: 'step-2',
        name: 'Update Leave Balance',
        type: 'auto',
        description: 'Automatically update leave balance on approval',
      },
      {
        id: 'step-3',
        name: 'Calendar Update',
        type: 'auto',
        description: 'Add to team calendar',
      },
    ],
  },
  {
    id: 'vendor-onboarding',
    name: 'Vendor Onboarding',
    description: 'Complete vendor onboarding with compliance checks',
    category: 'operations',
    complexity: 'complex',
    estimatedTime: '7-14 days',
    icon: Building2,
    tags: ['vendor', 'onboarding', 'compliance'],
    usageCount: 67,
    steps: [
      {
        id: 'step-1',
        name: 'Business Justification',
        type: 'approval',
        approverType: 'manager',
        timeoutHours: 48,
      },
      {
        id: 'step-2',
        name: 'Compliance Check',
        type: 'approval',
        approverType: 'role',
        approverValue: 'COMPLIANCE_OFFICER',
        timeoutHours: 72,
      },
      {
        id: 'step-3',
        name: 'Security Assessment',
        type: 'approval',
        approverType: 'role',
        approverValue: 'SECURITY_TEAM',
        timeoutHours: 120,
      },
      {
        id: 'step-4',
        name: 'Finance Setup',
        type: 'auto',
        description: 'Create vendor in finance system',
      },
      {
        id: 'step-5',
        name: 'Final Approval',
        type: 'approval',
        approverType: 'role',
        approverValue: 'PROCUREMENT_HEAD',
        timeoutHours: 48,
      },
    ],
  },
  {
    id: 'access-request',
    name: 'IT Access Request',
    description: 'System access request with security approval',
    category: 'it',
    complexity: 'moderate',
    estimatedTime: '1-3 days',
    icon: Shield,
    tags: ['access', 'security', 'it'],
    usageCount: 178,
    steps: [
      {
        id: 'step-1',
        name: 'Manager Approval',
        type: 'approval',
        approverType: 'manager',
        timeoutHours: 24,
      },
      {
        id: 'step-2',
        name: 'Data Owner Approval',
        type: 'conditional',
        condition: 'request.accessLevel === "sensitive"',
        description: 'Required for sensitive data access',
      },
      {
        id: 'step-3',
        name: 'IT Security Review',
        type: 'approval',
        approverType: 'role',
        approverValue: 'IT_SECURITY',
        timeoutHours: 48,
      },
      {
        id: 'step-4',
        name: 'Provision Access',
        type: 'auto',
        description: 'Auto-provision access rights',
      },
    ],
  },
];

// Category configuration
const CATEGORY_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  hr: { label: 'HR', color: 'bg-purple-100 text-purple-700', icon: Users },
  finance: { label: 'Finance', color: 'bg-green-100 text-green-700', icon: DollarSign },
  operations: { label: 'Operations', color: 'bg-blue-100 text-blue-700', icon: Briefcase },
  it: { label: 'IT', color: 'bg-orange-100 text-orange-700', icon: Shield },
  general: { label: 'General', color: 'bg-gray-100 text-gray-700', icon: CheckCircle },
};

const COMPLEXITY_CONFIG: Record<string, { label: string; color: string }> = {
  simple: { label: 'Simple', color: 'bg-green-100 text-green-700' },
  moderate: { label: 'Moderate', color: 'bg-yellow-100 text-yellow-700' },
  complex: { label: 'Complex', color: 'bg-red-100 text-red-700' },
};

interface WorkflowTemplatesProps {
  onSelect?: (template: WorkflowTemplate) => void;
  onCustomize?: (template: WorkflowTemplate) => void;
  selectedCategory?: string;
  searchQuery?: string;
}

export function WorkflowTemplates({ 
  onSelect, 
  onCustomize,
  selectedCategory = 'all',
  searchQuery = '',
}: WorkflowTemplatesProps) {
  const [previewTemplate, setPreviewTemplate] = useState<WorkflowTemplate | null>(null);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [copyName, setCopyName] = useState('');

  // Filter templates
  const filteredTemplates = WORKFLOW_TEMPLATES.filter(template => {
    if (selectedCategory !== 'all' && template.category !== selectedCategory) {
      return false;
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        template.name.toLowerCase().includes(query) ||
        template.description.toLowerCase().includes(query) ||
        template.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }
    return true;
  });

  const handleCopyTemplate = () => {
    if (previewTemplate && copyName.trim()) {
      const newTemplate = {
        ...previewTemplate,
        id: `custom-${Date.now()}`,
        name: copyName,
      };
      onCustomize?.(newTemplate);
      setCopyDialogOpen(false);
      setCopyName('');
      setPreviewTemplate(null);
    }
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Category filters */}
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            className="cursor-pointer"
          >
            All Templates
          </Badge>
          {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
            const Icon = config.icon;
            return (
              <Badge
                key={key}
                variant={selectedCategory === key ? 'default' : 'outline'}
                className={cn('cursor-pointer', selectedCategory !== key && config.color)}
              >
                <Icon className="w-3 h-3 mr-1" />
                {config.label}
              </Badge>
            );
          })}
        </div>

        {/* Templates grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map(template => (
            <TemplateCard
              key={template.id}
              template={template}
              onPreview={() => setPreviewTemplate(template)}
              onSelect={() => onSelect?.(template)}
              onCustomize={() => {
                setPreviewTemplate(template);
                setCopyName(`${template.name} (Copy)`);
                setCopyDialogOpen(true);
              }}
            />
          ))}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No templates match your search criteria
          </div>
        )}

        {/* Preview Dialog */}
        <Dialog open={!!previewTemplate && !copyDialogOpen} onOpenChange={() => setPreviewTemplate(null)}>
          <DialogContent className="max-w-2xl">
            {previewTemplate && (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <previewTemplate.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <DialogTitle>{previewTemplate.name}</DialogTitle>
                      <DialogDescription>{previewTemplate.description}</DialogDescription>
                    </div>
                  </div>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="flex gap-2">
                    <Badge className={CATEGORY_CONFIG[previewTemplate.category].color}>
                      {CATEGORY_CONFIG[previewTemplate.category].label}
                    </Badge>
                    <Badge className={COMPLEXITY_CONFIG[previewTemplate.complexity].color}>
                      {COMPLEXITY_CONFIG[previewTemplate.complexity].label}
                    </Badge>
                    <Badge variant="outline">
                      <Clock className="w-3 h-3 mr-1" />
                      {previewTemplate.estimatedTime}
                    </Badge>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Workflow Steps</h4>
                    <div className="space-y-2">
                      {previewTemplate.steps.map((step, idx) => (
                        <WorkflowStepPreview key={step.id} step={step} index={idx} />
                      ))}
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setPreviewTemplate(null)}>
                    Close
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setCopyName(`${previewTemplate.name} (Copy)`);
                      setCopyDialogOpen(true);
                    }}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Customize
                  </Button>
                  <Button onClick={() => {
                    onSelect?.(previewTemplate);
                    setPreviewTemplate(null);
                  }}>
                    <Zap className="w-4 h-4 mr-2" />
                    Use Template
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Copy/Customize Dialog */}
        <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Customize Template</DialogTitle>
              <DialogDescription>
                Create a copy of this template to customize
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              <Label htmlFor="template-name">Template Name</Label>
              <Input
                id="template-name"
                value={copyName}
                onChange={(e) => setCopyName(e.target.value)}
                placeholder="Enter template name"
                className="mt-2"
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setCopyDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCopyTemplate} disabled={!copyName.trim()}>
                <Edit className="w-4 h-4 mr-2" />
                Create & Edit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}

interface TemplateCardProps {
  template: WorkflowTemplate;
  onPreview: () => void;
  onSelect: () => void;
  onCustomize: () => void;
}

function TemplateCard({ template, onPreview, onSelect, onCustomize }: TemplateCardProps) {
  const Icon = template.icon;
  const categoryConfig = CATEGORY_CONFIG[template.category];

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div className="flex gap-1">
            <Badge variant="outline" className={categoryConfig.color}>
              {categoryConfig.label}
            </Badge>
          </div>
        </div>
        <CardTitle className="text-lg mt-2">{template.name}</CardTitle>
        <CardDescription className="line-clamp-2">
          {template.description}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Badge className={COMPLEXITY_CONFIG[template.complexity].color} variant="outline">
            {COMPLEXITY_CONFIG[template.complexity].label}
          </Badge>
          <span>•</span>
          <span>{template.steps.length} steps</span>
          <span>•</span>
          <Clock className="w-3 h-3" />
          <span>{template.estimatedTime}</span>
        </div>

        <div className="flex flex-wrap gap-1 mb-4">
          {template.tags.slice(0, 3).map(tag => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>

        <div className="flex gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={onPreview}>
                <Eye className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Preview</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={onCustomize}>
                <Settings className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Customize</TooltipContent>
          </Tooltip>
          
          <Button size="sm" className="flex-1" onClick={onSelect}>
            Use Template
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface WorkflowStepPreviewProps {
  step: WorkflowStep;
  index: number;
}

function WorkflowStepPreview({ step, index }: WorkflowStepPreviewProps) {
  const getStepIcon = () => {
    switch (step.type) {
      case 'approval': return CheckCircle;
      case 'notification': return Zap;
      case 'conditional': return GitBranch;
      case 'parallel': return Users;
      case 'auto': return Settings;
      default: return CheckCircle;
    }
  };
  
  const Icon = getStepIcon();
  
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
        {index + 1}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-gray-500" />
          <span className="font-medium">{step.name}</span>
          <Badge variant="outline" className="text-xs capitalize">
            {step.type}
          </Badge>
        </div>
        {step.description && (
          <p className="text-sm text-gray-500 mt-1">{step.description}</p>
        )}
        {step.timeoutHours && (
          <p className="text-xs text-gray-400 mt-1">
            Timeout: {step.timeoutHours}h
            {step.escalationEnabled && ' (with escalation)'}
          </p>
        )}
      </div>
    </div>
  );
}

export default WorkflowTemplates;
