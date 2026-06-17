
-- Add codese and intpripai_1 to spr1_records
ALTER TABLE public.spr1_records 
  ADD COLUMN IF NOT EXISTS codese character varying DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS intpripai_1 character varying DEFAULT NULL;

-- Add compensa to spr2_records with default 'N'
ALTER TABLE public.spr2_records 
  ADD COLUMN IF NOT EXISTS compensa character varying DEFAULT 'N';

-- Fix codusl default from '010' to '201'
ALTER TABLE public.spr1_records 
  ALTER COLUMN codusl SET DEFAULT '201';
