import { useEffect, useState } from "react";
import { useLocation, useNavigate, NavLink } from "react-router-dom";
import logo from "../assets/logoHolcim.svg";
import { useAuth } from "../context/AuthContext";

/**
 * Site-wide header. Cream top bar, the HSEA 2026 logo, and a normal
 * inline nav on desktop (with a dropdown for Awards) plus a premier
 * "Submission" CTA button. On mobile, the nav collapses behind a
 * hamburger drawer, with Submission highlighted as its own CTA row.
 */

type NavChild = { label: string; to: string };
type NavItem = {
  label: string;
  to: string;
  scrollTo?: string;
  children?: NavChild[];
};

const navItems: NavItem[] = [
  { label: "Home", to: "/dashboard" },
  {
    label: "Awards",
    to: "/awards",
    children: [
      { label: "About the Award", to: "/awards/about" },
      { label: "Award Categories", to: "/awards/categories" },
      { label: "Privilege of Winners", to: "/winners" },
      { label: "General Information", to: "/awards/general" },
    ],
  },
  { label: "Jury", to: "/jury" },
  { label: "About Us", to: "/dashboard", scrollTo: "about-us" },
];

const submissionItem: NavItem = { label: "Submission", to: "/submit" };

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {open ? (
        <>
          <path d="M6 6l12 12" />
          <path d="M18 6L6 18" />
        </>
      ) : (
        <>
          <path d="M3 6h18" />
          <path d="M3 12h18" />
          <path d="M3 18h18" />
        </>
      )}
    </svg>
  );
}

function UserIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-3.5 w-3.5 transition-transform duration-200 ${
        open ? "rotate-180" : ""
      }`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function ArrowIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </svg>
  );
}

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);
  const [awardsDesktopOpen, setAwardsDesktopOpen] = useState(false);

  // Close the drawer on any route change.
  useEffect(() => {
    setOpen(false);
    setOpenAccordion(null);
  }, [location.pathname]);

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  function handleNavClick(e: React.MouseEvent, item: NavItem) {
    if (!item.scrollTo) return;
    e.preventDefault();
    if (location.pathname === item.to) {
      document.getElementById(item.scrollTo)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    } else {
      navigate(item.to, { state: { scrollTo: item.scrollTo } });
    }
    setOpen(false);
  }

  return (
    <header className="relative z-50 w-full bg-[#F8F5EE]">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 lg:gap-10 xl:gap-16 px-3 md:px-6 xl:px-10 py-3 md:py-4">
        <NavLink to="/dashboard" className="flex items-center -my-2 flex-shrink-0">
          <img
            src={logo}
            alt="Holcim Structural Excellence Awards 2026"
            className="h-16 md:h-20 w-auto object-contain"
          />
        </NavLink>

        {/* Desktop inline nav */}
        <nav className="hidden lg:flex items-center gap-8 xl:gap-12 flex-1 justify-center">
          {navItems.map((item) => {
            const children = item.children ?? [];
            const hasChildren = children.length > 0;

            if (hasChildren) {
              return (
                <div
                  key={item.label}
                  className="relative"
                  onMouseEnter={() => setAwardsDesktopOpen(true)}
                  onMouseLeave={() => setAwardsDesktopOpen(false)}
                >
                  <button
                    type="button"
                    className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-navy-deep transition-colors hover:text-[#C86F3D]"
                    aria-expanded={awardsDesktopOpen}
                  >
                    {item.label}
                    <ChevronIcon open={awardsDesktopOpen} />
                  </button>

                  <div
                    className={[
                      "absolute left-1/2 top-full -translate-x-1/2 pt-3 transition-all duration-200",
                      awardsDesktopOpen
                        ? "pointer-events-auto opacity-100 translate-y-0"
                        : "pointer-events-none opacity-0 -translate-y-1",
                    ].join(" ")}
                  >
                    <div className="min-w-[220px] rounded-lg border border-navy-deep/10 bg-white py-2 shadow-xl">
                      {children.map((child) => (
                        <NavLink
                          key={child.to}
                          to={child.to}
                          className={({ isActive }) =>
                            [
                              "block px-4 py-2.5 text-sm tracking-wide transition-colors",
                              isActive
                                ? "text-[#C86F3D] bg-navy-deep/5"
                                : "text-navy-deep/80 hover:bg-navy-deep/5 hover:text-[#C86F3D]",
                            ].join(" ")
                          }
                        >
                          {child.label}
                        </NavLink>
                      ))}
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <NavLink
                key={item.label}
                to={item.to}
                onClick={(e) => handleNavClick(e, item)}
                className={({ isActive }) =>
                  [
                    "text-sm font-semibold uppercase tracking-wide transition-colors",
                    isActive && !item.scrollTo
                      ? "text-[#C86F3D]"
                      : "text-navy-deep hover:text-[#C86F3D]",
                  ].join(" ")
                }
              >
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        {/* Desktop account actions + premier Submission CTA */}
        <div className="hidden lg:flex items-center gap-3 xl:gap-4 flex-shrink-0">
          <NavLink
            to={submissionItem.to}
            className={({ isActive }) =>
              [
                "group relative flex items-center gap-2 overflow-hidden rounded-lg px-5 py-2.5 text-sm font-bold uppercase tracking-wide transition-all duration-300",
                "bg-gradient-to-r from-[#C86F3D] to-[#E08A52] text-white shadow-md shadow-[#C86F3D]/25",
                "hover:shadow-lg hover:shadow-[#C86F3D]/35 hover:-translate-y-0.5",
                isActive ? "ring-2 ring-[#C86F3D]/40 ring-offset-2 ring-offset-[#F8F5EE]" : "",
              ].join(" ")
            }
          >
            <span className="relative z-10">Submission</span>
            <ArrowIcon className="relative z-10 h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
            {/* subtle shine sweep on hover */}
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
          </NavLink>

          {isAuthenticated ? (
            <button
              onClick={() => navigate("/profile")}
              className="flex items-center justify-center gap-2 rounded-lg border border-navy-deep/70 px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-navy-deep transition-colors hover:bg-navy-deep/5"
            >
              <UserIcon />
              My Account
            </button>
          ) : (
            <>
              <button
                onClick={() => navigate("/login")}
                className="flex items-center justify-center gap-2 rounded-lg border border-navy-deep/70 px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-navy-deep transition-colors hover:bg-navy-deep/5"
              >
                <UserIcon />
                Login
              </button>
              <button
                onClick={() => navigate("/register")}
                className="rounded-lg bg-navy-deep px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-navy-deep/90"
              >
                Register
              </button>
            </>
          )}
        </div>

        {/* Mobile hamburger trigger */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg text-navy-deep transition-colors hover:bg-navy-deep/5 lg:hidden"
        >
          <MenuIcon open={open} />
        </button>
      </div>

      {/* Mobile drawer */}
      <div
        className={[
          "fixed inset-0 z-40 transition-opacity duration-300 lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
      >
        <div
          className="absolute inset-0 bg-navy-deep/50 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
        <div
          className={[
            "absolute right-0 top-0 flex h-full w-[85%] max-w-sm flex-col bg-navy-deep shadow-2xl transition-transform duration-300 ease-out",
            open ? "translate-x-0" : "translate-x-full",
          ].join(" ")}
        >
          <div className="flex items-center justify-between px-6 py-4">
            <span className="text-xs font-bold uppercase tracking-[3px] text-accent-cyan">
              Menu
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="flex h-10 w-10 items-center justify-center rounded-lg text-white"
            >
              <MenuIcon open={true} />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-2">
            {navItems.map((item) => {
              const children = item.children ?? [];
              const hasChildren = children.length > 0;
              const isAccordionOpen = openAccordion === item.label;

              return (
                <div key={item.label} className="border-b border-white/10">
                  {hasChildren ? (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setOpenAccordion(isAccordionOpen ? null : item.label)
                        }
                        aria-expanded={isAccordionOpen}
                        className="flex w-full items-center justify-between px-3 py-4 text-base font-semibold uppercase tracking-wide text-white"
                      >
                        {item.label}
                        <ChevronIcon open={isAccordionOpen} />
                      </button>
                      <div
                        className={[
                          "grid overflow-hidden transition-all duration-300",
                          isAccordionOpen
                            ? "grid-rows-[1fr] opacity-100"
                            : "grid-rows-[0fr] opacity-0",
                        ].join(" ")}
                      >
                        <div className="min-h-0">
                          <div className="flex flex-col gap-1 pb-3 pl-6 pr-3">
                            {children.map((child) => (
                              <NavLink
                                key={child.to}
                                to={child.to}
                                className={({ isActive }) =>
                                  [
                                    "rounded-lg px-3 py-2.5 text-sm tracking-wide text-white/80 transition-colors",
                                    isActive
                                      ? "bg-white/10 text-accent-cyan"
                                      : "hover:bg-white/5 hover:text-white",
                                  ].join(" ")
                                }
                              >
                                {child.label}
                              </NavLink>
                            ))}
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <NavLink
                      to={item.to}
                      onClick={(e) => handleNavClick(e, item)}
                      className={({ isActive }) =>
                        [
                          "block px-3 py-4 text-base font-semibold uppercase tracking-wide transition-colors",
                          isActive && !item.scrollTo
                            ? "text-accent-cyan"
                            : "text-white",
                        ].join(" ")
                      }
                    >
                      {item.label}
                    </NavLink>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Submission — premier CTA in the drawer too */}
          <div className="px-3 pt-2">
            <NavLink
              to={submissionItem.to}
              onClick={() => setOpen(false)}
              className="flex items-center justify-between rounded-lg bg-gradient-to-r from-[#C86F3D] to-[#E08A52] px-4 py-3.5 text-sm font-bold uppercase tracking-wide text-white shadow-md shadow-[#C86F3D]/30"
            >
              Submission
              <ArrowIcon className="h-4 w-4" />
            </NavLink>
          </div>

          {/* Account actions */}
          <div className="flex flex-col gap-3 px-6 py-6">
            {isAuthenticated ? (
              <button
                onClick={() => {
                  setOpen(false);
                  navigate("/profile");
                }}
                className="flex items-center justify-center gap-2 rounded-lg border border-white/70 px-5 py-3 text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-white/10"
              >
                <UserIcon />
                My Account
              </button>
            ) : (
              <>
                <button
                  onClick={() => {
                    setOpen(false);
                    navigate("/login");
                  }}
                  className="flex items-center justify-center gap-2 rounded-lg border border-white/70 px-5 py-3 text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-white/10"
                >
                  <UserIcon />
                  Login
                </button>
                <button
                  onClick={() => {
                    setOpen(false);
                    navigate("/register");
                  }}
                  className="rounded-lg bg-white px-5 py-3 text-sm font-bold uppercase tracking-wide text-navy-deep transition-colors hover:bg-white/90"
                >
                  Register
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}