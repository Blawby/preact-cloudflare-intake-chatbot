import { sqliteTable, text, integer, unique, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  name: text("name"),
  image: text("image"),
  stripeCustomerId: text("stripe_customer_id").unique(),
  organizationId: text("organization_id"),
  role: text("role"),
  phone: text("phone"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp" }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp" }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
}, (table) => ({
  // Prevent the same external provider account from being linked to multiple local users
  uniqueProviderAccount: unique("unique_provider_account").on(table.providerId, table.accountId),
  // Ensure one account per provider per user
  uniqueProviderUser: unique("unique_provider_user").on(table.providerId, table.userId),
}));

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

// Organization plugin tables
export const organization = sqliteTable("organization", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  stripeCustomerId: text("stripe_customer_id").unique(),
  subscriptionTier: text("subscription_tier", { enum: ["free", "plus", "business", "enterprise"] }).default("free"),
  seats: integer("seats").default(1),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
}, (_table) => ({
  // Check constraint for seats > 0 (enforced at DB level in schema.sql)
  // seatsPositive: check("seats_positive", sql`${table.seats} > 0`), // SQLite doesn't support named check constraints in Drizzle
}));

export const member = sqliteTable("member", {
  id: text("id").primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
}, (table) => ({
  uniqueOrgUser: unique("unique_org_user").on(table.organizationId, table.userId),
  memberOrgIdx: index("member_org_idx").on(table.organizationId),
  memberUserIdx: index("member_user_idx").on(table.userId),
}));

export const subscription = sqliteTable("subscription", {
  id: text("id").primaryKey(),
  plan: text("plan").notNull(),
  referenceId: text("reference_id").notNull().references(() => organization.id, { onDelete: "cascade" }), // References organization.id for organization-level subscriptions
  stripeCustomerId: text("stripe_customer_id"), // Added for Better Auth Stripe plugin
  stripeSubscriptionId: text("stripe_subscription_id").unique(),
  status: text("status").notNull().default("incomplete"), // Validated by CHECK constraint in SQL
  periodStart: integer("period_start", { mode: "timestamp" }),
  periodEnd: integer("period_end", { mode: "timestamp" }),
  trialStart: integer("trial_start", { mode: "timestamp" }),
  trialEnd: integer("trial_end", { mode: "timestamp" }),
  cancelAtPeriodEnd: integer("cancel_at_period_end", { mode: "boolean" }).default(false).notNull(),
  seats: integer("seats"), // Validated by CHECK constraint in SQL (seats > 0)
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
}, (_table) => ({
  // Foreign key constraints are now defined in Drizzle schema to match SQL schema
  // stripeSubscriptionIdUnique: unique("stripe_subscription_id_unique").on(table.stripeSubscriptionId), // Now handled by .unique() on column
}));
