-- Add table merging relational fields
ALTER TABLE tables
ADD COLUMN IF NOT EXISTS parent_table_id UUID REFERENCES tables(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_merged BOOLEAN DEFAULT false;

-- Allow arrays for tracking which exact tables form a merged super-table
ALTER TABLE tables
ADD COLUMN IF NOT EXISTS merged_table_ids UUID[] DEFAULT '{}';
