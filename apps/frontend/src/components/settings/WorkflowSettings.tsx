/**
 * Workflow Settings Component
 * Manage workflow templates, defaults, and SLA configuration
 */

import { useState } from 'react';
import {
  Settings,
  Clock,
  AlertTriangle,
  Plus,
  Edit,
  Trash2,
  Copy,
  ChevronRight,
  Users,
  CheckCircle,
  Calendar,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

// Types
export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  type: string;
  steps: WorkflowStep[];
  isDefault: boolean;
  isActive: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: 'approval' | 'notification' | 'condition' | 'action';
  approverRole?: string;
  slaHours?: number;
  escalationEnabled?: boolean;
}

export interface SLAConfig {
  id: string;
  name: string;
  workflowType: string;
  defaultSlaHours: number;
  escalationThresholdHours: number;
  autoEscalate: boolean;
  escalationRecipients: string[];
  businessHoursOnly: boolean;
}

export interface EscalationRule {
  id: string;
  name: string;
  triggerHours: number;
  action: 'notify' | 'reassign' | 'auto_approve';
  recipients: string[];
  isActive: boolean;
}

interface WorkflowSettingsProps {
  templates: WorkflowTemplate[];
  slaConfigs: SLAConfig[];
  escalationRules: EscalationRule[];
  onCreateTemplate: (template: Partial<WorkflowTemplate>) => void;
  onUpdateTemplate: (id: string, template: Partial<WorkflowTemplate>) => void;
  onDeleteTemplate: (id: string) => void;
  onDuplicateTemplate: (id: string) => void;
  onUpdateSLA: (id: string, config: Partial<SLAConfig>) => void;
  onUpdateEscalation: (id: string, rule: Partial<EscalationRule>) => void;
  onCreateEscalation: (rule: Partial<EscalationRule>) => void;
  onDeleteEscalation: (id: string) => void;
}

export function WorkflowSettings({
  templates,
  slaConfigs,
  escalationRules,
  onCreateTemplate,
  onUpdateTemplate,
  onDeleteTemplate,
  onDuplicateTemplate,
  onUpdateSLA,
  onUpdateEscalation,
  onCreateEscalation,
  onDeleteEscalation,
}: WorkflowSettingsProps) {
  const [activeTab, setActiveTab] = useState('templates');
  const [slaDialogOpen, setSlaDialogOpen] = useState(false);
  const [escalationDialogOpen, setEscalationDialogOpen] = useState(false);
  const [editingSLA, setEditingSLA] = useState<SLAConfig | null>(null);
  const [editingEscalation, setEditingEscalation] = useState<EscalationRule | null>(null);

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="sla">SLA Settings</TabsTrigger>
          <TabsTrigger value="escalation">Escalation Rules</TabsTrigger>
        </TabsList>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Workflow Templates
                  </CardTitle>
                  <CardDescription>
                    Manage pre-configured workflow templates for different request types
                  </CardDescription>
                </div>
                <Button onClick={() => onCreateTemplate({})}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Template
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {templates.map(template => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onEdit={() => onUpdateTemplate(template.id, {})}
                    onDelete={() => onDeleteTemplate(template.id)}
                    onDuplicate={() => onDuplicateTemplate(template.id)}
                    onToggleActive={(active) => onUpdateTemplate(template.id, { isActive: active })}
                    onSetDefault={() => onUpdateTemplate(template.id, { isDefault: true })}
                  />
                ))}
                
                {templates.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Settings className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No workflow templates configured</p>
                    <p className="text-sm">Create a template to standardize approval workflows</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Default Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Default Workflow Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Auto-assign Approver</Label>
                  <Select defaultValue="manager">
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manager">Direct Manager</SelectItem>
                      <SelectItem value="department_head">Department Head</SelectItem>
                      <SelectItem value="custom">Custom Assignment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Parallel Approval Threshold</Label>
                  <Select defaultValue="2">
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Require all approvers</SelectItem>
                      <SelectItem value="2">Require majority</SelectItem>
                      <SelectItem value="3">Require any one</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-4 border-t">
                <div>
                  <Label>Allow Self-Approval</Label>
                  <p className="text-sm text-gray-500">Requesters can approve their own requests</p>
                </div>
                <Switch />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>Require Comments on Rejection</Label>
                  <p className="text-sm text-gray-500">Approvers must provide a reason when rejecting</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SLA Tab */}
        <TabsContent value="sla" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                SLA Configuration
              </CardTitle>
              <CardDescription>
                Set service level agreements for different workflow types
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Workflow Type</TableHead>
                    <TableHead>Default SLA</TableHead>
                    <TableHead>Escalation</TableHead>
                    <TableHead>Business Hours</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slaConfigs.map(config => (
                    <TableRow key={config.id}>
                      <TableCell className="font-medium">{config.name}</TableCell>
                      <TableCell>{config.defaultSlaHours}h</TableCell>
                      <TableCell>
                        <Badge variant={config.autoEscalate ? 'default' : 'secondary'}>
                          {config.autoEscalate ? `Auto @ ${config.escalationThresholdHours}h` : 'Manual'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {config.businessHoursOnly ? 'Business Hours' : '24/7'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingSLA(config);
                            setSlaDialogOpen(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Business Hours */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Business Hours
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Time</Label>
                  <Input type="time" defaultValue="09:00" className="mt-1" />
                </div>
                <div>
                  <Label>End Time</Label>
                  <Input type="time" defaultValue="17:00" className="mt-1" />
                </div>
              </div>
              
              <div>
                <Label>Working Days</Label>
                <div className="flex gap-2 mt-2">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
                    <Badge
                      key={day}
                      variant={index < 5 ? 'default' : 'outline'}
                      className="cursor-pointer"
                    >
                      {day}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div>
                <Label>Timezone</Label>
                <Select defaultValue="utc">
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="utc">UTC</SelectItem>
                    <SelectItem value="est">Eastern Time (EST)</SelectItem>
                    <SelectItem value="pst">Pacific Time (PST)</SelectItem>
                    <SelectItem value="ist">India Standard Time (IST)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Escalation Tab */}
        <TabsContent value="escalation" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Escalation Rules
                  </CardTitle>
                  <CardDescription>
                    Configure automatic escalation for overdue approvals
                  </CardDescription>
                </div>
                <Button onClick={() => {
                  setEditingEscalation(null);
                  setEscalationDialogOpen(true);
                }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Rule
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {escalationRules.map(rule => (
                  <EscalationCard
                    key={rule.id}
                    rule={rule}
                    onEdit={() => {
                      setEditingEscalation(rule);
                      setEscalationDialogOpen(true);
                    }}
                    onDelete={() => onDeleteEscalation(rule.id)}
                    onToggle={(active) => onUpdateEscalation(rule.id, { isActive: active })}
                  />
                ))}
                
                {escalationRules.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <AlertTriangle className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No escalation rules configured</p>
                    <p className="text-sm">Create rules to handle overdue approvals automatically</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* SLA Edit Dialog */}
      <SLADialog
        open={slaDialogOpen}
        onClose={() => setSlaDialogOpen(false)}
        config={editingSLA}
        onSave={(data) => {
          if (editingSLA) {
            onUpdateSLA(editingSLA.id, data);
          }
          setSlaDialogOpen(false);
        }}
      />

      {/* Escalation Edit Dialog */}
      <EscalationDialog
        open={escalationDialogOpen}
        onClose={() => setEscalationDialogOpen(false)}
        rule={editingEscalation}
        onSave={(data) => {
          if (editingEscalation) {
            onUpdateEscalation(editingEscalation.id, data);
          } else {
            onCreateEscalation(data);
          }
          setEscalationDialogOpen(false);
        }}
      />
    </div>
  );
}

interface TemplateCardProps {
  template: WorkflowTemplate;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onToggleActive: (active: boolean) => void;
  onSetDefault: () => void;
}

function TemplateCard({ template, onEdit, onDelete, onDuplicate, onToggleActive, onSetDefault }: TemplateCardProps) {
  return (
    <div className={cn(
      'p-4 border rounded-lg',
      template.isDefault && 'border-blue-200 bg-blue-50',
      !template.isActive && 'opacity-60'
    )}>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{template.name}</span>
            {template.isDefault && <Badge variant="default">Default</Badge>}
            <Badge variant={template.isActive ? 'outline' : 'secondary'}>
              {template.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <p className="text-sm text-gray-500 mt-1">{template.description}</p>
          
          {/* Step Preview */}
          <div className="flex items-center gap-1 mt-3">
            {template.steps.slice(0, 4).map((step, index) => (
              <div key={step.id} className="flex items-center">
                <Badge variant="outline" className="text-xs">
                  {step.name}
                </Badge>
                {index < template.steps.length - 1 && index < 3 && (
                  <ChevronRight className="w-3 h-3 text-gray-400 mx-1" />
                )}
              </div>
            ))}
            {template.steps.length > 4 && (
              <span className="text-xs text-gray-500">+{template.steps.length - 4} more</span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">{template.usageCount} uses</span>
          <Switch
            checked={template.isActive}
            onCheckedChange={onToggleActive}
          />
          <Button variant="ghost" size="icon" onClick={onDuplicate}>
            <Copy className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onEdit}>
            <Edit className="w-4 h-4" />
          </Button>
          {!template.isDefault && (
            <Button variant="ghost" size="icon" onClick={onDelete}>
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          )}
        </div>
      </div>
      
      {!template.isDefault && (
        <div className="mt-3 pt-3 border-t">
          <Button variant="outline" size="sm" onClick={onSetDefault}>
            Set as Default
          </Button>
        </div>
      )}
    </div>
  );
}

interface EscalationCardProps {
  rule: EscalationRule;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: (active: boolean) => void;
}

function EscalationCard({ rule, onEdit, onDelete, onToggle }: EscalationCardProps) {
  const getActionIcon = () => {
    switch (rule.action) {
      case 'notify': return <Users className="w-4 h-4" />;
      case 'reassign': return <ChevronRight className="w-4 h-4" />;
      case 'auto_approve': return <CheckCircle className="w-4 h-4" />;
    }
  };

  const getActionLabel = () => {
    switch (rule.action) {
      case 'notify': return 'Notify';
      case 'reassign': return 'Reassign';
      case 'auto_approve': return 'Auto-approve';
    }
  };

  return (
    <div className={cn(
      'p-4 border rounded-lg flex items-center justify-between',
      !rule.isActive && 'opacity-60 bg-gray-50'
    )}>
      <div className="flex items-center gap-4">
        <div className={cn(
          'p-2 rounded-lg',
          rule.isActive ? 'bg-yellow-100' : 'bg-gray-100'
        )}>
          <Clock className="w-5 h-5 text-yellow-600" />
        </div>
        
        <div>
          <div className="font-medium">{rule.name}</div>
          <div className="text-sm text-gray-500 flex items-center gap-2 mt-1">
            <span>After {rule.triggerHours}h</span>
            <ChevronRight className="w-3 h-3" />
            <Badge variant="outline" className="flex items-center gap-1">
              {getActionIcon()}
              {getActionLabel()}
            </Badge>
            {rule.recipients.length > 0 && (
              <span>→ {rule.recipients.length} recipient(s)</span>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <Switch checked={rule.isActive} onCheckedChange={onToggle} />
        <Button variant="ghost" size="icon" onClick={onEdit}>
          <Edit className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onDelete}>
          <Trash2 className="w-4 h-4 text-red-500" />
        </Button>
      </div>
    </div>
  );
}

interface SLADialogProps {
  open: boolean;
  onClose: () => void;
  config: SLAConfig | null;
  onSave: (data: Partial<SLAConfig>) => void;
}

function SLADialog({ open, onClose, config, onSave }: SLADialogProps) {
  const [formData, setFormData] = useState<Partial<SLAConfig>>(config || {});

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent preventDismiss>
        <DialogHeader>
          <DialogTitle>Edit SLA Configuration</DialogTitle>
          <DialogDescription>
            Configure service level agreement for {config?.name}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div>
            <Label>Default SLA (hours)</Label>
            <Input
              type="number"
              value={formData.defaultSlaHours || ''}
              onChange={(e) => setFormData({ ...formData, defaultSlaHours: parseInt(e.target.value) })}
              className="mt-1"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label>Auto Escalate</Label>
              <p className="text-sm text-gray-500">Automatically escalate overdue items</p>
            </div>
            <Switch
              checked={formData.autoEscalate}
              onCheckedChange={(checked: boolean) => setFormData({ ...formData, autoEscalate: checked })}
            />
          </div>
          
          {formData.autoEscalate && (
            <div>
              <Label>Escalation Threshold (hours)</Label>
              <Input
                type="number"
                value={formData.escalationThresholdHours || ''}
                onChange={(e) => setFormData({ ...formData, escalationThresholdHours: parseInt(e.target.value) })}
                className="mt-1"
              />
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <div>
              <Label>Business Hours Only</Label>
              <p className="text-sm text-gray-500">Only count business hours towards SLA</p>
            </div>
            <Switch
              checked={formData.businessHoursOnly}
              onCheckedChange={(checked: boolean) => setFormData({ ...formData, businessHoursOnly: checked })}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(formData)}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface EscalationDialogProps {
  open: boolean;
  onClose: () => void;
  rule: EscalationRule | null;
  onSave: (data: Partial<EscalationRule>) => void;
}

function EscalationDialog({ open, onClose, rule, onSave }: EscalationDialogProps) {
  const [formData, setFormData] = useState<Partial<EscalationRule>>(rule || {
    name: '',
    triggerHours: 24,
    action: 'notify',
    recipients: [],
    isActive: true,
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent preventDismiss>
        <DialogHeader>
          <DialogTitle>{rule ? 'Edit Escalation Rule' : 'Create Escalation Rule'}</DialogTitle>
          <DialogDescription>
            Configure when and how to escalate overdue approvals
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div>
            <Label>Rule Name</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="24h Escalation"
              className="mt-1"
            />
          </div>
          
          <div>
            <Label>Trigger After (hours)</Label>
            <Input
              type="number"
              value={formData.triggerHours || ''}
              onChange={(e) => setFormData({ ...formData, triggerHours: parseInt(e.target.value) })}
              className="mt-1"
            />
          </div>
          
          <div>
            <Label>Action</Label>
            <Select
              value={formData.action}
              onValueChange={(value) => 
                setFormData({ ...formData, action: value as 'notify' | 'reassign' | 'auto_approve' })
              }
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="notify">Notify stakeholders</SelectItem>
                <SelectItem value="reassign">Reassign to backup</SelectItem>
                <SelectItem value="auto_approve">Auto-approve</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={() => onSave(formData)}
            disabled={!formData.name || !formData.triggerHours}
          >
            {rule ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default WorkflowSettings;
