// utils/analytics.js
let loaded = false;

export function gaInit(measurementId) {
  if (loaded || !measurementId) return;
  // gtag base
  const s1 = document.createElement("script");
  s1.async = true;
  s1.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(s1);

  // config
  const s2 = document.createElement("script");
  s2.innerHTML = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${measurementId}', {
      send_page_view: false,           // SPA: we’ll send manually
      anonymize_ip: true               // privacy-friendly default
    });
  `;
  document.head.appendChild(s2);
  loaded = true;
}

function gtag() {
  if (!window.gtag) return;
  window.gtag.apply(null, arguments);
}

export function gaPageView(path, title) {
  gtag('event', 'page_view', { page_location: window.location.origin + path, page_path: path, page_title: title || document.title });
}

export function gaEvent(name, params = {}) {
  gtag('event', name, params);
}

export function gaSetUserId(userId) {
  if (!userId) return;
  gtag('set', { user_id: String(userId) });
}
