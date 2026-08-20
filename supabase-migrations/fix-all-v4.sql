-- =============================================================================
-- RdivExport – Migration v4 (idempotent)
-- Fixes: Account management - admin can INSERT/DELETE profiles,
--         cleanup Auth users for deleted accounts,
--         password reset redirect URL support
-- Date: 2026-08-20
-- =============================================================================
-- Exécuter ce script dans Supabase Dashboard > SQL Editor
-- =============================================================================

-- ─── 1. Autoriser l'admin (main_requisitionist) à insérer des profils ───────
--     Nécessaire car les triggers peuvent ne pas fonctionner ou être absents.
DO $$ BEGIN
  CREATE POLICY "profiles_insert_admin" ON public.profiles
    FOR INSERT WITH CHECK (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'main_requisitionist')
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 2. Autoriser l'admin à supprimer des profils ───────────────────────────
--     Permet la suppression réelle quand on veut recréer un compte avec le même email.
DO $$ BEGIN
  CREATE POLICY "profiles_delete_admin" ON public.profiles
    FOR DELETE USING (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'main_requisitionist')
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 3. Supprimer l'utilisateur Auth pour les comptes marqués [Supprimé] ─────
--     ATTENTION: Cette partie doit être exécutée par un administrateur Supabase.
--     Le Dashboard SQL Editor a accès au service_role par défaut.
--     Pour chaque profil marqué [Supprimé] et inactif, on tente de supprimer
--     l'utilisateur correspondant dans auth.users.

DO $$
DECLARE
  v_record RECORD;
  v_deleted_count INTEGER := 0;
  v_error_msg TEXT;
BEGIN
  FOR v_record IN
    SELECT id, full_name, email
    FROM public.profiles
    WHERE is_active = false
      AND full_name LIKE '[Supprimé]%'
  LOOP
    BEGIN
      -- Supprimer l'utilisateur dans auth.users
      DELETE FROM auth.users WHERE id = v_record.id;
      v_deleted_count := v_deleted_count + 1;
      RAISE NOTICE 'Utilisateur Auth supprimé: % (%)', v_record.email, v_record.full_name;

      -- Supprimer le profil maintenant que l'utilisateur Auth est parti
      DELETE FROM public.profiles WHERE id = v_record.id;
      RAISE NOTICE 'Profil supprimé: %', v_record.email;
    EXCEPTION WHEN OTHERS THEN
      v_error_msg := SQLERRM;
      RAISE NOTICE 'Impossible de supprimer l''utilisateur % (%): %', v_record.email, v_record.id, v_error_msg;
    END;
  END LOOP;

  RAISE NOTICE '=== Nettoyage terminé: % utilisateur(s) Auth supprimé(s) ===', v_deleted_count;
END $$;

-- ─── 4. Configurer le Site URL pour le mot de passe oublié ───────────────────
--     Assurez-vous que dans Supabase Dashboard > Authentication > URL Configuration:
--     - Site URL: votre domaine Cloudflare Pages (ex: https://rdivexport.pages.dev)
--     - Redirect URLs: ajoutez https://rdivexport.pages.dev/**
--     Si votre URL est différente, modifiez les valeurs ci-dessous :

-- Décommentez et modifiez si nécessaire (nécessite les droits admin) :
-- UPDATE auth.config SET value = 'https://votre-domaine.pages.dev' WHERE key = 'SITE_URL';
-- INSERT INTO auth.config (key, value) VALUES ('EXTERNAL_REDIRECT_URLS', 'https://votre-domaine.pages.dev/**')
--   ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- ─── 5. Vérification ────────────────────────────────────────────────────────
SELECT 'Migration v4 terminée avec succès' AS status;
