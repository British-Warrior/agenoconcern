import { useEffect } from "react";
import { useNavigate } from "react-router";

export function Complete() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "You're all set! — Age No Concern";

    const timer = setTimeout(() => {
      navigate("/dashboard", { replace: true });
    }, 5000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-neutral-50 flex flex-col items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center">
        {/* Success icon */}
        <div className="flex justify-center mb-6" aria-hidden="true">
          <svg
            className="w-20 h-20 text-primary-700"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        {/* Heading */}
        <h1 className="text-4xl font-bold text-neutral-900 mb-4">
          You're all set!
        </h1>

        {/* Summary */}
        <p className="text-lg text-neutral-600 leading-relaxed mb-6">
          Your profile is complete and you are ready to join Circles, share your expertise,
          and make a real difference in your community.
        </p>

        <p className="text-sm text-neutral-500">
          Taking you to your dashboard in a moment...
        </p>

        {/* Animated dots */}
        <div className="flex justify-center gap-1.5 mt-4" aria-hidden="true">
          <span className="w-2 h-2 rounded-full bg-primary-600 animate-bounce [animation-delay:0ms]" />
          <span className="w-2 h-2 rounded-full bg-primary-600 animate-bounce [animation-delay:150ms]" />
          <span className="w-2 h-2 rounded-full bg-primary-600 animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}
