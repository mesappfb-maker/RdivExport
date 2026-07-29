-- =============================================================================
-- RdivExport - CORRECTION COMPLETE
-- =============================================================================
-- Executez CE SCRIPT dans le SQL Editor Supabase
-- Il corrige : profils manquants + recursion RLS + mise a jour des roles
-- =============================================================================

-- ─── ETAPE 1 : Inserer les profils manquants pour tous les utilisateurs auth ──

INSERT INTO public.profiles (id, full_name, email, role)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  u.email,
  'pharmacy_user'
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = u.id
)
ON CONFLICT (id) DO NOTHING;

-- ─── ETAPE 2 : Supprimer TOUTES les policies existantes ──────────────────────

DO $$ DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- ─── ETAPE 3 : Fonctions helper SECURITY DEFINER ─────────────────────────────

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
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'main_requisitionist'
  )
$$;

-- ─── ETAPE 4 : Recreer TOUTES les policies (sans recursion) ──────────────────

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
        r.pharmacy_id = public.current_user_pharmacy_id() OR public.is_requisitionist()
      )
    )
  );

CREATE POLICY "requisition_items_insert_via_requisition" ON public.requisition_items
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.requisitions r WHERE r.id = requisition_id AND r.created_by = auth.uid())
  );

CREATE POLICY "requisition_items_update_via_requisition" ON public.requisition_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.requisitions r
      WHERE r.id = requisition_id AND (r.created_by = auth.uid() OR public.is_requisitionist())
    )
  );

CREATE POLICY "requisition_items_delete_via_requisition" ON public.requisition_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.requisitions r WHERE r.id = requisition_id AND r.created_by = auth.uid() AND r.status = 'draft'
    )
  );

-- Bordereaux de livraison
CREATE POLICY "delivery_checklists_all_requisitionist" ON public.delivery_checklists
  FOR ALL USING (public.is_requisitionist());

CREATE POLICY "delivery_checklists_select_own" ON public.delivery_checklists
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.requisitions r WHERE r.id = requisition_id AND r.pharmacy_id = public.current_user_pharmacy_id()
    )
  );

-- Audit logs
CREATE POLICY "audit_logs_select_all_requisitionist" ON public.audit_logs
  FOR SELECT USING (public.is_requisitionist());

CREATE POLICY "audit_logs_select_own" ON public.audit_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "audit_logs_insert_all" ON public.audit_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ─── ETAPE 5 : Mettre a jour les roles et pharmacies ──────────────────────────

UPDATE public.profiles SET
  full_name = 'Administrateur RdivExport',
  role = 'main_requisitionist',
  pharmacy_id = NULL
WHERE email = 'admin@rdivexport.com';

UPDATE public.profiles SET
  full_name = 'Pharmacien HEWABORA 1', role = 'pharmacy_user',
  pharmacy_id = (SELECT id FROM public.pharmacies WHERE code = 'HW1')
WHERE email = 'hewabora1@rdivexport.com';

UPDATE public.profiles SET
  full_name = 'Pharmacien HEWABORA 2', role = 'pharmacy_user',
  pharmacy_id = (SELECT id FROM public.pharmacies WHERE code = 'HW2')
WHERE email = 'hewabora2@rdivexport.com';

UPDATE public.profiles SET
  full_name = 'Pharmacien DELA', role = 'pharmacy_user',
  pharmacy_id = (SELECT id FROM public.pharmacies WHERE code = 'DLA')
WHERE email = 'dela@rdivexport.com';

UPDATE public.profiles SET
  full_name = 'Pharmacien PHARMAFRICA', role = 'pharmacy_user',
  pharmacy_id = (SELECT id FROM public.pharmacies WHERE code = 'PFA')
WHERE email = 'pharmafrica@rdivexport.com';

UPDATE public.profiles SET
  full_name = 'Pharmacien KASAL', role = 'pharmacy_user',
  pharmacy_id = (SELECT id FROM public.pharmacies WHERE code = 'KAS')
WHERE email = 'kasal@rdivexport.com';

UPDATE public.profiles SET
  full_name = 'Pharmacien BIAYIL', role = 'pharmacy_user',
  pharmacy_id = (SELECT id FROM public.pharmacies WHERE code = 'BIY')
WHERE email = 'biayil@rdivexport.com';

UPDATE public.profiles SET
  full_name = 'Pharmacien KOLWEZI 1', role = 'pharmacy_user',
  pharmacy_id = (SELECT id FROM public.pharmacies WHERE code = 'KW1')
WHERE email = 'kolwezi1@rdivexport.com';

UPDATE public.profiles SET
  full_name = 'Pharmacien KOLWEZI 2', role = 'pharmacy_user',
  pharmacy_id = (SELECT id FROM public.pharmacies WHERE code = 'KW2')
WHERE email = 'kolwezi2@rdivexport.com';

-- ─── ETAPE 6 : Verifier le resultat ───────────────────────────────────────────

SELECT id, email, full_name, role, pharmacy_id FROM public.profiles ORDER BY role, email;