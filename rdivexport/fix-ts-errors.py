#!/usr/bin/env python3
"""Fix all TypeScript errors in RdivExport."""
import re

BASE = '/home/z/my-project/rdivexport/src'

# ============================================================
# Fix 1: ConfirmDialog.tsx - Remove unused useCallback
# ============================================================
with open(f'{BASE}/components/ConfirmDialog.tsx') as f:
    c = f.read()
c = c.replace('import { useEffect, useCallback, useRef } from \'react\'', 
          'import { useEffect, useRef } from \'react\'')
with open(f'{BASE}/components/ConfirmDialog.tsx', 'w') as f:
    f.write(c)
print('Fixed ConfirmDialog.tsx')

# ============================================================
# Fix 2: RequisitionItemRow.tsx - Remove unused formatQuantity
# ============================================================
with open(f'{BASE}/components/RequisitionItemRow.tsx') as f:
    c = f.read()
c = c.replace("import { useCallback } from 'react'\nimport { formatQuantity } from '@/utils/formatters'",
          "import { useCallback } from 'react'")
with open(f'{BASE}/components/RequisitionItemRow.tsx', 'w') as f:
    f.write(c)
print('Fixed RequisitionItemRow.tsx')

# ============================================================
# Fix 3: SearchBar.tsx - Fix touchstart/touchend handler type
# ============================================================
with open(f'{BASE}/components/SearchBar.tsx') as f:
    c = f.read()
c = c.replace(
    '    function handleClickOutside(event: MouseEvent) {',
    '    function handleClickOutside(event: Event) {'
)
with open(f'{BASE}/components/SearchBar.tsx', 'w') as f:
    f.write(c)
print('Fixed SearchBar.tsx')

# ============================================================
# Fix 4: useDeliveryChecklist.ts - Remove unused imports
# ============================================================
with open(f'{BASE}/hooks/useDeliveryChecklist.ts') as f:
    c = f.read()
c = c.replace("import type { Requisition, RequisitionItem } from '@/types'",
          "import type { Requisition } from '@/types'")
c = c.replace("import type { DeliveryChecklistItem } from '@/services/requisitions.service'\nimport { supabase } from '@/lib/supabase'",
          "import type { DeliveryChecklistItem } from '@/services/requisitions.service'")
with open(f'{BASE}/hooks/useDeliveryChecklist.ts', 'w') as f:
    f.write(c)
print('Fixed useDeliveryChecklist.ts')

# ============================================================
# Fix 5: AdminDashboard.tsx - Remove unused navigate
# ============================================================
with open(f'{BASE}/pages/AdminDashboard.tsx') as f:
    c = f.read()
c = c.replace("import { useNavigate } from 'react-router-dom'\n", '')
c = c.replace("  const navigate = useNavigate()\n\n", '')
with open(f'{BASE}/pages/AdminDashboard.tsx', 'w') as f:
    f.write(c)
print('Fixed AdminDashboard.tsx')

# ============================================================
# Fix 6: auth.service.ts - Fix onAuthStateChange return type
#        and updateProfile variable scoping
# ============================================================
with open(f'{BASE}/services/auth.service.ts') as f:
    c = f.read()

# Fix Subscription return type: onAuthStateChange should return the subscription directly
# The supabase.auth.onAuthStateChange returns { data: { subscription } }
# We need to return the subscription, not the whole object
old_onauth = '''export function onAuthStateChange(
  callback: (event: string, session: Session | null) => void
): Subscription {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session)
  })
}'''

new_onauth = '''export function onAuthStateChange(
  callback: (event: string, session: Session | null) => void
): { unsubscribe: () => void } {
  const { subscription } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session)
  })
  return { unsubscribe: () => subscription.unsubscribe() }
}'''

c = c.replace(old_onauth, new_onauth)

# Remove unused Subscription import
c = c.replace("  Subscription,\n", '')

# Fix updateProfile: variable scoping issue (data used before declaration)
# The issue is that 'data' is referenced in the .select() chain before being assigned
# We need to rename the inner destructured 'data' to avoid conflict
old_update = '''    const { data, error } = await supabase
      .from('profiles')
      .update(data)
      .eq('user_id', targetUserId)
      .select('*, pharmacies(*)')
      .single()

    if (error) {
      return { profile: null, error: error.message }
    }

    if (!data) {'''

new_update = '''    const { data: updatedProfile, error } = await supabase
      .from('profiles')
      .update(data)
      .eq('user_id', targetUserId)
      .select('*, pharmacies(*)')
      .single()

    if (error) {
      return { profile: null, error: error.message }
    }

    if (!updatedProfile) {'''

c = c.replace(old_update, new_update)

c = c.replace(
    'return { profile: mapRowToProfile(data), error: null }\n  } catch (err) {\n    const message =\n      err instanceof Error\n        ? err.message\n        : \'Erreur lors de la mise à jour du profil\'',
    'return { profile: mapRowToProfile(updatedProfile), error: null }\n  } catch (err) {\n    const message =\n      err instanceof Error\n        ? err.message\n        : \'Erreur lors de la mise à jour du profil\''
)

with open(f'{BASE}/services/auth.service.ts', 'w') as f:
    f.write(c)
print('Fixed auth.service.ts')

# ============================================================
# Fix 7: RequisitionDetailPage.tsx - Fix null checks and Element type
# ============================================================
with open(f'{BASE}/pages/RequisitionDetailPage.tsx') as f:
    c = f.read()

# Fix quantity_delivered possibly undefined
# Line 153: formatQuantity(item.quantity_delivered) -> formatQuantity(item.quantity_delivered ?? 0)
# Line 153: item.quantity_delivered > 1 -> (item.quantity_delivered ?? 0) > 1
c = c.replace(
    '{formatQuantity(item.quantity_delivered)} livre{item.quantity_delivered > 1 ? \'s\' : \'\'}',
    '{formatQuantity(item.quantity_delivered ?? 0)} livre{(item.quantity_delivered ?? 0) > 1 ? \'s\' : \'\'}'
)

# Fix ConfirmDialog message prop: Element is not assignable to string
# The cancel dialog passes JSX as the message prop, but ConfirmDialog expects string
# We need to change the message prop type in ConfirmDialog, OR change the usage
# Easier: move the input outside the ConfirmDialog message and use a simpler message
old_cancel_dialog = '''      <ConfirmDialog
        isOpen={showCancelDialog}
        title="Annuler la requisition"
        message={
          <div className="space-y-3">
            <p>Etes-vous sur de vouloir annuler cette requisition ?</p>
            <div>
              <label htmlFor="cancel-reason" className="mb-1 block text-xs font-medium text-gray-600">
                Raison de l\'annulation (optionnel)
              </label>
              <input
                id="cancel-reason"
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Indiquez la raison..."
                className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        }
        onConfirm={handleCancel}
        onCancel={() => { setShowCancelDialog(false); setCancelReason('') }}
        confirmLabel="Annuler"
        variant="warning"
      />'''

new_cancel_dialog = '''      {/* Raison d\'annulation */}
      {showCancelDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setShowCancelDialog(false); setCancelReason('') }} aria-hidden="true" />
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
              <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            <h2 className="mb-2 text-lg font-semibold text-gray-900">Annuler la requisition</h2>
            <p className="mb-4 text-sm leading-relaxed text-gray-600">Etes-vous sur de vouloir annuler cette requisition ?</p>
            <div className="mb-4">
              <label htmlFor="cancel-reason" className="mb-1 block text-xs font-medium text-gray-600">
                Raison de l\'annulation (optionnel)
              </label>
              <input
                id="cancel-reason"
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Indiquez la raison..."
                className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row-reverse sm:justify-end">
              <button
                type="button"
                onClick={handleCancel}
                className="flex h-11 min-h-[44px] items-center justify-center rounded-xl bg-yellow-500 px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
              >Annuler</button>
              <button
                type="button"
                onClick={() => { setShowCancelDialog(false); setCancelReason('') }}
                className="flex h-11 min-h-[44px] items-center justify-center rounded-xl border border-gray-300 bg-white px-5 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
              >Retour</button>
            </div>
          </div>
        </div>
      )}'''

c = c.replace(old_cancel_dialog, new_cancel_dialog)

# Remove unused ConfirmDialog import
with open(f'{BASE}/pages/RequisitionDetailPage.tsx', 'w') as f:
    f.write(c)
print('Fixed RequisitionDetailPage.tsx')

print('\nAll fixes applied!')
