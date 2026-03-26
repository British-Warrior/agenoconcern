import { useState } from "react";
import { useAttentionFlags, useAttentionHistory, useAttentionTrend, useResolveFlag } from "../../hooks/useAttention.js";
import type { AttentionFlag, AttentionHistoryEntry } from "../../api/attention.js";
import { Button } from "../../components/ui/Button.js";
import { AttentionTrendChart } from "../../components/attention/AttentionTrendChart.js";

// ─── Format date ───────────────────────────────────────────────────────────────

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ─── Signal type badge ─────────────────────────────────────────────────────────

function SignalBadge({ signalType }: { signalType: string }) {
  const label = signalType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
      {label}
    </span>
  );
}

// ─── Resolve dialog ────────────────────────────────────────────────────────────

interface ResolveDialogProps {
  flag: AttentionFlag;
  onConfirm: (followUpNotes: string) => void;
  onCancel: () => void;
  isPending: boolean;
}

function ResolveDialog({ flag, onConfirm, onCancel, isPending }: ResolveDialogProps) {
  const [notes, setNotes] = useState("");

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="resolve-dialog-title"
    >
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
        <h2
          id="resolve-dialog-title"
          className="text-lg font-semibold text-neutral-900 mb-3"
        >
          Resolve Flag
        </h2>
        <p className="text-neutral-600 mb-2">
          Resolving flag for{" "}
          <span className="font-medium text-neutral-900">{flag.contributorName}</span>
          {" — "}
          <SignalBadge signalType={flag.signalType} />
        </p>
        <p className="text-sm text-neutral-500 mb-5">
          Flagged on {formatDate(flag.createdAt)}
          {flag.cohortSize != null && flag.flaggedCount != null && (
            <> &middot; {flag.flaggedCount} of {flag.cohortSize} in cohort</>
          )}
        </p>
        <div className="flex flex-col gap-1.5 mb-6">
          <label
            htmlFor="resolve-notes"
            className="text-sm font-medium text-neutral-800"
          >
            Follow-up notes <span className="text-red-500">*</span>
          </label>
          <textarea
            id="resolve-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Enter follow-up notes..."
            disabled={isPending}
            rows={4}
            className="px-4 py-3 text-base text-neutral-900 bg-white border-2 border-neutral-300 rounded-[var(--radius-md)] transition-colors duration-150 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 hover:border-neutral-400 resize-none"
          />
        </div>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => onConfirm(notes)}
            loading={isPending}
            disabled={notes.trim() === "" || isPending}
          >
            Confirm Resolve
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Active flags section ──────────────────────────────────────────────────────

function ActiveFlags() {
  const { data, isLoading, error } = useAttentionFlags();
  const resolveFlag = useResolveFlag();
  const [resolvingFlag, setResolvingFlag] = useState<AttentionFlag | null>(null);

  const handleConfirmResolve = async (followUpNotes: string) => {
    if (!resolvingFlag) return;
    await resolveFlag.mutateAsync({ flagId: resolvingFlag.id, followUpNotes });
    setResolvingFlag(null);
  };

  if (isLoading) {
    return (
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
        <span className="sr-only">Loading...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700" role="alert">
        <p className="font-medium">Failed to load attention flags.</p>
        <p className="text-sm mt-1">{error instanceof Error ? error.message : "Unknown error"}</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-neutral-500">No flagged contributors at your institution.</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        {data.map((flag) => (
          <div
            key={flag.id}
            className="bg-white border border-neutral-200 rounded-xl p-5 flex items-start justify-between gap-4"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <p className="text-base font-semibold text-neutral-900">{flag.contributorName}</p>
                <SignalBadge signalType={flag.signalType} />
              </div>
              {flag.cohortSize != null && flag.flaggedCount != null && (
                <p className="text-sm text-neutral-500">
                  {flag.flaggedCount} of {flag.cohortSize} in cohort flagged
                </p>
              )}
              <p className="text-xs text-neutral-400 mt-1">Flagged {formatDate(flag.createdAt)}</p>
            </div>
            <Button
              variant="outline"
              size="default"
              className="shrink-0 text-sm px-3 py-1.5 min-h-0"
              onClick={() => setResolvingFlag(flag)}
            >
              Resolve
            </Button>
          </div>
        ))}
      </div>

      {resolvingFlag && (
        <ResolveDialog
          flag={resolvingFlag}
          onConfirm={(notes) => void handleConfirmResolve(notes)}
          onCancel={() => setResolvingFlag(null)}
          isPending={resolveFlag.isPending}
        />
      )}
    </>
  );
}

// ─── Signal history section ────────────────────────────────────────────────────

function SignalHistory() {
  const { data, isLoading, error } = useAttentionHistory();
  const [expandedNotes, setExpandedNotes] = useState<string | null>(null);

  if (isLoading) {
    return (
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
        <span className="sr-only">Loading...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700" role="alert">
        <p className="font-medium">Failed to load signal history.</p>
        <p className="text-sm mt-1">{error instanceof Error ? error.message : "Unknown error"}</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-neutral-500">No signal history yet.</p>
      </div>
    );
  }

  const sorted = [...data].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
      <ul className="divide-y divide-neutral-100">
        {sorted.map((entry: AttentionHistoryEntry) => {
          const isResolved = entry.clearedAt != null;
          const notesExpanded = expandedNotes === entry.id;
          return (
            <li key={entry.id} className="px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <p className="text-sm font-semibold text-neutral-900">{entry.contributorName}</p>
                    <SignalBadge signalType={entry.signalType} />
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        isResolved
                          ? "bg-green-100 text-green-800"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {isResolved ? "Resolved" : "Unresolved"}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400">
                    Flagged {formatDate(entry.createdAt)}
                    {isResolved && entry.clearedAt && (
                      <> &middot; Resolved {formatDate(entry.clearedAt)}</>
                    )}
                  </p>
                  {isResolved && entry.followUpNotes && (
                    <div className="mt-1.5">
                      <p
                        className={`text-sm text-neutral-600 ${notesExpanded ? "" : "line-clamp-2"}`}
                      >
                        {entry.followUpNotes}
                      </p>
                      {entry.followUpNotes.length > 100 && (
                        <button
                          type="button"
                          onClick={() => setExpandedNotes(notesExpanded ? null : entry.id)}
                          className="text-xs text-primary-700 hover:text-primary-900 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 rounded mt-0.5"
                        >
                          {notesExpanded ? "Show less" : "Show more"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ─── Trend indicator ───────────────────────────────────────────────────────────

const DIRECTION_ARROW: Record<string, string> = {
  Increasing: "↑",
  Stable: "→",
  Decreasing: "↓",
};

function TrendIndicator() {
  const { data } = useAttentionTrend();
  if (!data) return null;

  const arrow = DIRECTION_ARROW[data.direction] ?? "→";

  return (
    <p className="text-sm text-neutral-700 mb-6">
      {data.activeCount} active flag{data.activeCount !== 1 ? "s" : ""}{" "}
      <span aria-hidden="true">{arrow}</span>{" "}
      {data.direction}
    </p>
  );
}

// ─── Trends section ────────────────────────────────────────────────────────────

function AttentionTrends() {
  const { data, isLoading, error } = useAttentionTrend();

  if (isLoading) {
    return (
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
        <span className="sr-only">Loading...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700" role="alert">
        <p className="font-medium">Failed to load trend data.</p>
        <p className="text-sm mt-1">{error instanceof Error ? error.message : "Unknown error"}</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-6">
      <h2 className="text-sm font-medium text-neutral-700 mb-4">Weekly Flag Volume</h2>
      <AttentionTrendChart data={data?.weeks ?? []} />
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export function AttentionDashboard() {
  const [activeTab, setActiveTab] = useState<"active" | "history" | "trends">("active");

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Page header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-neutral-900">Attention Dashboard</h1>
        <p className="text-neutral-500 mt-1">
          Review flagged contributors and manage follow-up actions.
        </p>
      </div>

      {/* Trend indicator */}
      <TrendIndicator />

      {/* Tab toggle */}
      <div className="flex gap-2 mb-6">
        <button
          type="button"
          onClick={() => setActiveTab("active")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === "active"
              ? "bg-primary-800 text-white"
              : "bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-50"
          }`}
        >
          Active Flags
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("history")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === "history"
              ? "bg-primary-800 text-white"
              : "bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-50"
          }`}
        >
          History
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("trends")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === "trends"
              ? "bg-primary-800 text-white"
              : "bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-50"
          }`}
        >
          Trends
        </button>
      </div>

      {/* Tab content */}
      {activeTab === "active" && <ActiveFlags />}
      {activeTab === "history" && <SignalHistory />}
      {activeTab === "trends" && <AttentionTrends />}
    </div>
  );
}
