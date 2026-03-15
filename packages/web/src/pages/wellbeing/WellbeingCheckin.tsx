import { useEffect } from "react";
import { useNavigate } from "react-router";
import { WellbeingForm } from "../../components/wellbeing/WellbeingForm.js";

export function WellbeingCheckin() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Wellbeing Check-in — Age No Concern";
  }, []);

  const handleSuccess = () => {
    navigate("/dashboard");
  };

  const handleSkip = () => {
    navigate("/dashboard");
  };

  return (
    <div className="py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-neutral-900 mb-2">
          Your 8-Week Wellbeing Check-in
        </h1>
        <p className="text-base text-neutral-600 mb-8">
          It's been a while since your last check-in. These questions help us understand how you're
          doing and track the positive impact of your contributions over time.
        </p>

        <div className="bg-white rounded-[var(--radius-lg)] border border-neutral-200 shadow-sm px-8 py-10">
          <WellbeingForm
            onSuccess={handleSuccess}
            submitLabel="Submit check-in"
            showSkip={true}
            onSkip={handleSkip}
          />
        </div>
      </div>
    </div>
  );
}
