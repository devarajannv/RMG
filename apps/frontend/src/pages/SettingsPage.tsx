import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import MainLayout from '@/components/layout/MainLayout';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Edit2, Shield, DollarSign, Users, Search, FileText, ChevronLeft, ChevronRight, Building2, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter, ConfirmDialog } from '@/components/ui/dialog';
import { cn, formatDate } from '@/lib/utils';
import FunctionsTab from '@/components/settings/FunctionsTab';
import RequestTypesTab from '@/components/settings/RequestTypesTab';

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
  fromCurrencyId: string;
  toCurrencyId: string;
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
  permissions?: string[];
  _count?: { users: number };
}

interface CurrencyFormData {
  code: string;
  name: string;
  symbol: string;
  isBase: boolean;
  isActive: boolean;
}

interface ExchangeRateFormData {
  fromCurrencyId: string;
  toCurrencyId: string;
  rate: string;
  effectiveFrom: string;
}

interface RoleFormData {
  name: string;
  description: string;
  level: number;
  permissions: string[];
}

interface UserListItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  roles?: { role: Role }[];
}

interface UserFormData {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  status: 'ACTIVE' | 'INACTIVE';
  roleIds: string[];
}

interface AuditLogEntry {
  id: string;
  userId: string | null;
  user?: { firstName: string; lastName: string; email: string } | null;
  entityType: string;
  entityId: string;
  action: string;
  changes: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  timestamp: string;
}

interface OrganizationStats {
  tenant: { id: string; name: string; code: string; status: string; createdAt: string };
  users: { total: number; active: number; inactive: number };
  resources: { total: number; active: number; inactive: number; onBench: number };
  projects: { total: number; active: number; completed: number };
  clients: { total: number; active: number };
  storage: { documentsCount: number };
}

type TabType = 'profile' | 'notifications' | 'display' | 'security' | 'organization' | 'currency' | 'roles' | 'users' | 'functions' | 'request-types' | 'audit';

// ============================================================================
// Available Permissions
// ============================================================================

const AVAILABLE_PERMISSIONS = [
  'resources:create', 'resources:read', 'resources:update', 'resources:delete',
  'projects:create', 'projects:read', 'projects:update', 'projects:delete',
  'allocations:create', 'allocations:read', 'allocations:update', 'allocations:delete', 'allocations:approve',
  'timesheets:create', 'timesheets:read', 'timesheets:update', 'timesheets:approve',
  'contracts:create', 'contracts:read', 'contracts:update', 'contracts:delete', 'contracts:approve',
  'clients:create', 'clients:read', 'clients:update', 'clients:delete',
  'reports:read', 'reports:export',
  'settings:read', 'settings:update',
  'users:create', 'users:read', 'users:update', 'users:delete',
  'roles:create', 'roles:read', 'roles:update', 'roles:delete',
  'request-types:create', 'request-types:read', 'request-types:update', 'request-types:delete', 'request-types:clone',
  'request-templates:read', 'request-templates:import',
  'workflows:create', 'workflows:read', 'workflows:update', 'workflows:delete',
];

// ============================================================================
// Currency Form Modal
// ============================================================================

function CurrencyFormModal({
  isOpen,
  onClose,
  currency,
  onSave,
  isSaving,
}: {
  isOpen: boolean;
  onClose: () => void;
  currency?: Currency;
  onSave: (data: CurrencyFormData) => void;
  isSaving: boolean;
}) {
  const [formData, setFormData] = useState<CurrencyFormData>({
    code: '',
    name: '',
    symbol: '',
    isBase: false,
    isActive: true,
  });

  useEffect(() => {
    if (currency) {
      setFormData({
        code: currency.code,
        name: currency.name,
        symbol: currency.symbol,
        isBase: currency.isBase,
        isActive: currency.isActive,
      });
    } else {
      setFormData({
        code: '',
        name: '',
        symbol: '',
        isBase: false,
        isActive: true,
      });
    }
  }, [currency, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{currency ? 'Edit Currency' : 'Add Currency'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <DialogBody>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Currency Code *
                  </label>
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="USD"
                    maxLength={3}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Symbol *
                  </label>
                  <Input
                    value={formData.symbol}
                    onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                    placeholder="$"
                    maxLength={5}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Currency Name *
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="US Dollar"
                  required
                />
              </div>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isBase}
                    onChange={(e) => setFormData({ ...formData, isBase: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">Base Currency</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">Active</span>
                </label>
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : currency ? 'Update Currency' : 'Create Currency'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Exchange Rate Form Modal
// ============================================================================

function ExchangeRateFormModal({
  isOpen,
  onClose,
  exchangeRate,
  currencies,
  onSave,
  isSaving,
}: {
  isOpen: boolean;
  onClose: () => void;
  exchangeRate?: ExchangeRate;
  currencies: Currency[];
  onSave: (data: ExchangeRateFormData) => void;
  isSaving: boolean;
}) {
  const [formData, setFormData] = useState<ExchangeRateFormData>({
    fromCurrencyId: '',
    toCurrencyId: '',
    rate: '',
    effectiveFrom: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (exchangeRate) {
      setFormData({
        fromCurrencyId: exchangeRate.fromCurrencyId || exchangeRate.fromCurrency?.id || '',
        toCurrencyId: exchangeRate.toCurrencyId || exchangeRate.toCurrency?.id || '',
        rate: String(exchangeRate.rate),
        effectiveFrom: exchangeRate.effectiveFrom.split('T')[0],
      });
    } else {
      setFormData({
        fromCurrencyId: '',
        toCurrencyId: '',
        rate: '',
        effectiveFrom: new Date().toISOString().split('T')[0],
      });
    }
  }, [exchangeRate, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{exchangeRate ? 'Edit Exchange Rate' : 'Add Exchange Rate'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <DialogBody>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    From Currency *
                  </label>
                  <select
                    value={formData.fromCurrencyId}
                    onChange={(e) => setFormData({ ...formData, fromCurrencyId: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    required
                  >
                    <option value="">Select currency</option>
                    {currencies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} - {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    To Currency *
                  </label>
                  <select
                    value={formData.toCurrencyId}
                    onChange={(e) => setFormData({ ...formData, toCurrencyId: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    required
                  >
                    <option value="">Select currency</option>
                    {currencies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} - {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Exchange Rate *
                  </label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={formData.rate}
                    onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                    placeholder="1.0000"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Effective From *
                  </label>
                  <Input
                    type="date"
                    value={formData.effectiveFrom}
                    onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })}
                    required
                  />
                </div>
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : exchangeRate ? 'Update Rate' : 'Create Rate'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Role Form Modal
// ============================================================================

function RoleFormModal({
  isOpen,
  onClose,
  role,
  onSave,
  isSaving,
}: {
  isOpen: boolean;
  onClose: () => void;
  role?: Role;
  onSave: (data: RoleFormData) => void;
  isSaving: boolean;
}) {
  const [formData, setFormData] = useState<RoleFormData>({
    name: '',
    description: '',
    level: 100,
    permissions: [],
  });

  useEffect(() => {
    if (role) {
      setFormData({
        name: role.name,
        description: role.description || '',
        level: role.level,
        permissions: role.permissions || [],
      });
    } else {
      setFormData({
        name: '',
        description: '',
        level: 100,
        permissions: [],
      });
    }
  }, [role, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const togglePermission = (permission: string) => {
    if (formData.permissions.includes(permission)) {
      setFormData({
        ...formData,
        permissions: formData.permissions.filter((p) => p !== permission),
      });
    } else {
      setFormData({
        ...formData,
        permissions: [...formData.permissions, permission],
      });
    }
  };

  // Group permissions by module
  const groupedPermissions = AVAILABLE_PERMISSIONS.reduce((acc, perm) => {
    const [module] = perm.split(':');
    if (!acc[module]) acc[module] = [];
    acc[module].push(perm);
    return acc;
  }, {} as Record<string, string[]>);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{role ? 'Edit Role' : 'Create Role'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <DialogBody>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role Name *
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Manager"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Level (1-1000) *
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="1000"
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value) || 100 })}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Lower = higher authority</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Role description"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Permissions
                </label>
                <div className="max-h-64 overflow-y-auto border rounded-lg p-3 space-y-4">
                  {Object.entries(groupedPermissions).map(([module, perms]) => (
                    <div key={module}>
                      <p className="text-sm font-medium text-gray-600 capitalize mb-2">{module}</p>
                      <div className="flex flex-wrap gap-2">
                        {perms.map((perm) => {
                          const action = perm.split(':')[1];
                          const isSelected = formData.permissions.includes(perm);
                          return (
                            <button
                              key={perm}
                              type="button"
                              onClick={() => togglePermission(perm)}
                              className={`px-2 py-1 text-xs rounded border ${
                                isSelected
                                  ? 'bg-primary text-white border-primary'
                                  : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                              }`}
                            >
                              {action}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : role ? 'Update Role' : 'Create Role'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// User Form Modal
// ============================================================================

function UserFormModal({
  isOpen,
  onClose,
  user,
  roles,
  onSave,
  isSaving,
}: {
  isOpen: boolean;
  onClose: () => void;
  user?: UserListItem;
  roles: Role[];
  onSave: (data: UserFormData) => void;
  isSaving: boolean;
}) {
  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    status: 'ACTIVE',
    roleIds: [],
  });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        password: '', // Don't show existing password
        status: user.status as 'ACTIVE' | 'INACTIVE',
        roleIds: user.roles?.map((r) => r.role.id) || [],
      });
    } else {
      setFormData({
        email: '',
        firstName: '',
        lastName: '',
        password: '',
        status: 'ACTIVE',
        roleIds: [],
      });
    }
  }, [user, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // For updates, don't send password if empty
    const dataToSend = user && !formData.password 
      ? { ...formData, password: undefined } as unknown as UserFormData
      : formData;
    onSave(dataToSend);
  };

  const toggleRole = (roleId: string) => {
    setFormData((prev) => ({
      ...prev,
      roleIds: prev.roleIds.includes(roleId)
        ? prev.roleIds.filter((id) => id !== roleId)
        : [...prev.roleIds, roleId],
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{user ? 'Edit User' : 'Create User'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <DialogBody className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">First Name *</label>
                <Input
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                  placeholder="John"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Last Name *</label>
                <Input
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  required
                  placeholder="Doe"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Email *</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                placeholder="john.doe@company.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Password {user ? '(leave blank to keep existing)' : '*'}
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required={!user}
                  placeholder={user ? '••••••••' : 'Minimum 8 characters'}
                  minLength={user ? 0 : 8}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 px-2"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </Button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'ACTIVE' | 'INACTIVE' })}
                className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Roles</label>
              <div className="space-y-2 max-h-32 overflow-y-auto border rounded-md p-2">
                {roles.map((role) => (
                  <label key={role.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.roleIds.includes(role.id)}
                      onChange={() => toggleRole(role.id)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">{role.name}</span>
                    {role.description && (
                      <span className="text-xs text-gray-500">- {role.description}</span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : user ? 'Update User' : 'Create User'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  // Profile state
  const [profile, setProfile] = useState<UserProfile>({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: '',
  });

  // Notification state
  const [notifications, setNotifications] = useState<NotificationSettings>({
    emailNotifications: true,
    benchAlerts: true,
    rolloffReminders: true,
    weeklyDigest: false,
  });

  // Display state
  const [display, setDisplay] = useState<DisplaySettings>({
    theme: 'light',
    language: 'en',
    dateFormat: 'DD/MM/YYYY',
    currency: 'INR',
  });

  // Password state
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: '',
  });

  // Modal states
  const [currencyModalOpen, setCurrencyModalOpen] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState<Currency | undefined>();
  const [deletingCurrency, setDeletingCurrency] = useState<Currency | null>(null);

  const [exchangeRateModalOpen, setExchangeRateModalOpen] = useState(false);
  const [editingExchangeRate, setEditingExchangeRate] = useState<ExchangeRate | undefined>();
  const [deletingExchangeRate, setDeletingExchangeRate] = useState<ExchangeRate | null>(null);

  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | undefined>();
  const [deletingRole, setDeletingRole] = useState<Role | null>(null);

  // User management state
  const [userSearch, setUserSearch] = useState('');
  const [userRoleModalOpen, setUserRoleModalOpen] = useState(false);
  const [selectedUserForRole, setSelectedUserForRole] = useState<UserListItem | null>(null);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserListItem | undefined>();
  const [deletingUser, setDeletingUser] = useState<UserListItem | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<UserListItem | null>(null);
  const [newPassword, setNewPassword] = useState('');

  // Audit log state
  const [auditPage, setAuditPage] = useState(1);
  const [auditEntityFilter, setAuditEntityFilter] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('');

  // 2FA state
  const [show2FAModal, setShow2FAModal] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
      const res = await api.get<{ data: Role[] }>('/roles');
      return res.data || [];
    },
    enabled: activeTab === 'roles' || activeTab === 'users',
  });

  // Users query
  const { data: users = [] } = useQuery<UserListItem[]>({
    queryKey: ['users-list'],
    queryFn: async () => {
      const res = await api.get<{ data: UserListItem[] }>('/users?includeInactive=true');
      return res.data || [];
    },
    enabled: activeTab === 'users',
  });

  // Organization stats query
  const { data: orgStats } = useQuery<OrganizationStats>({
    queryKey: ['organization-stats'],
    queryFn: async () => {
      const res = await api.get<{ data: OrganizationStats }>('/organization/stats');
      return res.data;
    },
    enabled: activeTab === 'organization',
  });

  // Audit logs query
  const { data: auditData } = useQuery({
    queryKey: ['audit-logs', auditPage, auditEntityFilter, auditActionFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(auditPage), limit: '20' });
      if (auditEntityFilter) params.append('entityType', auditEntityFilter);
      if (auditActionFilter) params.append('action', auditActionFilter);
      const res = await api.get<{ data: AuditLogEntry[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>(`/audit-logs?${params}`);
      return res;
    },
    enabled: activeTab === 'audit',
  });

  // Audit entity types
  const { data: auditEntityTypes = [] } = useQuery<string[]>({
    queryKey: ['audit-entity-types'],
    queryFn: async () => {
      const res = await api.get<{ data: string[] }>('/audit-logs/entity-types');
      return res.data || [];
    },
    enabled: activeTab === 'audit',
  });

  // Filtered users
  const filteredUsers = users.filter(
    (u) =>
      u.firstName.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.lastName.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  // Seed currencies mutation
  const seedCurrenciesMutation = useMutation({
    mutationFn: async () => {
      await api.post('/currency/currencies/seed');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currencies'] });
      queryClient.invalidateQueries({ queryKey: ['exchangeRates'] });
      showMessage('success', 'Currencies seeded successfully!');
    },
    onError: () => {
      showMessage('error', 'Failed to seed currencies');
    },
  });

  // Currency mutations
  const createCurrencyMutation = useMutation({
    mutationFn: async (data: CurrencyFormData) => {
      await api.post('/currency/currencies', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currencies'] });
      setCurrencyModalOpen(false);
      setEditingCurrency(undefined);
      showMessage('success', 'Currency created successfully!');
    },
    onError: () => {
      showMessage('error', 'Failed to create currency');
    },
  });

  const updateCurrencyMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CurrencyFormData }) => {
      await api.put(`/currency/currencies/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currencies'] });
      setCurrencyModalOpen(false);
      setEditingCurrency(undefined);
      showMessage('success', 'Currency updated successfully!');
    },
    onError: () => {
      showMessage('error', 'Failed to update currency');
    },
  });

  const deleteCurrencyMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/currency/currencies/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currencies'] });
      setDeletingCurrency(null);
      showMessage('success', 'Currency deleted successfully!');
    },
    onError: () => {
      showMessage('error', 'Failed to delete currency');
    },
  });

  // Exchange Rate mutations
  const createExchangeRateMutation = useMutation({
    mutationFn: async (data: ExchangeRateFormData) => {
      await api.post('/currency/exchange-rates', {
        ...data,
        rate: parseFloat(data.rate),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exchangeRates'] });
      setExchangeRateModalOpen(false);
      setEditingExchangeRate(undefined);
      showMessage('success', 'Exchange rate created successfully!');
    },
    onError: () => {
      showMessage('error', 'Failed to create exchange rate');
    },
  });

  const updateExchangeRateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ExchangeRateFormData }) => {
      await api.put(`/currency/exchange-rates/${id}`, {
        ...data,
        rate: parseFloat(data.rate),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exchangeRates'] });
      setExchangeRateModalOpen(false);
      setEditingExchangeRate(undefined);
      showMessage('success', 'Exchange rate updated successfully!');
    },
    onError: () => {
      showMessage('error', 'Failed to update exchange rate');
    },
  });

  const deleteExchangeRateMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/currency/exchange-rates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exchangeRates'] });
      setDeletingExchangeRate(null);
      showMessage('success', 'Exchange rate deleted successfully!');
    },
    onError: () => {
      showMessage('error', 'Failed to delete exchange rate');
    },
  });

  // Role mutations
  const createRoleMutation = useMutation({
    mutationFn: async (data: RoleFormData) => {
      await api.post('/roles', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setRoleModalOpen(false);
      setEditingRole(undefined);
      showMessage('success', 'Role created successfully!');
    },
    onError: () => {
      showMessage('error', 'Failed to create role');
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: RoleFormData }) => {
      await api.put(`/roles/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setRoleModalOpen(false);
      setEditingRole(undefined);
      showMessage('success', 'Role updated successfully!');
    },
    onError: () => {
      showMessage('error', 'Failed to update role');
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/roles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setDeletingRole(null);
      showMessage('success', 'Role deleted successfully!');
    },
    onError: () => {
      showMessage('error', 'Failed to delete role');
    },
  });

  // User mutations
  const createUserMutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      await api.post('/users', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
      setUserModalOpen(false);
      setEditingUser(undefined);
      showMessage('success', 'User created successfully!');
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Failed to create user';
      showMessage('error', message);
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<UserFormData> }) => {
      await api.put(`/users/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
      setUserModalOpen(false);
      setEditingUser(undefined);
      showMessage('success', 'User updated successfully!');
    },
    onError: () => {
      showMessage('error', 'Failed to update user');
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
      setDeletingUser(null);
      showMessage('success', 'User deleted successfully!');
    },
    onError: () => {
      showMessage('error', 'Failed to delete user');
    },
  });

  const toggleUserStatusMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/users/${id}/status`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
      showMessage('success', 'User status updated!');
    },
    onError: () => {
      showMessage('error', 'Failed to update user status');
    },
  });

  const resetUserPasswordMutation = useMutation({
    mutationFn: async ({ id, newPassword }: { id: string; newPassword: string }) => {
      await api.post(`/users/${id}/reset-password`, { newPassword });
    },
    onSuccess: () => {
      setResetPasswordUser(null);
      setNewPassword('');
      showMessage('success', 'Password reset successfully!');
    },
    onError: () => {
      showMessage('error', 'Failed to reset password');
    },
  });

  const assignUserRoleMutation = useMutation({
    mutationFn: async ({ userId, roleId }: { userId: string; roleId: string }) => {
      await api.post(`/users/${userId}/roles`, { roleId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
      showMessage('success', 'Role assigned successfully!');
    },
    onError: () => {
      showMessage('error', 'Failed to assign role');
    },
  });

  const removeUserRoleMutation = useMutation({
    mutationFn: async ({ userId, roleId }: { userId: string; roleId: string }) => {
      await api.delete(`/users/${userId}/roles/${roleId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
      showMessage('success', 'Role removed successfully!');
    },
    onError: () => {
      showMessage('error', 'Failed to remove role');
    },
  });

  // Profile update mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: UserProfile) => {
      // The API endpoint would be /users/me or similar
      await api.put('/auth/profile', data);
    },
    onSuccess: () => {
      showMessage('success', 'Profile updated successfully!');
    },
    onError: () => {
      showMessage('error', 'Failed to update profile');
    },
  });

  // Password change mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      await api.post('/auth/change-password', data);
    },
    onSuccess: () => {
      setPasswords({ current: '', new: '', confirm: '' });
      showMessage('success', 'Password changed successfully!');
    },
    onError: () => {
      showMessage('error', 'Failed to change password');
    },
  });

  const showMessage = (type: 'success' | 'error', text: string) => {
    setSaveMessage({ type, text });
    setTimeout(() => setSaveMessage(null), 3000);
  };

  async function handleSaveProfile() {
    setSaving(true);
    try {
      await updateProfileMutation.mutateAsync(profile);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveNotifications() {
    setSaving(true);
    try {
      // Store notifications in localStorage for now since there's no backend endpoint
      localStorage.setItem('notificationSettings', JSON.stringify(notifications));
      showMessage('success', 'Notification preferences saved!');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveDisplay() {
    setSaving(true);
    try {
      // Store display settings in localStorage
      localStorage.setItem('displaySettings', JSON.stringify(display));
      showMessage('success', 'Display settings saved!');
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword() {
    if (passwords.new !== passwords.confirm) {
      showMessage('error', 'New passwords do not match');
      return;
    }
    if (passwords.new.length < 8) {
      showMessage('error', 'Password must be at least 8 characters');
      return;
    }
    await changePasswordMutation.mutateAsync({
      currentPassword: passwords.current,
      newPassword: passwords.new,
    });
  }

  // Load saved settings on mount
  useEffect(() => {
    const savedNotifications = localStorage.getItem('notificationSettings');
    if (savedNotifications) {
      setNotifications(JSON.parse(savedNotifications));
    }
    const savedDisplay = localStorage.getItem('displaySettings');
    if (savedDisplay) {
      setDisplay(JSON.parse(savedDisplay));
    }
  }, []);

  const tabs = [
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    { id: 'display', label: 'Display', icon: '🎨' },
    { id: 'security', label: 'Security', icon: '🔒' },
    { id: 'users', label: 'Users', icon: '👥' },
    { id: 'roles', label: 'Roles', icon: '🛡️' },
    { id: 'functions', label: 'Functions', icon: '⚙️' },
    { id: 'request-types', label: 'Request Types', icon: '📋' },
    { id: 'currency', label: 'Currency', icon: '💰' },
    { id: 'organization', label: 'Organization', icon: '🏢' },
    { id: 'audit', label: 'Audit Logs', icon: '📝' },
  ];

  return (
    <MainLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

        {/* Save Message */}
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
          {/* Sidebar */}
          <div className="md:w-64 flex-shrink-0">
            <Card className="shadow-sm">
              <CardContent className="p-2">
                <nav className="space-y-1">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as TabType)}
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

          {/* Content */}
          <div className="flex-1">
            {activeTab === 'profile' && (
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Profile Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        First Name
                      </label>
                      <Input
                        value={profile.firstName}
                        onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                        placeholder="First Name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Last Name
                      </label>
                      <Input
                        value={profile.lastName}
                        onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                        placeholder="Last Name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <Input
                        type="email"
                        value={profile.email}
                        onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                        placeholder="email@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <Input
                        value={profile.phone || ''}
                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                        placeholder="+91 98765 43210"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t flex justify-end">
                    <Button onClick={handleSaveProfile} disabled={saving || updateProfileMutation.isPending}>
                      {saving || updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
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
                    <Button onClick={handleSaveNotifications} disabled={saving}>
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
                    <p className="text-sm text-gray-500 mb-3">
                      Add an extra layer of security to your account
                    </p>
                    <Button variant="outline" onClick={() => setShow2FAModal(true)}>
                      Enable 2FA
                    </Button>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-2">Active Sessions</h3>
                    <p className="text-sm text-gray-500 mb-3">
                      Manage devices where you&apos;re currently logged in
                    </p>
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

            {activeTab === 'currency' && (
              <div className="space-y-6">
                <Card className="shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <DollarSign className="w-5 h-5" />
                      Currency Management
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => seedCurrenciesMutation.mutate()}
                        disabled={seedCurrenciesMutation.isPending}
                      >
                        {seedCurrenciesMutation.isPending ? 'Seeding...' : 'Seed Defaults'}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          setEditingCurrency(undefined);
                          setCurrencyModalOpen(true);
                        }}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Currency
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {currencies.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <DollarSign className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p>No currencies configured</p>
                        <p className="text-sm">Click "Seed Defaults" to add standard currencies or add one manually</p>
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
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingCurrency(currency);
                                  setCurrencyModalOpen(true);
                                }}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              {!currency.isBase && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-500 hover:text-red-700"
                                  onClick={() => setDeletingCurrency(currency)}
                                >
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
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">Exchange Rates</CardTitle>
                    <Button
                      size="sm"
                      onClick={() => {
                        setEditingExchangeRate(undefined);
                        setExchangeRateModalOpen(true);
                      }}
                      disabled={currencies.length < 2}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Rate
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {exchangeRates.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <p>No exchange rates configured</p>
                        <p className="text-sm">Add currencies first, then configure exchange rates</p>
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
                                  <div className="flex items-center justify-end gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setEditingExchangeRate(rate);
                                        setExchangeRateModalOpen(true);
                                      }}
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-red-500 hover:text-red-700"
                                      onClick={() => setDeletingExchangeRate(rate)}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
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
                    <Button
                      size="sm"
                      onClick={() => {
                        setEditingRole(undefined);
                        setRoleModalOpen(true);
                      }}
                    >
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
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingRole(role);
                                  setRoleModalOpen(true);
                                }}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              {!role.isSystem && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-500 hover:text-red-700"
                                  onClick={() => setDeletingRole(role)}
                                >
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

            {activeTab === 'users' && (
              <div className="space-y-6">
                <Card className="shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      User Management
                    </CardTitle>
                    <Button
                      size="sm"
                      onClick={() => {
                        setEditingUser(undefined);
                        setUserModalOpen(true);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add User
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          placeholder="Search users..."
                          value={userSearch}
                          onChange={(e) => setUserSearch(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    {filteredUsers.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p>No users found</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3"
                          onClick={() => {
                            setEditingUser(undefined);
                            setUserModalOpen(true);
                          }}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add First User
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {filteredUsers.map((u) => (
                          <div
                            key={u.id}
                            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                <span className="text-primary font-medium">
                                  {u.firstName[0]}{u.lastName[0]}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium">{u.firstName} {u.lastName}</p>
                                <p className="text-sm text-gray-500">{u.email}</p>
                                {u.roles && u.roles.length > 0 && (
                                  <div className="flex gap-1 mt-1">
                                    {u.roles.map((r) => (
                                      <span
                                        key={r.role.id}
                                        className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded"
                                      >
                                        {r.role.name}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => toggleUserStatusMutation.mutate(u.id)}
                                disabled={toggleUserStatusMutation.isPending}
                                className={cn(
                                  'text-xs px-3 py-1 rounded cursor-pointer border-0 transition-colors',
                                  u.status === 'ACTIVE' 
                                    ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                )}
                              >
                                {u.status}
                              </button>
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Manage Roles"
                                onClick={() => {
                                  setSelectedUserForRole(u);
                                  setUserRoleModalOpen(true);
                                }}
                              >
                                <Shield className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Edit User"
                                onClick={() => {
                                  setEditingUser(u);
                                  setUserModalOpen(true);
                                }}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Reset Password"
                                onClick={() => setResetPasswordUser(u)}
                              >
                                🔐
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-700"
                                title="Delete User"
                                onClick={() => setDeletingUser(u)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'functions' && <FunctionsTab />}

            {activeTab === 'request-types' && <RequestTypesTab />}

            {activeTab === 'organization' && (
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    Organization Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {orgStats ? (
                    <>
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl">🏢</span>
                          <div>
                            <h3 className="font-bold text-gray-900">{orgStats.tenant.name}</h3>
                            <p className="text-sm text-gray-600">
                              Code: {orgStats.tenant.code} • Status: {orgStats.tenant.status}
                            </p>
                            <p className="text-xs text-gray-500">
                              Created: {formatDate(orgStats.tenant.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-500">Total Users</p>
                          <p className="text-2xl font-bold text-primary">{orgStats.users.total}</p>
                          <p className="text-xs text-gray-500">{orgStats.users.active} active</p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-500">Resources</p>
                          <p className="text-2xl font-bold text-green-600">{orgStats.resources.active}</p>
                          <p className="text-xs text-gray-500">{orgStats.resources.onBench} on bench</p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-500">Projects</p>
                          <p className="text-2xl font-bold text-blue-600">{orgStats.projects.active}</p>
                          <p className="text-xs text-gray-500">{orgStats.projects.total} total</p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-500">Clients</p>
                          <p className="text-2xl font-bold text-purple-600">{orgStats.clients.active}</p>
                          <p className="text-xs text-gray-500">{orgStats.clients.total} total</p>
                        </div>
                      </div>

                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-500 mb-2">Storage</p>
                        <p className="text-lg font-medium">{orgStats.storage.documentsCount} documents</p>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p>Loading organization data...</p>
                    </div>
                  )}

                  <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                    <p className="text-sm text-amber-800">
                      <strong>Admin Only:</strong> Organization settings can only be modified by administrators.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'audit' && (
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Audit Logs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 mb-4">
                    <select
                      value={auditEntityFilter}
                      onChange={(e) => { setAuditEntityFilter(e.target.value); setAuditPage(1); }}
                      className="border rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="">All Entities</option>
                      {auditEntityTypes.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                    <select
                      value={auditActionFilter}
                      onChange={(e) => { setAuditActionFilter(e.target.value); setAuditPage(1); }}
                      className="border rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="">All Actions</option>
                      <option value="CREATE">Create</option>
                      <option value="UPDATE">Update</option>
                      <option value="DELETE">Delete</option>
                      <option value="LOGIN">Login</option>
                      <option value="LOGOUT">Logout</option>
                      <option value="APPROVE">Approve</option>
                      <option value="REJECT">Reject</option>
                    </select>
                  </div>

                  {auditData?.data && auditData.data.length > 0 ? (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="text-left p-3 font-medium">Timestamp</th>
                              <th className="text-left p-3 font-medium">User</th>
                              <th className="text-left p-3 font-medium">Action</th>
                              <th className="text-left p-3 font-medium">Entity</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {auditData.data.map((log) => (
                              <tr key={log.id} className="hover:bg-gray-50">
                                <td className="p-3 text-gray-500">
                                  {formatDate(log.timestamp)}
                                </td>
                                <td className="p-3">
                                  {log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System'}
                                </td>
                                <td className="p-3">
                                  <span className={cn(
                                    'text-xs px-2 py-0.5 rounded',
                                    log.action === 'CREATE' && 'bg-green-100 text-green-700',
                                    log.action === 'UPDATE' && 'bg-blue-100 text-blue-700',
                                    log.action === 'DELETE' && 'bg-red-100 text-red-700',
                                    log.action === 'LOGIN' && 'bg-purple-100 text-purple-700',
                                    !['CREATE', 'UPDATE', 'DELETE', 'LOGIN'].includes(log.action) && 'bg-gray-100 text-gray-700'
                                  )}>
                                    {log.action}
                                  </span>
                                </td>
                                <td className="p-3 font-mono text-xs">
                                  {log.entityType}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {auditData.pagination && auditData.pagination.totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4 pt-4 border-t">
                          <p className="text-sm text-gray-500">
                            Page {auditData.pagination.page} of {auditData.pagination.totalPages} ({auditData.pagination.total} total)
                          </p>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                              disabled={auditPage === 1}
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setAuditPage((p) => Math.min(auditData.pagination.totalPages, p + 1))}
                              disabled={auditPage >= auditData.pagination.totalPages}
                            >
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>No audit logs found</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* 2FA Setup Modal */}
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

        {/* User Role Assignment Modal */}
        <Dialog open={userRoleModalOpen} onOpenChange={setUserRoleModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Manage User Roles</DialogTitle>
            </DialogHeader>
            <DialogBody>
              {selectedUserForRole && (
                <div className="space-y-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="font-medium">{selectedUserForRole.firstName} {selectedUserForRole.lastName}</p>
                    <p className="text-sm text-gray-500">{selectedUserForRole.email}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Assigned Roles</label>
                    <p className="text-sm text-gray-500 mb-3">
                      Role assignment is managed through the Roles tab. 
                      Use the &quot;Assign Role&quot; endpoint in the API to assign roles to users.
                    </p>
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-800">
                        <strong>API Endpoint:</strong> POST /api/v1/roles/assign
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        {`{ "userId": "${selectedUserForRole.id}", "roleId": "<role-id>" }`}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" onClick={() => setUserRoleModalOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Currency Form Modal */}
        <CurrencyFormModal
          isOpen={currencyModalOpen}
          onClose={() => {
            setCurrencyModalOpen(false);
            setEditingCurrency(undefined);
          }}
          currency={editingCurrency}
          onSave={(data) => {
            if (editingCurrency) {
              updateCurrencyMutation.mutate({ id: editingCurrency.id, data });
            } else {
              createCurrencyMutation.mutate(data);
            }
          }}
          isSaving={createCurrencyMutation.isPending || updateCurrencyMutation.isPending}
        />

        {/* Delete Currency Confirmation */}
        <ConfirmDialog
          open={!!deletingCurrency}
          onOpenChange={(open) => !open && setDeletingCurrency(null)}
          onConfirm={() => {
            if (deletingCurrency) {
              deleteCurrencyMutation.mutate(deletingCurrency.id);
            }
          }}
          title="Delete Currency"
          description={`Are you sure you want to delete ${deletingCurrency?.code}? This action cannot be undone.`}
          confirmLabel="Delete"
          variant="danger"
          loading={deleteCurrencyMutation.isPending}
        />

        {/* Exchange Rate Form Modal */}
        <ExchangeRateFormModal
          isOpen={exchangeRateModalOpen}
          onClose={() => {
            setExchangeRateModalOpen(false);
            setEditingExchangeRate(undefined);
          }}
          exchangeRate={editingExchangeRate}
          currencies={currencies}
          onSave={(data) => {
            if (editingExchangeRate) {
              updateExchangeRateMutation.mutate({ id: editingExchangeRate.id, data });
            } else {
              createExchangeRateMutation.mutate(data);
            }
          }}
          isSaving={createExchangeRateMutation.isPending || updateExchangeRateMutation.isPending}
        />

        {/* Delete Exchange Rate Confirmation */}
        <ConfirmDialog
          open={!!deletingExchangeRate}
          onOpenChange={(open) => !open && setDeletingExchangeRate(null)}
          onConfirm={() => {
            if (deletingExchangeRate) {
              deleteExchangeRateMutation.mutate(deletingExchangeRate.id);
            }
          }}
          title="Delete Exchange Rate"
          description={`Are you sure you want to delete this exchange rate (${deletingExchangeRate?.fromCurrency?.code} to ${deletingExchangeRate?.toCurrency?.code})? This action cannot be undone.`}
          confirmLabel="Delete"
          variant="danger"
          loading={deleteExchangeRateMutation.isPending}
        />

        {/* Role Form Modal */}
        <RoleFormModal
          isOpen={roleModalOpen}
          onClose={() => {
            setRoleModalOpen(false);
            setEditingRole(undefined);
          }}
          role={editingRole}
          onSave={(data) => {
            if (editingRole) {
              updateRoleMutation.mutate({ id: editingRole.id, data });
            } else {
              createRoleMutation.mutate(data);
            }
          }}
          isSaving={createRoleMutation.isPending || updateRoleMutation.isPending}
        />

        {/* Delete Role Confirmation */}
        <ConfirmDialog
          open={!!deletingRole}
          onOpenChange={(open) => !open && setDeletingRole(null)}
          onConfirm={() => {
            if (deletingRole) {
              deleteRoleMutation.mutate(deletingRole.id);
            }
          }}
          title="Delete Role"
          description={`Are you sure you want to delete the "${deletingRole?.name}" role? Users with this role will need to be reassigned.`}
          confirmLabel="Delete"
          variant="danger"
          loading={deleteRoleMutation.isPending}
        />

        {/* User Form Modal */}
        <UserFormModal
          isOpen={userModalOpen}
          onClose={() => {
            setUserModalOpen(false);
            setEditingUser(undefined);
          }}
          user={editingUser}
          roles={roles}
          onSave={(data) => {
            if (editingUser) {
              updateUserMutation.mutate({ id: editingUser.id, data });
            } else {
              createUserMutation.mutate(data);
            }
          }}
          isSaving={createUserMutation.isPending || updateUserMutation.isPending}
        />

        {/* Delete User Confirmation */}
        <ConfirmDialog
          open={!!deletingUser}
          onOpenChange={(open) => !open && setDeletingUser(null)}
          onConfirm={() => {
            if (deletingUser) {
              deleteUserMutation.mutate(deletingUser.id);
            }
          }}
          title="Delete User"
          description={`Are you sure you want to delete "${deletingUser?.firstName} ${deletingUser?.lastName}"? This action cannot be undone.`}
          confirmLabel="Delete"
          variant="danger"
          loading={deleteUserMutation.isPending}
        />

        {/* Reset Password Dialog */}
        <Dialog open={!!resetPasswordUser} onOpenChange={(open) => !open && setResetPasswordUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reset Password</DialogTitle>
            </DialogHeader>
            <DialogBody className="space-y-4">
              <p className="text-sm text-gray-600">
                Set a new password for <strong>{resetPasswordUser?.firstName} {resetPasswordUser?.lastName}</strong>
              </p>
              <div>
                <label className="block text-sm font-medium mb-1">New Password *</label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  minLength={8}
                />
              </div>
            </DialogBody>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setResetPasswordUser(null);
                  setNewPassword('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (resetPasswordUser && newPassword.length >= 8) {
                    resetUserPasswordMutation.mutate({
                      id: resetPasswordUser.id,
                      newPassword,
                    });
                  }
                }}
                disabled={newPassword.length < 8 || resetUserPasswordMutation.isPending}
              >
                {resetUserPasswordMutation.isPending ? 'Resetting...' : 'Reset Password'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* User Role Management Modal */}
        <Dialog open={userRoleModalOpen} onOpenChange={(open) => !open && setUserRoleModalOpen(false)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Manage Roles</DialogTitle>
            </DialogHeader>
            <DialogBody className="space-y-4">
              {selectedUserForRole && (
                <>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-primary font-medium">
                        {selectedUserForRole.firstName[0]}{selectedUserForRole.lastName[0]}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{selectedUserForRole.firstName} {selectedUserForRole.lastName}</p>
                      <p className="text-sm text-gray-500">{selectedUserForRole.email}</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Assigned Roles</label>
                    <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-2">
                      {roles.map((role) => {
                        const isAssigned = selectedUserForRole.roles?.some((r) => r.role.id === role.id);
                        return (
                          <div key={role.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                            <div>
                              <p className="text-sm font-medium">{role.name}</p>
                              <p className="text-xs text-gray-500">{role.description}</p>
                            </div>
                            <Button
                              variant={isAssigned ? 'destructive' : 'outline'}
                              size="sm"
                              disabled={assignUserRoleMutation.isPending || removeUserRoleMutation.isPending}
                              onClick={() => {
                                if (isAssigned) {
                                  removeUserRoleMutation.mutate({
                                    userId: selectedUserForRole.id,
                                    roleId: role.id,
                                  });
                                } else {
                                  assignUserRoleMutation.mutate({
                                    userId: selectedUserForRole.id,
                                    roleId: role.id,
                                  });
                                }
                              }}
                            >
                              {isAssigned ? 'Remove' : 'Assign'}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" onClick={() => setUserRoleModalOpen(false)}>
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
