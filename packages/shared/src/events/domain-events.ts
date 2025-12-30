// ClairOS Domain Events
// Strongly typed event envelope pattern for Sidequest.js

import type { Recipe } from '../types/entities.ts';

// ─────────────────────────────────────────────────────────────
// Base Event Envelope
// ─────────────────────────────────────────────────────────────

/** Base envelope that all domain events extend */
export interface EventEnvelope<TType extends string, TPayload> {
  /** Unique event ID */
  id: string;
  /** Discriminant for type-safe handling */
  type: TType;
  /** Family (tenant) this event belongs to */
  familyId: string;
  /** When the event was emitted */
  emittedAt: Date;
  /** User who triggered the event */
  emittedBy: string;
  /** Event-specific payload */
  payload: TPayload;
}

// ─────────────────────────────────────────────────────────────
// Recipe Events
// ─────────────────────────────────────────────────────────────

export type RecipeCreatedEvent = EventEnvelope<
  'recipe.created',
  {
    recipeId: string;
    title: string;
    ingredientCount: number;
  }
>;

export type RecipeUpdatedEvent = EventEnvelope<
  'recipe.updated',
  {
    recipeId: string;
    changes: Partial<Recipe>;
  }
>;

export type RecipeDeletedEvent = EventEnvelope<
  'recipe.deleted',
  {
    recipeId: string;
  }
>;

// ─────────────────────────────────────────────────────────────
// Meal Events
// ─────────────────────────────────────────────────────────────

export type MealScheduledEvent = EventEnvelope<
  'meal.scheduled',
  {
    mealId: string;
    recipeId?: string;
    scheduledFor: Date;
    servings: number;
  }
>;

export type MealCompletedEvent = EventEnvelope<
  'meal.completed',
  {
    mealId: string;
    recipeId?: string;
  }
>;

// ─────────────────────────────────────────────────────────────
// Shopping Events
// ─────────────────────────────────────────────────────────────

export type ShoppingListCreatedEvent = EventEnvelope<
  'shopping_list.created',
  {
    listId: string;
    name: string;
  }
>;

export type ShoppingListCompletedEvent = EventEnvelope<
  'shopping_list.completed',
  {
    listId: string;
    itemCount: number;
  }
>;

export type ShoppingItemCreatedEvent = EventEnvelope<
  'shopping_item.created',
  {
    itemId: string;
    listId: string;
    name: string;
    quantity: number;
    sourceRecipeId?: string;
  }
>;

export type ShoppingItemCheckedEvent = EventEnvelope<
  'shopping_item.checked',
  {
    itemId: string;
    listId: string;
    name: string;
  }
>;

// ─────────────────────────────────────────────────────────────
// Task Events
// ─────────────────────────────────────────────────────────────

export type TaskCreatedEvent = EventEnvelope<
  'task.created',
  {
    taskId: string;
    title: string;
    assigneeId?: string;
    dueDate?: Date;
  }
>;

export type TaskCompletedEvent = EventEnvelope<
  'task.completed',
  {
    taskId: string;
    completedById: string;
  }
>;

export type TaskAssignedEvent = EventEnvelope<
  'task.assigned',
  {
    taskId: string;
    assigneeId: string;
    previousAssigneeId?: string;
  }
>;

// ─────────────────────────────────────────────────────────────
// Reminder Events
// ─────────────────────────────────────────────────────────────

export type ReminderCreatedEvent = EventEnvelope<
  'reminder.created',
  {
    reminderId: string;
    title: string;
    remindAt: Date;
    linkedEntityType?: string;
    linkedEntityId?: string;
  }
>;

export type ReminderDueEvent = EventEnvelope<
  'reminder.due',
  {
    reminderId: string;
    title: string;
    userId: string;
  }
>;

// ─────────────────────────────────────────────────────────────
// Union Type for All Domain Events
// ─────────────────────────────────────────────────────────────

export type DomainEvent =
  // Recipe
  | RecipeCreatedEvent
  | RecipeUpdatedEvent
  | RecipeDeletedEvent
  // Meal
  | MealScheduledEvent
  | MealCompletedEvent
  // Shopping
  | ShoppingListCreatedEvent
  | ShoppingListCompletedEvent
  | ShoppingItemCreatedEvent
  | ShoppingItemCheckedEvent
  // Task
  | TaskCreatedEvent
  | TaskCompletedEvent
  | TaskAssignedEvent
  // Reminder
  | ReminderCreatedEvent
  | ReminderDueEvent;

// ─────────────────────────────────────────────────────────────
// Type Utilities
// ─────────────────────────────────────────────────────────────

/** Extract event type string literals */
export type DomainEventType = DomainEvent['type'];

/** Extract a specific event by its type */
export type EventByType<T extends DomainEventType> = Extract<
  DomainEvent,
  { type: T }
>;

/** Type-safe event handler function */
export type EventHandler<T extends DomainEventType> = (
  event: EventByType<T>
) => Promise<void>;

/** Map of event types to their handlers */
export type EventHandlerMap = {
  [K in DomainEventType]?: EventHandler<K>;
};
