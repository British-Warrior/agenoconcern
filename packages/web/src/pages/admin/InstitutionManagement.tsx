import { useState } from "react";
import { Link } from "react-router";
import {
  useInstitutions,
  useCreateInstitution,
  useUpdateInstitution,
  useToggleActive,
  useInstitutionContributors,
  useAllContributors,
  useUpdateSchedule,
  useDeliveryLogs,
  usePortalAccount,
  useCreatePortalAccount,
  useSetPortalAccountActive,
  useResetPortalPassword,
} from "../../hooks/useInstitutions.js";
import type { Institution, InstitutionContributor, DeliveryLog } from "../../api/admin.js";
import { downloadInstitutionReport } from "../../api/admin.js";
import { Button } from "../../components/ui/Button.js";
import { Input } from "../../components/ui/Input.js";

// ─── Toggle switch component ──────────────────────────────────────────────────

interface ToggleSwitchProps {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  label: string;
}

function ToggleSwitch({ checked, onChange, disabled, label }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`
        relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2
        ${checked ? "bg-green-500" : "bg-neutral-300"}
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
      `.trim()}
    >
      <span
        className={`
          inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200
          ${checked ? "translate-x-6" : "translate-x-1"}
        `.trim()}
      />
    </button>
  );
}

// ─── Confirmation dialog ──────────────────────────────────────────────────────

interface ConfirmDialogProps {
  institutionName: string;
  isActive: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}

function ConfirmDialog({
  institutionName,
  isActive,
  onConfirm,
  onCancel,
  isPending,
}: ConfirmDialogProps) {
  const action = isActive ? "Deactivate" : "Activate";
  const message = isActive
    ? `Deactivate "${institutionName}"? This hides the kiosk page.`
    : `Activate "${institutionName}"? This makes the kiosk page visible.`;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4">
        <h2
          id="confirm-dialog-title"
          className="text-lg font-semibold text-neutral-900 mb-3"
        >
          {action} Institution
        </h2>
        <p className="text-neutral-600 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant={isActive ? "outline" : "primary"}
            className={isActive ? "border-red-500 text-red-600 hover:bg-red-50" : ""}
            onClick={onConfirm}
            loading={isPending}
          >
            {action}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Relative time formatter ───────────────────────────────────────────────────

function formatRelative(isoDate: string | null): string {
  if (!isoDate) return "No activity yet";
  const diff = Date.now() - new Date(isoDate).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months === 1) return "1 month ago";
  if (months < 12) return `${months} months ago`;
  return `${Math.floor(months / 12)} years ago`;
}

// ─── Contributor list (expandable) ────────────────────────────────────────────

interface ContributorListProps {
  institutionId: string;
}

function ContributorList({ institutionId }: ContributorListProps) {
  const { data, isLoading } = useInstitutionContributors(institutionId);

  if (isLoading) {
    return (
      <div className="px-1 py-2 text-sm text-neutral-400 animate-pulse">
        Loading contributors...
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <p className="text-sm text-neutral-400 px-1 py-2">No contributors assigned.</p>
    );
  }

  return (
    <ul className="divide-y divide-neutral-100">
      {data.map((c: InstitutionContributor) => (
        <li key={c.id} className="py-2 px-1 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium text-neutral-800 truncate">{c.name}</p>
            <p className="text-xs text-neutral-500 capitalize">{c.status}</p>
          </div>
          <span className="shrink-0 text-xs text-neutral-400 pt-0.5">
            {formatRelative(c.lastActivity)}
          </span>
        </li>
      ))}
    </ul>
  );
}

// ─── Delivery history log ──────────────────────────────────────────────────────

interface DeliveryHistoryProps {
  institutionId: string;
}

function formatAttemptedAt(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getUTCDate()).padStart(2, "0");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[d.getUTCMonth()];
  const year = d.getUTCFullYear();
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${day} ${month} ${year} ${hh}:${mm}`;
}

function formatRetryAt(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[d.getUTCMonth()];
  return `${day} ${month} ${hh}:${mm}`;
}

function DeliveryHistory({ institutionId }: DeliveryHistoryProps) {
  const { data, isLoading } = useDeliveryLogs(institutionId);

  if (isLoading) {
    return (
      <p className="text-xs text-neutral-400 animate-pulse mt-1">Loading delivery history...</p>
    );
  }

  if (!data || data.length === 0) {
    return (
      <p className="text-xs text-neutral-400 mt-1">No deliveries yet.</p>
    );
  }

  return (
    <div className="mt-2 border border-neutral-100 rounded-lg overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-neutral-50 text-neutral-500 text-left">
            <th className="px-2 py-1.5 font-medium">Date</th>
            <th className="px-2 py-1.5 font-medium">Status</th>
            <th className="px-2 py-1.5 font-medium">Recipient</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {data.map((log: DeliveryLog) => (
            <tr key={log.id} className="align-top">
              <td className="px-2 py-1.5 text-neutral-600 whitespace-nowrap">
                {formatAttemptedAt(log.attemptedAt)}
              </td>
              <td className="px-2 py-1.5 whitespace-nowrap">
                {log.status === "sent" ? (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Sent
                  </span>
                ) : (
                  <div>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                      Failed
                    </span>
                    <span className="ml-1 text-neutral-400">Attempt {log.attemptNumber}/5</span>
                    {log.nextRetryAt && (
                      <p className="text-neutral-400 mt-0.5">Retry at {formatRetryAt(log.nextRetryAt)}</p>
                    )}
                    {log.errorMessage && (
                      <p className="text-red-500 mt-0.5 max-w-[160px] break-words">{log.errorMessage}</p>
                    )}
                  </div>
                )}
              </td>
              <td className="px-2 py-1.5 text-neutral-600 break-all">
                {log.recipientEmail}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Report delivery section ──────────────────────────────────────────────────

interface ReportDeliverySectionProps {
  institution: Institution;
}

function ReportDeliverySection({ institution }: ReportDeliverySectionProps) {
  const updateSchedule = useUpdateSchedule();
  const [cadence, setCadence] = useState<"weekly" | "monthly">(
    institution.reportCadence ?? "monthly",
  );

  const hasEmail = !!institution.contactEmail;
  const isEnabled = institution.reportDeliveryEnabled;

  const handleToggle = () => {
    if (!hasEmail) return;
    const newEnabled = !isEnabled;
    updateSchedule.mutate({
      id: institution.id,
      data: {
        reportDeliveryEnabled: newEnabled,
        reportCadence: newEnabled ? cadence : null,
      },
    });
  };

  const handleCadenceChange = (newCadence: "weekly" | "monthly") => {
    setCadence(newCadence);
    if (isEnabled) {
      updateSchedule.mutate({
        id: institution.id,
        data: { reportDeliveryEnabled: true, reportCadence: newCadence },
      });
    }
  };

  const formatNextDelivery = (iso: string | null): string => {
    if (!iso) return "Not scheduled";
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="pt-3 border-t border-neutral-100">
      <p className="text-xs font-semibold text-neutral-700 uppercase tracking-wide mb-2">
        Automatic Report Delivery
      </p>

      {!hasEmail && (
        <p className="text-xs text-neutral-400 mb-2">
          Set a contact email above to enable automatic delivery.
        </p>
      )}

      <div className="flex items-center gap-2 mb-2">
        <ToggleSwitch
          checked={isEnabled}
          onChange={handleToggle}
          disabled={!hasEmail || updateSchedule.isPending}
          label={isEnabled ? "Disable automatic report delivery" : "Enable automatic report delivery"}
        />
        <span className="text-xs text-neutral-500">
          {isEnabled ? "Delivery enabled" : "Delivery disabled"}
        </span>
      </div>

      {(isEnabled || hasEmail) && (
        <div className="flex gap-3 mb-2">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name={`cadence-${institution.id}`}
              value="weekly"
              checked={cadence === "weekly"}
              onChange={() => handleCadenceChange("weekly")}
              disabled={updateSchedule.isPending}
              className="accent-primary-700"
            />
            <span className="text-xs text-neutral-700">Weekly</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name={`cadence-${institution.id}`}
              value="monthly"
              checked={cadence === "monthly"}
              onChange={() => handleCadenceChange("monthly")}
              disabled={updateSchedule.isPending}
              className="accent-primary-700"
            />
            <span className="text-xs text-neutral-700">Monthly</span>
          </label>
        </div>
      )}

      {isEnabled && institution.reportNextRunAt && (
        <p className="text-xs text-neutral-500">
          Next delivery: {formatNextDelivery(institution.reportNextRunAt)}
        </p>
      )}

      {updateSchedule.isError && (
        <p className="text-xs text-red-600 mt-1" role="alert">
          {updateSchedule.error instanceof Error
            ? updateSchedule.error.message
            : "Failed to update schedule"}
        </p>
      )}

      <div className="mt-3">
        <p className="text-xs font-semibold text-neutral-700 uppercase tracking-wide mb-1">
          Delivery History
        </p>
        <DeliveryHistory institutionId={institution.id} />
      </div>
    </div>
  );
}

// ─── Portal access section ────────────────────────────────────────────────────

interface PortalAccessSectionProps {
  institutionId: string;
}

function PortalAccessSection({ institutionId }: PortalAccessSectionProps) {
  const { data: account, isLoading, error } = usePortalAccount(institutionId);
  const createMutation = useCreatePortalAccount();
  const activeMutation = useSetPortalAccountActive();
  const resetMutation = useResetPortalPassword();

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // After reset, show the new password
  const handleResetPassword = () => {
    setNewPassword(null);
    resetMutation.mutate(account!.id, {
      onSuccess: (result) => {
        setNewPassword(result.password);
      },
    });
  };

  const handleCreate = () => {
    setEmailError(null);
    setNewPassword(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError("Enter a valid email address");
      return;
    }
    createMutation.mutate(
      { institutionId, email: email.trim() },
      {
        onSuccess: (result) => {
          setEmail("");
          setNewPassword(result.password);
        },
      },
    );
  };

  const handleCopyPassword = () => {
    if (!newPassword) return;
    void navigator.clipboard.writeText(newPassword).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const isNoAccount = !isLoading && (error || !account);

  return (
    <div className="pt-3 border-t border-neutral-100">
      <p className="text-xs font-semibold text-neutral-700 uppercase tracking-wide mb-2">
        Portal Access
      </p>

      {isLoading && (
        <p className="text-xs text-neutral-400 animate-pulse">Checking portal account...</p>
      )}

      {/* One-time password display (shown after create OR reset) */}
      {newPassword && (
        <div className="mb-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-xs font-semibold text-amber-800 mb-1">
            Generated password — save this now, it will not be shown again
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 font-mono text-sm text-amber-900 bg-amber-100 px-2 py-1 rounded break-all">
              {newPassword}
            </code>
            <button
              type="button"
              onClick={handleCopyPassword}
              className="shrink-0 text-xs text-amber-700 hover:text-amber-900 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded px-1"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      )}

      {/* No account — show creation form */}
      {isNoAccount && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-neutral-400">No portal account. Create one below.</p>
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="portal@institution.org"
              disabled={createMutation.isPending}
              className="flex-1 px-2 py-1 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
            <button
              type="button"
              onClick={handleCreate}
              disabled={createMutation.isPending || !email.trim()}
              className="shrink-0 px-3 py-1 text-xs font-medium bg-[#1a1d2e] text-white rounded-md hover:bg-[#2a2d3e] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
            >
              {createMutation.isPending ? "Creating..." : "Create"}
            </button>
          </div>
          {emailError && (
            <p className="text-xs text-red-600" role="alert">{emailError}</p>
          )}
          {createMutation.isError && (
            <p className="text-xs text-red-600" role="alert">
              {createMutation.error instanceof Error
                ? createMutation.error.message
                : "Failed to create portal account"}
            </p>
          )}
        </div>
      )}

      {/* Account exists — show management UI */}
      {!isLoading && account && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-neutral-600">
            <span className="font-medium">{account.email}</span>
            <span
              className={`ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${
                account.isActive
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {account.isActive ? "Active" : "Inactive"}
            </span>
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleResetPassword}
              disabled={resetMutation.isPending}
              className="text-xs text-primary-700 hover:text-primary-900 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 rounded disabled:opacity-50"
            >
              {resetMutation.isPending ? "Resetting..." : "Reset Password"}
            </button>
            <span className="text-neutral-300">·</span>
            <button
              type="button"
              onClick={() =>
                activeMutation.mutate({
                  accountId: account.id,
                  isActive: !account.isActive,
                  institutionId,
                })
              }
              disabled={activeMutation.isPending}
              className="text-xs text-primary-700 hover:text-primary-900 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 rounded disabled:opacity-50"
            >
              {activeMutation.isPending
                ? "Updating..."
                : account.isActive
                  ? "Deactivate"
                  : "Activate"}
            </button>
          </div>
          {resetMutation.isError && (
            <p className="text-xs text-red-600" role="alert">
              {resetMutation.error instanceof Error
                ? resetMutation.error.message
                : "Failed to reset password"}
            </p>
          )}
          {activeMutation.isError && (
            <p className="text-xs text-red-600" role="alert">
              {activeMutation.error instanceof Error
                ? activeMutation.error.message
                : "Failed to update account status"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Institution card (view mode) ─────────────────────────────────────────────

interface InstitutionCardViewProps {
  institution: Institution;
  onEdit: () => void;
  onToggle: () => void;
  isTogglePending: boolean;
}

function InstitutionCardView({
  institution,
  onEdit,
  onToggle,
  isTogglePending,
}: InstitutionCardViewProps) {
  const [expanded, setExpanded] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [showDateRange, setShowDateRange] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const stats = institution.stats;

  const handleGenerateReport = async () => {
    setReportError(null);
    setIsGenerating(true);
    try {
      await downloadInstitutionReport(
        institution.slug,
        fromDate || undefined,
        toDate || undefined,
      );
    } catch (err) {
      setReportError(err instanceof Error ? err.message : "Report generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-6 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-neutral-900 truncate">
            {institution.name}
          </h3>
          {institution.city && (
            <p className="text-sm text-neutral-500 mt-0.5">{institution.city}</p>
          )}
        </div>
        <span
          className={`
            shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
            ${institution.isActive
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-700"
            }
          `.trim()}
        >
          {institution.isActive ? "Active" : "Inactive"}
        </span>
      </div>

      {institution.description && (
        <p className="text-sm text-neutral-600 line-clamp-2">{institution.description}</p>
      )}

      {/* Live stats */}
      {stats ? (
        <p className="text-xs text-neutral-500">
          {stats.contributors} contributors &middot; {stats.challenges} challenges &middot; {stats.hours} hours
        </p>
      ) : (
        <p className="text-xs text-neutral-400">No contributors assigned</p>
      )}

      {/* Expandable contributor list */}
      <div>
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="text-xs text-primary-700 hover:text-primary-900 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 rounded"
        >
          {expanded ? "Hide contributors" : "Show contributors"}
        </button>
        {expanded && (
          <div className="mt-2 border-t border-neutral-100 pt-2">
            <ContributorList institutionId={institution.id} />
          </div>
        )}
      </div>

      {/* Generate Report */}
      <div className="pt-2 border-t border-neutral-100">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="default"
              className="text-sm px-3 py-1.5 min-h-0"
              disabled={!stats || isGenerating}
              loading={isGenerating}
              onClick={() => void handleGenerateReport()}
            >
              Generate Report
            </Button>
            <button
              type="button"
              onClick={() => setShowDateRange((prev) => !prev)}
              className="text-xs text-primary-700 hover:text-primary-900 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 rounded"
            >
              {showDateRange ? "Hide dates" : "Date range"}
            </button>
          </div>
          {!stats && (
            <span className="text-xs text-neutral-400">No contributors</span>
          )}
        </div>

        {showDateRange && (
          <div className="mt-2 flex gap-2">
            <div className="flex-1">
              <label htmlFor="report-from-date" className="text-xs text-neutral-500 block mb-1">From</label>
              <input
                id="report-from-date"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                disabled={isGenerating}
                className="w-full px-2 py-1 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
            <div className="flex-1">
              <label htmlFor="report-to-date" className="text-xs text-neutral-500 block mb-1">To</label>
              <input
                id="report-to-date"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                disabled={isGenerating}
                className="w-full px-2 py-1 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
          </div>
        )}

        {reportError && (
          <p className="mt-1.5 text-xs text-red-600" role="alert">{reportError}</p>
        )}
      </div>

      {/* Report delivery */}
      <ReportDeliverySection institution={institution} />

      {/* Portal access */}
      <PortalAccessSection institutionId={institution.id} />

      <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
        <div className="flex items-center gap-2">
          <ToggleSwitch
            checked={institution.isActive}
            onChange={onToggle}
            disabled={isTogglePending}
            label={institution.isActive ? "Deactivate institution" : "Activate institution"}
          />
          <span className="text-xs text-neutral-500">
            {institution.isActive ? "Active" : "Inactive"}
          </span>
        </div>
        <Button variant="ghost" size="default" onClick={onEdit} className="text-sm px-3 py-1.5 min-h-0">
          Edit
        </Button>
      </div>
    </div>
  );
}

// ─── Institution card (edit mode) ────────────────────────────────────────────

interface InstitutionCardEditProps {
  initialName?: string;
  initialDescription?: string;
  initialCity?: string;
  initialContactEmail?: string;
  onSave: (data: { name: string; description: string; city: string; contactEmail?: string }) => void;
  onCancel: () => void;
  isPending: boolean;
  isNew?: boolean;
}

function InstitutionCardEdit({
  initialName = "",
  initialDescription = "",
  initialCity = "",
  initialContactEmail = "",
  onSave,
  onCancel,
  isPending,
  isNew,
}: InstitutionCardEditProps) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [city, setCity] = useState(initialCity);
  const [contactEmail, setContactEmail] = useState(initialContactEmail);
  const [errors, setErrors] = useState<{ name?: string; city?: string; contactEmail?: string }>({});

  const validate = () => {
    const errs: { name?: string; city?: string; contactEmail?: string } = {};
    if (name.trim().length < 2) errs.name = "Name must be at least 2 characters";
    if (city.trim().length < 2) errs.city = "City must be at least 2 characters";
    if (contactEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())) {
      errs.contactEmail = "Enter a valid email address";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({
      name: name.trim(),
      description: description.trim(),
      city: city.trim(),
      contactEmail: contactEmail.trim() || undefined,
    });
  };

  return (
    <div className="bg-white border-2 border-primary-300 rounded-xl p-6 flex flex-col gap-4">
      <h3 className="text-base font-semibold text-neutral-900">
        {isNew ? "New Institution" : "Edit Institution"}
      </h3>
      <Input
        label="Name"
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={errors.name}
        placeholder="e.g. Central Library"
        disabled={isPending}
      />
      <Input
        label="City"
        required
        value={city}
        onChange={(e) => setCity(e.target.value)}
        error={errors.city}
        placeholder="e.g. Manchester"
        disabled={isPending}
      />
      <Input
        label="Contact Email"
        type="email"
        value={contactEmail}
        onChange={(e) => setContactEmail(e.target.value)}
        error={errors.contactEmail}
        placeholder="e.g. reports@library.org.uk"
        disabled={isPending}
      />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="institution-description" className="text-base font-medium text-neutral-800">
          Description
        </label>
        <textarea
          id="institution-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description..."
          disabled={isPending}
          rows={3}
          className="px-4 py-3 text-base text-neutral-900 bg-white border-2 border-neutral-300 rounded-[var(--radius-md)] transition-colors duration-150 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 hover:border-neutral-400 resize-none"
        />
      </div>
      <div className="flex gap-3 justify-end pt-1">
        <Button variant="secondary" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSave} loading={isPending}>
          Save
        </Button>
      </div>
    </div>
  );
}

// ─── Unassigned contributors section ──────────────────────────────────────────

function UnassignedContributors() {
  const { data, isLoading } = useAllContributors();

  const unassigned = data?.filter((c) => c.institutions.length === 0) ?? [];

  if (isLoading) {
    return (
      <div className="mt-12">
        <h2 className="text-lg font-semibold text-neutral-900 mb-4">Unassigned Contributors</h2>
        <p className="text-sm text-neutral-400 animate-pulse">Loading...</p>
      </div>
    );
  }

  if (unassigned.length === 0) return null;

  return (
    <div className="mt-12">
      <h2 className="text-lg font-semibold text-neutral-900 mb-1">Unassigned Contributors</h2>
      <p className="text-sm text-neutral-500 mb-4">
        These contributors are not linked to any institution. Click "View" to assign them.
      </p>
      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
        <ul className="divide-y divide-neutral-100">
          {unassigned.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-4 px-5 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-neutral-900 truncate">{c.name}</p>
                <p className="text-xs text-neutral-500 capitalize">{c.status}</p>
              </div>
              <Link
                to={`/admin/contributors/${c.id}`}
                className="shrink-0 text-sm font-medium text-primary-700 hover:text-primary-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 rounded px-1"
              >
                View
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function InstitutionManagement() {
  const { data: institutionsData, isLoading, error } = useInstitutions();
  const createMutation = useCreateInstitution();
  const updateMutation = useUpdateInstitution();
  const toggleMutation = useToggleActive();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);
  const [confirmToggle, setConfirmToggle] = useState<Institution | null>(null);

  const handleCreate = async (data: { name: string; description: string; city: string; contactEmail?: string }) => {
    await createMutation.mutateAsync(data);
    setCreatingNew(false);
  };

  const handleUpdate = async (id: string, data: { name: string; description: string; city: string; contactEmail?: string }) => {
    await updateMutation.mutateAsync({ id, data });
    setEditingId(null);
  };

  const handleToggleConfirm = async () => {
    if (!confirmToggle) return;
    await toggleMutation.mutateAsync({
      id: confirmToggle.id,
      isActive: !confirmToggle.isActive,
    });
    setConfirmToggle(null);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Institution Management</h1>
          <p className="text-neutral-500 mt-1">
            Manage institutions and their kiosk landing pages.
          </p>
        </div>
        {!creatingNew && (
          <Button
            variant="primary"
            onClick={() => {
              setCreatingNew(true);
              setEditingId(null);
            }}
          >
            New Institution
          </Button>
        )}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-20" role="status">
          <svg
            className="animate-spin h-8 w-8 text-primary-800"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="sr-only">Loading institutions...</span>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700" role="alert">
          Failed to load institutions. Please refresh and try again.
        </div>
      )}

      {/* Card grid */}
      {!isLoading && !error && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* New institution card (at top) */}
            {creatingNew && (
              <InstitutionCardEdit
                isNew
                onSave={(data) => void handleCreate(data)}
                onCancel={() => setCreatingNew(false)}
                isPending={createMutation.isPending}
              />
            )}

            {/* Existing institution cards */}
            {institutionsData?.map((institution) =>
              editingId === institution.id ? (
                <InstitutionCardEdit
                  key={institution.id}
                  initialName={institution.name}
                  initialDescription={institution.description}
                  initialCity={institution.city ?? ""}
                  initialContactEmail={institution.contactEmail ?? ""}
                  onSave={(data) => void handleUpdate(institution.id, data)}
                  onCancel={() => setEditingId(null)}
                  isPending={updateMutation.isPending}
                />
              ) : (
                <InstitutionCardView
                  key={institution.id}
                  institution={institution}
                  onEdit={() => {
                    setEditingId(institution.id);
                    setCreatingNew(false);
                  }}
                  onToggle={() => setConfirmToggle(institution)}
                  isTogglePending={
                    toggleMutation.isPending && confirmToggle?.id === institution.id
                  }
                />
              ),
            )}

            {/* Empty state */}
            {!creatingNew && institutionsData?.length === 0 && (
              <div className="col-span-full text-center py-16 text-neutral-400">
                <p className="text-lg font-medium">No institutions yet.</p>
                <p className="text-sm mt-1">Click "New Institution" to add the first one.</p>
              </div>
            )}
          </div>

          {/* Unassigned contributors section */}
          <UnassignedContributors />
        </>
      )}

      {/* Confirmation dialog */}
      {confirmToggle && (
        <ConfirmDialog
          institutionName={confirmToggle.name}
          isActive={confirmToggle.isActive}
          onConfirm={() => void handleToggleConfirm()}
          onCancel={() => setConfirmToggle(null)}
          isPending={toggleMutation.isPending}
        />
      )}
    </div>
  );
}
