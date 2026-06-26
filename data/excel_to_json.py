import pandas as pd
import json

# Leer Excel
excel_file = "catalogo_productos.xlsx"
df = pd.read_excel(excel_file)

# Limpiar columnas (por seguridad)
df.columns = df.columns.str.strip().str.lower()

catalog = {}

for _, row in df.iterrows():
    cat = str(row["categoria"]).strip().lower()

    if cat not in catalog:
        catalog[cat] = []

    product = {
        "img": str(row["img"]),
        "name": str(row["name"]),
        "retail": int(row["retail"]),
        "wholesale": int(row["wholesale"]),
        "stock": int(row["stock"]),
        "tag": str(row["tag"]) if not pd.isna(row["tag"]) else "",
        "description": str(row["description"]) if not pd.isna(row["description"]) else "",
        "size": str(row["size"]) if not pd.isna(row["size"]) else "",
        "occasions": str(row["occasions"]) if not pd.isna(row["occasions"]) else ""
    }

    catalog[cat].append(product)

# Guardar JSON
with open("catalogo_productos.json", "w", encoding="utf-8") as f:
    json.dump(catalog, f, ensure_ascii=False, indent=2)

print("✅ JSON generado correctamente")