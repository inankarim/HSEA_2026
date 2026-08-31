import { SUBMISSION_SECTIONS, type SectionId } from "../types/Submission";

type Props = {
  activeSection: SectionId;
  completedSections: Set<SectionId>;
  onSelect: (id: SectionId) => void;
};

export default function SubmissionProgress({ activeSection, completedSections, onSelect }: Props) {
  const activeIndex = SUBMISSION_SECTIONS.findIndex((s) => s.id === activeSection);
  const isFirstSection = activeIndex <= 0;

  function goBack() {
    if (isFirstSection) return;
    onSelect(SUBMISSION_SECTIONS[activeIndex - 1].id);
  }

  return (
    <>
      {/* Desktop: vertical rail */}
      <nav className="hidden md:flex flex-col gap-1 sticky top-24 self-start">
        {SUBMISSION_SECTIONS.map((section, i) => {
          const isActive = section.id === activeSection;
          const isDone = completedSections.has(section.id);
          return (
            <button
              key={section.id}
              onClick={() => onSelect(section.id)}
              className={[
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                isActive
                  ? "bg-navy-deep text-white"
                  : "text-navy-deep/70 hover:bg-navy-deep/5 hover:text-navy-deep",
              ].join(" ")}
            >
              <span
                className={[
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                  isActive
                    ? "bg-accent-cyan text-navy-ink"
                    : isDone
                    ? "bg-navy-deep/10 text-navy-deep"
                    : "border border-navy-deep/20 text-navy-deep/40",
                ].join(" ")}
              >
                {isDone && !isActive ? "✓" : String(i + 1).padStart(2, "0")}
              </span>
              <span className="font-semibold uppercase tracking-wide text-xs">
                {section.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Mobile: compact progress bar + current step label */}
      <div className="md:hidden">
        <div className="flex items-center justify-between gap-3">
          {!isFirstSection ? (
            <button
              type="button"
              onClick={goBack}
              className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-navy-deep/60 hover:text-navy-deep"
            >
              <svg
                viewBox="0 0 20 20"
                fill="none"
                className="h-3.5 w-3.5"
                aria-hidden="true"
              >
                <path
                  d="M12.5 15L7.5 10L12.5 5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Back
            </button>
          ) : (
            <span />
          )}
          <span className="text-xs font-bold uppercase tracking-wide text-navy-deep/60">
            Step {activeIndex + 1} of {SUBMISSION_SECTIONS.length}
          </span>
          <span className="text-xs font-bold uppercase tracking-wide text-accent-cyan">
            {SUBMISSION_SECTIONS[activeIndex].label}
          </span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-navy-deep/10">
          <div
            className="h-full rounded-full bg-accent-cyan transition-all duration-500"
            style={{
              width: `${((activeIndex + 1) / SUBMISSION_SECTIONS.length) * 100}%`,
            }}
          />
        </div>
      </div>
    </>
  );
}