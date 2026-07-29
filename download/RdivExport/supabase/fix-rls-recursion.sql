-- =============================================================================
-- RdivExport - CORRECTION RECURSION INFINIE RLS
-- =============================================================================
-- Probleme : les policies RLS interrogent la table profiles pour verifier le
-- role, ce qui declenche RLS sur profiles -> boucle infinie.
-- Solution : 3 fonctions SECURITY DEFINER qui contournent RLS.
-- =============================================================================
-- EXECUTER CE SCRIPT DANS LE SQL EDITOR SUPABASE
-- =============================================================================

-- ─── ETAPE 1 : Supprimer toutes les policies existantes ─────────────────────

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_all_for_requisitionist" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;

DROP POLICY IF EXISTS "pharmacies_select_active" ON public.pharmacies;
DROP POLICY IF EXISTS "pharmacies_insert_requisitionist" ON public.pharmacies;
DROP POLICY IF EXISTS "pharmacies_update_requisitionist" ON public.pharmacies;

DROP POLICY IF EXISTS "products_select_active" ON public.products;
DROP POLICY IF EXISTS "products_select_all_requisitionist" ON public.products;
DROP POLICY IF EXISTS "products_insert_requisitionist" ON public.products;
DROP POLICY IF EXISTS "products_update_requisitionist" ON public.products;

DROP POLICY IF EXISTS "requisitions_select_own_pharmacy" ON public.requisitions;
DROP POLICY IF EXISTS "requisitions_select_all_requisitionist" ON public.requisitions;
DROP POLICY IF EXISTS "requisitions_insert_own" ON public.requisitions;
DROP POLICY IF EXISTS "requisitions_update_own" ON public.requisitions;
DROP POLICY IF EXISTS "requisitions_update_requisitionist" ON public.requisitions;
DROP POLICY IF EXISTS "requisitions_delete_own" ON public.requisitions;

DROP POLICY IF EXISTS "requisition_items_select_via_requisition" ON public.requisition_items;
DROP POLICY IF EXISTS "requisition_items_insert_via_requisition" ON public.requisition_items;
DROP POLICY IF EXISTS "requisition_items_update_via_requisition" ON public.requisition_items;
DROP POLICY IF EXISTS "requisition_items_delete_via_requisition" ON public.requisition_items;

DROP POLICY IF EXISTS "delivery_checklists_all_requisitionist" ON public.delivery_checklists;
DROP POLICY IF EXISTS "delivery_checklists_select_own" ON public.delivery_checklists;

DROP POLICY IF EXISTS "audit_logs_select_all_requisitionist" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_select_own" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert_all" ON public.audit_logs;

-- ─── ETAPE 2 : Creer les fonctions helper SECURITY DEFINER ─────────────────
-- SECURITY DEFINER = la fonction s'execute en tant que proprietaire de la table,
-- donc elle contourne RLS. Pas de recursion possible.

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.current_user_pharmacy_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT pharmacy_id FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_requisitionist()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'main_requisitionist'
  )
$$;

-- ─── ETAPE 3 : Recreer toutes les policies avec les fonctions helper ────────

-- Profils
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_select_all_for_requisitionist" ON public.profiles
  FOR SELECT USING (public.is_requisitionist());

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Pharmacies
CREATE POLICY "pharmacies_select_active" ON public.pharmacies
  FOR SELECT USING (is_active = true);

CREATE POLICY "pharmacies_insert_requisitionist" ON public.pharmacies
  FOR INSERT WITH CHECK (public.is_requisitionist());

CREATE POLICY "pharmacies_update_requisitionist" ON public.pharmacies
  FOR UPDATE USING (public.is_requisitionist()) WITH CHECK (public.is_requisitionist());

-- Produits
CREATE POLICY "products_select_active" ON public.products
  FOR SELECT USING (is_active = true);

CREATE POLICY "products_select_all_requisitionist" ON public.products
  FOR SELECT USING (public.is_requisitionist());

CREATE POLICY "products_insert_requisitionist" ON public.products
  FOR INSERT WITH CHECK (public.is_requisitionist());

CREATE POLICY "products_update_requisitionist" ON public.products
  FOR UPDATE USING (public.is_requisitionist());

-- Requisitions
CREATE POLICY "requisitions_select_own_pharmacy" ON public.requisitions
  FOR SELECT USING (pharmacy_id = public.current_user_pharmacy_id());

CREATE POLICY "requisitions_select_all_requisitionist" ON public.requisitions
  FOR SELECT USING (public.is_requisitionist());

CREATE POLICY "requisitions_insert_own" ON public.requisitions
  FOR INSERT WITH CHECK (
    created_by = auth.uid() AND pharmacy_id = public.current_user_pharmacy_id()
  );

CREATE POLICY "requisitions_update_own" ON public.requisitions
  FOR UPDATE USING (
    created_by = auth.uid() AND pharmacy_id = public.current_user_pharmacy_id()
  );

CREATE POLICY "requisitions_update_requisitionist" ON public.requisitions
  FOR UPDATE USING (public.is_requisitionist());

CREATE POLICY "requisitions_delete_own" ON public.requisitions
  FOR DELETE USING (created_by = auth.uid() AND status = 'draft');

-- Lignes de requisition
CREATE POLICY "requisition_items_select_via_requisition" ON public.requisition_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.requisitions r
      WHERE r.id = requisition_id AND (
        r.pharmacy_id = public.current_user_pharmacy_id()
        OR public.is_requisitionist()
      )
    )
  );

CREATE POLICY "requisition_items_insert_via_requisition" ON public.requisition_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.requisitions r
      WHERE r.id = requisition_id AND r.created_by = auth.uid()
    )
  );

CREATE POLICY "requisition_items_update_via_requisition" ON public.requisition_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.requisitions r
      WHERE r.id = requisition_id AND (
        r.created_by = auth.uid() OR public.is_requisitionist()
      )
    )
  );

CREATE POLICY "requisition_items_delete_via_requisition" ON public.requisition_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.requisitions r
      WHERE r.id = requisition_id AND r.created_by = auth.uid() AND r.status = 'draft'
    )
  );

-- Bordereaux de livraison
CREATE POLICY "delivery_checklists_all_requisitionist" ON public.delivery_checklists
  FOR ALL USING (public.is_requisitionist());

CREATE POLICY "delivery_checklists_select_own" ON public.delivery_checklists
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.requisitions r
      WHERE r.id = requisition_id AND r.pharmacy_id = public.current_user_pharmacy_id()
    )
  );

-- Audit logs
CREATE POLICY "audit_logs_select_all_requisitionist" ON public.audit_logs
  FOR SELECT USING (public.is_requisitionist());

CREATE POLICY "audit_logs_select_own" ON public.audit_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "audit_logs_insert_all" ON public.audit_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- FIN - La recursion infinie est corrigee
-- =============================================================================