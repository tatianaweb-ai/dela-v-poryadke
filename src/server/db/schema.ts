import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Временные метки хранятся как строки (mode: "string"), чтобы отдавать их в клиент
 * в том же виде, в котором их ждёт текущий код — `createdAt: string`.
 */
const createdAt = () =>
  timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow();

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Всегда в нижнем регистре: нормализует слой приложения, чтобы не плодить дубли. */
    email: text("email").notNull(),
    /** Необязателен: пока не задан, имя показывается из локальной части адреса. */
    name: text("name"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("users_email_key").on(t.email)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** В базе лежит только SHA-256, сам токен уходит в cookie и больше нигде не хранится. */
    tokenHash: text("token_hash").notNull(),
    createdAt: createdAt(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true, mode: "string" }),
    userAgent: text("user_agent"),
    ip: text("ip"),
  },
  (t) => [
    uniqueIndex("sessions_token_hash_key").on(t.tokenHash),
    index("sessions_user_id_idx").on(t.userId),
  ],
);

export const loginTokens = pgTable(
  "login_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    tokenHash: text("token_hash").notNull(),
    createdAt: createdAt(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" }).notNull(),
    /** Одноразовость: при расходовании токена проставляем время и больше не принимаем. */
    usedAt: timestamp("used_at", { withTimezone: true, mode: "string" }),
    ip: text("ip"),
  },
  (t) => [
    uniqueIndex("login_tokens_token_hash_key").on(t.tokenHash),
    index("login_tokens_email_idx").on(t.email),
  ],
);

/**
 * Журнал попыток входа. Живёт отдельно от login_tokens намеренно: токены мы
 * инвалидируем при повторном запросе, и счётчик лимита, читающий те же строки,
 * всегда видел бы пустоту. Здесь только append-only записи, старые чистим по сроку.
 */
export const loginAttempts = pgTable(
  "login_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    ip: text("ip"),
    createdAt: createdAt(),
  },
  (t) => [
    index("login_attempts_email_idx").on(t.email),
    index("login_attempts_ip_idx").on(t.ip),
    index("login_attempts_created_at_idx").on(t.createdAt),
  ],
);

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("projects_user_id_idx").on(t.userId)],
);

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Каскадное удаление повторяет прежнее поведение: удалили проект — ушли и его задачи. */
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    deadline: date("deadline", { mode: "string" }),
    done: boolean("done").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    completedAt: timestamp("completed_at", { withTimezone: true, mode: "string" }),
  },
  (t) => [
    index("tasks_user_id_idx").on(t.userId),
    index("tasks_project_id_idx").on(t.projectId),
  ],
);

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  projects: many(projects),
  tasks: many(tasks),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, { fields: [projects.userId], references: [users.id] }),
  tasks: many(tasks),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  user: one(users, { fields: [tasks.userId], references: [users.id] }),
  project: one(projects, { fields: [tasks.projectId], references: [projects.id] }),
}));

export type UserRow = typeof users.$inferSelect;
export type ProjectRow = typeof projects.$inferSelect;
export type TaskRow = typeof tasks.$inferSelect;
export type SessionRow = typeof sessions.$inferSelect;
export type LoginTokenRow = typeof loginTokens.$inferSelect;
