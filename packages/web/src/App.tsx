import { BrowserRouter, Routes, Route } from "react-router";
import { AuthProvider } from "./hooks/useAuth.js";
import { KioskProvider } from "./contexts/KioskContext.js";
import { AppShell } from "./components/layout/AppShell.js";
import { ProtectedRoute } from "./components/layout/ProtectedRoute.js";
import { ChallengerRoute } from "./components/layout/ChallengerRoute.js";
import { CMRoute } from "./components/layout/CMRoute.js";
import { InstitutionManagement } from "./pages/admin/InstitutionManagement.js";
import { ContributorDetail } from "./pages/admin/ContributorDetail.js";
import { ChallengerRegister } from "./pages/challenger/ChallengerRegister.js";
import { ChallengerDashboard } from "./pages/challenger/ChallengerDashboard.js";
import { SubmitChallenge } from "./pages/challenger/SubmitChallenge.js";
import { ChallengeDetail } from "./pages/challenger/ChallengeDetail.js";
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
import { Preferences } from "./pages/onboarding/Preferences.js";
import { StripeConnect } from "./pages/onboarding/StripeConnect.js";
import { StripeReturn, StripeRefresh } from "./pages/onboarding/StripeReturn.js";
import { Wellbeing as OnboardingWellbeing } from "./pages/onboarding/Wellbeing.js";
import { Complete } from "./pages/onboarding/Complete.js";
import { WellbeingCheckin } from "./pages/wellbeing/WellbeingCheckin.js";
import { ChallengeFeed } from "./pages/challenges/ChallengeFeed.js";
import { MyCircles } from "./pages/circles/MyCircles.js";
import { CircleWorkspace } from "./pages/circles/CircleWorkspace.js";
import { ImpactDashboard } from "./pages/impact/ImpactDashboard.js";
import { ChallengerView } from "./pages/impact/ChallengerView.js";
import { InstitutionLanding } from "./pages/institution/InstitutionLanding.js";

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <KioskProvider>
          <Routes>
          <Route element={<AppShell />}>
            {/* Challenger public route */}
            <Route path="/challenger/register" element={<ChallengerRegister />} />

            {/* Challenger portal — guarded by ChallengerRoute */}
            <Route element={<ChallengerRoute />}>
              <Route path="/challenger" element={<ChallengerDashboard />} />
              <Route path="/challenger/submit" element={<SubmitChallenge />} />
              <Route path="/challenger/challenges/:id" element={<ChallengeDetail />} />
            </Route>

            {/* Institution landing pages — public, kiosk entry points */}
            <Route path="/i/:slug" element={<InstitutionLanding />} />

            {/* Admin routes — guarded by CMRoute (community_manager + admin) */}
            <Route element={<CMRoute />}>
              <Route path="/admin/institutions" element={<InstitutionManagement />} />
              <Route path="/admin/contributors/:id" element={<ContributorDetail />} />
            </Route>

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
              <Route path="/dashboard" element={<Dashboard />} />

              {/* Onboarding flow */}
              <Route path="/onboarding/upload" element={<UploadCV />} />
              <Route path="/onboarding/parsing" element={<Parsing />} />
              <Route path="/onboarding/review" element={<ReviewProfile />} />
              <Route path="/onboarding/affirmation" element={<Affirmation />} />

              {/* Plan 03 onboarding pages */}
              <Route path="/onboarding/preferences" element={<Preferences />} />
              <Route path="/onboarding/stripe" element={<StripeConnect />} />
              <Route path="/onboarding/stripe/return" element={<StripeReturn />} />
              <Route path="/onboarding/stripe/refresh" element={<StripeRefresh />} />
              <Route path="/onboarding/wellbeing" element={<OnboardingWellbeing />} />
              <Route path="/onboarding/complete" element={<Complete />} />

              {/* Challenges */}
              <Route path="/challenges" element={<ChallengeFeed />} />

              {/* Circles */}
              <Route path="/circles" element={<MyCircles />} />
              <Route path="/circles/:id" element={<CircleWorkspace />} />

              {/* Wellbeing */}
              <Route path="/wellbeing/checkin" element={<WellbeingCheckin />} />

              {/* Impact */}
              <Route path="/impact" element={<ImpactDashboard />} />
              <Route path="/impact/challenger" element={<ChallengerView />} />
            </Route>
          </Route>
          </Routes>
        </KioskProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
