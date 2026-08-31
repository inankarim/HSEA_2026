import { NavLink } from "react-router-dom";

/**
 * Horizontal tab-link row shown directly under the Dashboard hero,
 * matching the "About the Awards / Publication / Awards Winners / Jury
 * Members / New Chapter" row in the Holcim Foundation reference layout.
 * Top and bottom hairline rules, bold uppercase links, active link
 * picked out in the accent color.
 */

const tabs = [
  { label: "About the Awards", to: "/awards/about" },
  { label: "Award Categories", to: "/awards/categories" },
  { label: "Privilege of Winners", to: "/winners" },
  { label: "Jury Members", to: "/jury" },
  { label: "General Information", to: "/awards/general" },
];

export default function DashboardTabNav() {
  return (
    <nav className="bg-[#1B2A4A] border-t border-b border-navy-deep/15 sticky top-[72px] lg:top-[96px] z-40">
      <div className="mx-auto flex max-w-7xl items-center px-6 py-4 lg:py-5">
        <div className="flex flex-wrap items-center gap-x-6 sm:gap-x-8 lg:gap-x-10 gap-y-2 overflow-x-auto">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                [
                  "whitespace-nowrap text-xs sm:text-sm lg:text-base font-bold uppercase tracking-wide transition-colors pb-1 border-b-2",
                  isActive
                    ? "text-white border-accent-cyan"
                    : "text-white border-transparent hover:text-navy-deep hover:border-navy-deep/30",
                ].join(" ")
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}