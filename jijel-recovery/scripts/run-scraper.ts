import "dotenv/config";

import { ApifyClient } from "apify-client";

import sources from "../src/data/monitored-sources.json";

const client = new ApifyClient({
  token: process.env.APIFY_API_TOKEN,
});

const WEBHOOK_URL =
  process.env.FEED_WEBHOOK_URL ??
  "https://your-domain.railway.app/api/agent/process-feed";

async function triggerScraper() {
  // 1. Build the payload automatically from your dataset
  const startUrls = sources.sources.map((source) => ({ url: source.url }));

  console.log(
    `📡 Triggering Apify scrape for ${startUrls.length} Jijel sources...`,
  );

  // 2. Start actor execution with automatic webhook callback
  const run = await client.actor("apify/facebook-posts-scraper").call({
    startUrls,
    resultsLimit: 5,
    webhooks: [
      {
        eventTypes: ["ACTOR.RUN.SUCCEEDED"],
        requestUrl: WEBHOOK_URL,
        headersTemplate:
          '{"Authorization": "Bearer ' + process.env.FEED_WEBHOOK_SECRET + '"}',
      },
    ],
  });

  console.log(`✅ Scraper started successfully! Run ID: ${run.id}`);
}

triggerScraper().catch(console.error);
