CREATE TABLE "bills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"amount" double precision NOT NULL,
	"currency" text DEFAULT 'NZD' NOT NULL,
	"due_date" timestamp NOT NULL,
	"frequency" text DEFAULT 'once' NOT NULL,
	"recurrence_end_date" timestamp,
	"status" text DEFAULT 'upcoming' NOT NULL,
	"paid_at" timestamp,
	"paid_by_id" text,
	"reminder_id" uuid,
	"reminder_days_before" integer DEFAULT 3 NOT NULL,
	"created_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reminder_assignees" (
	"reminder_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	CONSTRAINT "reminder_assignees_reminder_id_user_id_pk" PRIMARY KEY("reminder_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "reminders" ADD COLUMN "source" text DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE "reminders" ADD COLUMN "source_entity_type" text;--> statement-breakpoint
ALTER TABLE "reminders" ADD COLUMN "source_entity_id" uuid;--> statement-breakpoint
ALTER TABLE "reminders" ADD COLUMN "recurrence" jsonb;--> statement-breakpoint
ALTER TABLE "reminders" ADD COLUMN "next_occurrence" timestamp;--> statement-breakpoint
ALTER TABLE "reminders" ADD COLUMN "notified_at" timestamp;--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_paid_by_id_users_id_fk" FOREIGN KEY ("paid_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_reminder_id_reminders_id_fk" FOREIGN KEY ("reminder_id") REFERENCES "public"."reminders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminder_assignees" ADD CONSTRAINT "reminder_assignees_reminder_id_reminders_id_fk" FOREIGN KEY ("reminder_id") REFERENCES "public"."reminders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminder_assignees" ADD CONSTRAINT "reminder_assignees_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bills_family_id_idx" ON "bills" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "bills_due_date_idx" ON "bills" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "bills_status_idx" ON "bills" USING btree ("status");--> statement-breakpoint
CREATE INDEX "reminders_source_entity_idx" ON "reminders" USING btree ("source_entity_type","source_entity_id");--> statement-breakpoint
ALTER TABLE "reminders" DROP COLUMN "linked_entity_type";--> statement-breakpoint
ALTER TABLE "reminders" DROP COLUMN "linked_entity_id";