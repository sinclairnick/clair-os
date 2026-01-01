CREATE TABLE "user_favorite_recipes" (
	"user_id" text NOT NULL,
	"recipe_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_favorite_recipes_user_id_recipe_id_pk" PRIMARY KEY("user_id","recipe_id")
);
--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "is_signature" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_favorite_recipes" ADD CONSTRAINT "user_favorite_recipes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_favorite_recipes" ADD CONSTRAINT "user_favorite_recipes_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_favorite_recipes_user_id_idx" ON "user_favorite_recipes" USING btree ("user_id");