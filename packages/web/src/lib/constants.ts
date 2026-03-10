/** API base URL — empty string because Vite proxy handles /api */
export const API_BASE_URL = "";

/** Route path constants */
export const ROUTES = {
  LANDING: "/",
  LOGIN: "/login",
  REGISTER: "/register",
  PHONE_LOGIN: "/phone-login",
  FORGOT_PASSWORD: "/forgot-password",
  RESET_PASSWORD: "/reset-password",
  DASHBOARD: "/dashboard",
  PRIVACY: "/privacy",
  COOKIES: "/cookies",
} as const;

/** localStorage keys */
export const STORAGE_KEYS = {
  COOKIE_CONSENT: "anc_cookie_consent",
} as const;
