import { useParams, Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { ROUTES } from "../../lib/constants.js";

interface InstitutionStats {
  contributors: number;
  challenges: number;
  hours: number;
}

interface Institution {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  city: string | null;
  stats: InstitutionStats | null;
}

async function fetchInstitution(slug: string): Promise<Institution> {
  const res = await fetch(`/api/institutions/${slug}`);
  if (res.status === 404) {
    throw new NotFoundError("Institution not found");
  }
  if (!res.ok) {
    throw new Error(`Failed to load institution: ${res.status}`);
  }
  return res.json() as Promise<Institution>;
}

class NotFoundError extends Error {
  readonly isNotFound = true;
}

function StatCard({ value, label }: { value: number; label: string }) {
  return (
    <div className="bg-white rounded-lg shadow p-6 text-center">
      <p className="text-3xl font-bold text-primary-800">{value.toLocaleString()}</p>
      <p className="text-sm text-neutral-600 mt-1">{label}</p>
    </div>
  );
}

export function InstitutionLanding() {
  const { slug } = useParams<{ slug: string }>();

  const { data, isLoading, error } = useQuery<Institution, Error>({
    queryKey: ["institution", slug],
    queryFn: () => fetchInstitution(slug!),
    enabled: !!slug,
    retry: (failureCount, err) => {
      // Do not retry on 404
      if (err instanceof NotFoundError) return false;
      return failureCount < 2;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="animate-pulse space-y-4 w-full max-w-2xl px-4">
          <div className="h-10 bg-neutral-200 rounded w-3/4" />
          <div className="h-5 bg-neutral-200 rounded w-1/3" />
          <div className="h-20 bg-neutral-200 rounded w-full" />
          <div className="grid grid-cols-3 gap-4">
            <div className="h-28 bg-neutral-200 rounded" />
            <div className="h-28 bg-neutral-200 rounded" />
            <div className="h-28 bg-neutral-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (error instanceof NotFoundError || (error && (error as unknown as { isNotFound?: boolean }).isNotFound)) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-neutral-800 mb-2">Institution not found</h1>
          <p className="text-neutral-600 mb-6">
            We could not find an institution at this address. Please check the link and try again.
          </p>
          <Link
            to={ROUTES.LANDING}
            className="text-primary-700 hover:underline font-medium"
          >
            Go to homepage
          </Link>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-neutral-800 mb-2">Something went wrong</h1>
          <p className="text-neutral-600">Unable to load institution details. Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-neutral-900">{data.name}</h1>
          {data.city && (
            <p className="text-lg text-neutral-600 mt-1">{data.city}</p>
          )}
        </div>

        {/* Description */}
        {data.description && (
          <p className="text-lg text-neutral-700 max-w-prose leading-relaxed">
            {data.description}
          </p>
        )}

        {/* Impact stats — only shown when contributors are assigned */}
        {data.stats && (
          <div className="grid grid-cols-3 gap-4">
            <StatCard value={data.stats.contributors} label="Contributors" />
            <StatCard value={data.stats.challenges} label="Challenges" />
            <StatCard value={data.stats.hours} label="Hours Contributed" />
          </div>
        )}

        {/* Get Started CTA */}
        <div className="pt-2">
          <Link
            to={`${ROUTES.LOGIN}?kiosk=true`}
            className="inline-flex items-center justify-center min-h-[3.5rem] text-lg px-8 bg-primary-700 hover:bg-primary-800 text-white font-semibold rounded-lg transition-colors"
          >
            Get Started
          </Link>
        </div>
      </div>
    </div>
  );
}
