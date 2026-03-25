/**
 * Enhanced Workflow Builder Component
 * Drag-and-drop workflow configuration with condition builder
 */

import { useState, useCallback } from 'react';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from '@hello-pangea/dnd';
import {
  Plus,
  Trash2,
  GripVertical,
  Settings,
  ChevronDown,
  ChevronRight,
  Bell,
  GitBranch,
  Play,
  CheckCircle,
  Copy,
  Zap,
  Code,
  Users,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

// Types
export interface WorkflowStep {
  id: string;
  name: string;
  type: 'approval' | 'notification' | 'condition' | 'action' | 'trigger';
  config: StepConfig;
  position: number;
}

export interface StepConfig {
  // Approval step
  approverType?: 'role' | 'user' | 'group' | 'dynamic';
  approverId?: string;
  approverRole?: string;
  requiredApprovals?: number;
  allowDelegation?: boolean;
  
  // Notification step
  notificationType?: 'email' | 'sms' | 'push' | 'webhook';
  recipients?: string[];
  template?: string;
  
  // Condition step
  conditions?: Condition[];
  conditionLogic?: 'and' | 'or';
  trueBranch?: string;
  falseBranch?: string;
  
  // Action step
  actionType?: 'update_field' | 'send_webhook' | 'create_task' | 'schedule';
  actionConfig?: Record<string, unknown>;
  
  // Trigger step
  triggerType?: 'manual' | 'schedule' | 'event' | 'webhook';
  triggerConfig?: Record<string, unknown>;
  
  // Common
  slaHours?: number;
  escalationEnabled?: boolean;
  description?: string;
}

export interface Condition {
  id: string;
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in';
  value: string | number | string[];
}

export interface WorkflowBuilderProps {
  steps: WorkflowStep[];
  onStepsChange: (steps: WorkflowStep[]) => void;
  availableFields: { id: string; name: string; type: string }[];
  availableRoles: { id: string; name: string }[];
  availableUsers: { id: string; name: string }[];
  onSave: () => void;
  onCancel: () => void;
}

// Step type configurations
const STEP_TYPES = [
  { type: 'trigger', label: 'Trigger', icon: Play, color: 'bg-purple-100 text-purple-600' },
  { type: 'approval', label: 'Approval', icon: CheckCircle, color: 'bg-green-100 text-green-600' },
  { type: 'notification', label: 'Notification', icon: Bell, color: 'bg-blue-100 text-blue-600' },
  { type: 'condition', label: 'Condition', icon: GitBranch, color: 'bg-yellow-100 text-yellow-600' },
  { type: 'action', label: 'Action', icon: Zap, color: 'bg-orange-100 text-orange-600' },
] as const;

export function WorkflowBuilder({
  steps,
  onStepsChange,
  availableFields,
  availableRoles,
  availableUsers,
  onSave,
  onCancel,
}: WorkflowBuilderProps) {
  const [selectedStep, setSelectedStep] = useState<WorkflowStep | null>(null);
  const [stepDialogOpen, setStepDialogOpen] = useState(false);
  const [conditionDialogOpen, setConditionDialogOpen] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  // Handle drag and drop
  const handleDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return;

    const reordered = Array.from(steps);
    const [removed] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, removed);

    // Update positions
    const updated = reordered.map((step, index) => ({
      ...step,
      position: index,
    }));

    onStepsChange(updated);
  }, [steps, onStepsChange]);

  // Add new step
  const handleAddStep = (type: WorkflowStep['type']) => {
    const newStep: WorkflowStep = {
      id: `step-${Date.now()}`,
      name: `New ${type.charAt(0).toUpperCase() + type.slice(1)} Step`,
      type,
      config: {},
      position: steps.length,
    };
    
    onStepsChange([...steps, newStep]);
    setSelectedStep(newStep);
    setStepDialogOpen(true);
  };

  // Update step
  const handleUpdateStep = (stepId: string, updates: Partial<WorkflowStep>) => {
    onStepsChange(
      steps.map(step => 
        step.id === stepId ? { ...step, ...updates } : step
      )
    );
  };

  // Delete step
  const handleDeleteStep = (stepId: string) => {
    onStepsChange(steps.filter(step => step.id !== stepId));
  };

  // Duplicate step
  const handleDuplicateStep = (step: WorkflowStep) => {
    const newStep: WorkflowStep = {
      ...step,
      id: `step-${Date.now()}`,
      name: `${step.name} (Copy)`,
      position: steps.length,
    };
    onStepsChange([...steps, newStep]);
  };

  // Toggle step expansion
  const toggleExpanded = (stepId: string) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepId)) {
      newExpanded.delete(stepId);
    } else {
      newExpanded.add(stepId);
    }
    setExpandedSteps(newExpanded);
  };

  return (
    <div className="flex h-[calc(100vh-200px)]">
      {/* Left Panel - Step List */}
      <div className="w-80 border-r bg-gray-50 p-4 overflow-y-auto">
        <div className="mb-4">
          <h3 className="font-semibold text-lg">Workflow Steps</h3>
          <p className="text-sm text-gray-500">Drag to reorder steps</p>
        </div>

        {/* Add Step Button */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="w-full mb-4">
              <Plus className="w-4 h-4 mr-2" />
              Add Step
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-48">
            {STEP_TYPES.map(({ type, label, icon: Icon }) => (
              <DropdownMenuItem 
                key={type} 
                onClick={() => handleAddStep(type as WorkflowStep['type'])}
              >
                <Icon className="w-4 h-4 mr-2" />
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Step List with Drag and Drop */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="workflow-steps">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-2"
              >
                {steps.map((step, index) => (
                  <Draggable key={step.id} draggableId={step.id} index={index}>
                    {(provided, snapshot) => (
                      <StepCard
                        ref={provided.innerRef}
                        step={step}
                        isSelected={selectedStep?.id === step.id}
                        isDragging={snapshot.isDragging}
                        isExpanded={expandedSteps.has(step.id)}
                        dragHandleProps={provided.dragHandleProps || undefined}
                        draggableProps={provided.draggableProps}
                        onSelect={() => setSelectedStep(step)}
                        onToggleExpanded={() => toggleExpanded(step.id)}
                        onEdit={() => {
                          setSelectedStep(step);
                          setStepDialogOpen(true);
                        }}
                        onDelete={() => handleDeleteStep(step.id)}
                        onDuplicate={() => handleDuplicateStep(step)}
                      />
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        {steps.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Play className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>No steps added yet</p>
            <p className="text-sm">Click "Add Step" to begin</p>
          </div>
        )}
      </div>

      {/* Right Panel - Workflow Visualization */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold text-lg">Workflow Preview</h3>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={onSave}>
              Save Workflow
            </Button>
          </div>
        </div>

        {/* Workflow Flow Visualization */}
        <div className="space-y-4">
          {steps.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <GitBranch className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <h4 className="font-medium text-gray-600">Empty Workflow</h4>
                <p className="text-sm text-gray-500 mt-1">
                  Add steps from the left panel to build your workflow
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="relative">
              {/* Connector Line */}
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200 z-0" />
              
              {steps.map((step, index) => (
                <WorkflowStepVisualization
                  key={step.id}
                  step={step}
                  index={index}
                  isLast={index === steps.length - 1}
                  onEdit={() => {
                    setSelectedStep(step);
                    setStepDialogOpen(true);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Step Configuration Dialog */}
      <StepConfigDialog
        open={stepDialogOpen}
        onClose={() => setStepDialogOpen(false)}
        step={selectedStep}
        availableFields={availableFields}
        availableRoles={availableRoles}
        availableUsers={availableUsers}
        onSave={(updates) => {
          if (selectedStep) {
            handleUpdateStep(selectedStep.id, updates);
          }
          setStepDialogOpen(false);
        }}
        onOpenConditionBuilder={() => setConditionDialogOpen(true)}
      />

      {/* Condition Builder Dialog */}
      <ConditionBuilderDialog
        open={conditionDialogOpen}
        onClose={() => setConditionDialogOpen(false)}
        conditions={selectedStep?.config.conditions || []}
        logic={selectedStep?.config.conditionLogic || 'and'}
        availableFields={availableFields}
        onSave={(conditions, logic) => {
          if (selectedStep) {
            handleUpdateStep(selectedStep.id, {
              config: {
                ...selectedStep.config,
                conditions,
                conditionLogic: logic,
              },
            });
          }
          setConditionDialogOpen(false);
        }}
      />
    </div>
  );
}

interface StepCardProps {
  step: WorkflowStep;
  isSelected: boolean;
  isDragging: boolean;
  isExpanded: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  draggableProps?: React.HTMLAttributes<HTMLDivElement>;
  onSelect: () => void;
  onToggleExpanded: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

const StepCard = ({
  step,
  isSelected,
  isDragging,
  isExpanded,
  dragHandleProps,
  draggableProps,
  onSelect,
  onToggleExpanded,
  onEdit,
  onDelete,
  onDuplicate,
  ref,
}: StepCardProps & { ref?: React.Ref<HTMLDivElement> }) => {
  const stepType = STEP_TYPES.find(t => t.type === step.type);
  const Icon = stepType?.icon || Settings;

  return (
    <div
      ref={ref}
      {...draggableProps}
      className={cn(
        'bg-white rounded-lg border transition-all',
        isSelected && 'ring-2 ring-blue-500',
        isDragging && 'shadow-lg'
      )}
      onClick={onSelect}
    >
      <div className="p-3">
        <div className="flex items-center gap-2">
          <div
            {...dragHandleProps}
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded"
          >
            <GripVertical className="w-4 h-4 text-gray-400" />
          </div>
          
          <div className={cn('p-1.5 rounded', stepType?.color)}>
            <Icon className="w-4 h-4" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">{step.name}</div>
            <div className="text-xs text-gray-500 capitalize">{step.type}</div>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpanded();
            }}
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </Button>
        </div>
        
        {isExpanded && (
          <div className="mt-3 pt-3 border-t">
            <div className="text-xs text-gray-500 mb-2">
              {step.config.description || 'No description'}
            </div>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Settings className="w-3 h-3 mr-1" />
                Configure
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDuplicate}>
                <Copy className="w-3 h-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDelete}>
                <Trash2 className="w-3 h-3 text-red-500" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface WorkflowStepVisualizationProps {
  step: WorkflowStep;
  index: number;
  isLast: boolean;
  onEdit: () => void;
}

function WorkflowStepVisualization({ step, index, onEdit }: WorkflowStepVisualizationProps) {
  const stepType = STEP_TYPES.find(t => t.type === step.type);
  const Icon = stepType?.icon || Settings;

  return (
    <div className="relative flex items-start gap-4 pb-4">
      {/* Step Node */}
      <div className={cn(
        'relative z-10 w-16 h-16 rounded-full flex items-center justify-center',
        stepType?.color,
        'ring-4 ring-white'
      )}>
        <Icon className="w-6 h-6" />
      </div>
      
      {/* Step Details Card */}
      <Card className="flex-1 hover:shadow-md transition-shadow cursor-pointer" onClick={onEdit}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <Badge variant="outline" className="mb-2">
                Step {index + 1}
              </Badge>
              <h4 className="font-medium">{step.name}</h4>
              <p className="text-sm text-gray-500 mt-1">
                {step.config.description || getStepDescription(step)}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
              <Settings className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Step-specific preview */}
          {step.type === 'condition' && step.config.conditions && (
            <div className="mt-3 p-2 bg-gray-50 rounded text-sm">
              <code>
                {step.config.conditions.map((c, i) => (
                  <span key={c.id}>
                    {i > 0 && ` ${step.config.conditionLogic?.toUpperCase()} `}
                    {c.field} {c.operator} {JSON.stringify(c.value)}
                  </span>
                ))}
              </code>
            </div>
          )}
          
          {step.type === 'approval' && step.config.approverRole && (
            <div className="mt-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">
                Approver: {step.config.approverRole}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function getStepDescription(step: WorkflowStep): string {
  switch (step.type) {
    case 'trigger':
      return `Triggered by ${step.config.triggerType || 'manual action'}`;
    case 'approval':
      return `Requires approval from ${step.config.approverRole || 'assigned approver'}`;
    case 'notification':
      return `Send ${step.config.notificationType || 'notification'} to recipients`;
    case 'condition':
      return `Branch based on ${step.config.conditions?.length || 0} conditions`;
    case 'action':
      return `Execute ${step.config.actionType || 'action'}`;
    default:
      return 'Configure this step';
  }
}

interface StepConfigDialogProps {
  open: boolean;
  onClose: () => void;
  step: WorkflowStep | null;
  availableFields: { id: string; name: string; type: string }[];
  availableRoles: { id: string; name: string }[];
  availableUsers: { id: string; name: string }[];
  onSave: (updates: Partial<WorkflowStep>) => void;
  onOpenConditionBuilder: () => void;
}

function StepConfigDialog({
  open,
  onClose,
  step,
  availableRoles,
  onSave,
  onOpenConditionBuilder,
}: StepConfigDialogProps) {
  const [formData, setFormData] = useState<Partial<WorkflowStep>>(step || {});

  if (!step) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg" preventDismiss>
        <DialogHeader>
          <DialogTitle>Configure {step.type} Step</DialogTitle>
          <DialogDescription>
            Set up the behavior for this workflow step
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div>
            <Label>Step Name</Label>
            <Input
              value={formData.name || step.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="mt-1"
            />
          </div>
          
          <div>
            <Label>Description</Label>
            <Textarea
              value={formData.config?.description || step.config.description || ''}
              onChange={(e) => setFormData({
                ...formData,
                config: { ...formData.config, description: e.target.value }
              })}
              className="mt-1"
              rows={2}
            />
          </div>

          {/* Type-specific configuration */}
          {step.type === 'approval' && (
            <>
              <div>
                <Label>Approver Type</Label>
                <Select
                  value={formData.config?.approverType || step.config.approverType || 'role'}
                  onValueChange={(value) => setFormData({
                    ...formData,
                    config: { ...formData.config, approverType: value as StepConfig['approverType'] }
                  })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="role">By Role</SelectItem>
                    <SelectItem value="user">Specific User</SelectItem>
                    <SelectItem value="group">User Group</SelectItem>
                    <SelectItem value="dynamic">Dynamic (from request)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Approver Role</Label>
                <Select
                  value={formData.config?.approverRole || step.config.approverRole}
                  onValueChange={(value) => setFormData({
                    ...formData,
                    config: { ...formData.config, approverRole: value }
                  })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select role..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoles.map(role => (
                      <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>SLA (hours)</Label>
                <Input
                  type="number"
                  value={formData.config?.slaHours || step.config.slaHours || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    config: { ...formData.config, slaHours: parseInt(e.target.value) }
                  })}
                  className="mt-1"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>Allow Delegation</Label>
                  <p className="text-sm text-gray-500">Approver can delegate to others</p>
                </div>
                <Switch
                  checked={formData.config?.allowDelegation ?? step.config.allowDelegation}
                  onCheckedChange={(checked) => setFormData({
                    ...formData,
                    config: { ...formData.config, allowDelegation: checked }
                  })}
                />
              </div>
            </>
          )}

          {step.type === 'notification' && (
            <>
              <div>
                <Label>Notification Type</Label>
                <Select
                  value={formData.config?.notificationType || step.config.notificationType || 'email'}
                  onValueChange={(value) => setFormData({
                    ...formData,
                    config: { ...formData.config, notificationType: value as StepConfig['notificationType'] }
                  })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="push">Push Notification</SelectItem>
                    <SelectItem value="webhook">Webhook</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Template</Label>
                <Select
                  value={formData.config?.template || step.config.template}
                  onValueChange={(value) => setFormData({
                    ...formData,
                    config: { ...formData.config, template: value }
                  })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select template..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approval_request">Approval Request</SelectItem>
                    <SelectItem value="status_update">Status Update</SelectItem>
                    <SelectItem value="reminder">Reminder</SelectItem>
                    <SelectItem value="escalation">Escalation Notice</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {step.type === 'condition' && (
            <div>
              <Label>Conditions</Label>
              <Button
                variant="outline"
                className="w-full mt-2"
                onClick={onOpenConditionBuilder}
              >
                <Code className="w-4 h-4 mr-2" />
                Open Condition Builder
              </Button>
              {step.config.conditions && step.config.conditions.length > 0 && (
                <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                  {step.config.conditions.length} condition(s) configured
                </div>
              )}
            </div>
          )}

          {step.type === 'trigger' && (
            <div>
              <Label>Trigger Type</Label>
              <Select
                value={formData.config?.triggerType || step.config.triggerType || 'manual'}
                onValueChange={(value) => setFormData({
                  ...formData,
                  config: { ...formData.config, triggerType: value as StepConfig['triggerType'] }
                })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual Start</SelectItem>
                  <SelectItem value="schedule">Scheduled</SelectItem>
                  <SelectItem value="event">On Event</SelectItem>
                  <SelectItem value="webhook">Webhook Trigger</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {step.type === 'action' && (
            <div>
              <Label>Action Type</Label>
              <Select
                value={formData.config?.actionType || step.config.actionType || 'update_field'}
                onValueChange={(value) => setFormData({
                  ...formData,
                  config: { ...formData.config, actionType: value as StepConfig['actionType'] }
                })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="update_field">Update Field</SelectItem>
                  <SelectItem value="send_webhook">Send Webhook</SelectItem>
                  <SelectItem value="create_task">Create Task</SelectItem>
                  <SelectItem value="schedule">Schedule Follow-up</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(formData)}>Save Step</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ConditionBuilderDialogProps {
  open: boolean;
  onClose: () => void;
  conditions: Condition[];
  logic: 'and' | 'or';
  availableFields: { id: string; name: string; type: string }[];
  onSave: (conditions: Condition[], logic: 'and' | 'or') => void;
}

function ConditionBuilderDialog({
  open,
  onClose,
  conditions: initialConditions,
  logic: initialLogic,
  availableFields,
  onSave,
}: ConditionBuilderDialogProps) {
  const [conditions, setConditions] = useState<Condition[]>(initialConditions);
  const [logic, setLogic] = useState<'and' | 'or'>(initialLogic);

  const addCondition = () => {
    setConditions([
      ...conditions,
      {
        id: `cond-${Date.now()}`,
        field: availableFields[0]?.id || '',
        operator: 'equals',
        value: '',
      },
    ]);
  };

  const updateCondition = (id: string, updates: Partial<Condition>) => {
    setConditions(conditions.map(c => 
      c.id === id ? { ...c, ...updates } : c
    ));
  };

  const removeCondition = (id: string) => {
    setConditions(conditions.filter(c => c.id !== id));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl" preventDismiss>
        <DialogHeader>
          <DialogTitle>Condition Builder</DialogTitle>
          <DialogDescription>
            Define conditions that determine the workflow path
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="flex items-center gap-4">
            <Label>Match</Label>
            <Select value={logic} onValueChange={(v) => setLogic(v as 'and' | 'or')}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="and">ALL conditions</SelectItem>
                <SelectItem value="or">ANY condition</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            {conditions.map((condition, index) => (
              <div key={condition.id} className="flex items-center gap-2">
                {index > 0 && (
                  <Badge variant="outline" className="w-12 justify-center">
                    {logic.toUpperCase()}
                  </Badge>
                )}
                
                <Select
                  value={condition.field}
                  onValueChange={(v) => updateCondition(condition.id, { field: v })}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Field..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableFields.map(f => (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={condition.operator}
                  onValueChange={(v) => updateCondition(condition.id, { operator: v as Condition['operator'] })}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="equals">equals</SelectItem>
                    <SelectItem value="not_equals">not equals</SelectItem>
                    <SelectItem value="greater_than">greater than</SelectItem>
                    <SelectItem value="less_than">less than</SelectItem>
                    <SelectItem value="contains">contains</SelectItem>
                    <SelectItem value="in">in list</SelectItem>
                  </SelectContent>
                </Select>

                <Input
                  value={condition.value as string}
                  onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
                  placeholder="Value..."
                  className="flex-1"
                />

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeCondition(condition.id)}
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            ))}
          </div>

          <Button variant="outline" onClick={addCondition}>
            <Plus className="w-4 h-4 mr-2" />
            Add Condition
          </Button>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(conditions, logic)}>
            Save Conditions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default WorkflowBuilder;
