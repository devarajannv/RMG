import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import MainLayout from '@/components/layout/MainLayout';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Edit2, Shield, DollarSign, Users } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}

interface NotificationSettings {
  emailNotifications: boolean;
  benchAlerts: boolean;
  rolloffReminders: boolean;
  weeklyDigest: boolean;
}

interface DisplaySettings {
  theme: 'light' | 'dark' | 'system';
  language: 'en' | 'hi';
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  currency: 'INR' | 'USD';
}

interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  isBase: boolean;
  isActive: boolean;
}

interface ExchangeRate {
  id: string;
  fromCurrency: Currency;
  toCurrency: Currency;
  rate: number;
  effectiveFrom: string;
  effectiveTo?: string;
}

interface Role {
  id: string;
  name: string;
  description?: string;
  isSystem: boolean;
  level: number;
  _count?: { users: number };
}

type TabType = 'profile' | 'notifications' | 'display' | 'security' | 'organization' | 'currency' | 'roles';

// ============================================================================
// Main Component
// ============================================================================

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [profile, setProfile] = useState<UserProfile>({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: '',
  });

  const [notifications, setNotifications] = useState<NotificationSettings>({
    emailNotifications: true,
    benchAlerts: true,
    rolloffReminders: true,
    weeklyDigest: false,
  });

  const [display, setDisplay] = useState<DisplaySettings>({
    theme: 'light',
    language: 'en',
    dateFormat: 'DD/MM/YYYY',
    currency: 'INR',
  });

  const [saving, setSaving] = useState(false);

  // Currency queries
  const { data: currencies = [] } = useQuery<Currency[]>({
    queryKey: ['currencies'],
    queryFn: async () => {
      const res = await api.get<Currency[]>('/currency/currencies');
      return res as unknown as Currency[];
    },
    enabled: activeTab === 'currency',
  });

  const { data: exchangeRates = [] } = useQuery<ExchangeRate[]>({
    queryKey: ['exchangeRates'],
    queryFn: async () => {
      const res = await api.get<ExchangeRate[]>('/currency/exchange-rates');
      return res as unknown as ExchangeRate[];
    },
    enabled: activeTab === 'currency',
  });

  // Role queries
  const { data: roles = [] } = useQuery<Role[]>({
    queryKey: ['roles'],
    queryFn: async () => {
      const res = await api.get<Role[]>('/roles');
      return res as unknown as Role[];
    },
    enabled: activeTab === 'roles',
  });

  // Seed currencies mutation
  const seedCurrenciesMutation = useMutation({
    mutationFn: async () => {
      await api.post('/currency/currencies/seed');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currencies'] });
      queryClient.invalidateQueries({ queryKey: ['exchangeRates'] });
    },
  });

  async function handleSave() {
    setSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setSaving(false);
    alert('Settings saved successfully!');
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    { id: 'display', label: 'Display', icon: '🎨' },
    { id: 'security', label: 'Security', icon: '🔒' },
    { id: 'currency', label: 'Currency', icon: '💰' },
    { id: 'roles', label: 'Roles', icon: '🛡️' },
    { id: 'organization', label: 'Organization', icon: '🏢' },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 text-sm">
            Manage your account preferences and application settings
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:w-64 flex-shrink-0">
            <Card className="shadow-sm">
              <CardContent className="p-2">
                <nav className="space-y-1">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as TabType)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === tab.id
                          ? 'bg-primary text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <span className="text-lg">{tab.icon}</span>
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Content Area */}
          <div className="flex-1">
            {activeTab === 'profile' && (
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Profile Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-6 mb-6">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-2xl font-bold">
                      {profile.firstName[0]}{profile.lastName[0]}
                    </div>
                    <div>
                      <Button variant="outline" size="sm">Change Photo</Button>
                      <p className="text-xs text-gray-500 mt-1">JPG, PNG. Max 2MB</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        First Name
                      </label>
                      <Input
                        value={profile.firstName}
                        onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Last Name
                      </label>
                      <Input
                        value={profile.lastName}
                        onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <Input
                        type="email"
                        value={profile.email}
                        onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                        disabled
                      />
                      <p className="text-xs text-gray-500 mt-1">Contact admin to change email</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone
                      </label>
                      <Input
                        type="tel"
                        value={profile.phone}
                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                        placeholder="+91 98765 43210"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t flex justify-end">
                    <Button onClick={handleSave} disabled={saving}>
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'notifications' && (
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Notification Preferences</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { key: 'emailNotifications', label: 'Email Notifications', desc: 'Receive email updates for important events' },
                    { key: 'benchAlerts', label: 'Bench Alerts', desc: 'Get notified when resources go on bench' },
                    { key: 'rolloffReminders', label: 'Rolloff Reminders', desc: 'Reminders for upcoming project rolloffs' },
                    { key: 'weeklyDigest', label: 'Weekly Digest', desc: 'Weekly summary of utilization and bench metrics' },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{item.label}</p>
                        <p className="text-sm text-gray-500">{item.desc}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notifications[item.key as keyof NotificationSettings]}
                          onChange={(e) =>
                            setNotifications({ ...notifications, [item.key]: e.target.checked })
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                  ))}

                  <div className="pt-4 border-t flex justify-end">
                    <Button onClick={handleSave} disabled={saving}>
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
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
                    <Button onClick={handleSave} disabled={saving}>
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
                        <Input type="password" placeholder="••••••••" />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">New Password</label>
                        <Input type="password" placeholder="••••••••" />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Confirm New Password</label>
                        <Input type="password" placeholder="••••••••" />
                      </div>
                      <Button variant="outline">Update Password</Button>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-2">Two-Factor Authentication</h3>
                    <p className="text-sm text-gray-500 mb-3">
                      Add an extra layer of security to your account
                    </p>
                    <Button variant="outline">Enable 2FA</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'currency' && (
              <div className="space-y-6">
                <Card className="shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <DollarSign className="w-5 h-5" />
                      Currency Management
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => seedCurrenciesMutation.mutate()}
                      disabled={seedCurrenciesMutation.isPending}
                    >
                      {seedCurrenciesMutation.isPending ? 'Seeding...' : 'Seed Defaults'}
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {currencies.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <DollarSign className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p>No currencies configured</p>
                        <p className="text-sm">Click "Seed Defaults" to add standard currencies</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {currencies.map((currency: Currency) => (
                          <div
                            key={currency.id}
                            className={`flex items-center justify-between p-3 rounded-lg ${
                              currency.isBase ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{currency.symbol}</span>
                              <div>
                                <p className="font-medium">
                                  {currency.code} - {currency.name}
                                  {currency.isBase && (
                                    <span className="ml-2 text-xs bg-blue-500 text-white px-2 py-0.5 rounded">
                                      Base
                                    </span>
                                  )}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {currency.isActive ? 'Active' : 'Inactive'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="sm">
                                <Edit2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg">Exchange Rates</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {exchangeRates.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <p>No exchange rates configured</p>
                        <p className="text-sm">Exchange rates will be available after seeding currencies</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="text-left p-3 text-sm font-medium">From</th>
                              <th className="text-left p-3 text-sm font-medium">To</th>
                              <th className="text-right p-3 text-sm font-medium">Rate</th>
                              <th className="text-left p-3 text-sm font-medium">Effective</th>
                              <th className="text-right p-3 text-sm font-medium">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {exchangeRates.map((rate: ExchangeRate) => (
                              <tr key={rate.id}>
                                <td className="p-3">{rate.fromCurrency?.code}</td>
                                <td className="p-3">{rate.toCurrency?.code}</td>
                                <td className="p-3 text-right font-mono">{Number(rate.rate).toFixed(4)}</td>
                                <td className="p-3 text-sm text-gray-500">
                                  {new Date(rate.effectiveFrom).toLocaleDateString()}
                                </td>
                                <td className="p-3 text-right">
                                  <Button variant="ghost" size="sm">
                                    <Edit2 className="w-4 h-4" />
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'roles' && (
              <div className="space-y-6">
                <Card className="shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Shield className="w-5 h-5" />
                      Role Management
                    </CardTitle>
                    <Button size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Role
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {roles.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p>No roles configured</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {roles.map((role: Role) => (
                          <div
                            key={role.id}
                            className={`flex items-center justify-between p-4 rounded-lg ${
                              role.isSystem ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
                            }`}
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{role.name}</p>
                                {role.isSystem && (
                                  <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded">
                                    System
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-500">{role.description || 'No description'}</p>
                              <p className="text-xs text-gray-400 mt-1">
                                Level {role.level} • {role._count?.users || 0} users
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="sm">
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              {!role.isSystem && (
                                <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg">Permission Reference</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {[
                        { module: 'Resources', permissions: ['Create', 'Read', 'Update', 'Delete'] },
                        { module: 'Projects', permissions: ['Create', 'Read', 'Update', 'Delete'] },
                        { module: 'Allocations', permissions: ['Create', 'Read', 'Update', 'Approve'] },
                        { module: 'Timesheets', permissions: ['Create', 'Read', 'Update', 'Approve'] },
                        { module: 'Contracts', permissions: ['Create', 'Read', 'Update', 'Approve'] },
                        { module: 'Reports', permissions: ['Read', 'Export'] },
                      ].map((item) => (
                        <div key={item.module} className="p-3 bg-gray-50 rounded-lg">
                          <p className="font-medium text-sm mb-2">{item.module}</p>
                          <div className="flex flex-wrap gap-1">
                            {item.permissions.map((perm) => (
                              <span
                                key={perm}
                                className="text-xs bg-white border px-2 py-0.5 rounded"
                              >
                                {perm}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'organization' && (
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Organization Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">🏢</span>
                      <div>
                        <h3 className="font-bold text-gray-900">NewVision Software</h3>
                        <p className="text-sm text-gray-600">Enterprise Plan • Active</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500">Total Users</p>
                      <p className="text-2xl font-bold text-primary">127</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500">Active Resources</p>
                      <p className="text-2xl font-bold text-green-600">245</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500">Active Projects</p>
                      <p className="text-2xl font-bold text-blue-600">38</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500">Storage Used</p>
                      <p className="text-2xl font-bold text-amber-600">2.4 GB</p>
                    </div>
                  </div>

                  <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                    <p className="text-sm text-amber-800">
                      <strong>Admin Only:</strong> Organization settings can only be modified by administrators.
                      Contact your admin for changes.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
