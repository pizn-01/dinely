-- Add premium pricing fields to tables
ALTER TABLE tables 
ADD COLUMN is_premium BOOLEAN DEFAULT false,
ADD COLUMN premium_price DECIMAL(10,2) DEFAULT NULL;
