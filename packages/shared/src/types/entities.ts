// Core entity types for ClairOS

// ─────────────────────────────────────────────────────────────
// Users & Families (Multi-tenant)
// ─────────────────────────────────────────────────────────────

export interface User {
	id: string;
	email: string;
	name: string;
	avatar?: string;
	createdAt: Date;
}

export interface Family {
	id: string;
	name: string;
	createdAt: Date;
}

export type FamilyRole = 'admin' | 'member' | 'child';

export interface FamilyMember {
	userId: string;
	familyId: string;
	displayName: string;
	color: string;
	role: FamilyRole;
	joinedAt: Date;
}

// ─────────────────────────────────────────────────────────────
// Recipes
// ─────────────────────────────────────────────────────────────

export interface Recipe {
	id: string;
	familyId: string;
	title: string;
	description?: string;
	servings: number;
	prepTimeMinutes?: number;
	cookTimeMinutes?: number;
	instructions: string;
	imageUrl?: string;
	tags: string[];
	createdAt: Date;
	updatedAt: Date;
}

export interface RecipeIngredient {
	id: string;
	recipeId: string;
	name: string;
	quantity: number;
	unit: string;
	notes?: string;
	category?: string;
}

// ─────────────────────────────────────────────────────────────
// Shopping Lists
// ─────────────────────────────────────────────────────────────

export type ShoppingListStatus = 'active' | 'completed' | 'archived';

export interface ShoppingList {
	id: string;
	familyId: string;
	name: string;
	createdById: string;
	status: ShoppingListStatus;
	createdAt: Date;
	completedAt?: Date;
}

export interface ShoppingItem {
	id: string;
	listId: string;
	name: string;
	quantity: number;
	unit?: string;
	category?: string;
	checked: boolean;
	addedById?: string;
	sourceRecipeId?: string;
	notes?: string;
}

// ─────────────────────────────────────────────────────────────
// Tasks & Chores
// ─────────────────────────────────────────────────────────────

export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskStatus = 'pending' | 'in_progress' | 'completed';
export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly';

export interface RecurrenceRule {
	frequency: RecurrenceFrequency;
	interval: number;
	daysOfWeek?: number[];
	endDate?: Date;
}

export interface Task {
	id: string;
	familyId: string;
	title: string;
	description?: string;
	assigneeId?: string;
	createdById: string;
	priority: TaskPriority;
	status: TaskStatus;
	dueDate?: Date;
	recurrence?: RecurrenceRule;
	estimatedMinutes?: number;
	tags: string[];
	createdAt: Date;
	completedAt?: Date;
}

// ─────────────────────────────────────────────────────────────
// Meals
// ─────────────────────────────────────────────────────────────

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface Meal {
	id: string;
	familyId: string;
	recipeId?: string;
	title: string;
	mealType: MealType;
	scheduledFor: Date;
	servings: number;
	notes?: string;
	createdAt: Date;
}

// ─────────────────────────────────────────────────────────────
// Calendar Events
// ─────────────────────────────────────────────────────────────

export type LinkedEntityType = 'meal' | 'task' | 'reminder';

export interface CalendarEvent {
	id: string;
	familyId: string;
	title: string;
	description?: string;
	startTime: Date;
	endTime: Date;
	allDay: boolean;
	memberIds: string[];
	linkedEntityType?: LinkedEntityType;
	linkedEntityId?: string;
	color?: string;
	location?: string;
}

// ─────────────────────────────────────────────────────────────
// Reminders
// ─────────────────────────────────────────────────────────────

export type ReminderSource = 'user' | 'recipe' | 'bill' | 'task';

export interface Reminder {
	id: string;
	familyId: string;
	title: string;
	description?: string;
	remindAt: Date;
	// Ownership tracking
	source: ReminderSource;
	sourceEntityType?: string;
	sourceEntityId?: string;
	// Recurrence
	recurrence?: RecurrenceRule;
	nextOccurrence?: Date;
	// Status
	dismissed: boolean;
	notifiedAt?: Date;
	// Audit
	createdById: string;
	createdAt: Date;
}

export interface ReminderAssignee {
	reminderId: string;
	userId: string;
}

// ─────────────────────────────────────────────────────────────
// Bills / Expenses
// ─────────────────────────────────────────────────────────────

export type BillStatus = 'upcoming' | 'paid' | 'overdue';
export type BillFrequency = 'once' | 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'yearly';

export interface Bill {
	id: string;
	familyId: string;
	name: string;
	description?: string;
	amount: number;
	currency: string;
	dueDate: Date;
	// Recurrence
	frequency: BillFrequency;
	recurrenceEndDate?: Date;
	// Status
	status: BillStatus;
	paidAt?: Date;
	paidById?: string;
	// Reminder integration
	reminderId?: string;
	reminderDaysBefore: number;
	// Audit
	createdById: string;
	createdAt: Date;
	updatedAt: Date;
}

// ─────────────────────────────────────────────────────────────
// Entity Links
// ─────────────────────────────────────────────────────────────

export type EntityType =
	| 'recipe'
	| 'shopping_list'
	| 'shopping_item'
	| 'task'
	| 'event'
	| 'meal'
	| 'reminder';

export type LinkRelationship =
	| 'requires'
	| 'contains'
	| 'scheduled_for'
	| 'assigned_to'
	| 'sourced_from';

export interface EntityLink {
	id: string;
	sourceType: EntityType;
	sourceId: string;
	targetType: EntityType;
	targetId: string;
	relationship: LinkRelationship;
	metadata?: Record<string, unknown>;
	createdAt: Date;
}
