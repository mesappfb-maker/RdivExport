-- =============================================================================
-- RdivExport – Schéma de base de données Supabase
-- Gestion de réquisitions pharmaceutiques
-- =============================================================================
-- Version : 1.0.0
-- Base    : PostgreSQL 15+ / Supabase
-- =============================================================================

-- ─── Extensions requises ─────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pg_trgm;      -- Recherche floue (trigram)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";  -- Génération d'UUID

-- =============================================================================
-- TABLE : pharmacies
-- Liste des pharmacies partenaires
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.pharmacies (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,                          -- Nom de la pharmacie
  code           TEXT UNIQUE,                             -- Code court unique
  address        TEXT,                                   -- Adresse physique
  phone          TEXT,                                   -- Numéro de téléphone
  whatsapp_number TEXT,                                  -- Numéro WhatsApp (format international)
  email          TEXT,                                   -- Adresse e-mail
  is_active      BOOLEAN NOT NULL DEFAULT true,          -- Pharmacie active/inactive
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),      -- Date de création
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()      -- Date de dernière mise à jour
);

COMMENT ON TABLE public.pharmacies IS 'Répertoire des pharmacies partenaires du réseau de distribution';
COMMENT ON COLUMN public.pharmacies.id IS 'Identifiant unique de la pharmacie';
COMMENT ON COLUMN public.pharmacies.name IS 'Nom complet de la pharmacie';
COMMENT ON COLUMN public.pharmacies.code IS 'Code abrégé unique pour les références internes';
COMMENT ON COLUMN public.pharmacies.whatsapp_number IS 'Numéro WhatsApp au format international (ex: +243812345678)';
COMMENT ON COLUMN public.pharmacies.is_active IS 'Indique si la pharmacie est active dans le système';

-- =============================================================================
-- TABLE : profiles
-- Profils utilisateurs liés aux comptes Supabase Auth
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name    TEXT,                                     -- Nom complet de l'utilisateur
  email        TEXT,                                     -- Adresse e-mail (copie de auth.users)
  phone        TEXT,                                     -- Numéro de téléphone
  role         TEXT NOT NULL,                            -- Rôle : pharmacy_user ou main_requisitionist
  pharmacy_id  UUID REFERENCES public.pharmacies(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT profiles_role_check CHECK (role IN ('pharmacy_user', 'main_requisitionist'))
);

COMMENT ON TABLE public.profiles IS 'Profils utilisateurs liés aux comptes d''authentification Supabase';
COMMENT ON COLUMN public.profiles.role IS 'Rôle de l''utilisateur : pharmacy_user (pharmacien) ou main_requisitionist (réquisitionniste principal)';
COMMENT ON COLUMN public.profiles.pharmacy_id IS 'Pharmacie associée (NULL pour les requisitionnistes)';

-- =============================================================================
-- TABLE : products
-- Catalogue de produits pharmaceutiques
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.products (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,                      -- Nom du produit
  main_depot_stock    INTEGER NOT NULL DEFAULT 0,        -- Stock disponible au dépôt principal
  unit                TEXT NOT NULL DEFAULT 'unité',    -- Unité de mesure
  category            TEXT,                               -- Catégorie du produit
  min_stock_threshold INTEGER NOT NULL DEFAULT 0,        -- Seuil minimum de stock pour alertes
  is_active           BOOLEAN NOT NULL DEFAULT true,     -- Produit actif/inactif
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.products IS 'Catalogue complet des produits pharmaceutiques disponibles';
COMMENT ON COLUMN public.products.name IS 'Nom du produit (médicament, consommable, etc.)';
COMMENT ON COLUMN public.products.main_depot_stock IS 'Quantité en stock au dépôt principal';
COMMENT ON COLUMN public.products.unit IS 'Unité de mesure (unité, boîte, flacon, etc.)';
COMMENT ON COLUMN public.products.min_stock_threshold IS 'Seuil en dessous duquel une alerte de rupture est déclenchée';

-- =============================================================================
-- TABLE : requisitions
-- Réquisitions (demandes) de produits par les pharmacies
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.requisitions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_number TEXT UNIQUE NOT NULL,                  -- Référence unique de la réquisition
  pharmacy_id      UUID NOT NULL REFERENCES public.pharmacies(id),
  created_by       UUID REFERENCES auth.users(id),       -- Utilisateur qui a créé la réquisition
  status           TEXT NOT NULL DEFAULT 'draft',        -- Statut de la réquisition
  comment          TEXT,                                  -- Commentaire / note du demandeur
  validated_by     UUID REFERENCES auth.users(id),         -- Utilisateur qui a validé
  validated_at     TIMESTAMPTZ,                            -- Date de validation
  delivered_by     UUID REFERENCES auth.users(id),         -- Livreur
  delivered_at     TIMESTAMPTZ,                            -- Date de livraison
  cancelled_by     UUID REFERENCES auth.users(id),         -- Utilisateur qui a annulé
  cancelled_at     TIMESTAMPTZ,                            -- Date d'annulation
  cancel_reason    TEXT,                                  -- Raison de l'annulation
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT requisitions_status_check CHECK (
    status IN ('draft', 'pending', 'validated', 'delivered', 'cancelled')
  )
);

COMMENT ON TABLE public.requisitions IS 'Demandes de produits émises par les pharmacies';
COMMENT ON COLUMN public.requisitions.reference_number IS 'Référence unique auto-générée (ex: REQ-2024-0001)';
COMMENT ON COLUMN public.requisitions.status IS 'Statut : draft (brouillon), pending (en attente), validated (validée), delivered (livrée), cancelled (annulée)';

-- =============================================================================
-- TABLE : requisition_items
-- Lignes de chaque réquisition (produits demandés)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.requisition_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requisition_id    UUID NOT NULL REFERENCES public.requisitions(id) ON DELETE CASCADE,
  product_id        UUID REFERENCES public.products(id),
  product_name      TEXT NOT NULL,                        -- Nom du produit (snapshot pour historique)
  quantity_requested INTEGER NOT NULL,                     -- Quantité demandée
  quantity_delivered INTEGER NOT NULL DEFAULT 0,          -- Quantité effectivement livrée
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT requisition_items_quantity_check CHECK (quantity_requested > 0)
);

COMMENT ON TABLE public.requisition_items IS 'Lignes de détail de chaque réquisition';
COMMENT ON COLUMN public.requisition_items.product_name IS 'Nom du produit dupliqué pour conservation de l''historique';
COMMENT ON COLUMN public.requisition_items.quantity_requested IS 'Quantité demandée par la pharmacie (strictement positive)';

-- =============================================================================
-- TABLE : delivery_checklists
-- Bordereaux de livraison
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.delivery_checklists (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requisition_id  UUID UNIQUE REFERENCES public.requisitions(id),
  items_checked   JSONB NOT NULL DEFAULT '[]'::jsonb,     -- Liste des articles vérifiés avec quantités
  delivered_by    UUID REFERENCES auth.users(id),         -- Personne ayant effectué la livraison
  signed_at       TIMESTAMPTZ,                            -- Date/heure de signature
  notes           TEXT,                                   -- Notes de livraison
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.delivery_checklists IS 'Bordereaux de livraison associés aux réquisitions';
COMMENT ON COLUMN public.delivery_checklists.items_checked IS 'JSONB contenant les articles vérifiés avec quantités livrées et statut de vérification';

-- =============================================================================
-- TABLE : audit_logs
-- Journal d'audit de toutes les actions importantes
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id),              -- Utilisateur ayant effectué l'action
  action      TEXT NOT NULL,                              -- Type d'action
  entity_type TEXT,                                       -- Type d'entité concernée
  entity_id   UUID,                                       -- Identifiant de l'entité
  details     JSONB,                                      -- Détails supplémentaires (JSON)
  ip_address  TEXT,                                       -- Adresse IP de l'utilisateur
  user_agent  TEXT,                                       -- User-Agent du navigateur
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.audit_logs IS 'Journal d''audit traçant toutes les actions importantes du système';
COMMENT ON COLUMN public.audit_logs.action IS 'Type d''action : create, update, delete, status_change, validate, deliver, cancel, login, logout';
COMMENT ON COLUMN public.audit_logs.entity_type IS 'Type d''entité : requisition, requisition_item, delivery_checklist, product, pharmacy, profile';
COMMENT ON COLUMN public.audit_logs.details IS 'Détails additionnels de l''action au format JSON';

-- =============================================================================
-- INDEX
-- =============================================================================

-- Produits : recherche par nom (trigram pour fuzzy search)
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON public.products USING gin (name gin_trgm_ops);

-- Produits : recherche active
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products (is_active);

-- Réquisitions : filtres courants
CREATE INDEX IF NOT EXISTS idx_requisitions_pharmacy_id ON public.requisitions (pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_requisitions_status ON public.requisitions (status);
CREATE INDEX IF NOT EXISTS idx_requisitions_created_at ON public.requisitions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_requisitions_pharmacy_status ON public.requisitions (pharmacy_id, status);

-- Lignes de réquisition
CREATE INDEX IF NOT EXISTS idx_requisition_items_requisition_id ON public.requisition_items (requisition_id);
CREATE INDEX IF NOT EXISTS idx_requisition_items_product_id ON public.requisition_items (product_id);

-- Profils
CREATE INDEX IF NOT EXISTS idx_profiles_pharmacy_id ON public.profiles (pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);

-- Audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON public.audit_logs (entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs (entity_type, entity_id);

-- =============================================================================
-- MISE À JOUR AUTOMATIQUE DE updated_at
-- Trigger pour mettre à jour le champ updated_at automatiquement
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Application du trigger sur les tables qui ont un updated_at
CREATE TRIGGER trg_pharmacies_updated_at
  BEFORE UPDATE ON public.pharmacies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_requisitions_updated_at
  BEFORE UPDATE ON public.requisitions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- AUTO-CRÉATION DU PROFIL LORS DE L'INSCRIPTION
-- Trigger qui crée automatiquement une entrée dans profiles quand
-- un nouvel utilisateur est créé dans auth.users.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.email, ''),
    COALESCE(
      NEW.raw_user_meta_data->>'role',
      'pharmacy_user'  -- rôle par défaut
    )::text
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- Activation et politiques de sécurité
-- =============================================================================

-- Activer RLS sur toutes les tables
ALTER TABLE public.pharmacies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requisition_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ─── Profils ──────────────────────────────────────────────────────────────────
-- Un utilisateur peut lire et modifier uniquement son propre profil
-- Un main_requisitionist peut lire tous les profils

CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_select_all_for_requisitionist" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'main_requisitionist'
    )
  );

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ─── Pharmacies ──────────────────────────────────────────────────────────────
-- Tous les utilisateurs authentifiés peuvent lire les pharmacies actives

CREATE POLICY "pharmacies_select_active" ON public.pharmacies
  FOR SELECT USING (is_active = true);

-- Seul un main_requisitionist peut créer/modifier des pharmacies
CREATE POLICY "pharmacies_insert_requisitionist" ON public.pharmacies
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'main_requisitionist'
    )
  );

CREATE POLICY "pharmacies_update_requisitionist" ON public.pharmacies
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'main_requisitionist'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'main_requisitionist'
    )
  );

-- ─── Produits ───────────────────────────────────────────────────────────────
-- Tous les utilisateurs authentifiés peuvent lire les produits actifs
-- Seul un main_requisitionist peut gérer le catalogue

CREATE POLICY "products_select_active" ON public.products
  FOR SELECT USING (is_active = true);

CREATE POLICY "products_select_all_requisitionist" ON public.products
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'main_requisitionist'
    )
  );

CREATE POLICY "products_insert_requisitionist" ON public.products
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'main_requisitionist'
    )
  );

CREATE POLICY "products_update_requisitionist" ON public.products
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'main_requisitionist'
    )
  );

-- ─── Réquisitions ──────────────────────────────────────────────────────────
-- pharmacy_user : CRUD sur les réquisitions de sa propre pharmacie
-- main_requisitionist : lecture de toutes les réquisitions, modification complète

CREATE POLICY "requisitions_select_own_pharmacy" ON public.requisitions
  FOR SELECT USING (
    pharmacy_id IN (
      SELECT pharmacy_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "requisitions_select_all_requisitionist" ON public.requisitions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'main_requisitionist'
    )
  );

CREATE POLICY "requisitions_insert_own" ON public.requisitions
  FOR INSERT WITH CHECK (
    created_by = auth.uid() AND
    pharmacy_id IN (
      SELECT pharmacy_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "requisitions_update_own" ON public.requisitions
  FOR UPDATE USING (
    created_by = auth.uid() AND
    pharmacy_id IN (
      SELECT pharmacy_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "requisitions_update_requisitionist" ON public.requisitions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'main_requisitionist'
    )
  );

CREATE POLICY "requisitions_delete_own" ON public.requisitions
  FOR DELETE USING (
    created_by = auth.uid() AND
    status = 'draft'
  );

-- ─── Lignes de réquisition ──────────────────────────────────────────────────
-- Accès via jointure avec la réquisition parente

CREATE POLICY "requisition_items_select_via_requisition" ON public.requisition_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.requisitions r
      WHERE r.id = requisition_id AND (
        r.pharmacy_id IN (SELECT pharmacy_id FROM public.profiles WHERE id = auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'main_requisitionist'
        )
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
        r.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'main_requisitionist'
        )
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

-- ─── Bordereaux de livraison ────────────────────────────────────────────────
-- Accès complet pour main_requisitionist uniquement

CREATE POLICY "delivery_checklists_all_requisitionist" ON public.delivery_checklists
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'main_requisitionist'
    )
  );

-- Les pharmacy_user peuvent lire les bordereaux de leur pharmacie
CREATE POLICY "delivery_checklists_select_own" ON public.delivery_checklists
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.requisitions r
      WHERE r.id = requisition_id AND r.pharmacy_id IN (
        SELECT pharmacy_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

-- ─── Audit logs ──────────────────────────────────────────────────────────────
-- main_requisitionist : lecture de tous les logs
-- pharmacy_user : lecture de ses propres logs uniquement

CREATE POLICY "audit_logs_select_all_requisitionist" ON public.audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'main_requisitionist'
    )
  );

CREATE POLICY "audit_logs_select_own" ON public.audit_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "audit_logs_insert_all" ON public.audit_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- DONNÉES INITIALES : Pharmacies du réseau RdivExport
-- =============================================================================

INSERT INTO public.pharmacies (name, code, address, phone, whatsapp_number, email, is_active) VALUES
  ('HEWABORA 1',       'HW1', 'Bukavu',       '+243991234501', '+243811234501', 'hewabora1@rdivexport.com',   true),
  ('HEWABORA 2',       'HW2', 'Bukavu',       '+243991234502', '+243811234502', 'hewabora2@rdivexport.com',   true),
  ('DELA',             'DLA', 'Bukavu',       '+243991234503', '+243811234503', 'dela@rdivexport.com',         true),
  ('PHARMAFRICA',      'PFA', 'Bukavu',       '+243991234504', '+243811234504', 'pharmafrica@rdivexport.com',  true),
  ('KASAI',            'KAS', 'Bukavu',       '+243991234505', '+243811234505', 'kasai@rdivexport.com',        true),
  ('BIAYI',            'BIY', 'Bukavu',       '+243991234506', '+243811234506', 'biayi@rdivexport.com',        true),
  ('KOLWEZI 1',        'KW1', 'Kolwezi',      '+243991234507', '+243811234507', 'kolwezi1@rdivexport.com',     true),
  ('KOLWEZI 2',        'KW2', 'Kolwezi',      '+243991234508', '+243811234508', 'kolwezi2@rdivexport.com',     true),
  ('DEPOT',            'DPT', 'Bukavu',       '+243991234509', '+243811234509', 'depot@rdivexport.com',        true),
  ('EXPORT',           'EXP', 'Bukavu',       '+243991234510', '+243811234510', 'export@rdivexport.com',       true)
ON CONFLICT (code) DO NOTHING;

-- =============================================================================
-- FIN DU SCHÉMA
-- =============================================================================
-- Prochaines étapes :
-- 1. Exécuter ce script dans l'éditeur SQL Supabase (SQL Editor)
-- 2. Créer les utilisateurs dans Authentication > Users
-- 3. Mettre à jour les profils avec les rôles et pharmacies correspondantes
-- 4. Exécuter seed-products.sql pour importer le catalogue de produits
-- =============================================================================
