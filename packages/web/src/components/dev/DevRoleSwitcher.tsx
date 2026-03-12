import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../hooks/useAuth.js";
import { apiClient } from "../../api/client.js";

const ROLES = ["contributor", "community_manager", "admin"] as const;
const ROLE_LABELS: Record<string, string> = {
  contributor: "Contributor",
  community_manager: "CM",
  admin: "Admin",
};

export function DevRoleSwitcher() {
  const { contributor } = useAuth();
  const queryClient = useQueryClient();
  const [switching, setSwitching] = useState(false);

  if (!contributor) return null;

  async function switchRole(role: string) {
    if (role === contributor!.role || switching) return;
    setSwitching(true);
    try {
      await apiClient("/api/auth/dev-role", {
        method: "POST",
        body: JSON.stringify({ role }),
      });
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      await queryClient.invalidateQueries({ queryKey: ["challenges"] });
    } finally {
      setSwitching(false);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-1 bg-neutral-900 text-white rounded-full px-2 py-1 shadow-lg text-xs font-mono opacity-80 hover:opacity-100 transition-opacity">
      <span className="px-1.5 text-neutral-400">DEV</span>
      {ROLES.map((role) => (
        <button
          key={role}
          type="button"
          disabled={switching}
          onClick={() => void switchRole(role)}
          className={`px-2 py-1 rounded-full transition-colors ${
            contributor.role === role
              ? "bg-accent-600 text-white"
              : "text-neutral-300 hover:bg-neutral-700"
          } ${switching ? "opacity-50 cursor-wait" : "cursor-pointer"}`}
        >
          {ROLE_LABELS[role]}
        </button>
      ))}
    </div>
  );
}
