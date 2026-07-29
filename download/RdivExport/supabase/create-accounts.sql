-- =============================================================================
-- RdivExport - Creation des comptes utilisateurs et mise a jour des profils
-- =============================================================================
-- IMPORTANT : Executer CE SCRIPT APRES schema.sql
-- Les utilisateurs doivent deja etre crees dans Supabase Authentication > Users
-- =============================================================================

-- -------------------------------------------------------------------------------
-- ETAPE 1 : Verifier que la table profiles existe
-- -------------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) THEN
    RAISE EXCEPTION 'La table profiles est introuvable. Executez schema.sql en premier.';
  END IF;
END $$;

-- -------------------------------------------------------------------------------
-- ETAPE 2 : Mise a jour des profils existants
-- La colonne PK s'appelle 'id' (pas 'user_id')
-- Les profils sont crees automatiquement par le trigger trg_on_auth_user_created
-- quand vous creez un utilisateur dans Authentication > Users.
-- Ce script met uniquement a jour le role et la pharmacie associee.
-- -------------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- ADMIN / Requisitionniste principal
-- ---------------------------------------------------------------------------

-- Remplacez 'admin@rdivexport.com' par la vraie adresse email du compte admin
UPDATE public.profiles
SET
  full_name   = 'Administrateur RdivExport',
  role        = 'main_requisitionist',
  phone       = '+243810000001',
  pharmacy_id = NULL,
  updated_at  = now()
WHERE email = 'admin@rdivexport.com'
RETURNING id, email, full_name, role;

-- ---------------------------------------------------------------------------
-- PHARMACIE : HEWABORA 1 (code: HW1)
-- ---------------------------------------------------------------------------

-- Remplacez par la vraie adresse email du pharmacien HW1
UPDATE public.profiles
SET
  full_name   = 'Pharmacien HEWABORA 1',
  role        = 'pharmacy_user',
  phone       = '+243811234501',
  pharmacy_id = (SELECT id FROM public.pharmacies WHERE code = 'HW1' LIMIT 1),
  updated_at  = now()
WHERE email = 'hewabora1@rdivexport.com'
RETURNING id, email, full_name, role, pharmacy_id;

-- ---------------------------------------------------------------------------
-- PHARMACIE : HEWABORA 2 (code: HW2)
-- ---------------------------------------------------------------------------

UPDATE public.profiles
SET
  full_name   = 'Pharmacien HEWABORA 2',
  role        = 'pharmacy_user',
  phone       = '+243811234502',
  pharmacy_id = (SELECT id FROM public.pharmacies WHERE code = 'HW2' LIMIT 1),
  updated_at  = now()
WHERE email = 'hewabora2@rdivexport.com'
RETURNING id, email, full_name, role, pharmacy_id;

-- ---------------------------------------------------------------------------
-- PHARMACIE : DELA (code: DLA)
-- ---------------------------------------------------------------------------

UPDATE public.profiles
SET
  full_name   = 'Pharmacien DELA',
  role        = 'pharmacy_user',
  phone       = '+243811234503',
  pharmacy_id = (SELECT id FROM public.pharmacies WHERE code = 'DLA' LIMIT 1),
  updated_at  = now()
WHERE email = 'dela@rdivexport.com'
RETURNING id, email, full_name, role, pharmacy_id;

-- ---------------------------------------------------------------------------
-- PHARMACIE : PHARMAFRICA (code: PFA)
-- ---------------------------------------------------------------------------

UPDATE public.profiles
SET
  full_name   = 'Pharmacien PHARMAFRICA',
  role        = 'pharmacy_user',
  phone       = '+243811234504',
  pharmacy_id = (SELECT id FROM public.pharmacies WHERE code = 'PFA' LIMIT 1),
  updated_at  = now()
WHERE email = 'pharmafrica@rdivexport.com'
RETURNING id, email, full_name, role, pharmacy_id;

-- ---------------------------------------------------------------------------
-- PHARMACIE : KASAI (code: KAS)
-- ---------------------------------------------------------------------------

UPDATE public.profiles
SET
  full_name   = 'Pharmacien KASAI',
  role        = 'pharmacy_user',
  phone       = '+243811234505',
  pharmacy_id = (SELECT id FROM public.pharmacies WHERE code = 'KAS' LIMIT 1),
  updated_at  = now()
WHERE email = 'kasai@rdivexport.com'
RETURNING id, email, full_name, role, pharmacy_id;

-- ---------------------------------------------------------------------------
-- PHARMACIE : BIAYI (code: BIY)
-- ---------------------------------------------------------------------------

UPDATE public.profiles
SET
  full_name   = 'Pharmacien BIAYI',
  role        = 'pharmacy_user',
  phone       = '+243811234506',
  pharmacy_id = (SELECT id FROM public.pharmacies WHERE code = 'BIY' LIMIT 1),
  updated_at  = now()
WHERE email = 'biayi@rdivexport.com'
RETURNING id, email, full_name, role, pharmacy_id;

-- ---------------------------------------------------------------------------
-- PHARMACIE : KOLWEZI 1 (code: KW1)
-- ---------------------------------------------------------------------------

UPDATE public.profiles
SET
  full_name   = 'Pharmacien KOLWEZI 1',
  role        = 'pharmacy_user',
  phone       = '+243811234507',
  pharmacy_id = (SELECT id FROM public.pharmacies WHERE code = 'KW1' LIMIT 1),
  updated_at  = now()
WHERE email = 'kolwezi1@rdivexport.com'
RETURNING id, email, full_name, role, pharmacy_id;

-- ---------------------------------------------------------------------------
-- PHARMACIE : KOLWEZI 2 (code: KW2)
-- ---------------------------------------------------------------------------

UPDATE public.profiles
SET
  full_name   = 'Pharmacien KOLWEZI 2',
  role        = 'pharmacy_user',
  phone       = '+243811234508',
  pharmacy_id = (SELECT id FROM public.pharmacies WHERE code = 'KW2' LIMIT 1),
  updated_at  = now()
WHERE email = 'kolwezi2@rdivexport.com'
RETURNING id, email, full_name, role, pharmacy_id;

-- =============================================================================
-- INSTRUCTIONS :
-- 1. Creer les utilisateurs dans Supabase > Authentication > Users (bouton Add User)
--    - Utilisez les emails ci-dessus avec des mots de passe temporaires
-- 2. Une fois les comptes crees, executer CE SCRIPT pour mettre a jour les profils
-- 3. Les utilisateurs pourront alors se connecter avec leurs roles corrects
-- =============================================================================
