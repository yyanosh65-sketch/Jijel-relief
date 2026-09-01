import convoyWaypointsData from "@/data/convoy-waypoints.json";
import type { ConvoyEntryPoint } from "@/db/schema";
import type { WaypointType } from "@/lib/convoys";

export type { WaypointType };

export type ConvoyWaypoint = {
  id: string;
  type: WaypointType;
  name_ar: string;
  lat: number;
  lng: number;
  phone: string;
  whatsapp: string | null;
  opening_hours: string;
  capacity: string;
  notes: string;
};

export type EntranceCoordinator = {
  entry_point: ConvoyEntryPoint;
  name_ar: string;
  phone: string;
  whatsapp: string;
  notes: string;
};

type ConvoyWaypointsFile = {
  waypoints: ConvoyWaypoint[];
  entranceCoordinators: EntranceCoordinator[];
};

const data = convoyWaypointsData as ConvoyWaypointsFile;

export const convoyWaypoints: ConvoyWaypoint[] = data.waypoints;
export const entranceCoordinators: EntranceCoordinator[] = data.entranceCoordinators;

export function getCoordinatorByEntry(
  entryPoint: ConvoyEntryPoint,
): EntranceCoordinator | undefined {
  return entranceCoordinators.find(
    (coordinator) => coordinator.entry_point === entryPoint,
  );
}

export function getWaypointsByType(type: WaypointType): ConvoyWaypoint[] {
  return convoyWaypoints.filter((waypoint) => waypoint.type === type);
}
