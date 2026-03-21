interface KioskWarningOverlayProps {
  secondsLeft: number;
  onContinue: () => void;
  onEndNow: () => void;
}

export function KioskWarningOverlay({
  secondsLeft,
  onContinue,
  onEndNow,
}: KioskWarningOverlayProps) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="kiosk-warning-title"
      aria-describedby="kiosk-warning-desc"
    >
      <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-md w-full mx-4 text-center">
        <div
          className="text-8xl font-bold text-red-600 tabular-nums mb-4"
          aria-live="polite"
        >
          {secondsLeft}
        </div>

        <h2
          id="kiosk-warning-title"
          className="text-2xl font-bold text-neutral-900 mb-2"
        >
          Session Ending Soon
        </h2>
        <p id="kiosk-warning-desc" className="text-lg text-neutral-600 mb-8">
          Your session will end in {secondsLeft} second{secondsLeft !== 1 ? "s" : ""}
        </p>

        <div className="flex flex-col gap-4">
          <button
            type="button"
            onClick={onContinue}
            className="min-h-[3.5rem] text-lg font-semibold bg-primary-700 hover:bg-primary-800 text-white rounded-xl px-6 py-3 transition-colors cursor-pointer"
          >
            Continue Session
          </button>
          <button
            type="button"
            onClick={onEndNow}
            className="min-h-[3.5rem] text-lg font-semibold bg-transparent border-2 border-red-500 text-red-600 hover:bg-red-50 rounded-xl px-6 py-3 transition-colors cursor-pointer"
          >
            End Session Now
          </button>
        </div>
      </div>
    </div>
  );
}
