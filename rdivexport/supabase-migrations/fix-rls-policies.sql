-- ================================================================
-- RdivExport - Correction des politiques RLS
-- À exécuter dans le SQL Editor de Supabase (https://supabase.com/dashboard)
-- ================================================================

-- 1. Activer RLS sur app_settings si pas déjà fait
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- 2. Supprimer les anciennes policies si elles existent (à ignorer si erreur)
DROP POLICY IF EXISTS "App settings select for authenticated" ON app_settings;
DROP POLICY IF EXISTS "App settings insert for admin" ON app_settings;
DROP POLICY IF EXISTS "App settings update for admin" ON app_settings;

-- 3. Créer les nouvelles policies pour app_settings
-- Tout utilisateur authentifié peut lire
CREATE POLICY "App settings select for authenticated"
  ON app_settings FOR SELECT
  TO authenticated
  USING (true);

-- Seul le superviseur peut insérer
CREATE POLICY "App settings insert for admin"
  ON app_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'main_requisitionist'
      AND profiles.is_active = true
    )
  );

-- Seul le superviseur peut mettre à jour
CREATE POLICY "App settings update for admin"
  ON app_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'main_requisitionist'
      AND profiles.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'main_requisitionist'
      AND profiles.is_active = true
    )
  );

-- ================================================================
-- 4. Vérifier et ajouter les policies DELETE sur requisitions
-- ================================================================
DROP POLICY IF EXISTS "Requisitions delete for owner" ON requisitions;
DROP POLICY IF EXISTS "Requisitions delete for admin" ON requisitions;

-- Le créateur de la réquisition peut supprimer (seulement si pending/draft)
CREATE POLICY "Requisitions delete for owner"
  ON requisitions FOR DELETE
  TO authenticated
  USING (
    -- Soit c'est le créateur et le statut est pending/draft
    (created_by = auth.uid() AND status IN ('pending', 'draft'))
    -- Soit c'est un superviseur
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'main_requisitionist'
      AND profiles.is_active = true
    )
  );

-- ================================================================
-- 5. Vérifier et ajouter les policies DELETE sur requisition_items
-- ================================================================
DROP POLICY IF EXISTS "Requisition items delete for owner" ON requisition_items;
DROP POLICY IF EXISTS "Requisition items delete for admin" ON requisition_items;

-- Suppression des items liés à une réquisition supprimable
CREATE POLICY "Requisition items delete for owner"
  ON requisition_items FOR DELETE
  TO authenticated
  USING (
    -- Si la réquisition parente peut être supprimée par l'utilisateur
    EXISTS (
      SELECT 1 FROM requisitions
      WHERE requisitions.id = requisition_items.requisition_id
      AND (
        (requisitions.created_by = auth.uid() AND requisitions.status IN ('pending', 'draft'))
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'main_requisitionist'
          AND profiles.is_active = true
        )
      )
    )
  );

-- ================================================================
-- 6. Vérifier que la contrainte unique existe sur app_settings.key
-- ================================================================
-- Si la table n'a pas de contrainte unique sur 'key', ajoutez-la :
-- ALTER TABLE app_settings ADD CONSTRAINT app_settings_key_unique UNIQUE (key);
