-- ─── RdivExport – Table app_settings ─────────────────────────────────
-- Paramètres globaux de l'application (clé-valeur).
-- Exécuter ce SQL dans le SQL Editor de Supabase.

-- Créer la table si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.app_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Tout utilisateur authentifié peut lire les paramètres
CREATE POLICY "Anyone can read settings" ON public.app_settings
  FOR SELECT USING (true);

-- Seul le superviseur (main_requisitionist) peut modifier
CREATE POLICY "Only supervisors can manage settings" ON public.app_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'main_requisitionist'
      AND is_active = true
    )
  );

-- Insérer le paramètre WhatsApp par défaut (vide)
INSERT INTO public.app_settings (key, value)
VALUES ('whatsapp_destination_number', '')
ON CONFLICT (key) DO NOTHING;

COMMENT ON TABLE public.app_settings IS 'Paramètres globaux de l\'application (clé-valeur)';
