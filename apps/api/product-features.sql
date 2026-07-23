-- Run once in Supabase SQL Editor before deploying the product feature update.
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS image_url TEXT;
