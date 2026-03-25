import { useCallback, useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { NotificationSettings } from '@/components/settings';
import type { NotificationPreferences } from '@/components/settings';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}

interface DisplaySettings {
  theme: 'light' | 'dark' | 'system';
  language: 'en' | 'hi';
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  currency: 'INR' | 'USD';
}

type PersonalTab = 'profile' | 'notifications' | 'display' | 'security';

const personalTabs: Array<{ id: PersonalTab; label: string; icon: string }> = [
  { id: 'profile', label: 'Profile', icon: '👤' },
  { id: 'notifications', label: 'Notifications', icon: '🔔' },
  { id: 'display', label: 'Display', icon: '🎨' },
  { id: 'security', label: 'Security', icon: '🔒' },
];

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<PersonalTab>('profile');
  const [saving, setSaving] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [profile, setProfile] = useState<UserProfile>({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: '',
  });

  const [display, setDisplay] = useState<DisplaySettings>({
    theme: 'light',
    language: 'en',
    dateFormat: 'DD/MM/YYYY',
    currency: 'INR',
  });

  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: '',
  });

  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>({
    channels: { email: true, push: false, inApp: true, sms: false },
    categories: {
      requests: { enabled: true, urgentOnly: false },
      approvals: { enabled: true, urgentOnly: false },
      contracts: { enabled: true, urgentOnly: false },
      resources: { enabled: true, urgentOnly: false },
      system: { enabled: true, urgentOnly: true },
    },
    quietHours: { enabled: false, start: '22:00', end: '08:00', timezone: 'Asia/Kolkata' },
    digest: { enabled: true, frequency: 'daily', time: '09:00' },
  });

  useEffect(() => {
    const savedDisplay = localStorage.getItem('displaySettings');
    if (savedDisplay) {
      setDisplay(JSON.parse(savedDisplay));
    }

    const savedPreferences = localStorage.getItem('notificationPreferencesRich');
    if (savedPreferences) {
      setNotificationPreferences(JSON.parse(savedPreferences));
    }
  }, []);

  const showToast = useCallback((type: 'success' | 'error', text: string) => {
    setSaveMessage({ type, text });
    setTimeout(() => setSaveMessage(null), 3000);
  }, []);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: UserProfile) => {
      await api.put('/auth/profile', data);
    },
    onSuccess: () => showToast('success', 'Profile updated successfully!'),
    onError: () => showToast('error', 'Failed to update profile'),
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      await api.post('/auth/change-password', data);
    },
    onSuccess: () => {
      setPasswords({ current: '', new: '', confirm: '' });
      showToast('success', 'Password changed successfully!');
    },
    onError: () => showToast('error', 'Failed to change password'),
  });

  async function handleSaveProfile() {
    setSaving(true);
    try {
      await updateProfileMutation.mutateAsync(profile);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveDisplay() {
    setSaving(true);
    try {
      localStorage.setItem('displaySettings', JSON.stringify(display));
      showToast('success', 'Display settings saved!');
    } finally {
      setSaving(false);
    }
  }

  function handleChangePassword() {
    if (!passwords.current || !passwords.new || !passwords.confirm) {
      showToast('error', 'All password fields are required');
      return;
    }

    if (passwords.new !== passwords.confirm) {
      showToast('error', 'New passwords do not match');
      return;
    }

    changePasswordMutation.mutate({
      currentPassword: passwords.current,
      newPassword: passwords.new,
    });
  }

  const handleSaveNotificationPreferences = useCallback((prefs: NotificationPreferences) => {
    setNotificationPreferences(prefs);
    localStorage.setItem('notificationPreferencesRich', JSON.stringify(prefs));
    showToast('success', 'Notification preferences saved!');
  }, [showToast]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Settings</h1>

      {saveMessage && (
        <div
          className={`mb-4 p-3 rounded-lg ${
            saveMessage.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {saveMessage.text}
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6">
        <div className="md:w-64 flex-shrink-0">
          <Card className="shadow-sm">
            <CardContent className="p-2">
              <nav className="space-y-1">
                {personalTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition ${
                      activeTab === tab.id
                        ? 'bg-primary text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <span>{tab.icon}</span>
                    <span className="font-medium">{tab.label}</span>
                  </button>
                ))}
              </nav>
            </CardContent>
          </Card>
        </div>

        <div className="flex-1">
          {activeTab === 'profile' && (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Profile Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                    <Input
                      value={profile.firstName}
                      onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                      placeholder="First Name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                    <Input
                      value={profile.lastName}
                      onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                      placeholder="Last Name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <Input value={profile.email} disabled className="bg-gray-50" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <Input
                      value={profile.phone || ''}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      placeholder="Phone Number"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t flex justify-end">
                  <Button onClick={handleSaveProfile} disabled={saving || updateProfileMutation.isPending}>
                    {saving ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'notifications' && (
            <NotificationSettings
              preferences={notificationPreferences}
              onSave={handleSaveNotificationPreferences}
              isLoading={saving}
            />
          )}

          {activeTab === 'display' && (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Display Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Theme</label>
                    <select
                      value={display.theme}
                      onChange={(e) => setDisplay({ ...display, theme: e.target.value as DisplaySettings['theme'] })}
                      className="w-full border rounded-lg px-3 py-2"
                    >
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                      <option value="system">System</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                    <select
                      value={display.language}
                      onChange={(e) => setDisplay({ ...display, language: e.target.value as DisplaySettings['language'] })}
                      className="w-full border rounded-lg px-3 py-2"
                    >
                      <option value="en">English</option>
                      <option value="hi">Hindi</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date Format</label>
                    <select
                      value={display.dateFormat}
                      onChange={(e) => setDisplay({ ...display, dateFormat: e.target.value as DisplaySettings['dateFormat'] })}
                      className="w-full border rounded-lg px-3 py-2"
                    >
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Display Currency</label>
                    <select
                      value={display.currency}
                      onChange={(e) => setDisplay({ ...display, currency: e.target.value as DisplaySettings['currency'] })}
                      className="w-full border rounded-lg px-3 py-2"
                    >
                      <option value="USD">US Dollar ($)</option>
                      <option value="INR">Indian Rupee (₹)</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 border-t flex justify-end">
                  <Button onClick={handleSaveDisplay} disabled={saving}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'security' && (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Security Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-2">Change Password</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Current Password</label>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        value={passwords.current}
                        onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">New Password</label>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        value={passwords.new}
                        onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Confirm New Password</label>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        value={passwords.confirm}
                        onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                      />
                    </div>
                    <Button
                      variant="outline"
                      onClick={handleChangePassword}
                      disabled={changePasswordMutation.isPending}
                    >
                      {changePasswordMutation.isPending ? 'Updating...' : 'Update Password'}
                    </Button>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-2">Two-Factor Authentication</h3>
                  <p className="text-sm text-gray-500 mb-3">Add an extra layer of security to your account</p>
                  <Button variant="outline" onClick={() => setShow2FAModal(true)}>
                    Enable 2FA
                  </Button>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-2">Active Sessions</h3>
                  <p className="text-sm text-gray-500 mb-3">Manage devices where you&apos;re currently logged in</p>
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center justify-between p-2 bg-white rounded border">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">💻</span>
                        <div>
                          <p className="text-sm font-medium">Current Session</p>
                          <p className="text-xs text-gray-500">This device • Active now</p>
                        </div>
                      </div>
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Active</span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                    Sign out all other sessions
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={show2FAModal} onOpenChange={setShow2FAModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Two-Factor Authentication</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <div className="flex gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-amber-800">Coming Soon</p>
                    <p className="text-sm text-amber-700">
                      Two-factor authentication will be available in a future update.
                      This will add an extra layer of security using authenticator apps like
                      Google Authenticator or Authy.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">How it will work:</h4>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>1. Install an authenticator app on your phone</p>
                  <p>2. Scan a QR code to link your account</p>
                  <p>3. Enter a 6-digit code from the app each time you log in</p>
                </div>
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShow2FAModal(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
