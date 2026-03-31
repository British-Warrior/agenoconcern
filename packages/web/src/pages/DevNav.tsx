import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../api/client.js";

const ROLES = ["community_manager", "contributor", "admin"] as const;

interface InstitutionSlug {
  slug: string;
  name: string;
}

const PAGES = [
  { section: "Admin (CM only)", links: [
    { path: "/admin/institutions", label: "Institution Management" },
  ]},
  { section: "Contributor", links: [
    { path: "/dashboard", label: "Dashboard" },
    { path: "/challenges", label: "Challenge Feed" },
    { path: "/circles", label: "My Circles" },
    { path: "/wellbeing/checkin", label: "Wellbeing Check-in" },
    { path: "/impact", label: "Impact Dashboard" },
    { path: "/impact/challenger", label: "Challenger View" },
  ]},
  { section: "Onboarding", links: [
    { path: "/onboarding/upload", label: "Upload CV" },
    { path: "/onboarding/review", label: "Review Profile" },
    { path: "/onboarding/preferences", label: "Preferences" },
    { path: "/onboarding/stripe", label: "Stripe Connect" },
    { path: "/onboarding/wellbeing", label: "Wellbeing" },
    { path: "/onboarding/complete", label: "Complete" },
  ]},
  { section: "Challenger Portal", links: [
    { path: "/challenger/register", label: "Challenger Register" },
    { path: "/challenger", label: "Challenger Dashboard" },
    { path: "/challenger/submit", label: "Submit Challenge" },
  ]},
  { section: "Auth Pages", links: [
    { path: "/login", label: "Login" },
    { path: "/register", label: "Register" },
    { path: "/forgot-password", label: "Forgot Password" },
  ]},
];

export function DevNav() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<string>("");
  const [institutions, setInstitutions] = useState<InstitutionSlug[]>([]);

  async function loginAs(role: string) {
    try {
      setStatus(`Logging in as ${role}...`);
      await apiClient("/api/dev/login-as", {
        method: "POST",
        body: JSON.stringify({ role }),
      });
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      setStatus(`Logged in as ${role}`);
      fetchInstitutions();
    } catch (e) {
      setStatus(`Failed: ${e}`);
    }
  }

  async function fetchInstitutions() {
    try {
      const data = await apiClient("/api/admin/institutions") as InstitutionSlug[];
      setInstitutions(data);
    } catch {
      // not logged in as CM, or no institutions yet
    }
  }

  useEffect(() => { fetchInstitutions(); }, []);

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-2">Dev Navigation</h1>
      <p className="text-neutral-500 mb-6">Quick login + page index. Dev only.</p>

      <div className="flex gap-3 mb-6">
        {ROLES.map((role) => (
          <button
            key={role}
            onClick={() => loginAs(role)}
            className="px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-700 cursor-pointer"
          >
            Login as {role}
          </button>
        ))}
      </div>
      {status && <p className="text-sm text-green-700 mb-6">{status}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {PAGES.map(({ section, links }) => (
          <div key={section} className="border border-neutral-200 rounded-lg p-4">
            <h2 className="font-semibold text-lg mb-3">{section}</h2>
            <ul className="space-y-1">
              {links.map(({ path, label }) => (
                <li key={path}>
                  <button
                    onClick={() => navigate(path)}
                    className="text-blue-600 hover:underline text-sm cursor-pointer"
                  >
                    {label}
                  </button>
                  <span className="text-neutral-400 text-xs ml-2">{path}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {/* Dynamic institution landing pages */}
        <div className="border border-neutral-200 rounded-lg p-4">
          <h2 className="font-semibold text-lg mb-3">Institutions (Public)</h2>
          {institutions.length === 0 ? (
            <p className="text-sm text-neutral-400">No institutions yet. Create one via Admin first, then refresh.</p>
          ) : (
            <ul className="space-y-1">
              {institutions.map((inst) => (
                <li key={inst.slug}>
                  <button
                    onClick={() => navigate(`/i/${inst.slug}`)}
                    className="text-blue-600 hover:underline text-sm cursor-pointer"
                  >
                    {inst.name}
                  </button>
                  <span className="text-neutral-400 text-xs ml-2">/i/{inst.slug}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
