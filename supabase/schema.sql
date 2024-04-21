
SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "pgsodium" WITH SCHEMA "pgsodium";

COMMENT ON SCHEMA "public" IS 'standard public schema';

CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";

CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "extensions";

CREATE OR REPLACE FUNCTION "public"."get_organization_owner"("organization_id" "uuid") RETURNS SETOF "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $_$ select created_by from organization where id = $1 $_$;

ALTER FUNCTION "public"."get_organization_owner"("organization_id" "uuid") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."get_user_organizations"("user_id" "uuid", "role" integer) RETURNS SETOF "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $_$
  select organization_id from member where user_id = $1 AND role >= $2 
$_$;

ALTER FUNCTION "public"."get_user_organizations"("user_id" "uuid", "role" integer) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";

CREATE TABLE IF NOT EXISTS "public"."section" (
    "datasource_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "embedding" "extensions"."vector"(1536),
    "organization_id" "uuid" NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);

ALTER TABLE "public"."section" OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."match_sections"("embedding" "extensions"."vector", "match_threshold" double precision, "organization_id" "uuid") RETURNS SETOF "public"."section"
    LANGUAGE "plpgsql"
    AS $$
#variable_conflict use_variable
begin
  return query
  select *
  from section
  where section.embedding <#> embedding < -match_threshold
  and section.organization_id = organization_id
	order by section.embedding <#> embedding;
end;
$$;

ALTER FUNCTION "public"."match_sections"("embedding" "extensions"."vector", "match_threshold" double precision, "organization_id" "uuid") OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."datasource" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "organization_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "url" "text" NOT NULL,
    "content" "text",
    "metadata" "jsonb"
);

ALTER TABLE "public"."datasource" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."email" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "thread_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email_from" "text" NOT NULL,
    "email_from_name" "text" NOT NULL,
    "email_cc" "text"[],
    "email_bcc" "text"[],
    "body" "text" NOT NULL,
    "cleaned_body" "text",
    "is_perfect" boolean,
    "role" "text" DEFAULT 'user'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "organization_id" "uuid" NOT NULL
);

ALTER TABLE "public"."email" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."member" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "role" smallint DEFAULT '0'::smallint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE "public"."member" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."organization" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid" NOT NULL,
    "support_email" "text" NOT NULL,
    "inbound_email" "text" NOT NULL,
    "onboarding" "jsonb" DEFAULT '{"step": 2, "hasOnboarded": false}'::"jsonb" NOT NULL
);

ALTER TABLE "public"."organization" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."reply" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "thread_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "content" "text" NOT NULL,
    "is_perfect" boolean,
    "organization_id" "uuid" NOT NULL
);

ALTER TABLE "public"."reply" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."thread" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email_from" "text" NOT NULL,
    "email_from_name" "text" NOT NULL,
    "subject" "text" NOT NULL,
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "tags" "text"[],
    "last_message_created_at" timestamp with time zone DEFAULT ("now"() AT TIME ZONE 'utc'::"text") NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "message_id" "text" NOT NULL
);

ALTER TABLE "public"."thread" OWNER TO "postgres";

ALTER TABLE ONLY "public"."datasource"
    ADD CONSTRAINT "datasource_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."email"
    ADD CONSTRAINT "email_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."member"
    ADD CONSTRAINT "member_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."organization"
    ADD CONSTRAINT "organization_inbound_email_key" UNIQUE ("inbound_email");

ALTER TABLE ONLY "public"."organization"
    ADD CONSTRAINT "organization_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."organization"
    ADD CONSTRAINT "organization_slug_key" UNIQUE ("slug");

ALTER TABLE ONLY "public"."reply"
    ADD CONSTRAINT "reply_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."section"
    ADD CONSTRAINT "section_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."thread"
    ADD CONSTRAINT "thread_pkey" PRIMARY KEY ("id");

CREATE INDEX "email_thread_id_idx" ON "public"."email" USING "btree" ("thread_id");

CREATE INDEX "member_organization_id_user_id_idx" ON "public"."member" USING "btree" ("organization_id", "user_id");

CREATE INDEX "organization_inbound_email_idx" ON "public"."organization" USING "btree" ("inbound_email");

CREATE INDEX "section_embedding_idx" ON "public"."section" USING "hnsw" ("embedding" "extensions"."vector_ip_ops");

CREATE INDEX "thread_organization_id_created_at_message_id_idx" ON "public"."thread" USING "btree" ("organization_id", "created_at", "message_id");

CREATE INDEX "thread_status_idx" ON "public"."thread" USING "btree" ("status");

CREATE OR REPLACE TRIGGER "generate_reply" AFTER INSERT ON "public"."email" FOR EACH ROW EXECUTE FUNCTION "supabase_functions"."http_request"('https://answerify.app/api/webhooks/reply', 'POST', '{"Content-type":"application/json"}', '{}', '5000');

CREATE OR REPLACE TRIGGER "scrape_datasource" AFTER INSERT ON "public"."datasource" FOR EACH ROW EXECUTE FUNCTION "supabase_functions"."http_request"('https://answerify.app/api/webhooks/data-source', 'POST', '{"Content-type":"application/json"}', '{}', '5000');

ALTER TABLE ONLY "public"."datasource"
    ADD CONSTRAINT "public_datasource_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."email"
    ADD CONSTRAINT "public_email_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."email"
    ADD CONSTRAINT "public_email_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "public"."thread"("id") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."member"
    ADD CONSTRAINT "public_member_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."member"
    ADD CONSTRAINT "public_member_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");

ALTER TABLE ONLY "public"."organization"
    ADD CONSTRAINT "public_organization_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");

ALTER TABLE ONLY "public"."reply"
    ADD CONSTRAINT "public_reply_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."reply"
    ADD CONSTRAINT "public_reply_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "public"."thread"("id") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."section"
    ADD CONSTRAINT "public_section_datasource_id_fkey" FOREIGN KEY ("datasource_id") REFERENCES "public"."datasource"("id") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."section"
    ADD CONSTRAINT "public_section_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."thread"
    ADD CONSTRAINT "public_thread_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON UPDATE CASCADE ON DELETE CASCADE;

CREATE POLICY "Access for organization members" ON "public"."email" USING ((( SELECT "auth"."uid"() AS "uid") IN ( SELECT "member"."user_id"
   FROM "public"."member"
  WHERE ("member"."organization_id" = "member"."organization_id"))));

CREATE POLICY "Access to team members" ON "public"."thread" USING ((( SELECT "auth"."uid"() AS "uid") IN ( SELECT "member"."user_id"
   FROM "public"."member"
  WHERE ("member"."organization_id" = "member"."organization_id"))));

CREATE POLICY "Allow delete organization." ON "public"."organization" FOR DELETE USING ((("created_by" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."member"
  WHERE (("member"."organization_id" = "organization"."id") AND ("member"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("member"."role" = 2))))));

CREATE POLICY "Allow select organization" ON "public"."organization" FOR SELECT USING ((("created_by" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."member"
  WHERE (("member"."organization_id" = "organization"."id") AND ("member"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));

CREATE POLICY "Allow to create organization" ON "public"."organization" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "created_by"));

CREATE POLICY "Allow to update based on created_by or member." ON "public"."organization" FOR UPDATE USING ((("created_by" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."member"
  WHERE (("member"."organization_id" = "member"."id") AND ("member"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))))) WITH CHECK ((("created_by" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."member"
  WHERE (("member"."organization_id" = "member"."id") AND ("member"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));

CREATE POLICY "Enable access for organization members" ON "public"."reply" FOR SELECT USING (("organization_id" IN ( SELECT "public"."get_user_organizations"(( SELECT "auth"."uid"() AS "uid"), 0) AS "get_user_organizations")));

CREATE POLICY "Members can view their organization" ON "public"."member" FOR SELECT USING (("organization_id" IN ( SELECT "public"."get_user_organizations"("auth"."uid"(), 0) AS "get_user_organizations")));

CREATE POLICY "Organization members can invite members" ON "public"."member" FOR INSERT WITH CHECK ((("organization_id" IN ( SELECT "public"."get_user_organizations"(( SELECT "auth"."uid"() AS "uid"), 1) AS "get_user_organizations")) OR (( SELECT "auth"."uid"() AS "uid") IN ( SELECT "public"."get_organization_owner"("member"."organization_id") AS "get_organization_owner"))));

CREATE POLICY "Organization members have access to datasources" ON "public"."datasource" USING (("organization_id" IN ( SELECT "public"."get_user_organizations"(( SELECT "auth"."uid"() AS "uid"), 0) AS "get_user_organizations")));

CREATE POLICY "Organization owners can remove member" ON "public"."member" FOR DELETE USING (("organization_id" IN ( SELECT "public"."get_user_organizations"(( SELECT "auth"."uid"() AS "uid"), 2) AS "get_user_organizations")));

CREATE POLICY "Organization owners can update member" ON "public"."member" FOR UPDATE USING (("organization_id" IN ( SELECT "public"."get_user_organizations"(( SELECT "auth"."uid"() AS "uid"), 2) AS "get_user_organizations")));

ALTER TABLE "public"."datasource" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."email" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."member" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."organization" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."reply" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."section" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."thread" ENABLE ROW LEVEL SECURITY;

ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";

ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."thread";

GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

GRANT ALL ON FUNCTION "public"."get_organization_owner"("organization_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_organization_owner"("organization_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_organization_owner"("organization_id" "uuid") TO "service_role";

GRANT ALL ON FUNCTION "public"."get_user_organizations"("user_id" "uuid", "role" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_organizations"("user_id" "uuid", "role" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_organizations"("user_id" "uuid", "role" integer) TO "service_role";

GRANT ALL ON TABLE "public"."section" TO "anon";
GRANT ALL ON TABLE "public"."section" TO "authenticated";
GRANT ALL ON TABLE "public"."section" TO "service_role";

GRANT ALL ON TABLE "public"."datasource" TO "anon";
GRANT ALL ON TABLE "public"."datasource" TO "authenticated";
GRANT ALL ON TABLE "public"."datasource" TO "service_role";

GRANT ALL ON TABLE "public"."email" TO "anon";
GRANT ALL ON TABLE "public"."email" TO "authenticated";
GRANT ALL ON TABLE "public"."email" TO "service_role";

GRANT ALL ON TABLE "public"."member" TO "anon";
GRANT ALL ON TABLE "public"."member" TO "authenticated";
GRANT ALL ON TABLE "public"."member" TO "service_role";

GRANT ALL ON TABLE "public"."organization" TO "anon";
GRANT ALL ON TABLE "public"."organization" TO "authenticated";
GRANT ALL ON TABLE "public"."organization" TO "service_role";

GRANT ALL ON TABLE "public"."reply" TO "anon";
GRANT ALL ON TABLE "public"."reply" TO "authenticated";
GRANT ALL ON TABLE "public"."reply" TO "service_role";

GRANT ALL ON TABLE "public"."thread" TO "anon";
GRANT ALL ON TABLE "public"."thread" TO "authenticated";
GRANT ALL ON TABLE "public"."thread" TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";

RESET ALL;
