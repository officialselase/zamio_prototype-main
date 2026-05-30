import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '@zamio/ui';
import {
  Users,
  Shield,
  Crown,
  FileText,
  Plus,
  Edit,
  UserX,
  UserCheck,
  Trash2,
  Loader2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { useAuth } from '../lib/auth';
import {
  fetchStationStaff,
  createStationStaff,
  updateStationStaff,
  archiveStationStaff,
  toggleStationStaffActive,
  type StationStaffRecord,
  type StationStaffSummary,
  type StationStaffFilters,
  type StationStaffPermissionDefinition,
  type StationStaffRoleDefinition,
} from '../lib/api';

type RoleDefinition = {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
};

type PermissionDefinition = {
  id: string;
  label: string;
  description: string;
};

const ROLE_TEMPLATES: Record<string, RoleDefinition> = {
  admin: {
    id: 'admin',
    name: 'Administrator',
    description: 'Full access to all station features and settings',
    icon: Crown,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
  },
  manager: {
    id: 'manager',
    name: 'Manager',
    description: 'Manage reports, monitoring, and staff oversight',
    icon: Shield,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
  },
  reporter: {
    id: 'reporter',
    name: 'Reporter',
    description: 'Access to reports and basic monitoring features',
    icon: FileText,
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
  },
};

const PERMISSION_TEMPLATES: Record<string, PermissionDefinition> = {
  reports: {
    id: 'reports',
    label: 'View Reports',
    description: 'Access to airplay and royalty reports',
  },
  monitoring: {
    id: 'monitoring',
    label: 'Monitor Streams',
    description: 'Real-time stream monitoring access',
  },
  staff: {
    id: 'staff',
    label: 'Manage Staff',
    description: 'Add/remove staff members and roles',
  },
  settings: {
    id: 'settings',
    label: 'System Settings',
    description: 'Modify station configuration',
  },
  payments: {
    id: 'payments',
    label: 'Payment Management',
    description: 'Access to payment and billing features',
  },
  compliance: {
    id: 'compliance',
    label: 'Compliance Tools',
    description: 'Access to regulatory compliance features',
  },
};

const DEFAULT_ROLE_DEFAULTS: Record<string, string[]> = {
  admin: ['reports', 'monitoring', 'staff', 'settings', 'payments', 'compliance'],
  manager: ['reports', 'monitoring', 'staff'],
  reporter: ['reports'],
};

const buildRoleDefinitions = (roles?: StationStaffRoleDefinition[]): RoleDefinition[] => {
  if (!roles || roles.length === 0) {
    return Object.values(ROLE_TEMPLATES);
  }

  return roles.map((role) => {
    const template = ROLE_TEMPLATES[role.id] ?? ROLE_TEMPLATES.reporter;
    return {
      ...template,
      id: role.id,
      name: role.label ?? template.name,
      description: role.description ?? template.description,
    };
  });
};

const buildPermissionDefinitions = (
  permissions?: StationStaffPermissionDefinition[],
): PermissionDefinition[] => {
  if (!permissions || permissions.length === 0) {
    return Object.values(PERMISSION_TEMPLATES);
  }

  return permissions.map((permission) => {
    const template = PERMISSION_TEMPLATES[permission.id] ?? {
      id: permission.id,
      label: permission.label ?? permission.id,
      description: permission.description ?? '',
    };

    return {
      ...template,
      id: permission.id,
      label: permission.label ?? template.label,
      description: permission.description ?? template.description,
    };
  });
};

const resolveStaffError = (maybeError: unknown) => {
  if (!maybeError) {
    return 'Unable to process the request. Please try again later.';
  }

  if (typeof maybeError === 'object' && maybeError !== null) {
    const response = (maybeError as { response?: unknown }).response;
    if (response && typeof response === 'object') {
      const data = (response as { data?: unknown }).data;
      if (data && typeof data === 'object') {
        const message = (data as { message?: unknown }).message;
        if (typeof message === 'string' && message.trim().length > 0) {
          return message;
        }

        const errors = (data as { errors?: unknown }).errors;
        if (errors && typeof errors === 'object') {
          const entries = Object.entries(errors as Record<string, unknown>);
          const firstEntry = entries[0];
          if (firstEntry) {
            const [, errorValue] = firstEntry;
            if (typeof errorValue === 'string' && errorValue.length > 0) {
              return errorValue;
            }
            if (Array.isArray(errorValue) && errorValue.length > 0) {
              const candidate = errorValue[0];
              if (typeof candidate === 'string' && candidate.length > 0) {
                return candidate;
              }
            }
          }
        }
      }
    }

    const message = (maybeError as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim().length > 0) {
      return message;
    }
  }

  return 'Unable to process the request. Please try again later.';
};

const StaffManagement: React.FC = () => {
  const { user } = useAuth();
  const stationId = useMemo(() => {
    if (user && typeof user === 'object' && user !== null) {
      const candidate = user['station_id'];
      if (typeof candidate === 'string' && candidate.length > 0) {
        return candidate;
      }
    }
    return null;
  }, [user]);

  const [staffMembers, setStaffMembers] = useState<StationStaffRecord[]>([]);
  const [summary, setSummary] = useState<StationStaffSummary | null>(null);
  const [roleDefaults, setRoleDefaults] = useState<Record<string, string[]>>(DEFAULT_ROLE_DEFAULTS);
  const [availableRoles, setAvailableRoles] = useState<RoleDefinition[]>(() => Object.values(ROLE_TEMPLATES));
  const [availablePermissions, setAvailablePermissions] = useState<PermissionDefinition[]>(() => Object.values(PERMISSION_TEMPLATES));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMember, setEditingMember] = useState<string | number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'reporter' as 'admin' | 'manager' | 'reporter',
    permissions: [] as string[],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const totalStaff = useMemo(() => summary?.totalStaff ?? staffMembers.length, [summary, staffMembers]);
  const activeStaff = useMemo(
    () => summary?.activeStaff ?? staffMembers.filter((member) => member.isActive).length,
    [summary, staffMembers],
  );
  const adminCount = useMemo(
    () => summary?.adminCount ?? staffMembers.filter((member) => member.role === 'admin').length,
    [summary, staffMembers],
  );
  const managerCount = useMemo(
    () => summary?.managerCount ?? staffMembers.filter((member) => member.role === 'manager').length,
    [summary, staffMembers],
  );

  const getDefaultPermissions = useCallback(
    (roleId: string) => roleDefaults[roleId] ?? roleDefaults.reporter ?? DEFAULT_ROLE_DEFAULTS.reporter,
    [roleDefaults],
  );

  const loadStaff = useCallback(async () => {
    if (!stationId) {
      setStaffMembers([]);
      setSummary(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const envelope = await fetchStationStaff({ stationId });
      const payload = envelope?.data;

      if (payload) {
        setStaffMembers(payload.staff?.results ?? []);
        setSummary(payload.summary ?? null);

        const filters: StationStaffFilters | undefined = payload.filters;
        if (filters) {
          setRoleDefaults({ ...DEFAULT_ROLE_DEFAULTS, ...(filters.roleDefaults ?? {}) });
          setAvailableRoles(buildRoleDefinitions(filters.roles));
          setAvailablePermissions(buildPermissionDefinitions(filters.permissions));
        } else {
          setRoleDefaults(DEFAULT_ROLE_DEFAULTS);
          setAvailableRoles(buildRoleDefinitions());
          setAvailablePermissions(buildPermissionDefinitions());
        }
      } else {
        setStaffMembers([]);
        setSummary(null);
      }
    } catch (err) {
      setError(resolveStaffError(err));
      setStaffMembers([]);
      setSummary(null);
    } finally {
      setIsLoading(false);
    }
  }, [stationId]);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handlePermissionToggle = (permissionId: string) => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter((permission) => permission !== permissionId)
        : [...prev.permissions, permissionId],
    }));
  };

  const validateForm = () => {
    const nextErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      nextErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      nextErrors.lastName = 'Last name is required';
    }

    if (!formData.email.trim()) {
      nextErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      nextErrors.email = 'Please enter a valid email address';
    }

    if (!formData.phone.trim()) {
      nextErrors.phone = 'Phone number is required';
    }

    if (formData.role !== 'admin' && formData.permissions.length === 0) {
      nextErrors.permissions = 'Select at least one permission';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      role: 'reporter',
      permissions: getDefaultPermissions('reporter'),
    });
    setErrors({});
    setActionError(null);
  };

  const handleRoleChange = (roleId: string) => {
    setFormData((prev) => ({
      ...prev,
      role: roleId as 'admin' | 'manager' | 'reporter',
      permissions: getDefaultPermissions(roleId),
    }));
  };

  const handleAddStaff = async () => {
    if (!validateForm() || !stationId) {
      return;
    }

    setIsSubmitting(true);
    setActionError(null);
    setActionMessage(null);

    try {
      await createStationStaff({
        stationId,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        role: formData.role,
        permissions: formData.role === 'admin' ? undefined : formData.permissions,
      });
      setActionMessage('Staff member added successfully.');
      setShowAddForm(false);
      setEditingMember(null);
      resetForm();
      await loadStaff();
    } catch (err) {
      setActionError(resolveStaffError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditStaff = (memberId: string | number) => {
    const member = staffMembers.find((candidate) => candidate.id === memberId);
    if (!member) {
      return;
    }

    setFormData({
      firstName: member.firstName || '',
      lastName: member.lastName || '',
      email: member.email || '',
      phone: member.phone || '',
      role: (member.role as 'admin' | 'manager' | 'reporter') || 'reporter',
      permissions: member.role === 'admin' ? getDefaultPermissions('admin') : member.permissions ?? [],
    });
    setEditingMember(memberId);
    setActionError(null);
    setShowAddForm(true);
  };

  const handleUpdateStaff = async () => {
    if (!validateForm() || !stationId || editingMember === null) {
      return;
    }

    setIsSubmitting(true);
    setActionError(null);
    setActionMessage(null);

    try {
      await updateStationStaff({
        stationId,
        staffId: editingMember,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        role: formData.role,
        permissions: formData.role === 'admin' ? undefined : formData.permissions,
      });
      setActionMessage('Staff member updated successfully.');
      setShowAddForm(false);
      setEditingMember(null);
      resetForm();
      await loadStaff();
    } catch (err) {
      setActionError(resolveStaffError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveStaff = async (memberId: string | number) => {
    setActionError(null);
    setActionMessage(null);
    try {
      await archiveStationStaff(memberId);
      setActionMessage('Staff member removed successfully.');
      await loadStaff();
    } catch (err) {
      setActionError(resolveStaffError(err));
    }
  };

  const toggleStaffStatus = async (memberId: string | number, currentStatus: boolean) => {
    setActionError(null);
    setActionMessage(null);
    try {
      await toggleStationStaffActive(memberId, !currentStatus);
      setActionMessage(`Staff member ${!currentStatus ? 'activated' : 'deactivated'} successfully.`);
      await loadStaff();
    } catch (err) {
      setActionError(resolveStaffError(err));
    }
  };

  return (
    <div className="space-y-8">
      {error && (
        <div className="px-4 py-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300">
          {error}
        </div>
      )}
      {actionMessage && (
        <div className="px-4 py-3 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300">
          {actionMessage}
        </div>
      )}
      {actionError && (
        <div className="px-4 py-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300">
          {actionError}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Staff Management</h1>
          <p className="text-base text-gray-600 dark:text-gray-300 mt-2">
            Manage station staff, assign roles and permissions, and track team performance.
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setEditingMember(null);
            setShowAddForm(true);
            setActionError(null);
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-all duration-200 hover:scale-105"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Staff Member
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50/90 via-cyan-50/80 to-indigo-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-blue-200/50 dark:border-slate-600/60 p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-normal text-gray-700 dark:text-slate-300 leading-relaxed">Total Staff</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-slate-100 leading-tight">
                {totalStaff}
              </p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/60 dark:to-cyan-900/60 rounded-lg flex items-center justify-center backdrop-blur-sm">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50/90 via-green-50/80 to-teal-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-emerald-200/50 dark:border-slate-600/60 p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-normal text-gray-700 dark:text-slate-300 leading-relaxed">Active Staff</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-slate-100 leading-tight">
                {activeStaff}
              </p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-green-100 dark:from-emerald-900/60 dark:to-green-900/60 rounded-lg flex items-center justify-center backdrop-blur-sm">
              <UserCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50/90 via-orange-50/80 to-yellow-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-amber-200/50 dark:border-slate-600/60 p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-normal text-gray-700 dark:text-slate-300 leading-relaxed">Administrators</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-slate-100 leading-tight">
                {adminCount}
              </p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/60 dark:to-orange-900/60 rounded-lg flex items-center justify-center backdrop-blur-sm">
              <Crown className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50/90 via-pink-50/80 to-rose-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-purple-200/50 dark:border-slate-600/60 p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-normal text-gray-700 dark:text-slate-300 leading-relaxed">Managers</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-slate-100 leading-tight">
                {managerCount}
              </p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/60 dark:to-pink-900/60 rounded-lg flex items-center justify-center backdrop-blur-sm">
              <Shield className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </Card>
      </div>

      <Card className="bg-gradient-to-br from-slate-50/90 via-gray-50/80 to-zinc-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200/50 dark:border-slate-600/60 p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
            <Users className="w-5 h-5 mr-2 text-indigo-500" />
            Team Members ({staffMembers.length})
          </h2>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-gray-500 dark:text-gray-400">
            <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading staff...
          </div>
        ) : staffMembers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 mb-4">No staff members added yet</p>
            <button
              onClick={() => {
                resetForm();
                setEditingMember(null);
                setShowAddForm(true);
                setActionError(null);
              }}
              className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-all duration-200"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Team Member
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {staffMembers.map((member) => {
              const roleInfo = availableRoles.find((role) => role.id === member.role) ?? ROLE_TEMPLATES.reporter;
              const permissions = member.permissions ?? [];
              const joinedLabel = member.joinDate ? new Date(member.joinDate).toLocaleDateString() : '—';

              return (
                <div
                  key={member.id}
                  className={`border rounded-xl p-6 transition-all duration-200 hover:shadow-md ${
                    member.isActive
                      ? 'border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800'
                      : 'border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-800/50 opacity-75'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${roleInfo.bgColor}`}>
                        <roleInfo.icon className={`w-7 h-7 ${roleInfo.color}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-1">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {member.firstName} {member.lastName}
                          </h3>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              member.isActive
                                ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                            }`}
                          >
                            {member.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">{member.email}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Joined {joinedLabel} • {roleInfo.name}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEditStaff(member.id)}
                        className="p-2 text-gray-400 hover:text-blue-600 dark:text-gray-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-200"
                        title="Edit staff member"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => toggleStaffStatus(member.id, member.isActive)}
                        className={`p-2 rounded-lg transition-all duration-200 ${
                          member.isActive
                            ? 'text-red-400 hover:text-red-600 hover:bg-red-50 dark:text-red-500 dark:hover:text-red-400 dark:hover:bg-red-900/20'
                            : 'text-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 dark:text-emerald-500 dark:hover:text-emerald-400 dark:hover:bg-emerald-900/20'
                        }`}
                        title={member.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {member.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleRemoveStaff(member.id)}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:text-red-500 dark:hover:text-red-400 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200"
                        title="Remove staff member"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-600">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Permissions ({permissions.length})
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{roleInfo.description}</p>
                      </div>
                      <div className="flex flex-wrap gap-1 max-w-md">
                        {permissions.map((permission) => {
                          const permInfo = availablePermissions.find((candidate) => candidate.id === permission);
                          return (
                            <span
                              key={permission}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                            >
                              {permInfo?.label ?? permission}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingMember ? 'Edit Staff Member' : 'Add New Staff Member'}
              </h3>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setEditingMember(null);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
              >
                ×
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.firstName ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                    }`}
                    placeholder="Enter first name"
                  />
                  {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.lastName ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                    }`}
                    placeholder="Enter last name"
                  />
                  {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.email ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                    }`}
                    placeholder="staff@radiostation.com"
                  />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.phone ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                    }`}
                    placeholder="+233 XX XXX XXXX"
                  />
                  {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Select Role *
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {availableRoles.map((role) => (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => handleRoleChange(role.id)}
                      className={`p-4 rounded-lg border-2 text-left transition-all duration-200 ${
                        formData.role === role.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 hover:border-gray-300 dark:hover:border-slate-500'
                      }`}
                    >
                      <div className="flex items-center space-x-3 mb-2">
                        <role.icon className={`w-5 h-5 ${role.color}`} />
                        <span className="font-medium text-gray-900 dark:text-white">{role.name}</span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{role.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Permissions {formData.role !== 'admin' && '(Based on selected role)'}
                </label>
                {formData.role === 'admin' ? (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Administrators have access to all features and permissions
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {availablePermissions.map((permission) => (
                      <label
                        key={permission.id}
                        className="flex items-start space-x-3 p-3 rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors duration-200"
                      >
                        <input
                          type="checkbox"
                          checked={formData.permissions.includes(permission.id)}
                          onChange={() => handlePermissionToggle(permission.id)}
                          className="mt-0.5 rounded border-gray-300 bg-white dark:bg-slate-800 text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{permission.label}</span>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{permission.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
                {errors.permissions && <p className="text-red-500 text-sm mt-2">{errors.permissions}</p>}
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-slate-600">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingMember(null);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={editingMember ? handleUpdateStaff : handleAddStaff}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors duration-200 disabled:opacity-70"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="inline-flex items-center">
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </span>
                  ) : editingMember ? (
                    'Update Member'
                  ) : (
                    'Add Member'
                  )}
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}

      <Card className="bg-gradient-to-br from-indigo-50/90 via-purple-50/80 to-pink-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-indigo-200/50 dark:border-slate-600/60 p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center">
          <Shield className="w-5 h-5 mr-2 text-indigo-500" />
          Role Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {availableRoles.map((role) => (
            <div key={role.id} className="text-center p-4 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${role.bgColor}`}>
                <role.icon className={`w-8 h-8 ${role.color}`} />
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">{role.name}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">{role.description}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default StaffManagement;
