---
Task ID: 4
Agent: Super Z (main)
Task: PWA install prompt, requition naming, edit/delete/cancel, FK fix, pharmacy editing, account creation

Work Log:
- Created `src/hooks/usePWAInstall.ts` - hook to detect and prompt PWA installation (Android + iOS)
- Updated `src/components/Layout.tsx` - added PWA install banner that shows after 3 seconds on mobile
- Updated `src/utils/formatters.ts` - `generateReferenceNumber` now accepts pharmacy code + daily counter (format: REQ-YYYYMMDD-CODE01)
- Updated `src/services/requisitions.service.ts` - fetches pharmacy code + today's count for reference; added `updateRequisitionItems` function
- Rewrote `src/pages/RequisitionDetailPage.tsx` - full edit mode (modify items/quantities/comment for pending requisitions), delete for cancelled requisitions
- Updated `src/pages/CreateRequisitionPage.tsx` - better error handling for manual product creation (fallback to null product_id)
- Rewrote `src/pages/SettingsPage.tsx` - pharmacy phone/whatsapp editing, account creation dialog (centralisateur, depot, pharmacy), pharmacies list
- Updated `public/sw.js` - bumped cache version to v3
- Created `supabase-migrations/fix-all-v2.sql` - comprehensive migration:
  - Drop/recreate FK on requisition_items.product_id with ON DELETE SET NULL
  - RLS policy for any auth user to insert products
  - Expanded role CHECK constraint (centralisateur, depot_user)
  - Delete RLS for pending/draft/cancelled requisitions
  - Centralisateur RLS policies (select/update requisitions and items)
  - app_settings table + RLS (idempotent)
  - is_active column on profiles (idempotent)
  - Update KOLWEZI 2 phone number
- Build: 0 errors, deployed to GitHub → Cloudflare Pages

Stage Summary:
- PWA install banner shows on mobile (Android: "Installer" button, iOS: instructions)
- Requisition refs now use format REQ-20260730-KLW01 (pharmacy code + counter)
- Pending/draft requisitions can be modified (edit items, quantities, comment)
- Cancelled requisitions can be deleted
- Manual product FK error fixed: RLS allows product inserts + graceful fallback to null product_id
- Pharmacy phone/WhatsApp editable from admin settings
- Centralisateur/depot accounts can be created from UI (no SQL needed)
- Migration SQL must be executed in Supabase Dashboard > SQL Editor
