// --- RdivExport - Export Utilitaires ------------------------------------
// Export des réquisitions en Excel (CSV) et PDF.

import type { Requisition } from '@/types'
import { formatDateShort } from './formatters'

// --- CSV / Excel Export --------------------------------------------------------

export function exportRequisitionCSV(req: Requisition): void {
  const lines: string[] = []
  const pharmacyName = req.pharmacy?.name ?? 'Pharmacie inconnue'

  lines.push(`Réquisition: ${req.reference_number}`)
  lines.push(`Pharmacie: ${pharmacyName}`)
  lines.push(`Date: ${formatDateShort(req.created_at)}`)
  lines.push(`Statut: ${req.status}`)
  if (req.comment) lines.push(`Commentaire: ${req.comment}`)
  lines.push('')
  lines.push('N°;Produit;Quantité demandée;Quantité livrée;Unité')

  const items = req.items ?? []
  items.forEach((item, i) => {
    const name = item.product?.name ?? item.product_name ?? 'Inconnu'
    const unit = item.product?.unit ?? ''
    const delivered = item.quantity_delivered ?? 0
    lines.push(`${i + 1};${name};${item.quantity_requested};${delivered};${unit}`)
  })

  const totalRequested = items.reduce((s, it) => s + it.quantity_requested, 0)
  const totalDelivered = items.reduce((s, it) => s + (it.quantity_delivered ?? 0), 0)
  lines.push('')
  lines.push(`Total;${items.length} produit(s);${totalRequested};${totalDelivered}`)

  // BOM pour Excel UTF-8
  const bom = '\uFEFF'
  const csv = bom + lines.join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  downloadBlob(blob, `${req.reference_number}.csv`)
}

// --- PDF Export ---------------------------------------------------------------

export function exportRequisitionPDF(req: Requisition): void {
  const pharmacyName = req.pharmacy?.name ?? 'Pharmacie inconnue'
  const items = req.items ?? []

  let html = `<html><head><meta charset="utf-8"><style>
    @page { size: A4 portrait; margin: 20mm; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #1f2937; margin: 0; padding: 0; }
    .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #2563eb; padding-bottom: 15px; }
    .header img { height: 50px; margin-bottom: 8px; }
    .header h1 { font-size: 18px; margin: 0; color: #1f2937; }
    .header p { font-size: 11px; color: #6b7280; margin: 4px 0 0 0; }
    .info-grid { display: flex; flex-wrap: wrap; gap: 4px 24px; margin-bottom: 16px; font-size: 11px; }
    .info-grid span { color: #374151; }
    .info-grid strong { color: #1f2937; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th { background: #2563eb; color: white; padding: 8px 10px; text-align: left; font-size: 11px; }
    th:first-child { border-radius: 6px 0 0 0; }
    th:last-child { border-radius: 0 6px 0 0; }
    td { padding: 6px 10px; border-bottom: 1px solid #e5e7eb; font-size: 11px; }
    tr:nth-child(even) td { background: #f9fafb; }
    .total-row td { font-weight: bold; background: #eff6ff !important; border-top: 2px solid #2563eb; }
    .comment { margin-top: 16px; padding: 10px 12px; background: #f9fafb; border-radius: 6px; border-left: 3px solid #2563eb; }
    .footer { margin-top: 30px; text-align: center; font-size: 9px; color: #9ca3af; }
  </style></head><body>

  <div class="header">
    <h1>${req.reference_number}</h1>
    <p>${pharmacyName} &mdash; ${formatDateShort(req.created_at)}</p>
  </div>

  <div class="info-grid">
    <span><strong>Référence:</strong> ${req.reference_number}</span>
    <span><strong>Pharmacie:</strong> ${pharmacyName}</span>
    <span><strong>Date:</strong> ${formatDateShort(req.created_at)}</span>
    <span><strong>Statut:</strong> ${req.status}</span>
  </div>

  <table>
    <thead><tr><th>N°</th><th>Produit</th><th>Qté demandée</th><th>Qté livrée</th></tr></thead>
    <tbody>`

  const totalReq = items.reduce((s, it) => s + it.quantity_requested, 0)
  const totalDel = items.reduce((s, it) => s + (it.quantity_delivered ?? 0), 0)

  items.forEach((item, i) => {
    const name = item.product?.name ?? item.product_name ?? 'Inconnu'
    const unit = item.product?.unit ?? ''
    const del = item.quantity_delivered ?? 0
    html += `<tr><td>${i + 1}</td><td>${name}</td><td>${item.quantity_requested} ${unit}</td><td>${del} ${unit}</td></tr>`
  })

  html += `</tbody>
    <tfoot><tr class="total-row"><td colspan="2">Total (${items.length} produit(s))</td><td>${totalReq}</td><td>${totalDel}</td></tr></tfoot>
  </table>`

  if (req.comment) {
    html += `<div class="comment"><strong>Commentaire:</strong> ${req.comment}</div>`
  }

  html += `<div class="footer">Généré par RdivExport le ${formatDateShort(new Date().toISOString())}</div></body></html>`

  // Ouvrir dans un nouvel onglet pour impression PDF
  const win = window.open('', '_blank')
  if (win) {
    win.document.write(html)
    win.document.close()
    win.onload = () => { win.print() }
  }
}

// --- Helpers ------------------------------------------------------------------

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
