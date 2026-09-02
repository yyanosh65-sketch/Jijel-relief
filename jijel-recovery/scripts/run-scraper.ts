import "dotenv/config";

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { ApifyClient } from "apify-client";

type MonitoredSourcesFile = {
  keywords: string[];
  sources: Array<{ url: string }>;
};

const scriptDir = dirname(fileURLToPath(import.meta.url));
const monitoredSourcesPath = join(
  scriptDir,
  "../src/data/monitored-sources.json",
);

const client = new ApifyClient({
  token: process.env.APIFY_API_TOKEN,
});

const WEBHOOK_URL =
  process.env.FEED_WEBHOOK_URL ??
  "https://your-domain.railway.app/api/agent/process-feed";

function buildKeywordSearchUrls(keywords: string[]): Array<{ url: string }> {
  return keywords.map((keyword) => ({
    url: `https://www.facebook.com/search/posts?q=${encodeURIComponent(keyword)}`,
  }));
}

async function loadMonitoredSources(): Promise<MonitoredSourcesFile> {
  const raw = await readFile(monitoredSourcesPath, "utf8");
  const parsed = JSON.parse(raw) as MonitoredSourcesFile;

  return {
    keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
    sources: Array.isArray(parsed.sources) ? parsed.sources : [],
  };
}

async function triggerScraper() {
  const monitoredSources = await loadMonitoredSources();
  const searchKeywords = monitoredSources.keywords;
  const sourceUrls = monitoredSources.sources.map((source) => ({
    url: source.url,
  }));
  const keywordUrls = buildKeywordSearchUrls(searchKeywords);
  const startUrls = [...sourceUrls, ...keywordUrls];

  console.log(
    `📡 Triggering Apify scrape for ${sourceUrls.length} monitored sources and ${searchKeywords.length} keyword searches...`,
  );

  if (searchKeywords.length > 0) {
    console.log(`🔎 Keywords: ${searchKeywords.join(" | ")}`);
  }

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
