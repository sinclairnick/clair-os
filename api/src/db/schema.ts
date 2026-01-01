import {
	pgTable,
	text,
	timestamp,
	boolean,
	integer,
	doublePrecision,
	jsonb,
	primaryKey,
	index,
	uuid
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ─────────────────────────────────────────────────────────────
// Users (BetterAuth manages these, but we define the schema)
// ─────────────────────────────────────────────────────────────

export const users = pgTable('users', {
	id: text('id').primaryKey(),
	email: text('email').notNull().unique(),
	name: text('name').notNull(),
	emailVerified: boolean('email_verified').notNull().default(false),
	image: text('image'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const sessions = pgTable('sessions', {
	id: text('id').primaryKey(),
	userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
	token: text('token').notNull().unique(),
	expiresAt: timestamp('expires_at').notNull(),
	ipAddress: text('ip_address'),
	userAgent: text('user_agent'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const accounts = pgTable('accounts', {
	id: text('id').primaryKey(),
	userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
	accountId: text('account_id').notNull(),
	providerId: text('provider_id').notNull(),
	accessToken: text('access_token'),
	refreshToken: text('refresh_token'),
	accessTokenExpiresAt: timestamp('access_token_expires_at'),
	refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
	scope: text('scope'),
	idToken: text('id_token'),
	password: text('password'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const verifications = pgTable('verifications', {
	id: text('id').primaryKey(),
	identifier: text('identifier').notNull(),
	value: text('value').notNull(),
	expiresAt: timestamp('expires_at').notNull(),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ─────────────────────────────────────────────────────────────
// Families (Tenants)
// ─────────────────────────────────────────────────────────────

export const families = pgTable('families', {
	id: uuid('id').primaryKey().defaultRandom(),
	name: text('name').notNull(),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const familyMembers = pgTable('family_members', {
	userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
	familyId: uuid('family_id').notNull().references(() => families.id, { onDelete: 'cascade' }),
	displayName: text('display_name').notNull(),
	color: text('color').notNull().default('#d4a574'),
	role: text('role').notNull().default('member'), // 'admin' | 'member' | 'child'
	joinedAt: timestamp('joined_at').notNull().defaultNow(),
}, (table) => [
	primaryKey({ columns: [table.userId, table.familyId] }),
]);

// Family invite links
export const familyInvites = pgTable('family_invites', {
	id: uuid('id').primaryKey().defaultRandom(),
	familyId: uuid('family_id').notNull().references(() => families.id, { onDelete: 'cascade' }),
	code: text('code').notNull().unique(),
	role: text('role').notNull().default('member'), // role the invitee will receive
	createdById: text('created_by_id').references(() => users.id),
	expiresAt: timestamp('expires_at'),
	maxUses: integer('max_uses'),
	uses: integer('uses').notNull().default(0),
	createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
	index('family_invites_code_idx').on(table.code),
	index('family_invites_family_id_idx').on(table.familyId),
]);

// ─────────────────────────────────────────────────────────────
// Recipes
// ─────────────────────────────────────────────────────────────

export const recipes = pgTable('recipes', {
	id: uuid('id').primaryKey().defaultRandom(),
	familyId: uuid('family_id').notNull().references(() => families.id, { onDelete: 'cascade' }),
	title: text('title').notNull(),
	description: text('description'),
	servings: integer('servings').notNull().default(4),
	yield: text('yield'),
	prepTimeMinutes: integer('prep_time_minutes'),
	cookTimeMinutes: integer('cook_time_minutes'),
	instructions: text('instructions').notNull().default(''),
	imageUrl: text('image_url'),
	tags: jsonb('tags').notNull().default([]),
	createdById: text('created_by_id').references(() => users.id),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
	index('recipes_family_id_idx').on(table.familyId),
]);

// Ingredient groups/sections within a recipe (e.g., "For the dough", "For the filling")
export const ingredientGroups = pgTable('ingredient_groups', {
	id: uuid('id').primaryKey().defaultRandom(),
	recipeId: uuid('recipe_id').notNull().references(() => recipes.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	sortOrder: integer('sort_order').notNull().default(0),
}, (table) => [
	index('ingredient_groups_recipe_id_idx').on(table.recipeId),
]);

export const recipeIngredients = pgTable('recipe_ingredients', {
	id: uuid('id').primaryKey().defaultRandom(),
	recipeId: uuid('recipe_id').notNull().references(() => recipes.id, { onDelete: 'cascade' }),
	groupId: uuid('group_id').references(() => ingredientGroups.id, { onDelete: 'set null' }),
	name: text('name').notNull(),
	quantity: doublePrecision('quantity').notNull().default(1),
	unit: text('unit').notNull().default(''),
	notes: text('notes'),
	category: text('category'),
	sortOrder: integer('sort_order').notNull().default(0),
}, (table) => [
	index('recipe_ingredients_recipe_id_idx').on(table.recipeId),
	index('recipe_ingredients_group_id_idx').on(table.groupId),
]);

// ─────────────────────────────────────────────────────────────
// Shopping Lists
// ─────────────────────────────────────────────────────────────

export const shoppingLists = pgTable('shopping_lists', {
	id: uuid('id').primaryKey().defaultRandom(),
	familyId: uuid('family_id').notNull().references(() => families.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	status: text('status').notNull().default('active'), // 'active' | 'completed' | 'archived'
	notes: text('notes'),
	createdById: text('created_by_id').references(() => users.id),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	completedAt: timestamp('completed_at'),
}, (table) => [
	index('shopping_lists_family_id_idx').on(table.familyId),
	index('shopping_lists_status_idx').on(table.status),
]);

export const shoppingItems = pgTable('shopping_items', {
	id: uuid('id').primaryKey().defaultRandom(),
	listId: uuid('list_id').notNull().references(() => shoppingLists.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	quantity: doublePrecision('quantity').notNull().default(1),
	unit: text('unit'),
	category: text('category'),
	checked: boolean('checked').notNull().default(false),
	addedById: text('added_by_id').references(() => users.id),
	sourceRecipeId: uuid('source_recipe_id').references(() => recipes.id, { onDelete: 'set null' }),
	notes: text('notes'),
	sortOrder: integer('sort_order').notNull().default(0),
}, (table) => [
	index('shopping_items_list_id_idx').on(table.listId),
	index('shopping_items_checked_idx').on(table.checked),
]);

// ─────────────────────────────────────────────────────────────
// Tasks & Chores
// ─────────────────────────────────────────────────────────────

export const tasks = pgTable('tasks', {
	id: uuid('id').primaryKey().defaultRandom(),
	familyId: uuid('family_id').notNull().references(() => families.id, { onDelete: 'cascade' }),
	title: text('title').notNull(),
	description: text('description'),
	assigneeId: text('assignee_id').references(() => users.id, { onDelete: 'set null' }),
	createdById: text('created_by_id').references(() => users.id),
	priority: text('priority').notNull().default('medium'), // 'low' | 'medium' | 'high'
	status: text('status').notNull().default('pending'), // 'pending' | 'in_progress' | 'completed'
	dueDate: timestamp('due_date'),
	recurrence: jsonb('recurrence'), // RecurrenceRule object
	estimatedMinutes: integer('estimated_minutes'),
	tags: jsonb('tags').notNull().default([]),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	completedAt: timestamp('completed_at'),
}, (table) => [
	index('tasks_family_id_idx').on(table.familyId),
	index('tasks_assignee_id_idx').on(table.assigneeId),
	index('tasks_status_idx').on(table.status),
	index('tasks_due_date_idx').on(table.dueDate),
]);

// ─────────────────────────────────────────────────────────────
// Meals
// ─────────────────────────────────────────────────────────────

export const meals = pgTable('meals', {
	id: uuid('id').primaryKey().defaultRandom(),
	familyId: uuid('family_id').notNull().references(() => families.id, { onDelete: 'cascade' }),
	recipeId: uuid('recipe_id').references(() => recipes.id, { onDelete: 'set null' }),
	title: text('title').notNull(),
	mealType: text('meal_type').notNull().default('dinner'), // 'breakfast' | 'lunch' | 'dinner' | 'snack'
	scheduledFor: timestamp('scheduled_for').notNull(),
	servings: integer('servings').notNull().default(4),
	notes: text('notes'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
	index('meals_family_id_idx').on(table.familyId),
	index('meals_scheduled_for_idx').on(table.scheduledFor),
]);

// ─────────────────────────────────────────────────────────────
// Calendar Events
// ─────────────────────────────────────────────────────────────

export const calendarEvents = pgTable('calendar_events', {
	id: uuid('id').primaryKey().defaultRandom(),
	familyId: uuid('family_id').notNull().references(() => families.id, { onDelete: 'cascade' }),
	title: text('title').notNull(),
	description: text('description'),
	startTime: timestamp('start_time').notNull(),
	endTime: timestamp('end_time').notNull(),
	allDay: boolean('all_day').notNull().default(false),
	memberIds: jsonb('member_ids').notNull().default([]),
	linkedEntityType: text('linked_entity_type'), // 'meal' | 'task' | 'reminder'
	linkedEntityId: uuid('linked_entity_id'),
	color: text('color'),
	location: text('location'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
	index('calendar_events_family_id_idx').on(table.familyId),
	index('calendar_events_start_time_idx').on(table.startTime),
]);

// ─────────────────────────────────────────────────────────────
// Reminders
// ─────────────────────────────────────────────────────────────

export const reminders = pgTable('reminders', {
	id: uuid('id').primaryKey().defaultRandom(),
	familyId: uuid('family_id').notNull().references(() => families.id, { onDelete: 'cascade' }),
	title: text('title').notNull(),
	description: text('description'),
	remindAt: timestamp('remind_at').notNull(),
	// Ownership - 'user' means standalone, others are resource-owned
	source: text('source').notNull().default('user'), // 'user' | 'recipe' | 'bill' | 'task'
	sourceEntityType: text('source_entity_type'),
	sourceEntityId: uuid('source_entity_id'),
	// Recurrence
	recurrence: jsonb('recurrence'), // RecurrenceRule object
	nextOccurrence: timestamp('next_occurrence'),
	// Status
	dismissed: boolean('dismissed').notNull().default(false),
	notifiedAt: timestamp('notified_at'),
	// Audit
	createdById: text('created_by_id').references(() => users.id),
	createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
	index('reminders_family_id_idx').on(table.familyId),
	index('reminders_remind_at_idx').on(table.remindAt),
	index('reminders_dismissed_idx').on(table.dismissed),
	index('reminders_source_entity_idx').on(table.sourceEntityType, table.sourceEntityId),
]);

// Junction table for reminder assignees (who gets notified)
export const reminderAssignees = pgTable('reminder_assignees', {
	reminderId: uuid('reminder_id').notNull().references(() => reminders.id, { onDelete: 'cascade' }),
	userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
}, (table) => [
	primaryKey({ columns: [table.reminderId, table.userId] }),
]);

// ─────────────────────────────────────────────────────────────
// Bills / Expenses
// ─────────────────────────────────────────────────────────────

export const bills = pgTable('bills', {
	id: uuid('id').primaryKey().defaultRandom(),
	familyId: uuid('family_id').notNull().references(() => families.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	description: text('description'),
	amount: doublePrecision('amount').notNull(),
	currency: text('currency').notNull().default('NZD'),
	dueDate: timestamp('due_date').notNull(),
	frequency: text('frequency').notNull().default('once'), // 'once' | 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'yearly'
	recurrenceEndDate: timestamp('recurrence_end_date'),
	status: text('status').notNull().default('upcoming'), // 'upcoming' | 'paid' | 'overdue'
	paidAt: timestamp('paid_at'),
	paidById: text('paid_by_id').references(() => users.id),
	reminderId: uuid('reminder_id').references(() => reminders.id, { onDelete: 'set null' }),
	reminderDaysBefore: integer('reminder_days_before').notNull().default(3),
	createdById: text('created_by_id').references(() => users.id),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
	index('bills_family_id_idx').on(table.familyId),
	index('bills_due_date_idx').on(table.dueDate),
	index('bills_status_idx').on(table.status),
]);

// ─────────────────────────────────────────────────────────────
// Push Notifications
// ─────────────────────────────────────────────────────────────

export const pushSubscriptions = pgTable('push_subscriptions', {
	id: uuid('id').primaryKey().defaultRandom(),
	userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
	endpoint: text('endpoint').notNull().unique(),
	p256dh: text('p256dh').notNull(),
	auth: text('auth').notNull(),
	userAgent: text('user_agent'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
	index('push_subscriptions_user_id_idx').on(table.userId),
]);

// ─────────────────────────────────────────────────────────────
// Entity Links (for cross-referencing)
// ─────────────────────────────────────────────────────────────

export const entityLinks = pgTable('entity_links', {
	id: uuid('id').primaryKey().defaultRandom(),
	sourceType: text('source_type').notNull(),
	sourceId: uuid('source_id').notNull(),
	targetType: text('target_type').notNull(),
	targetId: uuid('target_id').notNull(),
	relationship: text('relationship').notNull(),
	metadata: jsonb('metadata'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
	index('entity_links_source_idx').on(table.sourceType, table.sourceId),
	index('entity_links_target_idx').on(table.targetType, table.targetId),
]);

// ─────────────────────────────────────────────────────────────
// Relations
// ─────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
	sessions: many(sessions),
	accounts: many(accounts),
	familyMemberships: many(familyMembers),
	pushSubscriptions: many(pushSubscriptions),
}));

export const familiesRelations = relations(families, ({ many }) => ({
	members: many(familyMembers),
	invites: many(familyInvites),
	recipes: many(recipes),
	shoppingLists: many(shoppingLists),
	tasks: many(tasks),
	meals: many(meals),
	calendarEvents: many(calendarEvents),
	reminders: many(reminders),
	bills: many(bills),
}));

export const familyInvitesRelations = relations(familyInvites, ({ one }) => ({
	family: one(families, {
		fields: [familyInvites.familyId],
		references: [families.id],
	}),
	createdBy: one(users, {
		fields: [familyInvites.createdById],
		references: [users.id],
	}),
}));

export const familyMembersRelations = relations(familyMembers, ({ one }) => ({
	user: one(users, {
		fields: [familyMembers.userId],
		references: [users.id],
	}),
	family: one(families, {
		fields: [familyMembers.familyId],
		references: [families.id],
	}),
}));

export const recipesRelations = relations(recipes, ({ one, many }) => ({
	family: one(families, {
		fields: [recipes.familyId],
		references: [families.id],
	}),
	createdBy: one(users, {
		fields: [recipes.createdById],
		references: [users.id],
	}),
	ingredientGroups: many(ingredientGroups),
	ingredients: many(recipeIngredients),
	meals: many(meals),
}));

export const ingredientGroupsRelations = relations(ingredientGroups, ({ one, many }) => ({
	recipe: one(recipes, {
		fields: [ingredientGroups.recipeId],
		references: [recipes.id],
	}),
	ingredients: many(recipeIngredients),
}));

export const recipeIngredientsRelations = relations(recipeIngredients, ({ one }) => ({
	recipe: one(recipes, {
		fields: [recipeIngredients.recipeId],
		references: [recipes.id],
	}),
	group: one(ingredientGroups, {
		fields: [recipeIngredients.groupId],
		references: [ingredientGroups.id],
	}),
}));

export const shoppingListsRelations = relations(shoppingLists, ({ one, many }) => ({
	family: one(families, {
		fields: [shoppingLists.familyId],
		references: [families.id],
	}),
	createdBy: one(users, {
		fields: [shoppingLists.createdById],
		references: [users.id],
	}),
	items: many(shoppingItems),
}));

export const shoppingItemsRelations = relations(shoppingItems, ({ one }) => ({
	list: one(shoppingLists, {
		fields: [shoppingItems.listId],
		references: [shoppingLists.id],
	}),
	addedBy: one(users, {
		fields: [shoppingItems.addedById],
		references: [users.id],
	}),
	sourceRecipe: one(recipes, {
		fields: [shoppingItems.sourceRecipeId],
		references: [recipes.id],
	}),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
	family: one(families, {
		fields: [tasks.familyId],
		references: [families.id],
	}),
	assignee: one(users, {
		fields: [tasks.assigneeId],
		references: [users.id],
	}),
	createdBy: one(users, {
		fields: [tasks.createdById],
		references: [users.id],
	}),
}));

export const mealsRelations = relations(meals, ({ one }) => ({
	family: one(families, {
		fields: [meals.familyId],
		references: [families.id],
	}),
	recipe: one(recipes, {
		fields: [meals.recipeId],
		references: [recipes.id],
	}),
}));

export const pushSubscriptionsRelations = relations(pushSubscriptions, ({ one }) => ({
	user: one(users, {
		fields: [pushSubscriptions.userId],
		references: [users.id],
	}),
}));

export const remindersRelations = relations(reminders, ({ one, many }) => ({
	family: one(families, {
		fields: [reminders.familyId],
		references: [families.id],
	}),
	createdBy: one(users, {
		fields: [reminders.createdById],
		references: [users.id],
	}),
	assignees: many(reminderAssignees),
}));

export const reminderAssigneesRelations = relations(reminderAssignees, ({ one }) => ({
	reminder: one(reminders, {
		fields: [reminderAssignees.reminderId],
		references: [reminders.id],
	}),
	user: one(users, {
		fields: [reminderAssignees.userId],
		references: [users.id],
	}),
}));

export const billsRelations = relations(bills, ({ one }) => ({
	family: one(families, {
		fields: [bills.familyId],
		references: [families.id],
	}),
	createdBy: one(users, {
		fields: [bills.createdById],
		references: [users.id],
	}),
	paidBy: one(users, {
		fields: [bills.paidById],
		references: [users.id],
	}),
	reminder: one(reminders, {
		fields: [bills.reminderId],
		references: [reminders.id],
	}),
}));
