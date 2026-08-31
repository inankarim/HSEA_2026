import { useEffect, useState } from "react";
import { useLocation, useNavigate, NavLink } from "react-router-dom";
import logo from "../assets/logoHolcim.svg";
import { useAuth } from "../context/AuthContext";

/**
 * Header used only on the Dashboard page. Deliberately separate from the
 * shared <Header /> used elsewhere on the site: this one keeps a plain
 * cream top bar (matching the Holcim Foundation reference layout) and
 * puts every link behind the hamburger instead of an inline nav row.
 * The drawer itself carries the SAME nav structure as <Header />,
 * including the Awards accordion submenu.
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
  { label: "Submit", to: "/submit" },
  { label: "About Us", to: "/dashboard", scrollTo: "about-us" },
];

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

export default function DashboardHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);

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
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3 md:py-4">
        <NavLink to="/dashboard" className="flex items-center -my-2">
          <img
            src={logo}
            alt="Holcim Structural Excellence Awards 2026"
            className="h-16 md:h-20 w-auto object-contain"
          />
        </NavLink>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          className="flex h-11 w-11 items-center justify-center rounded-lg text-navy-deep transition-colors hover:bg-navy-deep/5"
        >
          <MenuIcon open={open} />
        </button>
      </div>

      {/* Drawer */}
      <div
        className={[
          "fixed inset-0 z-40 transition-opacity duration-300",
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