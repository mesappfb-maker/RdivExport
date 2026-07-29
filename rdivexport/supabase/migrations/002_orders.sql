-- =============================================================================
-- Migration 002 – Commandes (orders) et lignes de commande (order_items)
-- Systeme de commande de produits du depot par les pharmacies
-- =============================================================================

-- ─── Table : orders ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.orders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_number   TEXT UNIQUE NOT NULL,
  pharmacy_id       UUID NOT NULL REFERENCES public.pharmacies(id),
  status            TEXT NOT NULL DEFAULT 'pending',
  total_amount      NUMERIC(12, 2) DEFAULT 0,
  comment           TEXT,
  confirmed_by      UUID REFERENCES public.profiles(user_id),
  confirmed_at      TIMESTAMPTZ,
  cancelled_by      UUID REFERENCES public.profiles(user_id),
  cancelled_at      TIMESTAMPTZ,
  cancel_reason     TEXT,
  created_by        UUID NOT NULL REFERENCES public.profiles(user_id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT orders_status_check CHECK (
    status IN ('pending', 'confirmed', 'partially_delivered', 'delivered', 'cancelled')
  )
);

COMMENT ON TABLE public.orders IS 'Commandes de produits du depot par les pharmacies';
COMMENT ON COLUMN public.orders.reference_number IS 'Reference unique auto-generee (ex: CMD-20250101-0001)';
COMMENT ON COLUMN public.orders.status IS 'Statut : pending (en attente), confirmed (confirmee), partially_delivered (livraison partielle), delivered (livree), cancelled (annulee)';
COMMENT ON COLUMN public.orders.total_amount IS 'Montant total de la commande';

-- ─── Table : order_items ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.order_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id        UUID NOT NULL REFERENCES public.products(id),
  quantity_ordered  INTEGER NOT NULL,
  unit_price        NUMERIC(12, 2) NOT NULL DEFAULT 0,
  quantity_delivered INTEGER NOT NULL DEFAULT 0,
  comment           TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT order_items_quantity_check CHECK (quantity_ordered > 0),
  CONSTRAINT order_items_price_check CHECK (unit_price >= 0),
  CONSTRAINT order_items_delivered_check CHECK (quantity_delivered >= 0)
);

COMMENT ON TABLE public.order_items IS 'Lignes de detail de chaque commande';
COMMENT ON COLUMN public.order_items.quantity_ordered IS 'Quantite commandee par la pharmacie (strictement positive)';
COMMENT ON COLUMN public.order_items.unit_price IS 'Prix unitaire au moment de la commande';
COMMENT ON COLUMN public.order_items.quantity_delivered IS 'Quantite effectivement livree';

-- ─── Index ─────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_orders_pharmacy_id ON public.orders (pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_pharmacy_status ON public.orders (pharmacy_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_reference ON public.orders (reference_number);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items (product_id);

-- ─── Triggers updated_at ──────────────────────────────────────────────────────

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_order_items_updated_at
  BEFORE UPDATE ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- ─── Orders RLS ──────────────────────────────────────────────────────────────

-- pharmacy_user : lire les commandes de sa pharmacie, creer des commandes pour sa pharmacie
CREATE POLICY "orders_select_own_pharmacy" ON public.orders
  FOR SELECT USING (
    pharmacy_id IN (
      SELECT pharmacy_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- main_requisitionist : lire toutes les commandes
CREATE POLICY "orders_select_all_requisitionist" ON public.orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'main_requisitionist'
    )
  );

-- pharmacy_user : inserer une commande pour sa pharmacie
CREATE POLICY "orders_insert_own" ON public.orders
  FOR INSERT WITH CHECK (
    created_by = auth.uid() AND
    pharmacy_id IN (
      SELECT pharmacy_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- main_requisitionist : modifier toutes les commandes
CREATE POLICY "orders_update_requisitionist" ON public.orders
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'main_requisitionist'
    )
  );

-- ─── Order Items RLS ────────────────────────────────────────────────────────

-- pharmacy_user : lire les items de ses commandes
CREATE POLICY "order_items_select_via_order" ON public.order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND (
        o.pharmacy_id IN (SELECT pharmacy_id FROM public.profiles WHERE id = auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'main_requisitionist'
        )
      )
    )
  );

-- pharmacy_user : inserer des items dans ses propres commandes
CREATE POLICY "order_items_insert_via_order" ON public.order_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND o.created_by = auth.uid()
    )
  );

-- main_requisitionist : modifier tous les items
CREATE POLICY "order_items_update_requisitionist" ON public.order_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'main_requisitionist'
      )
    )
  );
