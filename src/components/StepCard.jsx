// StepCard.jsx
export function StepCard({ title, description, emoji, disabled, comingSoon, onClick }) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      className={[
        "relative w-full text-left rounded-2xl border bg-white p-4",
        "border-gray-200 shadow-sm transition",
        disabled ? "opacity-60 cursor-not-allowed" : "hover:shadow-md hover:border-gray-300",
        "min-h-[92px] flex items-start gap-3"
      ].join(" ")}
    >
      <span className="text-lg leading-none mt-0.5">{emoji}</span>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h5 className="font-semibold text-gray-900">{title}</h5>
          {comingSoon && (
            <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
              Coming soon
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-gray-500 leading-snug line-clamp-2">{description}</p>
      </div>

      {disabled && (
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-white/40" />
      )}
    </button>
  );
}
