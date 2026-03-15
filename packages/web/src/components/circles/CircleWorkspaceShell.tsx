import { useEffect, useRef, useCallback, useState } from "react";
import * as Collapsible from "@radix-ui/react-collapsible";
import type { CircleWorkspaceResponse, CircleStatus } from "@indomitable-unity/shared";
import { useCircleNotes, useResolution } from "../../hooks/useCircles.js";
import { NoteCard } from "./NoteCard.js";
import { NoteComposer } from "./NoteComposer.js";
import { SocialChannelEditor } from "./SocialChannelEditor.js";
import { ResolutionCard } from "./ResolutionCard.js";
import { AddMemberModal } from "./AddMemberModal.js";

interface CircleWorkspaceShellProps {
  workspace: CircleWorkspaceResponse;
  currentContributorId: string | null;
}

const STATUS_STYLES: Record<CircleStatus, string> = {
  forming: "bg-blue-50 text-blue-700 border border-blue-200",
  active: "bg-green-100 text-green-700 border border-green-200",
  submitted: "bg-violet-50 text-violet-700 border border-violet-200",
  completed: "bg-neutral-100 text-neutral-600 border border-neutral-200",
  dissolved: "bg-amber-50 text-amber-700 border border-amber-200",
};

const STATUS_LABELS: Record<CircleStatus, string> = {
  forming: "Forming",
  active: "Active",
  submitted: "Submitted",
  completed: "Completed",
  dissolved: "Dissolved",
};

function Spinner() {
  return (
    <div className="flex justify-center py-8" aria-label="Loading notes">
      <svg
        className="animate-spin h-6 w-6 text-primary-600"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
    </div>
  );
}

export function CircleWorkspaceShell({
  workspace,
  currentContributorId,
}: CircleWorkspaceShellProps) {
  const { circle, challenge, members } = workspace;
  const [briefOpen, setBriefOpen] = useState(true);
  const [addMemberOpen, setAddMemberOpen] = useState(false);

  // Notes infinite query
  const {
    data: notesData,
    isLoading: notesLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useCircleNotes(circle.id);

  // Resolution + rating query
  const { data: resolutionData } = useResolution(circle.id);

  // All notes flattened (newest-first from API, so reverse to show newest at top)
  const allNotes = notesData?.pages.flatMap((p) => p.notes) ?? [];

  // Infinite scroll sentinel
  const sentinelRef = useRef<HTMLDivElement>(null);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
        void fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage],
  );

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(handleObserver, {
      rootMargin: "200px",
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [handleObserver]);

  const isCM = circle.createdBy === currentContributorId;
  const isChallenger = challenge.createdBy === currentContributorId;
  const isMember = members.some((m) => m.contributorId === currentContributorId);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-bold text-neutral-900 truncate">
          {challenge.title}
        </h1>
        <span
          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${STATUS_STYLES[circle.status]}`}
        >
          {STATUS_LABELS[circle.status]}
        </span>
      </div>

      {/* ── Section A: Pinned challenge brief (collapsible) ── */}
      <Collapsible.Root open={briefOpen} onOpenChange={setBriefOpen}>
        <div className="rounded-[var(--radius-lg)] border border-neutral-200 bg-white overflow-hidden">
          <Collapsible.Trigger asChild>
            <button
              type="button"
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 transition-colors duration-150"
            >
              <span>Challenge Brief</span>
              <svg
                className={`w-4 h-4 text-neutral-400 transition-transform duration-200 ${briefOpen ? "rotate-180" : ""}`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
          </Collapsible.Trigger>

          <Collapsible.Content>
            <div className="px-4 pb-4 space-y-3 border-t border-neutral-100">
              {/* Brief text */}
              <p className="text-sm text-neutral-700 leading-relaxed pt-3">
                {challenge.brief}
              </p>

              {/* Domains */}
              {challenge.domain.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {challenge.domain.map((d) => (
                    <span
                      key={d}
                      className="inline-block px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200 text-xs font-medium"
                    >
                      {d}
                    </span>
                  ))}
                </div>
              )}

              {/* Skills needed */}
              {challenge.skillsNeeded.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1.5">
                    Skills needed
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {challenge.skillsNeeded.map((skill) => (
                      <span
                        key={skill}
                        className="inline-block px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 text-xs"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Type badge */}
              <span
                className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                  challenge.type === "paid"
                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                    : "bg-neutral-100 text-neutral-600 border border-neutral-200"
                }`}
              >
                {challenge.type}
              </span>
            </div>
          </Collapsible.Content>
        </div>
      </Collapsible.Root>

      {/* ── Section B: Member list ── */}
      <div className="rounded-[var(--radius-lg)] border border-neutral-200 bg-white px-4 py-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
            Members
          </span>
          <span className="px-1.5 py-0.5 rounded-full bg-neutral-100 text-neutral-600 text-xs font-medium">
            {members.length}
          </span>
          <div className="flex flex-wrap gap-2 ml-1">
            {members.map((member) => (
              <span
                key={member.contributorId}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-50 border border-primary-200 text-xs text-primary-800"
              >
                <span className="w-4 h-4 rounded-full bg-primary-200 flex items-center justify-center text-[9px] font-bold text-primary-900 flex-shrink-0">
                  {member.name.charAt(0).toUpperCase()}
                </span>
                {member.name}
              </span>
            ))}
          </div>
          {isCM && (
            <button
              type="button"
              className="ml-auto text-xs font-medium text-primary-700 border border-primary-300 hover:bg-primary-50 rounded-[var(--radius-md)] px-2.5 py-1 transition-colors duration-150"
              onClick={() => setAddMemberOpen(true)}
            >
              Add Member
            </button>
          )}
        </div>
      </div>

      {/* ── Section C: Social channel editor ── */}
      <div className="rounded-[var(--radius-lg)] border border-neutral-200 bg-white px-4 py-3">
        <div className="flex items-start gap-2 flex-wrap">
          <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide flex-shrink-0 pt-0.5">
            Social channel
          </span>
          <div className="flex-1 min-w-0">
            <SocialChannelEditor
              circleId={circle.id}
              currentChannel={circle.socialChannel}
              currentUrl={circle.socialChannelUrl}
            />
          </div>
        </div>
      </div>

      {/* ── Section D + E: Notes feed + composer ── */}
      <div>
        <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3">
          Notes
        </p>

        {/* Notes list — newest first */}
        {notesLoading && <Spinner />}

        {!notesLoading && allNotes.length === 0 && (
          <div className="rounded-[var(--radius-lg)] border border-neutral-200 bg-neutral-50 px-4 py-8 text-center">
            <p className="text-sm text-neutral-500">
              No notes yet. Be the first to post something!
            </p>
          </div>
        )}

        {allNotes.length > 0 && (
          <div className="space-y-3">
            {allNotes.map((note) => (
              <NoteCard key={note.id} note={note} circleId={circle.id} />
            ))}
          </div>
        )}

        {/* Infinite scroll sentinel */}
        <div ref={sentinelRef} className="h-1" aria-hidden="true" />

        {isFetchingNextPage && (
          <div className="flex justify-center py-4">
            <svg
              className="animate-spin h-5 w-5 text-neutral-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        )}

        {/* Note composer */}
        <div className="mt-4 sticky bottom-4">
          <NoteComposer circleId={circle.id} />
        </div>
      </div>

      {/* ── Section F: Resolution ── */}
      <div>
        <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3">
          Resolution
        </p>
        <ResolutionCard
          circleId={circle.id}
          resolution={resolutionData?.resolution ?? null}
          rating={resolutionData?.rating ?? null}
          isChallenger={isChallenger}
          isMember={isMember}
          circleStatus={circle.status}
        />
      </div>

      {/* Add Member modal */}
      <AddMemberModal
        isOpen={addMemberOpen}
        onClose={() => setAddMemberOpen(false)}
        circleId={circle.id}
      />
    </div>
  );
}
