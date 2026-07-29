#!/usr/bin/env python3
"""
RdivExport – Script d'importation des produits depuis un fichier Excel
=========================================================================
Lit le fichier Excel de produits et génère des instructions SQL INSERT
pour peupler la table `products` de la base de données Supabase.

Utilisation :
    python seed-products.py [chemin/vers/fichier.xlsx]

Par défaut, le fichier source est :
    /home/z/my-project/upload/liste de produit.xlsx

Le fichier SQL est généré dans :
    ./supabase/seed-products.sql
"""

import sys
import os
import csv
from io import StringIO
from pathlib import Path

def main():
    # ─── Configuration ────────────────────────────────────────────────────────
    default_input = '/home/z/my-project/upload/liste de produit.xlsx'
    output_path = Path(__file__).parent / 'seed-products.sql'

    input_path = sys.argv[1] if len(sys.argv) > 1 else default_input

    if not os.path.exists(input_path):
        print(f"❌ Fichier introuvable : {input_path}")
        print(f"   Utilisation : python {sys.argv[0]} [chemin/vers/fichier.xlsx]")
        sys.exit(1)

    # ─── Lecture du fichier Excel ──────────────────────────────────────────────
    try:
        import openpyxl
    except ImportError:
        print("❌ Le module openpyxl est requis.")
        print("   Installez-le avec : pip install openpyxl")
        sys.exit(1)

    print(f"📂 Lecture du fichier : {input_path}")
    wb = openpyxl.load_workbook(input_path, read_only=True, data_only=True)
    ws = wb.active

    if ws is None:
        print("❌ Aucune feuille active trouvée dans le fichier.")
        sys.exit(1)

    # ─── Détection des colonnes ──────────────────────────────────────────────
    rows = list(ws.iter_rows(values_only=True))
    if len(rows) < 2:
        print("❌ Le fichier est vide ou ne contient pas de données.")
        sys.exit(1)

    header = [str(cell).strip() if cell else '' for cell in rows[0]]

    # Mapping flexible des colonnes
    col_name = None
    col_stock = None

    for i, h in enumerate(header):
        h_lower = h.lower()
        if h_lower in ('product name', 'nom', 'name', 'produit', 'product', 'désignation', 'designation', 'nom du produit'):
            col_name = i
        elif h_lower in ('main depot', 'stock', 'stock principal', 'main_depot_stock', 'main depot stock', 'dépôt principal', 'depot principal'):
            col_stock = i

    if col_name is None:
        print(f"⚠️  En-têtes détectés : {header}")
        print("❌ Colonne 'Product Name' introuvable.")
        sys.exit(1)

    if col_stock is None:
        print(f"⚠️  En-têtes détectés : {header}")
        print("⚠️  Colonne 'MAIN DEPOT' introuvable. Le stock sera par défaut à 0.")
        col_stock = -1  # marqueur : pas de colonne stock

    print(f"   Colonne 'nom'        : index {col_name} ('{header[col_name]}')")
    print(f"   Colonne 'stock'      : {'index ' + str(col_stock) if col_stock >= 0 else 'non trouvée (défaut 0)'}")

    # ─── Génération du SQL ────────────────────────────────────────────────────
    lines: list[str] = []
    lines.append("-- =============================================================================")
    lines.append("-- RdivExport – Insertion des produits depuis le fichier Excel")
    lines.append(f"-- Source : {os.path.basename(input_path)}")
    lines.append(f"-- Généré automatiquement par seed-products.py")
    lines.append(f"-- Nombre total de produits : {len(rows) - 1}")
    lines.append("-- =============================================================================")
    lines.append("")
    lines.append("INSERT INTO public.products (id, name, main_depot_stock, unit, category, is_active)")
    lines.append("VALUES")

    count = 0
    skipped = 0
    values: list[str] = []

    for row_idx, row in enumerate(rows[1:], start=2):
        if not row or all(cell is None or str(cell).strip() == '' for cell in row):
            skipped += 1
            continue

        # Extraire le nom du produit
        name_cell = row[col_name] if col_name < len(row) else None
        name = str(name_cell).strip() if name_cell else ''

        if not name or name.lower() in ('', 'null', 'n/a', 'nan', 'none'):
            skipped += 1
            continue

        # Extraire le stock
        stock = 0
        if col_stock >= 0 and col_stock < len(row):
            stock_cell = row[col_stock]
            try:
                stock = int(float(str(stock_cell))) if stock_cell is not None else 0
            except (ValueError, TypeError):
                stock = 0

        # Échapper les guillemets simples dans le nom
        safe_name = name.replace("'", "''")

        values.append(f"  (gen_random_uuid(), '{safe_name}', {stock}, 'unité', NULL, true)")
        count += 1

    if values:
        lines.append(',\n'.join(values) + ';')
    else:
        lines.append("-- Aucun produit valide trouvé dans le fichier.")
        lines.append("-- SELECT 1;")

    lines.append("")
    lines.append(f"-- Total : {count} produits insérés, {skipped} lignes ignorées")

    # ─── Écriture du fichier SQL ──────────────────────────────────────────────
    sql_content = '\n'.join(lines)

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(sql_content)

    print(f"")
    print(f"✅ {count} produits traités")
    print(f"   {skipped} lignes ignorées")
    print(f"📄 Fichier SQL généré : {output_path}")
    print(f"")
    print(f"Prochaine étape :")
    print(f"  1. Ouvrir le SQL Editor dans Supabase Dashboard")
    print(f"  2. Copier/coller le contenu de {output_path}")
    print(f"  3. Exécuter la requête")
    print(f"")

    wb.close()


if __name__ == '__main__':
    main()
