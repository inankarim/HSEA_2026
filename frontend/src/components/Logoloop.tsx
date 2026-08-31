type LogoLoopProps = {
  title?: string;
};

// Tight, shared viewBox that bounds ONLY the ring + H icon (not the wordmark)
const ICON_VIEWBOX = "-168.851 -5.994 194.023 194.607";

// Paths taken directly from the source SVG's icon group — same coordinate
// space as ICON_VIEWBOX, so they overlay perfectly with no extra transform.
const RING_D =
  "m-17.41 62.541c-11.21-11.51-25.074-17.099-41.89-17.099-16.227 0-30.092 5.892-41.6 17.676-11.504 11.237-17.11 25.087-17.11 41.305 0 16.53 5.606 30.398 17.11 41.608 11.508 11.802 25.373 17.7 41.6 17.7v18.882c-21.536 0-39.829-7.669-55.17-23.012-15.34-15.635-23.011-33.928-23.011-55.178 0-21.533 7.671-39.817 23.012-55.458 15.339-15.337 33.633-23.021 55.169-23.021s39.825 7.684 55.169 23.021c15.635 15.641 23.303 33.925 23.303 55.458h-19.47c0-16.218-5.604-30.371-17.112-41.882";
const H_D =
  "m-88.802 93.523-55.169-56.048-18.88 18.29 55.759 55.762zm36.879-37.758-55.76-55.759-18.29 18.881 55.759 55.76z";

const WORDMARK_VIEWBOX = "621.9 586.9 1884 486";
const WORDMARK_D =
  "m 894.328545231,800.908054008 l 0,-173.9265488 l 81.769368583,0 l 0,432.1963204 l -81.769368583,0 l 0,-186.857416396 l -181.722907215,0 l 0,186.857416396 l -85.6675477901,0 l 0,-432.1963204 l 85.6675477901,0 l 0,173.922149049 z m 375.1359523,98.6688113985 c 0,66.1722520036 -23.4110739968,98.5632173794 -68.8429007381,98.5632173794 c -48.0012812074,0 -72.6926826865,-32.3909653757 -72.6926826865,-98.5632173794 c 0,-63.6071972883 24.691401479,-96.1037566832 72.6926826865,-96.1037566832 c 45.4318267413,0 68.8429007381,32.4965593949 68.8429007381,96.1037566832 z m 85.6279500329,-5.23570344976 c 0,-105.088047813 -49.2816086897,-158.320632719 -149.235147321,-158.320632719 c -48.0012812074,0 -87.0182712851,15.5003220618 -116.844181946,47.9968814566 s -45.4318267413,72.6926826865 -45.4318267413,123.364612628 c 0,106.363975544 49.3872027088,159.600960202 149.34074134,159.600960202 c 48.0012812074,0 86.912677266,-15.6059160809 116.734188176,-48.0012812074 c 29.9359044304,-32.4965593949 45.4362264921,-73.9730101687 45.4362264921,-124.644940111 m 67.5581735051,164.841063402 l 80.3922465832,0 l 0,-467.262334261 l -80.3922465832,0 z m 146.670092606,-146.665692855 c 0,-118.124509428 54.5173121394,-176.491603516 164.841063402,-176.491603516 l 64.8875247706,7.80075816506 c -1.28032748225,24.5902072107 -3.84978194835,49.2816086897 -7.80515791586,72.6926826865 l -57.0823668547,-10.4714068995 c -53.2369846572,0 -79.2131133693,32.4921596441 -79.2131133693,98.6644116477 c 0,61.042142573 25.9761287121,90.8680532335 76.538064884,90.8680532335 c 22.1307465145,-3.84978194835 42.8711717768,-7.80515791586 62.3268698061,-14.2199945795 l 5.23570344976,70.022033952 c -28.5411834274,10.3702126312 -57.0823668547,15.6059160809 -85.7335440521,15.6059160809 c -95.9981626641,0 -143.995044121,-51.9522574241 -143.995044121,-154.475250522 m 336.202557487,-210.268490393 c -33.7812866279,0 -50.6719299419,-16.8950430648 -50.6719299419,-50.5663359227 c 0,-35.066013861 16.8950430648,-51.9522574241 50.6719299419,-51.9522574241 c 33.6756926088,0 50.5619361719,16.890643314 50.5619361719,51.9522574241 c 0,33.6756926088 -16.8862435632,50.5663359227 -50.5619361719,50.5663359227 z m -40.3017173107,45.4318267413 l 80.4978406023,0 l 0,311.506756257 l -80.4978406023,0 z m 442.676526802,159.710953972 l 0,151.795802286 l -81.7781680846,0 l 0,-199.902677512 c 0,-37.6310685763 -13.0452611164,-55.8020393725 -37.7366625954,-55.8020393725 c -19.4556980293,0 -36.3463413432,9.08548539811 -50.5663359227,28.5411834274 c -14.2155948287,22.1307465145 -22.0207527446,46.7165539744 -22.0207527446,75.3677311717 l 0,151.795802286 l -81.7781680846,0 l 0,-311.506756257 l 76.5424646348,0 l -2.5694544661,53.2369846572 c 19.4600977801,-42.866772026 54.5217118902,-64.8875247706 103.80332058,-64.8875247706 c 48.0012812074,0 77.9283861362,22.0207527446 88.3029985182,64.8875247706 c 22.0163529938,-42.866772026 55.7976396217,-64.8875247706 103.798920829,-64.8875247706 c 63.6027975376,0 96.1037566832,35.0616141102 96.1037566832,105.083648062 l 0,218.073648309 l -81.7825678354,0 l 0,-199.902677512 c 0,-37.6310685763 -13.0408613656,-55.8020393725 -37.6266688255,-55.8020393725 c -18.1709707962,0 -33.7812866279,9.08548539811 -48.1068752266,28.5411834274 c -16.890643314,19.4556980293 -24.5858074599,45.4362264921 -24.5858074599,75.3677311717";

function Laurel({ flip = false }: { flip?: boolean }) {
  const p0 = { x: 26, y: 128 };
  const p1 = { x: -6, y: 68 };
  const p2 = { x: 22, y: 8 };

  const bezier = (t: number) => {
    const mt = 1 - t;
    return {
      x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
      y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
    };
  };
  const tangentAngle = (t: number) => {
    const mt = 1 - t;
    const dx = 2 * mt * (p1.x - p0.x) + 2 * t * (p2.x - p1.x);
    const dy = 2 * mt * (p1.y - p0.y) + 2 * t * (p2.y - p1.y);
    return (Math.atan2(dy, dx) * 180) / Math.PI;
  };

  const leafCount = 9;
  const leaves = Array.from({ length: leafCount }, (_, i) => {
    const t = 0.08 + (i / (leafCount - 1)) * 0.85;
    const { x, y } = bezier(t);
    const angle = tangentAngle(t) + 100;
    const scale = 0.68 + (1 - i / (leafCount - 1)) * 0.62;
    return { x, y, angle, scale, key: i };
  });

  return (
    <svg
      viewBox="0 0 40 140"
      className={`h-24 w-[70px] text-accent-cyan ${flip ? "scale-x-[-1]" : ""}`}
    >
      <path
        d={`M ${p0.x} ${p0.y} Q ${p1.x} ${p1.y} ${p2.x} ${p2.y}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {leaves.map(({ x, y, angle, scale, key }) => (
        <path
          key={key}
          d="M0,-6.5 C3.2,-4.2 3.2,4.2 0,6.5 C-3.2,4.2 -3.2,-4.2 0,-6.5 Z"
          fill="currentColor"
          transform={`translate(${x} ${y}) rotate(${angle}) scale(${scale})`}
        />
      ))}
    </svg>
  );
}

export default function LogoLoop({
  title = "Structural Excellence Awards",
}: LogoLoopProps) {
  return (
    <div className="logo-loop flex flex-col items-center w-full max-w-[460px] mx-auto py-10 bg-transparent">
      <div className="flex items-center justify-center gap-5 -translate-x-2">
        {/*
          ICON POSITION CONTROL
          ----------------------
          -translate-y-3 (=12px) lifts the icon above the wordmark's
          vertical center, giving the "Icon ↗ / HOLCIM" look.

          To adjust:
          - Raise it more:  -translate-y-4 (16px), -translate-y-5 (20px)
          - Raise it less:  -translate-y-2 (8px), -translate-y-1 (4px)
          - Exact pixel value: replace with an inline style, e.g.
              style={{ transform: "translateY(-10px)" }}
          - Move it left/right too: add -translate-x-1 / translate-x-1
            alongside -translate-y-4 (Tailwind combines transforms
            written together in one className).
          - Back to perfectly centered with the wordmark: delete
            -translate-y-4 translate-x-1 entirely.
        */}
        <div className="icon-wrap relative h-14 w-14 shrink-0 flex items-center justify-center bg-transparent -translate-y-11 translate-x-8">
          <svg
            viewBox={ICON_VIEWBOX}
            className="shape-l absolute h-14 w-auto opacity-0"
            style={{ filter: "drop-shadow(0 2px 10px rgba(0,0,0,0.25))" }}
          >
            <path d={RING_D} fill="#ed1c24" fillRule="evenodd" />
          </svg>
          <svg
            viewBox={ICON_VIEWBOX}
            className="shape-h absolute h-14 w-auto opacity-0"
            style={{ filter: "drop-shadow(0 2px 10px rgba(0,0,0,0.25))" }}
          >
            <path d={H_D} fill="#231f20" fillRule="evenodd" />
          </svg>
        </div>

        <svg
          viewBox={WORDMARK_VIEWBOX}
          className="wordmark h-14 w-auto opacity-0"
        >
          <path d={WORDMARK_D} fill="#ffffff" fillRule="evenodd" />
        </svg>
      </div>

      <div className="award-block mt-6 flex flex-col items-center opacity-0">
        <span className="award-line inline-block w-0 h-0.5 bg-accent-cyan mb-3" />
        <div className="flex items-center gap-2 relative left-[12px]">
          <Laurel />
          <span className="text-[15px] md:text-lg font-bold tracking-[3px] text-accent-cyan uppercase text-center leading-tight">
            {title}
          </span>
          <Laurel flip />
        </div>
      </div>
    </div>
  );
}