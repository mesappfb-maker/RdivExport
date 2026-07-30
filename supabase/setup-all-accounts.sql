-- =============================================================================
-- RdivExport – Création de TOUS les comptes utilisateurs
-- =============================================================================
-- 
-- PRÉREQUIS :
--   1. Le schéma (schema.sql) doit être exécuté dans Supabase
--   2. Les 10 pharmacies doivent être insérées
--
-- UTILISATION :
--   1. Créez d'abord TOUS les utilisateurs dans Supabase Dashboard :
--      Authentication → Users → Add User → pour chaque compte ci-dessous
--      (Ou créez-les via la page d'inscription de l'application)
--
--   2. Exécutez ce script dans le SQL Editor de Supabase Dashboard
--      (https://supabase.com/dashboard → Votre projet → SQL Editor)
--
--   3. Ce script créera les profils et les liera aux pharmacies
-- =============================================================================

-- ─── Vérification du schéma ─────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    RAISE EXCEPTION 'La table profiles n''existe pas. Exécutez d''abord schema.sql.';
  END IF;
END $$;

-- =============================================================================
-- COMPTE ADMINISTRATEUR SYSTÈME
-- =============================================================================
-- Email      : fabricefb@gmail.com
-- Mot de passe: Waze@Div007
-- Rôle       : main_requisitionist (admin global, pas de pharmacie assignée)
-- Accès      : /admin (tableau de bord, consolidation, livraison, catalog, commandes)
-- =============================================================================

INSERT INTO public.profiles (id, user_id, full_name, email, phone, role, pharmacy_id, is_active)
SELECT 
  u.id, u.id, 'Administrateur Système', u.email, NULL,
  'main_requisitionist', NULL, true
FROM auth.users u WHERE u.email = 'fabricefb@gmail.com'
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name, role = EXCLUDED.role,
  pharmacy_id = EXCLUDED.pharmacy_id, is_active = EXCLUDED.is_active,
  updated_at = now();

-- =============================================================================
-- COMPTES PHARMACIES (8 utilisateurs)
-- =============================================================================
-- Chaque utilisateur est lié à sa pharmacie via pharmacy_id
-- =============================================================================

-- 1. HEWABORA 1 → hewabora1@ladivine.com / Div@hb1
INSERT INTO public.profiles (id, user_id, full_name, email, phone, role, pharmacy_id, is_active)
SELECT u.id, u.id, 'HEWABORA 1', u.email, NULL, 'pharmacy_user',
  (SELECT id FROM public.pharmacies WHERE code = 'HW1' LIMIT 1), true
FROM auth.users u WHERE u.email = 'hewabora1@ladivine.com'
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name, role = EXCLUDED.role,
  pharmacy_id = EXCLUDED.pharmacy_id, is_active = EXCLUDED.is_active,
  updated_at = now();

-- 2. HEWABORA 2 → hewabora2@ladivine.com / Div@hb2
INSERT INTO public.profiles (id, user_id, full_name, email, phone, role, pharmacy_id, is_active)
SELECT u.id, u.id, 'HEWABORA 2', u.email, NULL, 'pharmacy_user',
  (SELECT id FROM public.pharmacies WHERE code = 'HW2' LIMIT 1), true
FROM auth.users u WHERE u.email = 'hewabora2@ladivine.com'
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name, role = EXCLUDED.role,
  pharmacy_id = EXCLUDED.pharmacy_id, is_active = EXCLUDED.is_active,
  updated_at = now();

-- 3. DELA → dela@ladivine.com / Div@2la
INSERT INTO public.profiles (id, user_id, full_name, email, phone, role, pharmacy_id, is_active)
SELECT u.id, u.id, 'DELA', u.email, NULL, 'pharmacy_user',
  (SELECT id FROM public.pharmacies WHERE code = 'DLA' LIMIT 1), true
FROM auth.users u WHERE u.email = 'dela@ladivine.com'
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name, role = EXCLUDED.role,
  pharmacy_id = EXCLUDED.pharmacy_id, is_active = EXCLUDED.is_active,
  updated_at = now();

-- 4. PHARMAFRICA → pharmafrica@ladivine.com / Div@africa
INSERT INTO public.profiles (id, user_id, full_name, email, phone, role, pharmacy_id, is_active)
SELECT u.id, u.id, 'PHARMAFRICA', u.email, NULL, 'pharmacy_user',
  (SELECT id FROM public.pharmacies WHERE code = 'PFA' LIMIT 1), true
FROM auth.users u WHERE u.email = 'pharmafrica@ladivine.com'
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name, role = EXCLUDED.role,
  pharmacy_id = EXCLUDED.pharmacy_id, is_active = EXCLUDED.is_active,
  updated_at = now();

-- 5. KASAI → kasai@ladivine.com / Div@ksi
INSERT INTO public.profiles (id, user_id, full_name, email, phone, role, pharmacy_id, is_active)
SELECT u.id, u.id, 'KASAI', u.email, NULL, 'pharmacy_user',
  (SELECT id FROM public.pharmacies WHERE code = 'KAS' LIMIT 1), true
FROM auth.users u WHERE u.email = 'kasai@ladivine.com'
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name, role = EXCLUDED.role,
  pharmacy_id = EXCLUDED.pharmacy_id, is_active = EXCLUDED.is_active,
  updated_at = now();

-- 6. BIAYI → biayi@ladivine.com / Div@byi
INSERT INTO public.profiles (id, user_id, full_name, email, phone, role, pharmacy_id, is_active)
SELECT u.id, u.id, 'Pharmacie La Divine Biayi', u.email, NULL, 'pharmacy_user',
  (SELECT id FROM public.pharmacies WHERE code = 'BIY' LIMIT 1), true
FROM auth.users u WHERE u.email = 'biayi@ladivine.com'
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name, role = EXCLUDED.role,
  pharmacy_id = EXCLUDED.pharmacy_id, is_active = EXCLUDED.is_active,
  updated_at = now();

-- 7. KOLWEZI 1 → kolwezi1@ladivine.com / Div@klz1
INSERT INTO public.profiles (id, user_id, full_name, email, phone, role, pharmacy_id, is_active)
SELECT u.id, u.id, 'KOLWEZI 1', u.email, NULL, 'pharmacy_user',
  (SELECT id FROM public.pharmacies WHERE code = 'KW1' LIMIT 1), true
FROM auth.users u WHERE u.email = 'kolwezi1@ladivine.com'
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name, role = EXCLUDED.role,
  pharmacy_id = EXCLUDED.pharmacy_id, is_active = EXCLUDED.is_active,
  updated_at = now();

-- 8. KOLWEZI 2 → kolwezi2@ladivine.com / Div@klz2
INSERT INTO public.profiles (id, user_id, full_name, email, phone, role, pharmacy_id, is_active)
SELECT u.id, u.id, 'KOLWEZI 2', u.email, NULL, 'pharmacy_user',
  (SELECT id FROM public.pharmacies WHERE code = 'KW2' LIMIT 1), true
FROM auth.users u WHERE u.email = 'kolwezi2@ladivine.com'
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name, role = EXCLUDED.role,
  pharmacy_id = EXCLUDED.pharmacy_id, is_active = EXCLUDED.is_active,
  updated_at = now();

-- =============================================================================
-- VÉRIFICATION FINALE
-- =============================================================================
DO $$
DECLARE
  v_total INTEGER;
  v_admin INTEGER;
  v_pharmacy INTEGER;
  v_orphans INTEGER;
BEGIN
  -- Compter les profils créés
  SELECT COUNT(*) INTO v_total FROM public.profiles;
  SELECT COUNT(*) INTO v_admin FROM public.profiles WHERE role = 'main_requisitionist';
  SELECT COUNT(*) INTO v_pharmacy FROM public.profiles WHERE role = 'pharmacy_user';
  
  -- Compter les utilisateurs sans profil
  SELECT COUNT(*) INTO v_orphans
  FROM auth.users u
  WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = u.id);

  RAISE NOTICE '=============================================';
  RAISE NOTICE '  RÉSUMÉ DE LA CONFIGURATION';
  RAISE NOTICE '=============================================';
  RAISE NOTICE '  Total profils   : %', v_total;
  RAISE NOTICE '  Administrateurs : %', v_admin;
  RAISE NOTICE '  Pharmacies     : %', v_pharmacy;
  RAISE NOTICE '  Sans profil    : %', v_orphans;
  RAISE NOTICE '---------------------------------------------';
  
  IF v_orphans > 0 THEN
    RAISE NOTICE '  ⚠ ATTENTION : % utilisateur(s) sans profil !', v_orphans;
    RAISE NOTICE '  Créez ces comptes dans Supabase Auth puis';
    RAISE NOTICE '  réexécutez ce script.';
    FOR rec IN 
      SELECT u.email FROM auth.users u
      WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = u.id)
    LOOP
      RAISE NOTICE '  → Manquant : %', rec.email;
    END LOOP;
  ELSE
    RAISE NOTICE '  ✅ Tous les comptes sont configurés !';
  END IF;
  
  RAISE NOTICE '=============================================';
  
  -- Détail par pharmacie
  RAISE NOTICE '';
  RAISE NOTICE 'DÉTAIL PAR PHARMACIE :';
  FOR rec IN
    SELECT ph.name, ph.code, p.full_name, p.email
    FROM public.profiles p
    JOIN public.pharmacies ph ON ph.id = p.pharmacy_id
    ORDER BY ph.code
  LOOP
      RAISE NOTICE '  % (%) → % [%]', rec.name, rec.code, rec.full_name, rec.email;
    END LOOP;
END $$;
