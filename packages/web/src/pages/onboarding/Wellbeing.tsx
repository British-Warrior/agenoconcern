import { useEffect } from "react";
import { useNavigate } from "react-router";
import { WellbeingForm } from "../../components/wellbeing/WellbeingForm.js";

export function Wellbeing() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Wellbeing Check-in — Age No Concern";
  }, []);

  const handleSuccess = () => {
    navigate("/onboarding/complete");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-neutral-50 flex flex-col items-center px-4 py-16">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-[var(--radius-lg)] border border-neutral-200 shadow-sm px-8 py-10">
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">
            Your Wellbeing Check-in
          </h1>
          <p className="text-base text-neutral-600 mb-8">
            Before you get started, we'd like to understand how you're feeling. This helps us
            track the difference Age No Concern makes to your wellbeing over time.
          </p>

          <WellbeingForm
            onSuccess={handleSuccess}
            submitLabel="Complete check-in"
            showSkip={false}
          />
        </div>
      </div>
    </div>
  );
}
