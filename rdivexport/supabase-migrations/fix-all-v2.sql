-- =============================================================================
-- RdivExport – Migration v2
-- Fixes: FK manual products, role constraint, phone editing, delete cancelled
-- Date: 2026-07-30
-- =============================================================================
-- Exécuter ce script dans Supabase Dashboard > SQL Editor
-- =============================================================================

-- ─── 1. Permettre product_id NULL et assouplir la contrainte FK ─────────
-- Les produits saisis manuellement peuvent ne pas exister dans la table products.
-- On remplace la FK par une contrainte plus souple.

DO $$
DECLARE
  fk_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'requisition_items_product_id_fkey' 
    AND table_name = 'requisition_items'
  ) INTO fk_exists;
  
  IF fk_exists THEN
    ALTER TABLE public.requisition_items DROP CONSTRAINT requisition_items_product_id_fkey;
  END IF;
END $$;

-- Recréer la FK avec ON DELETE SET NULL (plus souple)
DO $$ BEGIN
  ALTER TABLE public.requisition_items 
    ADD CONSTRAINT requisition_items_product_id_fkey 
    FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- RLS: Permettre à tout utilisateur authentifié d'insérer des produits ──
-- Les utilisateurs pharmacie doivent pouvoir créer des produits manuellement
-- lors de la saisie d'une réquisition.

CREATE POLICY "products_insert_any_auth" ON public.products
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ─── 2. Élargir le rôle CHECK pour inclure centralisateur et depot_user ─────

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (
  role IN ('pharmacy_user', 'main_requisitionist', 'centralisateur', 'depot_user')
);

-- ─── 3. RLS: Permettre la suppression des réquisitions annulées ─────────────
-- Supprimer l'ancienne politique et recréer avec status draft OU cancelled

DROP POLICY IF EXISTS "requisitions_delete_own" ON public.requisitions;
CREATE POLICY "requisitions_delete_own" ON public.requisitions
  FOR DELETE USING (
    created_by = auth.uid() AND
    (status = 'draft' OR status = 'pending' OR status = 'cancelled')
  );

-- Même chose pour les items
DROP POLICY IF EXISTS "requisition_items_delete_via_requisition" ON public.requisition_items;
CREATE POLICY "requisition_items_delete_via_requisition" ON public.requisition_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.requisitions r
      WHERE r.id = requisition_id AND r.created_by = auth.uid() 
      AND (r.status = 'draft' OR r.status = 'pending' OR r.status = 'cancelled')
    )
  );

-- ─── 4. RLS: Permettre au centralisateur de voir et modifier les réquisitions ─

CREATE POLICY "requisitions_select_centralisateur" ON public.requisitions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'centralisateur'
    )
  );

CREATE POLICY "requisitions_update_centralisateur" ON public.requisitions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'centralisateur'
    )
  );

-- Items visibles par le centralisateur
CREATE POLICY "requisition_items_select_centralisateur" ON public.requisition_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.requisitions r
      WHERE r.id = requisition_id AND EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'centralisateur'
      )
    )
  );

-- Items modifiables par le centralisateur
CREATE POLICY "requisition_items_update_centralisateur" ON public.requisition_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.requisitions r
      WHERE r.id = requisition_id AND EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'centralisateur'
      )
    )
  );

-- ─── 5. RLS: Permettre la mise à jour des pharmacies par l'admin ─────────────
-- (déjà existant mais on s'assure que le centralisateur peut aussi les lire)

CREATE POLICY "pharmacies_select_centralisateur" ON public.pharmacies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'centralisateur'
    )
  );

-- ─── 6. Mettre à jour le numéro de téléphone de KOLWEZI 2 ───────────────────
-- À exécuter si la pharmacie KOLWEZI 2 existe

UPDATE public.pharmacies 
SET phone = '+243811234508', 
    whatsapp_number = '+243811234508',
    updated_at = now()
WHERE name ILIKE '%KOLWEZI 2%';

-- ─── 7. Créer la table app_settings si elle n'existe pas (rappel) ──────────

CREATE TABLE IF NOT EXISTS public.app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT app_settings_key_unique UNIQUE (key)
);

-- RLS pour app_settings
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_settings_select_all" ON public.app_settings
  FOR SELECT USING (true);

CREATE POLICY "app_settings_insert_admin" ON public.app_settings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'main_requisitionist'
    )
  );

CREATE POLICY "app_settings_update_admin" ON public.app_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'main_requisitionist'
    )
  );

-- ─── 8. Ajouter is_active si manquant (rappel) ──────────────────────────────

DO $$ BEGIN
  ALTER TABLE profiles ADD COLUMN is_active boolean NOT NULL DEFAULT true;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- RLS pour mettre à jour is_active par l'admin
CREATE POLICY "profiles_update_admin" ON public.profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'main_requisitionist'
    )
  );

-- ─── FIN DE MIGRATION ───────────────────────────────────────────────────────