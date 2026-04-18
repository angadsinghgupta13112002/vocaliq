/**
 * utils/analytics.js - Google Analytics GA4 Event Tracking
 * Wraps window.gtag() calls for tracking page views and custom events.
 * The gtag script is loaded in index.html with Measurement ID G-SN3LE9Y5RT.
 * Author: Angaddeep Singh Gupta | CS651 Project 2
 */

const GA_ID = "G-SN3LE9Y5RT";

/**
 * trackPageView - Sends a page_view event to GA4
 * Called on every React Router navigation in App.jsx
 * @param {string} path - The current URL path (e.g. "/dashboard")
 */
export const trackPageView = (path) => {
  if (typeof window.gtag !== "function") return;
  window.gtag("config", GA_ID, { page_path: path });
};

/**
 * trackEvent - Sends a custom event to GA4
 * @param {string} eventName   - GA4 event name (snake_case)
 * @param {Object} eventParams - Additional event parameters
 *
 * Events tracked:
 *  - login               : user completes Google OAuth
 *  - session_started     : user clicks "Start Session"
 *  - session_submitted   : user submits recording for analysis
 *  - session_complete    : Gemini analysis finishes, report shown
 *  - report_tab_viewed   : user switches tabs in the coaching report
 *  - logout              : user clicks Sign Out
 */
export const trackEvent = (eventName, eventParams = {}) => {
  if (typeof window.gtag !== "function") return;
  window.gtag("event", eventName, eventParams);
};
