// src/services/analytics.service.js
import { google } from "googleapis";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

let analyticsDataClient = null;

function getClient() {
  if (analyticsDataClient) return analyticsDataClient;
  if (!env.GOOGLE_OAUTH_CLIENT_ID || !env.GOOGLE_OAUTH_REFRESH_TOKEN)
    return null;

  const oauth2Client = new google.auth.OAuth2(
    env.GOOGLE_OAUTH_CLIENT_ID,
    env.GOOGLE_OAUTH_CLIENT_SECRET,
  );
  oauth2Client.setCredentials({
    refresh_token: env.GOOGLE_OAUTH_REFRESH_TOKEN,
  });

  analyticsDataClient = google.analyticsdata({
    version: "v1beta",
    auth: oauth2Client,
  });
  return analyticsDataClient;
}

// src/services/analytics.service.js
export async function getAnalyticsSummary() {
  const client = getClient();
  if (!client || !env.GA4_PROPERTY_ID) {
    return { totalViews: null, totalVisitors: null };
  }

  try {
    const response = await Promise.race([
      client.properties.runReport({
        property: `properties/${env.GA4_PROPERTY_ID}`,
        requestBody: {
          dateRanges: [{ startDate: "2020-01-01", endDate: "today" }],
          metrics: [{ name: "screenPageViews" }, { name: "totalUsers" }],
        },
      }),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("GA4 request timed out after 8s")),
          8000,
        ),
      ),
    ]);

    const row = response.data.rows?.[0];
    const views = row?.metricValues?.[0]?.value;
    const visitors = row?.metricValues?.[1]?.value;

    return {
      totalViews: views ? parseInt(views, 10) : 0,
      totalVisitors: visitors ? parseInt(visitors, 10) : 0,
    };
  } catch (err) {
    logger.error("Failed to fetch GA4 analytics summary", {
      error: err.message,
      stack: err.stack,
    });
    return { totalViews: null, totalVisitors: null };
  }
}
