import image from "../assets/whitelogo.svg";

const quickLinks = [
  { label: "Home", to: "/dashboard" },
  { label: "Awards", to: "/awards" },
  { label: "Jury", to: "/jury" },
  { label: "Privilege of Winners", to: "/winners" },
  { label: "About Us", to: "/about" },
];

function LinkedinIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
      <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9h4v12H3V9Zm7 0h3.8v1.7h.05c.53-1 1.83-2.1 3.77-2.1 4.03 0 4.78 2.65 4.78 6.1V21H18v-5.7c0-1.36-.02-3.1-1.9-3.1-1.9 0-2.2 1.48-2.2 3v5.8H10V9Z" />
    </svg>
  );
}
function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
      <path d="M13.5 21v-7.5h2.5l.4-3H13.5V8.4c0-.87.24-1.46 1.5-1.46h1.6V4.3C16.3 4.24 15.3 4.15 14.15 4.15c-2.4 0-4.05 1.47-4.05 4.16V10.5H7.6v3h2.5V21h3.4Z" />
    </svg>
  );
}

export default function Footer() {
  return (
    <footer className="bg-navy-deep">
      <div className="mx-auto max-w-7xl px-6 py-12 sm:py-16 lg:py-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-10 sm:gap-12 lg:gap-8 text-center sm:text-left">
        {/* Logo */}
        <div className="flex flex-col items-center sm:items-start lg:col-span-3">
          <img src={image} alt="LafargeHolcim" className="h-12 sm:h-14 lg:h-16 w-auto" />
          <p className="mt-4 lg:mt-6 text-sm lg:text-base text-white/50 max-w-xs">
            Celebrating excellence and innovation across LafargeHolcim.
          </p>
        </div>

        {/* Quick links */}
        <div className="lg:col-span-2">
          <h4 className="text-sm lg:text-base font-bold uppercase tracking-wide text-white">
            Quick Links
          </h4>
          <ul className="mt-4 lg:mt-6 space-y-3 lg:space-y-4">
            {quickLinks.map((l) => (
              <li key={l.to}>
                
                <a  href={l.to}
                  className="text-sm lg:text-base text-white/60 hover:text-accent-cyan transition-colors"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Social Media */}
        <div className="lg:col-span-2">
          <h4 className="text-sm lg:text-base font-bold uppercase tracking-wide text-white">
            Social Media
          </h4>
          <div className="mt-4 lg:mt-6 flex justify-center sm:justify-start gap-4 lg:gap-5 text-white">
            
            <a  href="https://www.linkedin.com/company/lafargeholcimbangladesh"
              className="hover:text-accent-cyan transition-colors"
            >
              <LinkedinIcon />
            </a>
            
            <a  href="https://www.facebook.com/holcimbangladesh"
              className="hover:text-accent-cyan transition-colors"
            >
              <FacebookIcon />
            </a>
          </div>
        </div>

        {/* Contact / Award Secretariat */}
        <div className="sm:col-span-2 lg:col-span-5">
          <h4 className="text-sm lg:text-base font-bold uppercase tracking-wide text-white">
            Award Secretariat
          </h4>
          <div className="mt-4 lg:mt-6 space-y-3">
            <p className="text-sm lg:text-base text-white/60 whitespace-nowrap">
              Email:{" "}
              
              <a  href="mailto:excellenceaward@lafargeholcim.com"
                className="text-white/60 hover:text-accent-cyan transition-colors"
              >
                excellenceaward@lafargeholcim.com
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Copyright bar */}
      <div className="border-t border-white/10 py-6 lg:py-8 text-center text-xs lg:text-sm text-white/40 px-6">
        Copyright LafargeHolcim Excellence Award © 2026. All rights reserved.
      </div>
    </footer>
  );
}