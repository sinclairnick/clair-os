CREATE TABLE "family_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"code" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"created_by_id" text,
	"expires_at" timestamp,
	"max_uses" integer,
	"uses" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "family_invites_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "family_invites" ADD CONSTRAINT "family_invites_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_invites" ADD CONSTRAINT "family_invites_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "family_invites_code_idx" ON "family_invites" USING btree ("code");--> statement-breakpoint
CREATE INDEX "family_invites_family_id_idx" ON "family_invites" USING btree ("family_id");