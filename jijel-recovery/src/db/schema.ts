import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const needCategoryEnum = pgEnum("need_category", [
  "food",
  "water",
  "shelter",
  "medical",
  "sos_orphan_family",
  "clothing",
  "transport",
  "other",
]);

export const needUrgencyEnum = pgEnum("need_urgency", [
  "low",
  "medium",
  "high",
  "critical",
]);

export const needStatusEnum = pgEnum("need_status", [
  "open",
  "partial",
  "fulfilled",
  "closed",
]);

export const pledgeStatusEnum = pgEnum("pledge_status", [
  "pending",
  "confirmed",
  "delivered",
  "cancelled",
]);

export const sosEmergencyTypeEnum = pgEnum("sos_emergency_type", [
  "fire_flare",
  "livestock_trap",
  "medical",
  "water_cutoff",
]);

export const sosAlertStatusEnum = pgEnum("sos_alert_status", [
  "active",
  "acknowledged",
  "resolved",
]);

export const facilityTypeEnum = pgEnum("facility_type", [
  "civil_protection",
  "veterinary_clinic",
  "forest_conservancy",
]);

export const helperSkillEnum = pgEnum("helper_skill", [
  "transport_4x4",
  "cargo_truck",
  "vet_livestock",
  "first_aid",
  "construction",
  "hosting",
  "general_volunteer",
]);

export const helperStatusEnum = pgEnum("helper_status", [
  "pending",
  "verified",
  "rejected",
  "inactive",
]);

export const convoyVehicleTypeEnum = pgEnum("convoy_vehicle_type", [
  "truck",
  "pickup_4x4",
  "van",
  "bus",
]);

export const convoyCargoTypeEnum = pgEnum("convoy_cargo_type", [
  "food",
  "farm_equipment",
  "blankets",
  "medicine",
  "mixed",
]);

export const convoyEntryPointEnum = pgEnum("convoy_entry_point", [
  "bejaia_west",
  "setif_south",
  "skikda_east",
  "mila_south_east",
]);

export const convoyStatusEnum = pgEnum("convoy_status", [
  "planned",
  "en_route",
  "arrived",
  "completed",
  "cancelled",
]);

export const fieldRoadPassabilityEnum = pgEnum("field_road_passability", [
  "paved",
  "rough_4x4",
  "closed",
]);

export const fieldInfrastructureStatusEnum = pgEnum("field_infrastructure_status", [
  "normal",
  "intermittent",
  "cut_off",
  "unknown",
]);

export const charityItemCategoryEnum = pgEnum("charity_item_category", [
  "water_equipment",
  "fodder",
  "building_materials",
  "food",
]);

export const charityAvailabilityEnum = pgEnum("charity_availability", [
  "available",
  "limited",
  "reserved",
  "depleted",
]);

export const charityInventoryStatusEnum = pgEnum("charity_inventory_status", [
  "pending",
  "approved",
  "rejected",
]);

export const responderRoleEnum = pgEnum("responder_role", [
  "doctor",
  "paramedic",
  "psychologist",
  "food_distribution",
  "clearing_debris",
  "logistics_driver",
  "general_volunteer",
]);

export const responderStatusEnum = pgEnum("responder_status", [
  "en_route",
  "on_site",
  "completed",
]);

/** Mountain trail vehicle clearance for offline / field reporting */
export const trailClearanceEnum = pgEnum("trail_clearance", [
  "sedan_passable",
  "high_clearance_only",
  "strict_4x4_required",
  "completely_blocked",
]);

/** Cross-hub stockpile barter (Bourse d'Échange) */
export const transferStatusEnum = pgEnum("transfer_status", [
  "available_surplus",
  "matched_in_transit",
  "received",
]);

/** Granular settlement classification (mechta / dechra) */
export const settlementTypeEnum = pgEnum("settlement_type", [
  "daira_center",
  "commune_center",
  "mechta",
  "dechra",
  "hamlet_isolated",
]);

/** Community facilities — mosques, springs, shelters */
export const communityFacilityTypeEnum = pgEnum("community_facility_type", [
  "mosque_operational",
  "mosque_damaged",
  "zawiya_sanctuary",
  "water_spring",
  "oxygen_generator",
  "cold_chain_pharma",
]);

/** Agro-pastoral burn recovery pledges */
export const agroCategoryEnum = pgEnum("agro_category", [
  "olive_saplings",
  "beehives",
  "livestock_feed_hay",
  "irrigation_hoses",
  "veterinary_supplies",
]);

export const locations = pgTable("locations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  daira: text("daira").notNull(),
  address: text("address"),
  lat: numeric("lat", { precision: 10, scale: 6 }).notNull(),
  lng: numeric("lng", { precision: 10, scale: 6 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const needs = pgTable("needs", {
  id: serial("id").primaryKey(),
  locationId: integer("location_id")
    .notNull()
    .references(() => locations.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: needCategoryEnum("category").notNull(),
  urgency: needUrgencyEnum("urgency").notNull(),
  status: needStatusEnum("status").notNull().default("open"),
  quantityNeeded: integer("quantity_needed").notNull(),
  quantityFulfilled: integer("quantity_fulfilled").notNull().default(0),
  contactName: text("contact_name"),
  contactPhone: text("contact_phone"),
  contactWhatsapp: text("contact_whatsapp"),
  mediaUrls: text("media_urls").array().notNull().default([]),
  facebookUrl: text("facebook_url"),
  voiceNoteData: text("voice_note_data"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const pledges = pgTable("pledges", {
  id: serial("id").primaryKey(),
  needId: integer("need_id")
    .notNull()
    .references(() => needs.id, { onDelete: "cascade" }),
  contributorName: text("contributor_name").notNull(),
  contributorContact: text("contributor_contact"),
  quantity: integer("quantity").notNull(),
  notes: text("notes"),
  status: pledgeStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const urgentAlerts = pgTable("urgent_alerts", {
  id: serial("id").primaryKey(),
  emergencyType: sosEmergencyTypeEnum("emergency_type").notNull(),
  description: text("description").notNull(),
  reporterName: text("reporter_name").notNull(),
  reporterPhone: text("reporter_phone"),
  daira: text("daira").notNull(),
  commune: text("commune").notNull(),
  village: text("village"),
  lat: numeric("lat", { precision: 10, scale: 6 }).notNull(),
  lng: numeric("lng", { precision: 10, scale: 6 }).notNull(),
  status: sosAlertStatusEnum("status").notNull().default("active"),
  mediaUrls: text("media_urls").array().notNull().default([]),
  facebookUrl: text("facebook_url"),
  voiceNoteData: text("voice_note_data"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/** @deprecated Use urgentAlerts — kept for existing imports */
export const sosAlerts = urgentAlerts;

export const emergencyNotifications = pgTable("emergency_notifications", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  commune: text("commune").notNull(),
  communeAr: text("commune_ar"),
  village: text("village"),
  phone: text("phone"),
  facebookUrl: text("facebook_url"),
  urgency: text("urgency"),
  category: text("category"),
  sourceKind: text("source_kind").notNull(),
  sourceId: integer("source_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const emergencyFacilities = pgTable("emergency_facilities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  facilityType: facilityTypeEnum("facility_type").notNull(),
  commune: text("commune").notNull(),
  lat: numeric("lat", { precision: 10, scale: 6 }).notNull(),
  lng: numeric("lng", { precision: 10, scale: 6 }).notNull(),
  hotlinePhone: text("hotline_phone").notNull(),
  secondaryPhone: text("secondary_phone"),
  availableServices: text("available_services").array().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const communityHelpers = pgTable("community_helpers", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  phone: text("phone").notNull(),
  whatsappPhone: text("whatsapp_phone"),
  daira: text("daira").notNull(),
  commune: text("commune").notNull(),
  lat: numeric("lat", { precision: 10, scale: 6 }).notNull(),
  lng: numeric("lng", { precision: 10, scale: 6 }).notNull(),
  skills: helperSkillEnum("skills").array().notNull(),
  availabilityNotes: text("availability_notes"),
  status: helperStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const incomingConvoys = pgTable("incoming_convoys", {
  id: serial("id").primaryKey(),
  departureWilaya: text("departure_wilaya").notNull(),
  driverName: text("driver_name").notNull(),
  driverPhone: text("driver_phone").notNull(),
  driverWhatsapp: text("driver_whatsapp"),
  vehicleType: convoyVehicleTypeEnum("vehicle_type").notNull(),
  cargoType: convoyCargoTypeEnum("cargo_type").notNull(),
  eta: timestamp("eta", { withTimezone: true }).notNull(),
  entryPoint: convoyEntryPointEnum("entry_point").notNull(),
  status: convoyStatusEnum("status").notNull().default("planned"),
  welcomingGuideName: text("welcoming_guide_name"),
  welcomingGuidePhone: text("welcoming_guide_phone"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/** @deprecated Use incomingConvoys */
export const convoys = incomingConvoys;

export const villageFieldReports = pgTable("village_field_reports", {
  id: serial("id").primaryKey(),
  villageNameAr: text("village_name_ar").notNull(),
  commune: text("commune").notNull(),
  communeAr: text("commune_ar").notNull(),
  daira: text("daira").notNull(),
  dairaAr: text("daira_ar").notNull(),
  lat: numeric("lat", { precision: 10, scale: 6 }).notNull(),
  lng: numeric("lng", { precision: 10, scale: 6 }).notNull(),
  reporterName: text("reporter_name").notNull(),
  reporterPhone: text("reporter_phone").notNull(),
  affectedFamilies: integer("affected_families"),
  populationEstimate: integer("population_estimate"),
  roadPassability: fieldRoadPassabilityEnum("road_passability").notNull(),
  waterStatus: fieldInfrastructureStatusEnum("water_status")
    .notNull()
    .default("unknown"),
  fodderStatus: fieldInfrastructureStatusEnum("fodder_status")
    .notNull()
    .default("unknown"),
  electricityStatus: fieldInfrastructureStatusEnum("electricity_status")
    .notNull()
    .default("unknown"),
  urgentNeeds: text("urgent_needs").array().notNull().default([]),
  notes: text("notes"),
  mediaUrls: text("media_urls").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const charityInventories = pgTable("charity_inventories", {
  id: serial("id").primaryKey(),
  charityName: text("charity_name").notNull(),
  charityNameAr: text("charity_name_ar"),
  representativeName: text("representative_name").notNull(),
  representativePhone: text("representative_phone").notNull(),
  representativeWhatsapp: text("representative_whatsapp"),
  daira: text("daira").notNull(),
  commune: text("commune").notNull(),
  communeAr: text("commune_ar").notNull(),
  category: charityItemCategoryEnum("category").notNull(),
  itemTitle: text("item_title").notNull(),
  availableQuantity: integer("available_quantity").notNull(),
  unit: text("unit").notNull(),
  coverageRadiusKm: integer("coverage_radius_km"),
  targetDouars: text("target_douars").array().notNull().default([]),
  availability: charityAvailabilityEnum("availability")
    .notNull()
    .default("available"),
  verified: boolean("verified").notNull().default(false),
  status: charityInventoryStatusEnum("status").notNull().default("approved"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const activeResponders = pgTable("active_responders", {
  id: serial("id").primaryKey(),
  needId: integer("need_id").references(() => needs.id, {
    onDelete: "set null",
  }),
  settlementId: integer("settlement_id"),
  fullName: varchar("full_name", { length: 120 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  role: responderRoleEnum("role").notNull(),
  organizationName: varchar("organization_name", { length: 150 }),
  status: responderStatusEnum("status").notNull().default("on_site"),
  etaMinutes: integer("eta_minutes"),
  suppliesBrought: text("supplies_brought"),
  checkedInAt: timestamp("checked_in_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const mountainTrails = pgTable("mountain_trails", {
  id: serial("id").primaryKey(),
  roadCode: varchar("road_code", { length: 50 }).notNull(),
  settlementId: integer("settlement_id"),
  clearanceLevel: trailClearanceEnum("clearance_level").notNull(),
  audioVoiceNoteUrl: text("audio_voice_note_url"),
  notes: text("notes"),
  reportedByPhone: varchar("reported_by_phone", { length: 20 }),
  lat: varchar("lat", { length: 30 }).notNull(),
  lng: varchar("lng", { length: 30 }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const inventoryTransfers = pgTable("inventory_transfers", {
  id: serial("id").primaryKey(),
  sourceHubName: varchar("source_hub_name", { length: 120 }).notNull(),
  sourceCommune: varchar("source_commune", { length: 80 }).notNull(),
  itemCategory: varchar("item_category", { length: 80 }).notNull(),
  surplusQuantity: integer("surplus_quantity").notNull(),
  neededInExchange: varchar("needed_in_exchange", { length: 150 }),
  status: transferStatusEnum("status").notNull().default("available_surplus"),
  coordinatorPhone: varchar("coordinator_phone", { length: 20 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/** Volunteer / fleet registration */
export const volunteerVehicleEnum = pgEnum("volunteer_vehicle", [
  "suv_4x4",
  "truck",
  "sedan",
  "on_foot",
]);

export const volunteerSpecialtyEnum = pgEnum("volunteer_specialty", [
  "general_relief",
  "medical",
  "veterinary",
  "debris_clearing",
]);

export const agroRecoveryPledges = pgTable("agro_recovery_pledges", {
  id: serial("id").primaryKey(),
  donorOrganization: varchar("donor_organization", { length: 150 }).notNull(),
  donorWilaya: varchar("donor_wilaya", { length: 50 }).notNull(),
  category: agroCategoryEnum("category").notNull(),
  quantityOffered: integer("quantity_offered").notNull(),
  targetCommune: varchar("target_commune", { length: 80 }),
  status: varchar("status", { length: 30 }).notNull().default("ready_for_dispatch"),
  contactPhone: varchar("contact_phone", { length: 20 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const communityFacilities = pgTable("community_facilities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameAr: text("name_ar").notNull(),
  facilityType: communityFacilityTypeEnum("facility_type").notNull(),
  commune: varchar("commune", { length: 80 }).notNull(),
  communeAr: varchar("commune_ar", { length: 80 }),
  daira: varchar("daira", { length: 80 }),
  lat: numeric("lat", { precision: 10, scale: 6 }).notNull(),
  lng: numeric("lng", { precision: 10, scale: 6 }).notNull(),
  hasWaterTank: boolean("has_water_tank").notNull().default(false),
  hasPowerGenerator: boolean("has_power_generator").notNull().default(false),
  shelterCapacityPeople: integer("shelter_capacity_people"),
  coordinatorPhone: varchar("coordinator_phone", { length: 20 }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const volunteers = pgTable("volunteers", {
  id: serial("id").primaryKey(),
  fullName: varchar("full_name", { length: 120 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  commune: varchar("commune", { length: 80 }).notNull(),
  vehicleType: volunteerVehicleEnum("vehicle_type").notNull(),
  specialty: volunteerSpecialtyEnum("specialty").notNull(),
  status: varchar("status", { length: 30 }).notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const locationsRelations = relations(locations, ({ many }) => ({
  needs: many(needs),
}));

export const needsRelations = relations(needs, ({ one, many }) => ({
  location: one(locations, {
    fields: [needs.locationId],
    references: [locations.id],
  }),
  pledges: many(pledges),
  activeResponders: many(activeResponders),
}));

export const pledgesRelations = relations(pledges, ({ one }) => ({
  need: one(needs, {
    fields: [pledges.needId],
    references: [needs.id],
  }),
}));

export const activeRespondersRelations = relations(
  activeResponders,
  ({ one }) => ({
    need: one(needs, {
      fields: [activeResponders.needId],
      references: [needs.id],
    }),
  }),
);

export type Location = typeof locations.$inferSelect;
export type Need = typeof needs.$inferSelect;
export type Pledge = typeof pledges.$inferSelect;
export type ActiveResponder = typeof activeResponders.$inferSelect;
export type ResponderRole = (typeof responderRoleEnum.enumValues)[number];
export type ResponderStatus = (typeof responderStatusEnum.enumValues)[number];
export type NeedCategory = (typeof needCategoryEnum.enumValues)[number];
export type NeedUrgency = (typeof needUrgencyEnum.enumValues)[number];
export type NeedStatus = (typeof needStatusEnum.enumValues)[number];
export type PledgeStatus = (typeof pledgeStatusEnum.enumValues)[number];
export type SosEmergencyType = (typeof sosEmergencyTypeEnum.enumValues)[number];
export type SosAlertStatus = (typeof sosAlertStatusEnum.enumValues)[number];
export type FacilityType = (typeof facilityTypeEnum.enumValues)[number];
export type EmergencyFacility = typeof emergencyFacilities.$inferSelect;
export type CommunityHelper = typeof communityHelpers.$inferSelect;
export type HelperSkill = (typeof helperSkillEnum.enumValues)[number];
export type HelperStatus = (typeof helperStatusEnum.enumValues)[number];
export type UrgentAlert = typeof urgentAlerts.$inferSelect;
export type IncomingConvoy = typeof incomingConvoys.$inferSelect;
/** @deprecated Use IncomingConvoy */
export type Convoy = IncomingConvoy;
export type ConvoyVehicleType = (typeof convoyVehicleTypeEnum.enumValues)[number];
export type ConvoyCargoType = (typeof convoyCargoTypeEnum.enumValues)[number];
export type ConvoyEntryPoint = (typeof convoyEntryPointEnum.enumValues)[number];
export type ConvoyStatus = (typeof convoyStatusEnum.enumValues)[number];
export type FieldRoadPassability =
  (typeof fieldRoadPassabilityEnum.enumValues)[number];
export type FieldInfrastructureStatus =
  (typeof fieldInfrastructureStatusEnum.enumValues)[number];
export type VillageFieldReport = typeof villageFieldReports.$inferSelect;
export type CharityInventory = typeof charityInventories.$inferSelect;
export type CharityItemCategory =
  (typeof charityItemCategoryEnum.enumValues)[number];
export type CharityAvailability =
  (typeof charityAvailabilityEnum.enumValues)[number];
export type CharityInventoryStatus =
  (typeof charityInventoryStatusEnum.enumValues)[number];
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type MountainTrail = typeof mountainTrails.$inferSelect;
export type NewMountainTrail = typeof mountainTrails.$inferInsert;
export type TrailClearanceLevel =
  (typeof trailClearanceEnum.enumValues)[number];
export type InventoryTransfer = typeof inventoryTransfers.$inferSelect;
export type NewInventoryTransfer = typeof inventoryTransfers.$inferInsert;
export type TransferStatus = (typeof transferStatusEnum.enumValues)[number];
export type AgroRecoveryPledge = typeof agroRecoveryPledges.$inferSelect;
export type NewAgroRecoveryPledge = typeof agroRecoveryPledges.$inferInsert;
export type AgroCategory = (typeof agroCategoryEnum.enumValues)[number];
export type SettlementType = (typeof settlementTypeEnum.enumValues)[number];
export type CommunityFacilityType =
  (typeof communityFacilityTypeEnum.enumValues)[number];
export type CommunityFacility = typeof communityFacilities.$inferSelect;
export type NewCommunityFacility = typeof communityFacilities.$inferInsert;
export type VolunteerVehicleType =
  (typeof volunteerVehicleEnum.enumValues)[number];
export type VolunteerSpecialty =
  (typeof volunteerSpecialtyEnum.enumValues)[number];
export type Volunteer = typeof volunteers.$inferSelect;
export type NewVolunteer = typeof volunteers.$inferInsert;
