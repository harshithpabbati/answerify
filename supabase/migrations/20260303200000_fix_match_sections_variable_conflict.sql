-- Migration: Fix match_sections variable conflict
--
-- Migration 20260303000000 renamed the organization_id parameter to
-- p_organization_id to resolve the ambiguity between the function parameter
-- and the column name, but it also removed the `#variable_conflict use_variable`
-- directive. This left the `embedding` parameter name still conflicting with
-- the `embedding` column in the section table. Without the directive,
-- PostgreSQL may resolve the unqualified `embedding` identifier as the column
-- rather than the parameter, causing the similarity calculation to compare
-- each section's embedding against itself instead of against the query
-- embedding, returning incorrect results or raising an ambiguity error.
--
-- Fix: restore `#variable_conflict use_variable` so `embedding` in the
-- function body always refers to the function parameter (the query vector),
-- not the section.embedding column.

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
#variable_conflict use_variable
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
