-- Date-aware table merges: merged layout applies from merge_effective_from (inclusive).
-- NULL = immediate merge (legacy behaviour).

ALTER TABLE tables
ADD COLUMN IF NOT EXISTS merge_effective_from DATE NULL;

COMMENT ON COLUMN tables.merge_effective_from IS
  'For is_merged rows: first calendar day the merged table replaces its parts. NULL = merge applies immediately.';
