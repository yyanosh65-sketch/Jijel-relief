import { relations } from "drizzle-orm";
import {
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { customType } from "drizzle-orm/pg-core";

export const needCategoryEnum = pgEnum("need_category", [
  "food",
  "water",
  "shelter",
  "medical",
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

const geographyPoint = customType<{ data: string; driverData: string }>({
  dataType() {
    return "geography(Point,4326)";
  },
});

export const locations = pgTable("locations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  daira: text("daira").notNull(),
  address: text("address"),
  coordinates: geographyPoint("coordinates").notNull(),
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

export const sosAlerts = pgTable("sos_alerts", {
  id: serial("id").primaryKey(),
  emergencyType: sosEmergencyTypeEnum("emergency_type").notNull(),
  description: text("description").notNull(),
  reporterName: text("reporter_name").notNull(),
  reporterPhone: text("reporter_phone"),
  daira: text("daira").notNull(),
  commune: text("commune").notNull(),
  village: text("village"),
  coordinates: geographyPoint("coordinates").notNull(),
  status: sosAlertStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const emergencyFacilities = pgTable("emergency_facilities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  facilityType: facilityTypeEnum("facility_type").notNull(),
  commune: text("commune").notNull(),
  coordinates: geographyPoint("coordinates").notNull(),
  hotlinePhone: text("hotline_phone").notNull(),
  secondaryPhone: text("secondary_phone"),
  availableServices: text("available_services").array().notNull(),
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
}));

export const pledgesRelations = relations(pledges, ({ one }) => ({
  need: one(needs, {
    fields: [pledges.needId],
    references: [needs.id],
  }),
}));

export type Location = typeof locations.$inferSelect;
export type Need = typeof needs.$inferSelect;
export type Pledge = typeof pledges.$inferSelect;
export type NeedCategory = (typeof needCategoryEnum.enumValues)[number];
export type NeedUrgency = (typeof needUrgencyEnum.enumValues)[number];
export type NeedStatus = (typeof needStatusEnum.enumValues)[number];
export type PledgeStatus = (typeof pledgeStatusEnum.enumValues)[number];
export type SosEmergencyType = (typeof sosEmergencyTypeEnum.enumValues)[number];
export type SosAlertStatus = (typeof sosAlertStatusEnum.enumValues)[number];
export type FacilityType = (typeof facilityTypeEnum.enumValues)[number];
export type EmergencyFacility = typeof emergencyFacilities.$inferSelect;
