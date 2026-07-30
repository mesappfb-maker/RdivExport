-- =============================================================================
-- RdivExport – Migration v2 (idempotent – peut être relancée sans erreur)
-- Fixes: FK manual products, role constraint, phone editing, delete cancelled
-- Date: 2026-07-30
-- =============================================================================
-- Exécuter ce script dans Supabase Dashboard > SQL Editor
-- =============================================================================

-- ─── 1. Récupérer l’ID du code KOLWEZI pour les références ────────────────
DO $$ DECLARE
  v_pharmacy_id UUID;
  v_code TEXT := 'KLW';
BEGIN
  SELECT id INTO v_pharmacy_id FROM public.pharmacies
    WHERE name ILIKE '%KOLWEZI%' LIMIT 1;
  RAISE NOTICE 'Pharmacy KOLWEZI id = %', v_pharmacy_id;
END $$;

-- ─── 2. Assouplir la contrainte FK product_id ─────────────────────────────
DO $$ DECLARE
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

DO $$ BEGIN
  ALTER TABLE public.requisition_items
    ADD CONSTRAINT requisition_items_product_id_fkey
    FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 3. Permettre l’insertion de produits par tout utilisateur authentifié ───
DO $$ BEGIN
  CREATE POLICY "products_insert_any_auth" ON public.products
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 4. Élargir le rôle CHECK ────────────────────────────────────────────
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (
  role IN ('pharmacy_user', 'main_requisitionist', 'centralisateur', 'depot_user')
);

-- ─── 5. Suppression des réquisitions annulées / brouillons ──────────────────────
DO $$ BEGIN
  CREATE POLICY "requisitions_delete_own" ON public.requisitions
    FOR DELETE USING (
      created_by = auth.uid() AND
      (status = 'draft' OR status = 'pending' OR status = 'cancelled')
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "requisition_items_delete_via_requisition" ON public.requisition_items
    FOR DELETE USING (
      EXISTS (
        SELECT 1 FROM public.requisitions r
        WHERE r.id = requisition_id AND r.created_by = auth.uid()
        AND (r.status = 'draft' OR r.status = 'pending' OR r.status = 'cancelled')
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 6. RLS pour le centralisateur ────────────────────────────────────
DO $$ BEGIN
  CREATE POLICY "requisitions_select_centralisateur" ON public.requisitions
    FOR SELECT USING (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'centralisateur')
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "requisitions_update_centralisateur" ON public.requisitions
    FOR UPDATE USING (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'centralisateur')
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "requisition_items_select_centralisateur" ON public.requisition_items
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM public.requisitions r
        WHERE r.id = requisition_id AND EXISTS (
          SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'centralisateur'
        )
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "requisition_items_update_centralisateur" ON public.requisition_items
    FOR UPDATE USING (
      EXISTS (
        SELECT 1 FROM public.requisitions r
        WHERE r.id = requisition_id AND EXISTS (
          SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'centralisateur'
        )
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "pharmacies_select_centralisateur" ON public.pharmacies
    FOR SELECT USING (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'centralisateur')
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 7. Table app_settings ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT app_settings_key_unique UNIQUE (key)
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "app_settings_select_all" ON public.app_settings
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "app_settings_insert_admin" ON public.app_settings
    FOR INSERT WITH CHECK (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'main_requisitionist')
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "app_settings_update_admin" ON public.app_settings
    FOR UPDATE USING (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'main_requisitionist')
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 8. Colonne is_active sur profiles ─────────────────────────────────
DO $$ BEGIN
  ALTER TABLE profiles ADD COLUMN is_active boolean NOT NULL DEFAULT true;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "profiles_update_admin" ON public.profiles
    FOR UPDATE USING (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'main_requisitionist')
      OR id = auth.uid()
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 9. Mettre à jour le téléphone de KOLWEZI 2 ─────────────────────────────
UPDATE public.pharmacies
SET phone = '+243811234508',
    whatsapp_number = '+243811234508',
    updated_at = now()
WHERE name ILIKE '%KOLWEZI 2%';

-- ─── 10. Vérification ────────────────────────────────────────────────
SELECT 'Migration v2 terminée avec succès' AS status;
