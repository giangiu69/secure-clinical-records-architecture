
-- Tabella Rubrica Alias Nomi
CREATE TABLE public.name_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pdf_name text NOT NULL,
  spr1_cf text NOT NULL,
  spr1_cognome text,
  spr1_nome text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT name_aliases_pdf_name_key UNIQUE (pdf_name)
);

ALTER TABLE public.name_aliases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authorized users can select aliases"
  ON public.name_aliases FOR SELECT
  USING (is_authorized_user());

CREATE POLICY "Authorized users can insert aliases"
  ON public.name_aliases FOR INSERT
  WITH CHECK (is_authorized_user());

CREATE POLICY "Authorized users can update aliases"
  ON public.name_aliases FOR UPDATE
  USING (is_authorized_user())
  WITH CHECK (is_authorized_user());

CREATE POLICY "Authorized users can delete aliases"
  ON public.name_aliases FOR DELETE
  USING (is_authorized_user());

-- Tabella Parcheggio Record con Errori
CREATE TABLE public.pending_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_type text NOT NULL DEFAULT 'spr2',
  patient_name text,
  raw_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_reason text,
  reference_month text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.pending_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authorized users can select pending"
  ON public.pending_records FOR SELECT
  USING (is_authorized_user());

CREATE POLICY "Authorized users can insert pending"
  ON public.pending_records FOR INSERT
  WITH CHECK (is_authorized_user());

CREATE POLICY "Authorized users can update pending"
  ON public.pending_records FOR UPDATE
  USING (is_authorized_user())
  WITH CHECK (is_authorized_user());

CREATE POLICY "Authorized users can delete pending"
  ON public.pending_records FOR DELETE
  USING (is_authorized_user());
