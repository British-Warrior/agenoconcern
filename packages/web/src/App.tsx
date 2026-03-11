import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { AuthProvider } from "./hooks/useAuth.js";
import { useAuth } from "./hooks/useAuth.js";
import { AppShell } from "./components/layout/AppShell.js";
import { ProtectedRoute } from "./components/layout/ProtectedRoute.js";
import { Landing } from "./pages/Landing.js";
import { Login } from "./pages/Login.js";
import { Register } from "./pages/Register.js";
import { PhoneLogin } from "./pages/PhoneLogin.js";
import { ForgotPassword } from "./pages/ForgotPassword.js";
import { ResetPassword } from "./pages/ResetPassword.js";
import { Dashboard } from "./pages/Dashboard.js";
import { PrivacyPolicy } from "./pages/PrivacyPolicy.js";
import { CookiePolicy } from "./pages/CookiePolicy.js";
import { UploadCV } from "./pages/onboarding/UploadCV.js";
import { Parsing } from "./pages/onboarding/Parsing.js";
import { ReviewProfile } from "./pages/onboarding/ReviewProfile.js";
import { Affirmation } from "./pages/onboarding/Affirmation.js";

/**
 * Redirect authenticated users to onboarding if their status is "onboarding",
 * otherwise to the dashboard.
 */
function DashboardOrOnboarding() {
  const { contributor } = useAuth();
  if (contributor?.status === "onboarding") {
    return <Navigate to="/onboarding/upload" replace />;
  }
  return <Dashboard />;
}

/**
 * Placeholder page for routes not yet implemented (Plans 03+).
 */
function ComingSoon({ page }: { page: string }) {
  return (
    <div className="py-12 text-center">
      <p className="text-lg text-neutral-600">{page} — coming soon.</p>
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<AppShell />}>
            {/* Public routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/phone-login" element={<PhoneLogin />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/cookies" element={<CookiePolicy />} />

            {/* Protected routes */}
            <Route element={<ProtectedRoute />}>
              {/* Dashboard — redirects to onboarding if status is "onboarding" */}
              <Route path="/dashboard" element={<DashboardOrOnboarding />} />

              {/* Onboarding flow */}
              <Route path="/onboarding/upload" element={<UploadCV />} />
              <Route path="/onboarding/parsing" element={<Parsing />} />
              <Route path="/onboarding/review" element={<ReviewProfile />} />
              <Route path="/onboarding/affirmation" element={<Affirmation />} />

              {/* Placeholder routes for Plan 03 */}
              <Route
                path="/onboarding/preferences"
                element={<ComingSoon page="Preferences" />}
              />
              <Route
                path="/onboarding/stripe"
                element={<ComingSoon page="Stripe Connect" />}
              />
              <Route
                path="/onboarding/complete"
                element={<ComingSoon page="Onboarding Complete" />}
              />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
