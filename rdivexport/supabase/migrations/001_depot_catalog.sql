-- =============================================================================
-- Migration 001 – Catalogue du depot (depot_catalog)
-- Liste des produits disponibles a la commande avec quantite et prix
-- =============================================================================

-- ─── Table ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.depot_catalog (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id         UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  available_quantity INTEGER NOT NULL DEFAULT 0,
  unit_price         NUMERIC(12, 2),
  is_available       BOOLEAN NOT NULL DEFAULT true,
  restock_date       DATE,
  notes              TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT depot_catalog_product_unique UNIQUE (product_id),
  CONSTRAINT depot_catalog_quantity_check CHECK (available_quantity >= 0),
  CONSTRAINT depot_catalog_price_check CHECK (unit_price IS NULL OR unit_price >= 0)
);

COMMENT ON TABLE public.depot_catalog IS 'Catalogue des produits disponibles au depot pour la commande par les pharmacies';
COMMENT ON COLUMN public.depot_catalog.product_id IS 'Reference vers le produit dans le catalogue general';
COMMENT ON COLUMN public.depot_catalog.available_quantity IS 'Quantite effectivement disponible a la commande';
COMMENT ON COLUMN public.depot_catalog.unit_price IS 'Prix unitaire du produit au depot';
COMMENT ON COLUMN public.depot_catalog.is_available IS 'Indique si le produit est actuellement disponible a la commande';
COMMENT ON COLUMN public.depot_catalog.restock_date IS 'Date prevue du prochain reapprovisionnement';

-- ─── Index ─────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_depot_catalog_product_id ON public.depot_catalog (product_id);
CREATE INDEX IF NOT EXISTS idx_depot_catalog_is_available ON public.depot_catalog (is_available);

-- ─── Trigger updated_at ───────────────────────────────────────────────────────

CREATE TRIGGER trg_depot_catalog_updated_at
  BEFORE UPDATE ON public.depot_catalog
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE public.depot_catalog ENABLE ROW LEVEL SECURITY;

-- Tous les utilisateurs authentifies peuvent lire le catalogue (produits disponibles uniquement)
CREATE POLICY "depot_catalog_select_available" ON public.depot_catalog
  FOR SELECT USING (is_available = true);

-- Les pharmacy_user peuvent lire tous les produits du catalogue (meme indisponibles)
CREATE POLICY "depot_catalog_select_all_pharmacy" ON public.depot_catalog
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'pharmacy_user'
    )
  );

-- main_requisitionist : acces complet (lecture, insertion, mise a jour, suppression)
CREATE POLICY "depot_catalog_all_requisitionist" ON public.depot_catalog
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'main_requisitionist'
    )
  );
