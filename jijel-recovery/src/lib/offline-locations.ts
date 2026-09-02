import type { JijelLocations } from "@/lib/locations";

import bundledLocations from "@/data/jijel-locations.json";

const OFFLINE_LOCATIONS_URL = "/data/jijel-locations.json";

let cachedLocations: JijelLocations | null = null;

export function getBundledLocations(): JijelLocations {
  return bundledLocations as JijelLocations;
}

export async function loadLocationsWithOfflineFallback(): Promise<JijelLocations> {
  if (cachedLocations) {
    return cachedLocations;
  }

  if (typeof window === "undefined") {
    return getBundledLocations();
  }

  try {
    const response = await fetch(OFFLINE_LOCATIONS_URL, {
      cache: "force-cache",
    });

    if (response.ok) {
      cachedLocations = (await response.json()) as JijelLocations;
      return cachedLocations;
    }
  } catch {
    // Fall through to bundled dataset.
  }

  cachedLocations = getBundledLocations();
  return cachedLocations;
}
