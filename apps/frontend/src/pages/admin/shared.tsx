import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  isBase: boolean;
  isActive: boolean;
}

export interface ExchangeRate {
  id: string;
  fromCurrency: Currency;
  toCurrency: Currency;
  fromCurrencyId: string;
  toCurrencyId: string;
  rate: number;
  effectiveFrom: string;
  effectiveTo?: string;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  isSystem: boolean;
  level: number;
  permissions?: string[];
  _count?: { users: number };
}

export interface PermissionOption {
  key: string;
  label: string;
  description: string;
  category: 'OPERATIONAL' | 'APPROVAL' | 'GOVERNANCE' | 'SENSITIVE' | 'ADMIN' | 'AUTOMATION';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface PermissionGroup {
  key: string;
  label: string;
  permissions: PermissionOption[];
}

export interface PermissionSection {
  key: string;
  label: string;
  description: string;
  groups: PermissionGroup[];
}

export interface PermissionPreset {
  code: string;
  name: string;
  description: string;
  permissionKeys: string[];
}

export interface RoleCatalog {
  permissions: PermissionOption[];
  sections: PermissionSection[];
  presets: PermissionPreset[];
}

export interface CurrencyFormData {
  code: string;
  name: string;
  symbol: string;
  isBase: boolean;
  isActive: boolean;
}

export interface ExchangeRateFormData {
  fromCurrencyId: string;
  toCurrencyId: string;
  rate: string;
  effectiveFrom: string;
}

export interface RoleFormData {
  name: string;
  description: string;
  permissions: string[];
}

export interface UserListItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  roles?: { role: Role }[];
}

export interface UserFormData {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  status: 'ACTIVE' | 'INACTIVE';
  roleIds: string[];
}

export interface AuditLogEntry {
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

export interface OrganizationStats {
  tenant: { id: string; name: string; slug: string; status: string; createdAt: string };
  users: { total: number; active: number; inactive: number };
  resources: { total: number; active: number; inactive: number; onBench: number };
  projects: { total: number; active: number; completed: number };
  clients: { total: number; active: number };
  storage: { documentsCount: number };
}

export interface BillingTaxonomyPolicy {
  version: string;
  updatedAt: string;
  updatedBy: string | null;
  allowedInvoicingModels: Array<'CONTRACT_LED' | 'PROJECT_LED' | 'HYBRID'>;
  allowedBillingTypes: string[];
  allowContractProjectLinkage: boolean;
}

export interface DocumentTaxonomyPolicy {
  version: string;
  updatedAt: string;
  updatedBy: string | null;
  allowedCategories: string[];
}

export function CurrencyFormModal({
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent preventDismiss>
        <DialogHeader>
          <DialogTitle>{currency ? 'Edit Currency' : 'Add Currency'}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave(formData);
          }}
        >
          <DialogBody>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Currency Code *</label>
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="USD"
                    maxLength={3}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Symbol *</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Currency Name *</label>
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
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : currency ? 'Update Currency' : 'Create Currency'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ExchangeRateFormModal({
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent preventDismiss>
        <DialogHeader>
          <DialogTitle>{exchangeRate ? 'Edit Exchange Rate' : 'Add Exchange Rate'}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave(formData);
          }}
        >
          <DialogBody>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">From Currency *</label>
                  <select
                    value={formData.fromCurrencyId}
                    onChange={(e) => setFormData({ ...formData, fromCurrencyId: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    required
                  >
                    <option value="">Select currency</option>
                    {currencies.map((c) => (
                      <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">To Currency *</label>
                  <select
                    value={formData.toCurrencyId}
                    onChange={(e) => setFormData({ ...formData, toCurrencyId: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    required
                  >
                    <option value="">Select currency</option>
                    {currencies.map((c) => (
                      <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Exchange Rate *</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Effective From *</label>
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
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : exchangeRate ? 'Update Rate' : 'Create Rate'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function RoleFormModal({
  isOpen,
  onClose,
  role,
  catalog,
  onSave,
  isSaving,
}: {
  isOpen: boolean;
  onClose: () => void;
  role?: Role;
  catalog?: RoleCatalog;
  onSave: (data: RoleFormData) => void;
  isSaving: boolean;
}) {
  const [formData, setFormData] = useState<RoleFormData>({
    name: '',
    description: '',
    permissions: [],
  });

  useEffect(() => {
    if (role) {
      setFormData({
        name: role.name,
        description: role.description || '',
        permissions: role.permissions || [],
      });
    } else {
      setFormData({ name: '', description: '', permissions: [] });
    }
  }, [role, isOpen]);

  const selectedDefinitions = catalog?.permissions.filter((permission) => formData.permissions.includes(permission.key)) ?? [];
  const elevatedPermissions = selectedDefinitions.filter(
    (permission) => permission.riskLevel === 'HIGH' || permission.riskLevel === 'CRITICAL'
  );

  const togglePermission = (permissionKey: string) => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permissionKey)
        ? prev.permissions.filter((currentKey) => currentKey !== permissionKey)
        : [...prev.permissions, permissionKey],
    }));
  };

  const applyPreset = (preset: PermissionPreset) => {
    setFormData((prev) => ({
      ...prev,
      permissions: Array.from(new Set([...prev.permissions, ...preset.permissionKeys])),
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl" preventDismiss>
        <DialogHeader>
          <DialogTitle>{role ? 'Edit Role' : 'Create Role'}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave(formData);
          }}
        >
          <DialogBody>
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role Name *</label>
                  <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Role description" />
              </div>
              {catalog?.presets?.length ? (
                <div className="rounded-lg border bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-slate-900">Role blueprints</p>
                      <p className="text-sm text-slate-600">Start from a recommended authority pack and then refine individual permissions.</p>
                    </div>
                    <span className="text-xs text-slate-500">Level is managed internally and is not exposed during role design.</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {catalog.presets.map((preset) => (
                      <button
                        key={preset.code}
                        type="button"
                        onClick={() => applyPreset(preset)}
                        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:border-slate-500"
                      >
                        <span className="block">{preset.name}</span>
                        <span className="block text-xs font-normal text-slate-500">{preset.description}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
                <div className="max-h-[32rem] space-y-4 overflow-y-auto rounded-lg border p-4">
                  {catalog?.sections?.map((section) => (
                    <div key={section.key} className="rounded-lg border bg-white p-4">
                      <div className="mb-4">
                        <p className="text-sm font-semibold text-slate-900">{section.label}</p>
                        <p className="text-sm text-slate-500">{section.description}</p>
                      </div>
                      <div className="space-y-4">
                        {section.groups.map((group) => (
                          <div key={group.key} className="rounded-md border border-slate-200 p-3">
                            <p className="mb-3 text-sm font-medium text-slate-700">{group.label}</p>
                            <div className="grid gap-3 md:grid-cols-2">
                              {group.permissions.map((permission) => {
                                const isSelected = formData.permissions.includes(permission.key);
                                return (
                                  <label
                                    key={permission.key}
                                    className={cn(
                                      'flex cursor-pointer items-start gap-3 rounded-md border p-3 transition',
                                      isSelected ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-slate-400'
                                    )}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => togglePermission(permission.key)}
                                      className="mt-1 rounded border-gray-300"
                                    />
                                    <span className="min-w-0 flex-1">
                                      <span className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-900">
                                        {permission.label}
                                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                          {permission.riskLevel}
                                        </span>
                                      </span>
                                      <span className="mt-1 block text-xs text-slate-500">{permission.description}</span>
                                      <span className="mt-2 block text-[11px] uppercase tracking-wide text-slate-400">{permission.key}</span>
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid gap-4 rounded-lg border bg-slate-50 p-4 md:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-slate-900">Selection summary</p>
                  <p className="mt-1 text-sm text-slate-600">{formData.permissions.length} permissions selected.</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">Elevated permissions</p>
                  {elevatedPermissions.length ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {elevatedPermissions.map((permission) => (
                        <span key={permission.key} className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
                          {permission.label}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-slate-500">No high-risk permissions selected.</p>
                  )}
                </div>
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : role ? 'Update Role' : 'Create Role'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function UserFormModal({
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
        password: '',
        status: user.status as 'ACTIVE' | 'INACTIVE',
        roleIds: user.roles?.map((r) => r.role.id) || [],
      });
    } else {
      setFormData({ email: '', firstName: '', lastName: '', password: '', status: 'ACTIVE', roleIds: [] });
    }
  }, [user, isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg" preventDismiss>
        <DialogHeader>
          <DialogTitle>{user ? 'Edit User' : 'Create User'}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const dataToSend = user && !formData.password
              ? ({ ...formData, password: undefined } as unknown as UserFormData)
              : formData;
            onSave(dataToSend);
          }}
        >
          <DialogBody className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">First Name *</label>
                <Input value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Last Name *</label>
                <Input value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} required />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email *</label>
              <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Password {user ? '(leave blank to keep existing)' : '*'}</label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required={!user}
                  minLength={user ? 0 : 8}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 px-2"
                  onClick={() => setShowPassword((prev) => !prev)}
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
                      onChange={() => {
                        setFormData((prev) => ({
                          ...prev,
                          roleIds: prev.roleIds.includes(role.id)
                            ? prev.roleIds.filter((id) => id !== role.id)
                            : [...prev.roleIds, role.id],
                        }));
                      }}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">{role.name}</span>
                    {role.description && <span className="text-xs text-gray-500">- {role.description}</span>}
                  </label>
                ))}
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : user ? 'Update User' : 'Create User'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
