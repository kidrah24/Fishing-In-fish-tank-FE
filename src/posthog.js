import posthog from "posthog-js";

const posthogKey = import.meta.env.VITE_POSTHOG_KEY;
const posthogHost = import.meta.env.VITE_POSTHOG_HOST;

if ((!posthogKey || !posthogHost) && import.meta.env.DEV) {
  console.warn(
    "PostHog key or host missing in environment variables. Analytics events will be skipped until VITE_POSTHOG_KEY and VITE_POSTHOG_HOST are configured.",
  );
}

const analytics = posthogKey && posthogHost
  ? posthog.init(posthogKey, {
      api_host: posthogHost,
      defaults: "2026-05-30",
      capture_pageview: true,
      capture_pageleave: true,
      capture_exceptions: {
        capture_unhandled_errors: true,
        capture_unhandled_rejections: true,
        capture_console_errors: false,
      },
      loaded: (ph) => {
        if (document.referrer) {
          ph.register({ external_referrer: document.referrer });
        }
      },
    })
  : null;

export default analytics;
