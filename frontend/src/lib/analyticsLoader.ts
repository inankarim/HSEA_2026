// Loads GA4/Meta Pixel on demand (only after cookie consent), instead of
// unconditionally in index.html. Each loader is idempotent — safe to call
// more than once (e.g. if the banner re-renders).

function injectScript(src: string) {
  const s = document.createElement("script");
  s.src = src;
  s.async = true;
  document.head.appendChild(s);
}

function injectInlineScript(code: string) {
  const s = document.createElement("script");
  s.textContent = code;
  document.head.appendChild(s);
}

let gaLoaded = false;

export function loadGoogleAnalytics() {
  if (gaLoaded) return;
  const gaId = import.meta.env.VITE_GA_MEASUREMENT_ID;
  if (!gaId) return;
  gaLoaded = true;

  injectScript(`https://www.googletagmanager.com/gtag/js?id=${gaId}`);
  injectInlineScript(`
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${gaId}');
    window.gtag = gtag;
  `);
}

let metaPixelLoaded = false;
const META_PIXEL_ID = "2185010449090899";

export function loadMetaPixel() {
  if (metaPixelLoaded) return;
  metaPixelLoaded = true;

  injectInlineScript(`
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', '${META_PIXEL_ID}');
    fbq('track', 'PageView');
  `);
}
