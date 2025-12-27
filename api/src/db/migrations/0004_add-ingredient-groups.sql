CREATE TABLE "ingredient_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipe_id" uuid NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ADD COLUMN "group_id" uuid;--> statement-breakpoint
ALTER TABLE "ingredient_groups" ADD CONSTRAINT "ingredient_groups_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ingredient_groups_recipe_id_idx" ON "ingredient_groups" USING btree ("recipe_id");--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_group_id_ingredient_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."ingredient_groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "recipe_ingredients_group_id_idx" ON "recipe_ingredients" USING btree ("group_id");