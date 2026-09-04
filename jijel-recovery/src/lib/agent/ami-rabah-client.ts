import { dispatchFlyToPoint } from "@/lib/map-fly-to";

export type AmiFlyToAction = {
  type: "FLY_TO";
  lat: number;
  lng: number;
  zoom?: number;
};

export type AmiParsedReply = {
  /** Human-visible text with ACTION tags stripped */
  displayText: string;
  actions: AmiFlyToAction[];
  /** Phone numbers found for click-to-call chips */
  phones: Array<{ label: string; tel: string }>;
};

const ACTION_RE = /<<<ACTION:(\{[\s\S]*?\})>>>/g;
const MD_TEL_RE = /\[([^\]]*)\]\(tel:([^)]+)\)/g;
const RAW_TEL_RE = /(?:tel:)?(\+?213\d{9}|0\d{9})/g;

export function parseAmiRabahReply(raw: string): AmiParsedReply {
  const actions: AmiFlyToAction[] = [];
  let displayText = raw;

  displayText = displayText.replace(ACTION_RE, (_full, json: string) => {
    try {
      const parsed = JSON.parse(json) as {
        type?: string;
        lat?: number;
        lng?: number;
        zoom?: number;
      };
      if (
        parsed.type === "FLY_TO" &&
        typeof parsed.lat === "number" &&
        typeof parsed.lng === "number" &&
        Number.isFinite(parsed.lat) &&
        Number.isFinite(parsed.lng)
      ) {
        actions.push({
          type: "FLY_TO",
          lat: parsed.lat,
          lng: parsed.lng,
          zoom: typeof parsed.zoom === "number" ? parsed.zoom : 13,
        });
      }
    } catch {
      // ignore malformed tags
    }
    return "";
  });

  const phones: Array<{ label: string; tel: string }> = [];
  const seen = new Set<string>();

  for (const match of raw.matchAll(MD_TEL_RE)) {
    const label = match[1]?.replace(/^📞\s*/, "").trim() || match[2];
    const tel = match[2].trim();
    if (!seen.has(tel)) {
      seen.add(tel);
      phones.push({ label, tel });
    }
  }

  // Convert markdown tel links to plain readable text in display
  displayText = displayText.replace(MD_TEL_RE, (_m, label: string, tel: string) => {
    const clean = String(label).replace(/^📞\s*/, "").trim() || tel;
    return `📞 ${clean}`;
  });

  displayText = displayText.replace(/\n{3,}/g, "\n\n").trim();

  // Fallback: bare Algerian mobiles
  if (phones.length === 0) {
    for (const match of displayText.matchAll(RAW_TEL_RE)) {
      const tel = match[1];
      if (!seen.has(tel)) {
        seen.add(tel);
        phones.push({ label: tel, tel });
      }
    }
  }

  return { displayText, actions, phones };
}

export function executeAmiFlyTo(action: AmiFlyToAction) {
  dispatchFlyToPoint({
    lat: action.lat,
    lng: action.lng,
    zoom: action.zoom ?? 13,
    duration: 1.2,
  });
}

export function executeAmiActions(actions: AmiFlyToAction[]) {
  const first = actions[0];
  if (first) executeAmiFlyTo(first);
}
