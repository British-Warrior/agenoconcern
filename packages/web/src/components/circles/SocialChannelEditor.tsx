import { useState } from "react";
import type { SocialChannel } from "@agenoconcern/shared";
import { useSetSocialChannel } from "../../hooks/useCircles.js";

const PLATFORM_LABELS: Record<SocialChannel, string> = {
  whatsapp: "WhatsApp",
  slack: "Slack",
  discord: "Discord",
  teams: "Microsoft Teams",
  signal: "Signal",
};

const PLATFORM_HOSTNAMES: Record<SocialChannel, string> = {
  whatsapp: "chat.whatsapp.com",
  slack: "slack.com",
  discord: "discord.gg",
  teams: "teams.microsoft.com",
  signal: "signal.group",
};

const PLATFORMS: SocialChannel[] = ["whatsapp", "slack", "discord", "teams", "signal"];

interface SocialChannelEditorProps {
  circleId: string;
  currentChannel: SocialChannel | null;
  currentUrl: string | null;
}

export function SocialChannelEditor({
  circleId,
  currentChannel,
  currentUrl,
}: SocialChannelEditorProps) {
  const [isEditing, setIsEditing] = useState(!currentChannel);
  const [selectedPlatform, setSelectedPlatform] = useState<SocialChannel>(
    currentChannel ?? "whatsapp",
  );
  const [urlInput, setUrlInput] = useState(currentUrl ?? "");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [urlWarning, setUrlWarning] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const mutation = useSetSocialChannel(circleId);

  function validateUrl(value: string): { error: string | null; warning: string | null } {
    if (!value.trim()) return { error: null, warning: null };
    try {
      const parsed = new URL(value);
      const expectedHost = PLATFORM_HOSTNAMES[selectedPlatform];
      const hostMatches =
        parsed.hostname === expectedHost ||
        parsed.hostname.endsWith("." + expectedHost);
      if (!hostMatches) {
        return {
          error: null,
          warning: `This doesn't look like a ${PLATFORM_LABELS[selectedPlatform]} link`,
        };
      }
      return { error: null, warning: null };
    } catch {
      return { error: "Please enter a valid URL", warning: null };
    }
  }

  function handleUrlBlur() {
    const { error, warning } = validateUrl(urlInput);
    setUrlError(error);
    setUrlWarning(warning);
  }

  function handlePlatformChange(platform: SocialChannel) {
    setSelectedPlatform(platform);
    setUrlError(null);
    setUrlWarning(null);
    if (urlInput) {
      const { error, warning } = validateUrl(urlInput);
      setUrlError(error);
      setUrlWarning(warning);
    }
  }

  async function handleSave() {
    const { error } = validateUrl(urlInput);
    if (error) {
      setUrlError(error);
      return;
    }
    if (!urlInput.trim()) {
      setUrlError("Please enter a URL");
      return;
    }
    setSaveError(null);
    try {
      await mutation.mutateAsync({ channel: selectedPlatform, url: urlInput.trim() });
      setIsEditing(false);
    } catch {
      setSaveError("Failed to save. Please try again.");
    }
  }

  if (!isEditing && currentChannel && currentUrl) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-neutral-700">
          {PLATFORM_LABELS[currentChannel]}
        </span>
        <button
          type="button"
          onClick={() =>
            window.open(currentUrl, "_blank", "noopener,noreferrer")
          }
          className="inline-flex items-center gap-1 text-xs text-primary-700 hover:text-primary-900 font-medium transition-colors duration-150"
        >
          Open
          <svg
            className="w-3 h-3"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
            />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => {
            setSelectedPlatform(currentChannel);
            setUrlInput(currentUrl);
            setUrlError(null);
            setUrlWarning(null);
            setSaveError(null);
            setIsEditing(true);
          }}
          className="text-xs text-neutral-500 hover:text-neutral-700 transition-colors duration-150"
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {!currentChannel && (
        <p className="text-xs text-neutral-500 italic">
          Add a social channel for your Circle
        </p>
      )}
      <div className="flex flex-col sm:flex-row gap-2">
        <select
          value={selectedPlatform}
          onChange={(e) => handlePlatformChange(e.target.value as SocialChannel)}
          className="text-xs border border-neutral-300 rounded-[var(--radius-md)] px-2 py-1.5 bg-white text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          {PLATFORMS.map((p) => (
            <option key={p} value={p}>
              {PLATFORM_LABELS[p]}
            </option>
          ))}
        </select>
        <input
          type="url"
          value={urlInput}
          onChange={(e) => {
            setUrlInput(e.target.value);
            setUrlError(null);
            setUrlWarning(null);
          }}
          onBlur={handleUrlBlur}
          placeholder={`Paste your ${PLATFORM_LABELS[selectedPlatform]} link`}
          className={`flex-1 text-xs border rounded-[var(--radius-md)] px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
            urlError
              ? "border-red-400 bg-red-50"
              : "border-neutral-300 bg-white text-neutral-800"
          }`}
        />
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={mutation.isPending}
          className="text-xs font-medium bg-primary-600 hover:bg-primary-700 text-white rounded-[var(--radius-md)] px-3 py-1.5 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {mutation.isPending ? "Saving..." : "Save"}
        </button>
        {currentChannel && (
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="text-xs text-neutral-500 hover:text-neutral-700 transition-colors duration-150 px-2"
          >
            Cancel
          </button>
        )}
      </div>
      {urlError && (
        <p className="text-xs text-red-600">{urlError}</p>
      )}
      {urlWarning && !urlError && (
        <p className="text-xs text-amber-600">{urlWarning}</p>
      )}
      {saveError && (
        <p className="text-xs text-red-600">{saveError}</p>
      )}
    </div>
  );
}
