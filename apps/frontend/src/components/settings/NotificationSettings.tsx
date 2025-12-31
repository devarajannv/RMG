/**
 * Notification Settings Component
 * Manage notification preferences and delivery channels
 */

import { useState } from 'react';
import { 
  Bell, 
  Mail, 
  Smartphone, 
  Globe, 
  Settings,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

export interface NotificationPreferences {
  channels: {
    email: boolean;
    push: boolean;
    inApp: boolean;
    sms: boolean;
  };
  categories: {
    requests: { enabled: boolean; urgentOnly: boolean };
    approvals: { enabled: boolean; urgentOnly: boolean };
    contracts: { enabled: boolean; urgentOnly: boolean };
    resources: { enabled: boolean; urgentOnly: boolean };
    system: { enabled: boolean; urgentOnly: boolean };
  };
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
    timezone: string;
  };
  digest: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'never';
    time: string;
  };
}

interface NotificationSettingsProps {
  preferences: NotificationPreferences;
  onSave: (preferences: NotificationPreferences) => void;
  isLoading?: boolean;
}

export function NotificationSettings({ 
  preferences, 
  onSave, 
  isLoading 
}: NotificationSettingsProps) {
  const [localPrefs, setLocalPrefs] = useState(preferences);
  const [hasChanges, setHasChanges] = useState(false);

  const updatePrefs = <K extends keyof NotificationPreferences>(
    section: K,
    value: NotificationPreferences[K]
  ) => {
    setLocalPrefs(prev => ({ ...prev, [section]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    onSave(localPrefs);
    setHasChanges(false);
  };

  return (
    <div className="space-y-6">
      {/* Delivery Channels */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Delivery Channels
          </CardTitle>
          <CardDescription>
            Choose how you want to receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-gray-500" />
              <div>
                <Label>Email Notifications</Label>
                <p className="text-sm text-gray-500">Receive notifications via email</p>
              </div>
            </div>
            <Switch
              checked={localPrefs.channels.email}
              onCheckedChange={(checked: boolean) => 
                updatePrefs('channels', { ...localPrefs.channels, email: checked })
              }
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-gray-500" />
              <div>
                <Label>Push Notifications</Label>
                <p className="text-sm text-gray-500">Browser push notifications</p>
              </div>
            </div>
            <Switch
              checked={localPrefs.channels.push}
              onCheckedChange={(checked: boolean) => 
                updatePrefs('channels', { ...localPrefs.channels, push: checked })
              }
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-gray-500" />
              <div>
                <Label>In-App Notifications</Label>
                <p className="text-sm text-gray-500">Show notifications in the app</p>
              </div>
            </div>
            <Switch
              checked={localPrefs.channels.inApp}
              onCheckedChange={(checked: boolean) => 
                updatePrefs('channels', { ...localPrefs.channels, inApp: checked })
              }
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Smartphone className="w-5 h-5 text-gray-500" />
              <div>
                <Label>SMS Notifications</Label>
                <p className="text-sm text-gray-500">Receive urgent alerts via SMS</p>
              </div>
            </div>
            <Switch
              checked={localPrefs.channels.sms}
              onCheckedChange={(checked: boolean) => 
                updatePrefs('channels', { ...localPrefs.channels, sms: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Notification Categories */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Notification Categories
          </CardTitle>
          <CardDescription>
            Configure which types of notifications you receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(localPrefs.categories).map(([category, settings]) => (
            <div key={category} className="flex items-center justify-between py-2">
              <div>
                <Label className="capitalize">{category}</Label>
                <p className="text-sm text-gray-500">
                  {getCategoryDescription(category)}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label className="text-sm text-gray-500">Urgent Only</Label>
                  <Switch
                    checked={settings.urgentOnly}
                    onCheckedChange={(checked: boolean) => 
                      updatePrefs('categories', {
                        ...localPrefs.categories,
                        [category]: { ...settings, urgentOnly: checked }
                      })
                    }
                    disabled={!settings.enabled}
                  />
                </div>
                <Switch
                  checked={settings.enabled}
                  onCheckedChange={(checked: boolean) => 
                    updatePrefs('categories', {
                      ...localPrefs.categories,
                      [category]: { ...settings, enabled: checked }
                    })
                  }
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Quiet Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {localPrefs.quietHours.enabled ? (
              <VolumeX className="w-5 h-5" />
            ) : (
              <Volume2 className="w-5 h-5" />
            )}
            Quiet Hours
          </CardTitle>
          <CardDescription>
            Set times when you don't want to be disturbed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Enable Quiet Hours</Label>
            <Switch
              checked={localPrefs.quietHours.enabled}
              onCheckedChange={(checked: boolean) => 
                updatePrefs('quietHours', { ...localPrefs.quietHours, enabled: checked })
              }
            />
          </div>
          
          {localPrefs.quietHours.enabled && (
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div>
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={localPrefs.quietHours.start}
                  onChange={(e) => 
                    updatePrefs('quietHours', { ...localPrefs.quietHours, start: e.target.value })
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={localPrefs.quietHours.end}
                  onChange={(e) => 
                    updatePrefs('quietHours', { ...localPrefs.quietHours, end: e.target.value })
                  }
                  className="mt-1"
                />
              </div>
              <div className="col-span-2">
                <Label>Timezone</Label>
                <Select
                  value={localPrefs.quietHours.timezone}
                  onValueChange={(value) => 
                    updatePrefs('quietHours', { ...localPrefs.quietHours, timezone: value })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Asia/Kolkata">India (IST)</SelectItem>
                    <SelectItem value="America/New_York">Eastern (EST)</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific (PST)</SelectItem>
                    <SelectItem value="Europe/London">London (GMT)</SelectItem>
                    <SelectItem value="UTC">UTC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Digest */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Email Digest
          </CardTitle>
          <CardDescription>
            Receive a summary of notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Enable Email Digest</Label>
            <Switch
              checked={localPrefs.digest.enabled}
              onCheckedChange={(checked: boolean) => 
                updatePrefs('digest', { ...localPrefs.digest, enabled: checked })
              }
            />
          </div>
          
          {localPrefs.digest.enabled && (
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div>
                <Label>Frequency</Label>
                <Select
                  value={localPrefs.digest.frequency}
                  onValueChange={(value) => 
                    updatePrefs('digest', { ...localPrefs.digest, frequency: value as 'daily' | 'weekly' | 'never' })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="never">Never</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Delivery Time</Label>
                <Input
                  type="time"
                  value={localPrefs.digest.time}
                  onChange={(e) => 
                    updatePrefs('digest', { ...localPrefs.digest, time: e.target.value })
                  }
                  className="mt-1"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      {hasChanges && (
        <div className="flex justify-end gap-2 sticky bottom-0 bg-white py-4 border-t">
          <Button variant="outline" onClick={() => {
            setLocalPrefs(preferences);
            setHasChanges(false);
          }}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      )}
    </div>
  );
}

function getCategoryDescription(category: string): string {
  const descriptions: Record<string, string> = {
    requests: 'New requests, status updates, and assignments',
    approvals: 'Approval requests and decisions',
    contracts: 'Contract expirations, renewals, and updates',
    resources: 'Resource allocations and availability changes',
    system: 'System updates, maintenance, and security alerts',
  };
  return descriptions[category] || '';
}

export default NotificationSettings;
