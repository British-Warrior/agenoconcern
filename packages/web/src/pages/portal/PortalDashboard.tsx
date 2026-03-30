import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePortalAuth } from "../../hooks/usePortalAuth.js";
import {
  getPortalDashboard,
  getPortalAttentionFlags,
  downloadPortalReport,
} from "../../api/portal.js";
import type { PortalDashboardData, PortalAttentionFlag } from "../../api/portal.js";

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------

interface StatCardProps {
  label: string;
  value: number;
}

function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6 flex flex-col items-center text-center">
      <span className="text-4xl font-bold text-neutral-900">{value.toLocaleString()}</span>
      <span className="mt-2 text-sm text-neutral-500 font-medium">{label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Attention flags table
// ---------------------------------------------------------------------------

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

interface AttentionFlagsCardProps {
  flags: PortalAttentionFlag[];
}

function AttentionFlagsCard({ flags }: AttentionFlagsCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
      <h2 className="text-base font-semibold text-neutral-900 mb-4">Attention Flags</h2>

      {flags.length === 0 ? (
        <p className="text-sm text-neutral-400">No active attention flags.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 text-left text-neutral-500 text-xs font-medium uppercase tracking-wide">
                <th className="pb-2 pr-4">Contributor</th>
                <th className="pb-2 pr-4">Signal Type</th>
                <th className="pb-2">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {flags.map((flag) => (
                <tr key={flag.id} className="py-2">
                  <td className="py-2 pr-4 font-medium text-neutral-800">{flag.contributorName}</td>
                  <td className="py-2 pr-4 text-neutral-600">{flag.signalType}</td>
                  <td className="py-2 text-neutral-500 whitespace-nowrap">{formatDate(flag.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main dashboard page
// ---------------------------------------------------------------------------

export function PortalDashboard() {
  const { portalUser, logout } = usePortalAuth();
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const {
    data: dashboardData,
    isLoading: isDashboardLoading,
    error: dashboardError,
  } = useQuery<PortalDashboardData>({
    queryKey: ["portal-dashboard"],
    queryFn: getPortalDashboard,
  });

  const {
    data: attentionFlags,
    isLoading: isFlagsLoading,
    error: flagsError,
  } = useQuery<PortalAttentionFlag[]>({
    queryKey: ["portal-attention"],
    queryFn: getPortalAttentionFlags,
  });

  const handleDownloadReport = async () => {
    setDownloadError(null);
    setIsDownloading(true);
    try {
      await downloadPortalReport();
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleLogout = () => {
    void logout();
  };

  const institutionName =
    dashboardData?.institutionName ?? portalUser?.institutionName ?? "Institution Portal";

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-[#1a1d2e] text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold leading-tight">{institutionName}</h1>
            <p className="text-xs text-[#c89a30] mt-0.5 font-medium uppercase tracking-wide">
              Institution Portal
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="text-sm text-neutral-300 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c89a30] rounded px-2 py-1 transition-colors"
          >
            Log out
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6">

        {/* Stats section */}
        {isDashboardLoading ? (
          <div className="text-sm text-neutral-400 animate-pulse" role="status">
            Loading dashboard...
          </div>
        ) : dashboardError ? (
          <div
            className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm"
            role="alert"
          >
            Failed to load dashboard data. Please refresh and try again.
          </div>
        ) : dashboardData ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard label="Contributors" value={dashboardData.stats.contributors} />
            <StatCard label="Active Challenges" value={dashboardData.stats.challenges} />
            <StatCard label="Hours Contributed" value={dashboardData.stats.hours} />
          </div>
        ) : null}

        {/* PDF Report section */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
          <h2 className="text-base font-semibold text-neutral-900 mb-1">Impact Report</h2>
          <p className="text-sm text-neutral-500 mb-4">
            Download a branded PDF impact report for your institution.
          </p>
          <button
            type="button"
            onClick={() => void handleDownloadReport()}
            disabled={isDownloading}
            className={`
              inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
              bg-[#1a1d2e] text-white hover:bg-[#2a2d3e]
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c89a30]
              disabled:opacity-60 disabled:cursor-not-allowed
            `.trim()}
          >
            {isDownloading ? (
              <>
                <svg
                  className="animate-spin h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Generating...
              </>
            ) : (
              "Download PDF"
            )}
          </button>
          {downloadError && (
            <p className="mt-2 text-sm text-red-600" role="alert">
              {downloadError}
            </p>
          )}
        </div>

        {/* Attention flags section */}
        {isFlagsLoading ? (
          <div className="text-sm text-neutral-400 animate-pulse" role="status">
            Loading attention flags...
          </div>
        ) : flagsError ? (
          <div
            className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm"
            role="alert"
          >
            Failed to load attention flags. Please refresh and try again.
          </div>
        ) : (
          <AttentionFlagsCard flags={attentionFlags ?? []} />
        )}
      </main>
    </div>
  );
}
