import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Users,
  Plus,
  Trash2,
  Shield,
  Edit,
  Mail,
  Phone,
  UserCheck,
  UserX,
  Crown,
  FileText,
} from "lucide-react";
import { useStationOnboarding } from "../StationOnboardingContext";

interface StaffMemberForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: "admin" | "manager" | "reporter";
  permissions: string[];
}

interface StaffStepProps {
  onNext: () => void;
  onPrevious: () => void;
  onSkip?: () => void;
}

const availableRoles = [
  {
    id: "admin",
    name: "Administrator",
    icon: Crown,
    description: "Full access to all station features and settings",
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/20",
  },
  {
    id: "manager",
    name: "Manager",
    icon: Shield,
    description: "Manage reports, monitoring, and staff oversight",
    color: "text-blue-400",
    bgColor: "bg-blue-500/20",
  },
  {
    id: "reporter",
    name: "Reporter",
    icon: FileText,
    description: "Access to reports and basic monitoring features",
    color: "text-green-400",
    bgColor: "bg-green-500/20",
  },
];

const availablePermissions = [
  {
    id: "reports",
    label: "View Reports",
    description: "Access to airplay and royalty reports",
  },
  {
    id: "monitoring",
    label: "Monitor Streams",
    description: "Real-time stream monitoring access",
  },
  {
    id: "staff",
    label: "Manage Staff",
    description: "Add/remove staff members and roles",
  },
  {
    id: "settings",
    label: "System Settings",
    description: "Modify station configuration",
  },
  {
    id: "payments",
    label: "Payment Management",
    description: "Access to payment and billing features",
  },
  {
    id: "compliance",
    label: "Compliance Tools",
    description: "Access to regulatory compliance features",
  },
];

const defaultForm: StaffMemberForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  role: "reporter",
  permissions: ["reports"],
};

const mapSummaryToForm = (
  summary: Record<string, unknown>,
): StaffMemberForm => {
  const name = typeof summary.name === "string" ? summary.name : "";
  const [firstName, ...rest] = name.split(" ");
  const lastName = rest.join(" ");
  const role =
    typeof summary.role === "string" &&
    (["admin", "manager", "reporter"] as const).includes(summary.role as any)
      ? (summary.role as "admin" | "manager" | "reporter")
      : "reporter";

  return {
    firstName: firstName ?? "",
    lastName: lastName ?? "",
    email: typeof summary.email === "string" ? (summary.email ?? "") : "",
    phone: typeof summary.phone === "string" ? (summary.phone ?? "") : "",
    role,
    permissions: Array.isArray(summary.permissions)
      ? (summary.permissions as string[])
      : ["reports"],
  };
};

const StaffStep: React.FC<StaffStepProps> = ({
  onNext,
  onPrevious,
  onSkip,
}) => {
  const { status, submitStaff, skipStep } = useStationOnboarding();
  const [staffMembers, setStaffMembers] = useState<StaffMemberForm[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState<StaffMemberForm>(defaultForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [skipping, setSkipping] = useState(false);

  const staffSummary = useMemo(
    () => (status as any)?.staff_members ?? [],
    [status],
  );

  useEffect(() => {
    if (Array.isArray(staffSummary) && staffSummary.length > 0) {
      const mapped = staffSummary
        .filter((item) => item && typeof item === "object")
        .map((item) => mapSummaryToForm(item as Record<string, unknown>));
      setStaffMembers(mapped);
    }
  }, [staffSummary]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const handlePermissionToggle = (permissionId: string) => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter((p) => p !== permissionId)
        : [...prev.permissions, permissionId],
    }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required";
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setFormData(defaultForm);
    setErrors({});
    setShowAddForm(false);
    setEditingIndex(null);
  };

  const handleAddStaff = () => {
    if (!validateForm()) return;

    setStaffMembers((prev) => [...prev, formData]);
    resetForm();
  };

  const handleEditStaff = (index: number) => {
    const target = staffMembers[index];
    if (!target) return;
    setFormData(target);
    setEditingIndex(index);
    setShowAddForm(true);
  };

  const handleUpdateStaff = () => {
    if (!validateForm() || editingIndex === null) return;
    setStaffMembers((prev) =>
      prev.map((member, idx) => (idx === editingIndex ? formData : member)),
    );
    resetForm();
  };

  const handleRemoveStaff = (index: number) => {
    setStaffMembers((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setApiError(null);

    // Require at least one staff member or use Skip button
    if (staffMembers.length === 0) {
      setApiError(
        "Please add at least one staff member, or click Skip to continue without adding staff.",
      );
      setSubmitting(false);
      return;
    }

    const payload = staffMembers.map((member) => ({
      name: `${member.firstName.trim()} ${member.lastName.trim()}`.trim(),
      email: member.email.trim(),
      role: member.role,
    }));

    try {
      await submitStaff(payload);
      onNext();
    } catch (err) {
      const message = resolveApiError(err, setApiError);
      setApiError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = async () => {
    if (!onSkip) {
      setSkipping(true);
      try {
        await skipStep("staff");
        onNext();
      } catch (err) {
        const message = resolveApiError(err, setApiError);
        setApiError(message);
      } finally {
        setSkipping(false);
      }
      return;
    }
    onSkip();
  };

  return (
    <div className="py-8">
      <div className="text-center mb-8">
        <h3 className="text-3xl font-semibold text-white mb-4">
          Staff Management
        </h3>
        <p className="text-slate-300 text-lg max-w-2xl mx-auto">
          Add team members and assign roles for efficient station operations.
          Control access levels and permissions for different team functions.
        </p>
      </div>

      <div className="space-y-8">
        {apiError && (
          <div className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {apiError}
          </div>
        )}

        <div className="bg-slate-900/60 rounded-2xl border border-white/10 p-8">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-xl font-semibold text-white">Team Members</h4>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(true);
                setEditingIndex(null);
                setFormData(defaultForm);
              }}
              className="inline-flex items-center space-x-2 bg-indigo-500 hover:bg-indigo-400 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Staff Member</span>
            </button>
          </div>

          <div className="space-y-4">
            {staffMembers.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 bg-slate-800/40 p-6 text-center text-slate-300">
                <p>
                  No staff members added yet. Use the button above to invite
                  your team.
                </p>
              </div>
            ) : (
              staffMembers.map((member, index) => {
                const roleInfo = availableRoles.find(
                  (role) => role.id === member.role,
                );
                return (
                  <div
                    key={`${member.email}-${index}`}
                    className="flex flex-col md:flex-row md:items-center justify-between rounded-xl border border-white/10 bg-slate-800/40 p-4"
                  >
                    <div className="flex items-center space-x-4">
                      <div
                        className={`rounded-lg px-3 py-1 text-sm font-medium ${roleInfo?.bgColor ?? "bg-slate-700/40"} ${roleInfo?.color ?? "text-slate-300"}`}
                      >
                        {roleInfo?.name ?? member.role}
                      </div>
                      <div>
                        <p className="text-white font-medium">
                          {member.firstName} {member.lastName}
                        </p>
                        <p className="text-sm text-slate-400 flex items-center space-x-2">
                          <Mail className="w-4 h-4" />
                          <span>{member.email}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 mt-4 md:mt-0">
                      <button
                        type="button"
                        onClick={() => handleEditStaff(index)}
                        className="inline-flex items-center space-x-1 rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800/60 transition"
                      >
                        <Edit className="w-4 h-4" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveStaff(index)}
                        className="inline-flex items-center space-x-1 rounded-lg border border-red-400/40 px-3 py-2 text-sm text-red-300 hover:bg-red-500/10 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {showAddForm && (
          <div className="bg-slate-900/60 rounded-2xl border border-white/10 p-8">
            <h4 className="text-xl font-semibold text-white mb-6">
              {editingIndex !== null
                ? "Update Team Member"
                : "Add New Team Member"}
            </h4>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label
                  htmlFor="firstName"
                  className="block text-sm font-medium text-slate-200 mb-2"
                >
                  First Name
                </label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className={`w-full rounded-lg border px-4 py-3 text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 ${
                    errors.firstName
                      ? "border-red-400 bg-slate-800/50 focus:border-red-400 focus:ring-red-400"
                      : "border-white/20 bg-slate-800/50 focus:border-indigo-400 focus:ring-indigo-400"
                  }`}
                  placeholder="Sarah"
                />
                {errors.firstName && (
                  <p className="text-red-400 text-sm mt-1">
                    {errors.firstName}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="lastName"
                  className="block text-sm font-medium text-slate-200 mb-2"
                >
                  Last Name
                </label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className={`w-full rounded-lg border px-4 py-3 text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 ${
                    errors.lastName
                      ? "border-red-400 bg-slate-800/50 focus:border-red-400 focus:ring-red-400"
                      : "border-white/20 bg-slate-800/50 focus:border-indigo-400 focus:ring-indigo-400"
                  }`}
                  placeholder="Johnson"
                />
                {errors.lastName && (
                  <p className="text-red-400 text-sm mt-1">{errors.lastName}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-slate-200 mb-2"
                >
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full rounded-lg border px-4 py-3 text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 ${
                    errors.email
                      ? "border-red-400 bg-slate-800/50 focus:border-red-400 focus:ring-red-400"
                      : "border-white/20 bg-slate-800/50 focus:border-indigo-400 focus:ring-indigo-400"
                  }`}
                  placeholder="sarah@radiostation.com"
                />
                {errors.email && (
                  <p className="text-red-400 text-sm mt-1">{errors.email}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="phone"
                  className="block text-sm font-medium text-slate-200 mb-2"
                >
                  Phone
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-white/20 bg-slate-800/50 px-4 py-3 text-white placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  placeholder="+233 24 123 4567"
                />
              </div>

              <div className="md:col-span-2">
                <p className="text-sm font-medium text-slate-200 mb-3">Role</p>
                <div className="grid md:grid-cols-3 gap-3">
                  {availableRoles.map((role) => {
                    const Icon = role.icon;
                    const isActive = formData.role === role.id;
                    return (
                      <button
                        type="button"
                        key={role.id}
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            role: role.id as "admin" | "manager" | "reporter",
                            permissions: getDefaultPermissions(role.id),
                          }))
                        }
                        className={`flex items-start space-x-3 rounded-xl border px-4 py-3 text-left transition ${
                          isActive
                            ? "border-indigo-400 bg-indigo-500/20"
                            : "border-white/10 bg-slate-800/50 hover:border-white/20"
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${role.color}`} />
                        <div>
                          <p className="text-sm font-semibold text-white">
                            {role.name}
                          </p>
                          <p className="text-xs text-slate-400">
                            {role.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="md:col-span-2">
                <p className="text-sm font-medium text-slate-200 mb-3">
                  Permissions
                </p>
                <div className="grid md:grid-cols-2 gap-3">
                  {availablePermissions.map((permission) => (
                    <label
                      key={permission.id}
                      className={`flex items-start space-x-3 rounded-lg border px-4 py-3 text-sm transition ${
                        formData.permissions.includes(permission.id)
                          ? "border-indigo-400 bg-indigo-500/20"
                          : "border-white/10 bg-slate-800/50 hover:border-white/20"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.permissions.includes(permission.id)}
                        onChange={() => handlePermissionToggle(permission.id)}
                        className="mt-1 h-4 w-4 rounded border-white/20 bg-slate-800 text-indigo-500 focus:ring-indigo-400"
                      />
                      <span>
                        <span className="block text-white font-medium">
                          {permission.label}
                        </span>
                        <span className="text-xs text-slate-400">
                          {permission.description}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center space-x-2 rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800/60 transition"
              >
                <UserX className="w-4 h-4" />
                <span>Cancel</span>
              </button>

              <div className="flex items-center space-x-3">
                {editingIndex !== null ? (
                  <button
                    type="button"
                    onClick={handleUpdateStaff}
                    className="inline-flex items-center space-x-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>Update Member</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleAddStaff}
                    className="inline-flex items-center space-x-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>Add Member</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-6 border-t border-white/10">
          <button
            type="button"
            onClick={onPrevious}
            className="inline-flex items-center rounded-lg bg-slate-800/50 px-6 py-3 text-white transition hover:bg-slate-800"
          >
            Previous
          </button>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={handleSkip}
              disabled={skipping}
              className="inline-flex items-center rounded-lg border border-white/20 px-6 py-3 text-white transition hover:bg-slate-800/60 disabled:opacity-60"
            >
              {skipping ? "Skipping…" : "Skip"}
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex items-center rounded-lg bg-indigo-500 px-6 py-3 font-semibold text-white transition hover:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 disabled:opacity-60"
            >
              {submitting ? "Saving…" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const getDefaultPermissions = (roleId: string): string[] => {
  switch (roleId) {
    case "admin":
      return [
        "reports",
        "monitoring",
        "staff",
        "settings",
        "payments",
        "compliance",
      ];
    case "manager":
      return ["reports", "monitoring", "staff"];
    default:
      return ["reports"];
  }
};

const resolveApiError = (
  error: unknown,
  setMessage: React.Dispatch<React.SetStateAction<string | null>>,
): string => {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data as
      | { errors?: Record<string, string[] | string>; message?: string }
      | undefined;
    if (responseData?.message) {
      setMessage(responseData.message);
      return responseData.message;
    }
    if (responseData?.errors) {
      const first = Object.values(responseData.errors)[0];
      if (Array.isArray(first) && typeof first[0] === "string") {
        setMessage(first[0]);
        return first[0];
      }
    }
    const message = error.message || "Unable to save staff members.";
    setMessage(message);
    return message;
  }
  if (error instanceof Error && error.message) {
    setMessage(error.message);
    return error.message;
  }
  const fallback = "Unable to save staff members.";
  setMessage(fallback);
  return fallback;
};

export default StaffStep;
