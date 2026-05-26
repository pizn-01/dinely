

-- Allow start_time and end_time fields for merged table to  make sure merging is time specific
ALTER TABLE tables
ADD COLUMN IF NOT EXISTS start_time time default null,
ADD COLUMN IF NOT EXISTS end_time time default null;
