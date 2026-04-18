/**
 * services/analyticsService.js - Google Analytics Measurement Protocol (GA4)
 * Sends server-side events to GA4 using the Measurement Protocol API.
 * This covers the "backend analytics" requirement — tracks key API events
 * (login, session_analyzed) independently of the browser.
 *
 * Docs: https://developers.google.com/analytics/devguides/collection/protocol/ga4
 * Author: Angaddeep Singh Gupta | CS651 Project 2
 */
const axios = require("axios");

const GA_MEASUREMENT_ID  = "G-SN3LE9Y5RT";
const GA_API_SECRET      = process.env.GA_API_SECRET || "";
const GA_MP_ENDPOINT     = `https://www.google-analytics.com/mp/collect?measurement_id=${GA_MEASUREMENT_ID}&api_secret=${GA_API_SECRET}`;

/**
 * sendServerEvent - Sends a GA4 event via the Measurement Protocol
 * Failures are silently swallowed — analytics should never crash the app.
 *
 * @param {string} clientId   - Unique client identifier (uid or "server")
 * @param {string} eventName  - GA4 event name
 * @param {Object} params     - Additional event parameters
 */
const sendServerEvent = async (clientId, eventName, params = {}) => {
  if (!GA_API_SECRET) {
    // Log locally if no API secret — still visible in Cloud Run logs
    console.log(`[analytics] ${eventName}`, { clientId, ...params });
    return;
  }
  try {
    await axios.post(GA_MP_ENDPOINT, {
      client_id: clientId || "server",
      events: [{
        name:   eventName,
        params: { ...params, engagement_time_msec: "1" },
      }],
    });
  } catch (err) {
    // Never let analytics failures affect the main request
    console.warn("[analytics] Measurement Protocol error:", err.message);
  }
};

module.exports = { sendServerEvent };
