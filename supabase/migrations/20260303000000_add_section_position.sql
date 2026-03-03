-- Migration: Add position column to section table for context-window expansion
--
-- When a section is matched via vector similarity, the application can now fetch
-- the sections immediately before and after it (by position) from the same
-- datasource. This gives the LLM more surrounding context and improves answer
-- quality when relevant information is split across adjacent chunks.
--
-- Changes:
--   1. Add `position` integer column to `section` (order within the datasource)
--   2. Add a composite index on (datasource_id, position) for efficient neighbor lookups
--   3. Update `match_sections` RPC to return `position` and `heading` so the
--      application knows where each matched section sits relative to its neighbors

-- 1. Add position column
ALTER TABLE "public"."section"
    ADD COLUMN IF NOT EXISTS "position" integer NOT NULL DEFAULT 0;

-- 2. Composite index for neighbor lookups (datasource_id, position)
CREATE INDEX IF NOT EXISTS section_datasource_position_idx
    ON public.section (datasource_id, position);

-- 3. Update match_sections to also return position and heading
CREATE OR REPLACE FUNCTION "public"."match_sections"(
    "embedding"          extensions.vector,
    "match_threshold"    double precision,
    "p_organization_id"  uuid,
    "match_count"        integer DEFAULT 5
)
RETURNS TABLE (
    "id"              uuid,
    "datasource_id"   uuid,
    "organization_id" uuid,
    "content"         text,
    "heading"         text,
    "position"        integer,
    "similarity"      double precision
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    section.id,
    section.datasource_id,
    section.organization_id,
    section.content,
    section.heading,
    section.position,
    -(section.embedding <#> embedding) AS similarity
  FROM section
  WHERE -(section.embedding <#> embedding) > match_threshold
    AND section.organization_id = p_organization_id
  ORDER BY section.embedding <#> embedding
  LIMIT match_count;
END;
$$;
