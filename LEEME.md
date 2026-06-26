# 🌸 Mimitos — Catálogo Web

## Estructura de carpetas

```
mimitos/
├── index.html              ← página principal (no editar)
├── css/
│   └── styles.css          ← todos los estilos
├── js/
│   ├── catalog.js          ← ✏️ AQUÍ registras tus productos
│   └── app.js              ← lógica del carrito y WhatsApp
└── img/
    ├── Logo.png            ← logo de Mimitos
    ├── llaveros/           ← imágenes de llaveros (.png)
    ├── bisuteria/          ← imágenes de bisutería (.png)
    └── didacticos/         ← imágenes de didácticos (.png)
```

---

## ¿Cómo agregar productos?

### Paso 1 — Pon la imagen en la carpeta correcta
Copia tu archivo `.png` en `img/llaveros/`, `img/bisuteria/` o `img/didacticos/`.

### Paso 2 — Registra el producto en `js/catalog.js`
Abre el archivo y agrega un objeto al arreglo de la categoría:

```js
llaveros: [
  {
    img:       "img/llaveros/mi-producto.png",
    name:      "Nombre del producto",
    retail:    5000,      // precio al detal (sin puntos ni $)
    wholesale: 3500,      // precio mayorista
    tag:       "Nuevo"    // OPCIONAL: "Nuevo", "Hot", "Popular"
  },
],
```

### Paso 3 — Guarda y recarga el navegador ✅

---

## ¿Cómo configurar WhatsApp?

Abre `js/app.js` y busca esta línea al principio:

```js
whatsappNumber: "573XXXXXXXXX",
```

Reemplaza `573XXXXXXXXX` con tu número completo (código de país + número, sin `+`).  
**Ejemplo Colombia:** `573001234567`

---

## Funcionalidades

| Función | Descripción |
|---|---|
| 🔍 Filtros | Filtra por categoría con los botones superiores |
| 🛒 Carrito | Agrega productos con el botón en cada tarjeta |
| ➕ Cantidades | Ajusta unidades dentro del carrito |
| 💗/⭐ Precio | Elige entre precio detal y mayorista en el carrito |
| 📱 WhatsApp | Envía el pedido completo directamente a tu WhatsApp |

---

## Mensaje que recibe el cliente en WhatsApp

```
🛍️ Pedido Mimitos
📋 Precio: Detal
─────────────────────
1. Llavero Corazón
   Categoría: Llaveros
   Cantidad: 2 × $5.000 = $10.000

2. Collar Flor Pastel
   Categoría: Bisutería
   Cantidad: 1 × $12.000 = $12.000
─────────────────────
💰 TOTAL: $22.000

Por favor confirmar disponibilidad y forma de pago. ¡Gracias! 🌸
```
