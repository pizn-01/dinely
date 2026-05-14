-- Date-aware table merges (see backend/migrations/007_merge_effective_from.sql)

ALTER TABLE tables
ADD COLUMN IF NOT EXISTS merge_effective_from DATE NULL;

COMMENT ON COLUMN tables.merge_effective_from IS
  'For is_merged rows: first calendar day the merged table replaces its parts. NULL = merge applies immediately.';
