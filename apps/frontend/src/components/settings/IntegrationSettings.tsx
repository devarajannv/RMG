/**
 * Integration Settings Component
 * Manage external integrations and webhooks
 */

import { useState } from 'react';
import { 
  Link2, 
  Plus, 
  Settings, 
  Trash2, 
  Edit,
  CheckCircle,
  XCircle,
  RefreshCw,
  ExternalLink,
  Copy,
  Eye,
  EyeOff,
  Webhook,
  Cloud,
  Database,
  Mail,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// Types
export interface Integration {
  id: string;
  name: string;
  type: 'webhook' | 'oauth' | 'api_key' | 'custom';
  provider: string;
  status: 'connected' | 'disconnected' | 'error';
  lastSync?: string;
  config?: Record<string, unknown>;
}

export interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  isActive: boolean;
  secret?: string;
  lastTriggered?: string;
  successRate?: number;
}

interface IntegrationSettingsProps {
  integrations: Integration[];
  webhooks: Webhook[];
  onConnectIntegration: (type: string) => void;
  onDisconnectIntegration: (id: string) => void;
  onCreateWebhook: (webhook: Partial<Webhook>) => void;
  onUpdateWebhook: (id: string, webhook: Partial<Webhook>) => void;
  onDeleteWebhook: (id: string) => void;
  onTestWebhook: (id: string) => Promise<boolean>;
}

// Available integration types
const INTEGRATION_TYPES = [
  { id: 'microsoft', name: 'Microsoft 365', icon: Cloud, description: 'Calendar, Teams, SharePoint' },
  { id: 'google', name: 'Google Workspace', icon: Cloud, description: 'Calendar, Drive, Gmail' },
  { id: 'slack', name: 'Slack', icon: Mail, description: 'Notifications and commands' },
  { id: 'jira', name: 'Jira', icon: Database, description: 'Issue tracking and sync' },
  { id: 'salesforce', name: 'Salesforce', icon: Database, description: 'CRM integration' },
  { id: 'sap', name: 'SAP', icon: Database, description: 'ERP integration' },
];

// Webhook event types
const WEBHOOK_EVENTS = [
  { category: 'Requests', events: ['request.created', 'request.updated', 'request.approved', 'request.rejected'] },
  { category: 'Resources', events: ['resource.created', 'resource.updated', 'resource.allocated'] },
  { category: 'Contracts', events: ['contract.created', 'contract.expiring', 'contract.renewed'] },
  { category: 'Projects', events: ['project.created', 'project.completed', 'project.budget_alert'] },
];

export function IntegrationSettings({
  integrations,
  webhooks,
  onConnectIntegration,
  onDisconnectIntegration,
  onCreateWebhook,
  onUpdateWebhook,
  onDeleteWebhook,
  onTestWebhook,
}: IntegrationSettingsProps) {
  const [webhookDialogOpen, setWebhookDialogOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);
  const [testingWebhook, setTestingWebhook] = useState<string | null>(null);

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Third-Party Integrations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="w-5 h-5" />
              Third-Party Integrations
            </CardTitle>
            <CardDescription>
              Connect external services to sync data and automate workflows
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {INTEGRATION_TYPES.map(intType => {
                const integration = integrations.find(i => i.provider === intType.id);
                const Icon = intType.icon;
                
                return (
                  <div
                    key={intType.id}
                    className={cn(
                      'p-4 border rounded-lg',
                      integration?.status === 'connected' && 'border-green-200 bg-green-50',
                      integration?.status === 'error' && 'border-red-200 bg-red-50',
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'p-2 rounded-lg',
                          integration?.status === 'connected' ? 'bg-green-100' : 'bg-gray-100'
                        )}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-medium">{intType.name}</div>
                          <div className="text-sm text-gray-500">{intType.description}</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 flex items-center justify-between">
                      {integration ? (
                        <>
                          <Badge variant={
                            integration.status === 'connected' ? 'default' :
                            integration.status === 'error' ? 'destructive' : 'secondary'
                          }>
                            {integration.status === 'connected' && <CheckCircle className="w-3 h-3 mr-1" />}
                            {integration.status === 'error' && <XCircle className="w-3 h-3 mr-1" />}
                            {integration.status}
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onDisconnectIntegration(integration.id)}
                          >
                            Disconnect
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => onConnectIntegration(intType.id)}
                        >
                          Connect
                        </Button>
                      )}
                    </div>
                    
                    {integration?.lastSync && (
                      <div className="mt-2 text-xs text-gray-500">
                        Last synced: {new Date(integration.lastSync).toLocaleString()}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Webhooks */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Webhook className="w-5 h-5" />
                  Webhooks
                </CardTitle>
                <CardDescription>
                  Send real-time notifications to external systems
                </CardDescription>
              </div>
              <Button onClick={() => {
                setEditingWebhook(null);
                setWebhookDialogOpen(true);
              }}>
                <Plus className="w-4 h-4 mr-2" />
                Add Webhook
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {webhooks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Webhook className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No webhooks configured</p>
                <p className="text-sm">Create a webhook to send events to external systems</p>
              </div>
            ) : (
              <div className="space-y-4">
                {webhooks.map(webhook => (
                  <WebhookCard
                    key={webhook.id}
                    webhook={webhook}
                    onEdit={() => {
                      setEditingWebhook(webhook);
                      setWebhookDialogOpen(true);
                    }}
                    onDelete={() => onDeleteWebhook(webhook.id)}
                    onTest={async () => {
                      setTestingWebhook(webhook.id);
                      await onTestWebhook(webhook.id);
                      setTestingWebhook(null);
                    }}
                    onToggle={(active) => onUpdateWebhook(webhook.id, { isActive: active })}
                    isTesting={testingWebhook === webhook.id}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* API Keys */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              API Access
            </CardTitle>
            <CardDescription>
              Manage API keys for programmatic access
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="font-medium">API Documentation</div>
                  <div className="text-sm text-gray-500">
                    Learn how to integrate with our API
                  </div>
                </div>
                <Button variant="outline" asChild>
                  <a href="/api-docs" target="_blank">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Docs
                  </a>
                </Button>
              </div>
              
              <div className="text-sm text-gray-500">
                Contact your administrator to request API access.
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Webhook Dialog */}
        <WebhookDialog
          open={webhookDialogOpen}
          onClose={() => setWebhookDialogOpen(false)}
          webhook={editingWebhook}
          onSave={(data) => {
            if (editingWebhook) {
              onUpdateWebhook(editingWebhook.id, data);
            } else {
              onCreateWebhook(data);
            }
            setWebhookDialogOpen(false);
          }}
        />
      </div>
    </TooltipProvider>
  );
}

interface WebhookCardProps {
  webhook: Webhook;
  onEdit: () => void;
  onDelete: () => void;
  onTest: () => void;
  onToggle: (active: boolean) => void;
  isTesting: boolean;
}

function WebhookCard({ webhook, onEdit, onDelete, onTest, onToggle, isTesting }: WebhookCardProps) {
  const [showSecret, setShowSecret] = useState(false);

  return (
    <div className={cn(
      'p-4 border rounded-lg',
      webhook.isActive ? 'border-gray-200' : 'border-gray-200 bg-gray-50'
    )}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{webhook.name}</span>
            <Badge variant={webhook.isActive ? 'default' : 'secondary'}>
              {webhook.isActive ? 'Active' : 'Inactive'}
            </Badge>
            {webhook.successRate !== undefined && (
              <Badge variant="outline">
                {webhook.successRate}% success
              </Badge>
            )}
          </div>
          <div className="text-sm text-gray-500 mt-1 font-mono truncate max-w-md">
            {webhook.url}
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {webhook.events.slice(0, 3).map(event => (
              <Badge key={event} variant="outline" className="text-xs">
                {event}
              </Badge>
            ))}
            {webhook.events.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{webhook.events.length - 3} more
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Switch
            checked={webhook.isActive}
            onCheckedChange={onToggle}
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onTest} disabled={isTesting}>
                <RefreshCw className={cn('w-4 h-4', isTesting && 'animate-spin')} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Test Webhook</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onEdit}>
                <Edit className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Edit</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onDelete}>
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete</TooltipContent>
          </Tooltip>
        </div>
      </div>
      
      {webhook.secret && (
        <div className="mt-3 pt-3 border-t">
          <div className="flex items-center gap-2">
            <Label className="text-xs text-gray-500">Secret:</Label>
            <code className="text-xs bg-gray-100 px-2 py-1 rounded">
              {showSecret ? webhook.secret : '••••••••••••••••'}
            </code>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setShowSecret(!showSecret)}
            >
              {showSecret ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => navigator.clipboard.writeText(webhook.secret || '')}
            >
              <Copy className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}
      
      {webhook.lastTriggered && (
        <div className="mt-2 text-xs text-gray-500">
          Last triggered: {new Date(webhook.lastTriggered).toLocaleString()}
        </div>
      )}
    </div>
  );
}

interface WebhookDialogProps {
  open: boolean;
  onClose: () => void;
  webhook: Webhook | null;
  onSave: (data: Partial<Webhook>) => void;
}

function WebhookDialog({ open, onClose, webhook, onSave }: WebhookDialogProps) {
  const [formData, setFormData] = useState<Partial<Webhook>>({
    name: webhook?.name || '',
    url: webhook?.url || '',
    events: webhook?.events || [],
    isActive: webhook?.isActive ?? true,
  });

  const handleEventToggle = (event: string) => {
    setFormData(prev => ({
      ...prev,
      events: prev.events?.includes(event)
        ? prev.events.filter(e => e !== event)
        : [...(prev.events || []), event]
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{webhook ? 'Edit Webhook' : 'Create Webhook'}</DialogTitle>
          <DialogDescription>
            Configure webhook endpoint and events to listen for
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div>
            <Label>Name</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="My Webhook"
              className="mt-1"
            />
          </div>
          
          <div>
            <Label>URL</Label>
            <Input
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              placeholder="https://example.com/webhook"
              className="mt-1"
            />
          </div>
          
          <div>
            <Label>Events</Label>
            <div className="mt-2 space-y-3 max-h-48 overflow-y-auto">
              {WEBHOOK_EVENTS.map(category => (
                <div key={category.category}>
                  <div className="text-sm font-medium text-gray-700 mb-1">
                    {category.category}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {category.events.map(event => (
                      <Badge
                        key={event}
                        variant={formData.events?.includes(event) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => handleEventToggle(event)}
                      >
                        {event.split('.')[1]}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={() => onSave(formData)}
            disabled={!formData.name || !formData.url || !formData.events?.length}
          >
            {webhook ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default IntegrationSettings;
