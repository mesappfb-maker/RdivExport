-- ================================================================
-- RdivExport - Migration complète
-- À exécuter dans le SQL Editor de Supabase
-- https://supabase.com/dashboard → SQL Editor → New query
-- ================================================================

-- ================================================================
-- 1. AJOUTER la colonne is_active à la table profiles
-- ================================================================
DO $$ BEGIN
  ALTER TABLE profiles ADD COLUMN is_active boolean NOT NULL DEFAULT true;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- ================================================================
-- 2. CRÉER la table app_settings (si elle n'existe pas)
-- ================================================================
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT app_settings_key_unique UNIQUE (key)
);

-- ================================================================
-- 3. RLS sur app_settings
-- ================================================================
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "app_settings_select_all"
    ON app_settings FOR SELECT TO authenticated
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "app_settings_insert_admin"
    ON app_settings FOR INSERT TO authenticated
    WITH CHECK (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'main_requisitionist')
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "app_settings_update_admin"
    ON app_settings FOR UPDATE TO authenticated
    USING (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'main_requisitionist')
    )
    WITH CHECK (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'main_requisitionist')
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ================================================================
-- 4. RLS DELETE sur requisitions
-- ================================================================
DO $$ BEGIN
  CREATE POLICY "requisitions_delete"
    ON requisitions FOR DELETE TO authenticated
    USING (
      created_by = auth.uid() AND status IN ('pending', 'draft')
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'main_requisitionist')
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ================================================================
-- 5. RLS DELETE sur requisition_items
-- ================================================================
DO $$ BEGIN
  CREATE POLICY "requisition_items_delete"
    ON requisition_items FOR DELETE TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM requisitions
        WHERE requisitions.id = requisition_items.requisition_id
        AND (
          (requisitions.created_by = auth.uid() AND requisitions.status IN ('pending', 'draft'))
          OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'main_requisitionist')
        )
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ================================================================
-- 6. RLS UPDATE sur profiles (pour is_active)
-- ================================================================
DO $$ BEGIN
  CREATE POLICY "profiles_update_admin"
    ON profiles FOR UPDATE TO authenticated
    USING (
      -- Un superviseur peut modifier n'importe quel profil
      EXISTS (SELECT 1 FROM profiles p2 WHERE p2.id = auth.uid() AND p2.role = 'main_requisitionist')
      -- Un utilisateur peut modifier son propre profil
      OR id = auth.uid()
    )
    WITH CHECK (
      EXISTS (SELECT 1 FROM profiles p2 WHERE p2.id = auth.uid() AND p2.role = 'main_requisitionist')
      OR id = auth.uid()
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ================================================================
-- 7. Vérification : afficher les résultats
-- ================================================================
SELECT 'app_settings table OK' AS status
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'app_settings');

SELECT 'is_active column OK' AS status
WHERE EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_name = 'profiles' AND column_name = 'is_active'
);
