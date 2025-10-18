import { sqliteTable, text, integer, unique, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  name: text("name"),
  image: text("image"),
  organizationId: text("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  stripeCustomerId: text("stripe_customer_id").unique(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  
  // Profile Information
  bio: text("bio"),
  secondaryPhone: text("secondary_phone"),
  addressStreet: text("address_street"),
  addressCity: text("address_city"),
  addressState: text("address_state"),
  addressZip: text("address_zip"),
  addressCountry: text("address_country"),
  preferredContactMethod: text("preferred_contact_method"),
  
  // App Preferences
  theme: text("theme").default("system"),
  accentColor: text("accent_color").default("default"),
  fontSize: text("font_size").default("medium"),
  language: text("language").default("en"),
  spokenLanguage: text("spoken_language").default("en"),
  country: text("country").default("us"),
  timezone: text("timezone"),
  dateFormat: text("date_format").default("MM/DD/YYYY"),
  timeFormat: text("time_format").default("12-hour"),
  
  // Chat Preferences
  autoSaveConversations: integer("auto_save_conversations", { mode: "boolean" }).default(true),
  typingIndicators: integer("typing_indicators", { mode: "boolean" }).default(true),
  
  // Notification Settings
  notificationResponsesPush: integer("notification_responses_push", { mode: "boolean" }).default(true),
  notificationTasksPush: integer("notification_tasks_push", { mode: "boolean" }).default(true),
  notificationTasksEmail: integer("notification_tasks_email", { mode: "boolean" }).default(true),
  notificationMessagingPush: integer("notification_messaging_push", { mode: "boolean" }).default(true),
  
  // Email Settings
  receiveFeedbackEmails: integer("receive_feedback_emails", { mode: "boolean" }).default(false),
  marketingEmails: integer("marketing_emails", { mode: "boolean" }).default(true),
  securityAlerts: integer("security_alerts", { mode: "boolean" }).default(true),
  
  // Security Settings
  twoFactorEnabled: integer("two_factor_enabled", { mode: "boolean" }).default(false),
  emailNotifications: integer("email_notifications", { mode: "boolean" }).default(true),
  loginAlerts: integer("login_alerts", { mode: "boolean" }).default(true),
  sessionTimeout: text("session_timeout").default("7 days"),
  lastPasswordChange: text("last_password_change"),
  
  // Links
  selectedDomain: text("selected_domain"),
  linkedinUrl: text("linkedin_url"),
  githubUrl: text("github_url"),
  
  // Onboarding
  onboardingCompleted: integer("onboarding_completed", { mode: "boolean" }).default(false),
  onboardingData: text("onboarding_data"), // JSON string
  
  // Better Auth lastLoginMethod plugin
  lastLoginMethod: text("last_login_method"), // "google", "email", "credential", etc.
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
});

export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
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

export const verifications = sqliteTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

// Organization plugin tables
export const organizations = sqliteTable("organizations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  stripeCustomerId: text("stripe_customer_id").unique(),
  subscriptionTier: text("subscription_tier", { enum: ["free", "plus", "business", "enterprise"] }).default("free"),
  seats: integer("seats").default(1),
  isPersonal: integer("is_personal", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
}, (_table) => ({
  // Check constraint for seats > 0 (enforced at DB level in schema.sql)
  // seatsPositive: check("seats_positive", sql`${table.seats} > 0`), // SQLite doesn't support named check constraints in Drizzle
}));

export const members = sqliteTable("members", {
  id: text("id").primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
}, (table) => ({
  uniqueOrgUser: unique("unique_org_user").on(table.organizationId, table.userId),
  memberOrgIdx: index("member_org_idx").on(table.organizationId),
  memberUserIdx: index("member_user_idx").on(table.userId),
}));

export const subscriptions = sqliteTable("subscriptions", {
  id: text("id").primaryKey(),
  plan: text("plan").notNull(),
  referenceId: text("reference_id").notNull().references(() => organizations.id, { onDelete: "cascade" }), // References organizations.id for organization-level subscriptions
  stripeSubscriptionId: text("stripe_subscription_id").unique(),
  stripeCustomerId: text("stripe_customer_id"),
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
