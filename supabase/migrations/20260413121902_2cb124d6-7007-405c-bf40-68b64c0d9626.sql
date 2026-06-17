ALTER TABLE public.spr1_records ADD COLUMN IF NOT EXISTS scala_dis_1 character varying(2);
ALTER TABLE public.spr1_records ADD COLUMN IF NOT EXISTS dis_ingr_1 character varying(5);
ALTER TABLE public.spr1_records ADD COLUMN IF NOT EXISTS scala_dis_2 character varying(2);
ALTER TABLE public.spr1_records ADD COLUMN IF NOT EXISTS dis_ingr_2 character varying(5);
ALTER TABLE public.spr1_records ADD COLUMN IF NOT EXISTS scala_dis_3 character varying(2);
ALTER TABLE public.spr1_records ADD COLUMN IF NOT EXISTS dis_ingr_3 character varying(5);
ALTER TABLE public.spr1_records ALTER COLUMN cittu TYPE character varying(3);