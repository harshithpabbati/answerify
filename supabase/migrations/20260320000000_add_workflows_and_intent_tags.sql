-- Migration: Add workflow table and intent-detection tag support
--
-- Creates the `workflow` table used by the tag-based workflow engine.
-- Each workflow belongs to an organization and stores its trigger condition
-- and ordered list of steps as JSONB so the schema stays flexible as new
-- step types are added over time.
--
-- The `thread.tags` column (text[]) used to persist auto-detected intent
-- tags is already present in the base schema; no column change is needed here.

CREATE TABLE IF NOT EXISTS "public"."workflow" (
    "id"              uuid DEFAULT gen_random_uuid() NOT NULL,
    "organization_id" uuid NOT NULL,
    "name"            text NOT NULL,
    "description"     text,
    "enabled"         boolean DEFAULT true NOT NULL,
    "trigger"         jsonb NOT NULL,
    "steps"           jsonb DEFAULT '[]'::jsonb NOT NULL,
    "created_at"      timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "workflow_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "public"."workflow" OWNER TO "postgres";

ALTER TABLE ONLY "public"."workflow"
    ADD CONSTRAINT "workflow_organization_id_fkey"
    FOREIGN KEY ("organization_id")
    REFERENCES "public"."organization"("id")
    ON UPDATE CASCADE ON DELETE CASCADE;

CREATE INDEX "workflow_organization_id_idx"
    ON "public"."workflow" USING btree ("organization_id");

ALTER TABLE "public"."workflow" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organization members have access to workflows"
    ON "public"."workflow"
    USING (
        "organization_id" IN (
            SELECT "public"."get_user_organizations"(
                ( SELECT "auth"."uid"() AS "uid"), 0
            ) AS "get_user_organizations"
        )
    );

GRANT ALL ON TABLE "public"."workflow" TO "anon";
GRANT ALL ON TABLE "public"."workflow" TO "authenticated";
GRANT ALL ON TABLE "public"."workflow" TO "service_role";
