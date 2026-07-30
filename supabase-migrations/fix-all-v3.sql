-- =============================================================================
-- RdivExport – Migration v3 (idempotent)
-- Features: depot product delete, draft history, depot-linked products
-- Date: 2026-07-30
-- =============================================================================
-- Exécuter ce script dans Supabase Dashboard > SQL Editor
-- =============================================================================

-- ─── 1. Permettre la suppression de produits par depot_user ────────────────────
DO $$ BEGIN
  CREATE POLICY "products_delete_depot" ON public.products
    FOR DELETE USING (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'depot_user')
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 2. Permettre la suppression de produits par main_requisitionist ────────────
DO $$ BEGIN
  CREATE POLICY "products_delete_requisitionist" ON public.products
    FOR DELETE USING (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'main_requisitionist')
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 3. Permettre à pharmacy_user de voir les réquisitions brouillons ──────────
-- Les brouillons sont déjà visibles car le filtre pharmacy_id fonctionne
-- pour tous les statuts. On s'assure juste que le SELECT inclut les drafts.
DO $$ BEGIN
  CREATE POLICY "requisitions_select_own_all_status" ON public.requisitions
    FOR SELECT USING (
      pharmacy_id IN (
        SELECT pharmacy_id FROM public.profiles WHERE id = auth.uid()
      )
      AND created_by = auth.uid()
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 4. Vérification ────────────────────────────────────────────────────────────
SELECT 'Migration v3 terminée avec succès' AS status;
