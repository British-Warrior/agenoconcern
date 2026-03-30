import { usePortalAuthContext } from "../contexts/PortalAuthContext.js";

/**
 * Hook to access the institution portal auth context.
 * Must be used within a PortalAuthProvider.
 */
export function usePortalAuth() {
  return usePortalAuthContext();
}
