-- Tabella SPR1 Records
CREATE TABLE public.spr1_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Chiave univoca pratica
  codusl VARCHAR(3) NOT NULL DEFAULT '010',
  struttura VARCHAR(6) NOT NULL DEFAULT '090MA7',
  data_pic DATE,
  nprat VARCHAR(20),
  
  -- Dati identificativi
  id_utente VARCHAR(16), -- Codice Fiscale
  cognome VARCHAR(50),
  nome VARCHAR(50),
  genere VARCHAR(1),
  datanasc DATE,
  
  -- Campi calcolati da Excel
  ore_prev VARCHAR(5),
  impatt VARCHAR(10),
  codpres VARCHAR(7),
  
  -- Altri campi SPR1 essenziali
  setting VARCHAR(1) DEFAULT '8',
  accesso VARCHAR(1) DEFAULT '1',
  opera VARCHAR(1) DEFAULT '1'
);

-- Tabella SPR2 Records
CREATE TABLE public.spr2_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- Collegamento a SPR1
  spr1_id UUID REFERENCES public.spr1_records(id) ON DELETE CASCADE,
  
  -- Chiave ripetuta per export
  codusl VARCHAR(3),
  struttura VARCHAR(6),
  data_pic DATE,
  nprat VARCHAR(20),
  
  -- Tipo record
  record VARCHAR(1) DEFAULT '3',
  
  -- Dati calcolati da Excel
  tariffa DECIMAL(8,2),
  numpres INTEGER,
  durata INTEGER,
  impres DECIMAL(8,2),
  
  -- Date trattamento
  dataini DATE,
  datafine DATE
);

-- Indici per performance
CREATE INDEX idx_spr1_cf ON public.spr1_records(id_utente);
CREATE INDEX idx_spr1_nprat ON public.spr1_records(nprat);
CREATE INDEX idx_spr2_spr1 ON public.spr2_records(spr1_id);

-- Trigger per updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_spr1_updated_at
BEFORE UPDATE ON public.spr1_records
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS (pubblico per ora, da restringere con autenticazione)
ALTER TABLE public.spr1_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spr2_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on spr1" ON public.spr1_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on spr2" ON public.spr2_records FOR ALL USING (true) WITH CHECK (true);