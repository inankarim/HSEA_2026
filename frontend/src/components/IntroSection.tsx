import FadeIn from "./FadeIn";
import introVideo from "../assets/intro-bg.mp4";

export default function IntroSection() {
  return (
    <section className="border-b border-gray-200 font-manrope">
      <div className="mx-auto max-w-7xl px-6 py-12 sm:py-16 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-[0.85fr_1.15fr] gap-10 lg:gap-16 items-center">
          {/* Left: text content */}
          <div>
            <FadeIn>
              <p className="max-w-4xl text-lg sm:text-xl lg:text-2xl xl:text-3xl leading-relaxed lg:leading-relaxed text-navy-deep">
                <span className="font-bold">Holcim Structural Excellence Award</span>{" "}
            honors projects and teams that lead through operational excellence, sustainability, and innovation.
              </p>
            </FadeIn>

            <FadeIn delay={0.15}>
              <div className="mt-8 lg:mt-10 flex flex-wrap items-center gap-x-4 sm:gap-x-5 lg:gap-x-6 gap-y-3 text-sm sm:text-base lg:text-lg font-bold uppercase tracking-wide text-accent-cyan">
                <a href="/awards/about" className="hover:underline flex items-center gap-1.5 lg:gap-2">
                  Learn more <span aria-hidden>→</span>
                </a>
                <span className="text-gray-300">|</span>
                <a href="/jury" className="hover:underline flex items-center gap-1.5 lg:gap-2">
                  Meet the jury <span aria-hidden>→</span>
                </a>
              </div>
            </FadeIn>
          </div>

          {/* Right: branded video panel */}
          <FadeIn delay={0.1}>
            <div className="relative w-full overflow-hidden rounded-[22px] bg-navy-deep">
              <video
                className="h-full w-full object-contain"
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
              >
                <source src={introVideo} type="video/mp4" />
              </video>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}