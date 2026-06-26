/**
 * app.js — Mimitos: catálogo, modal, carrito persistente, WhatsApp
 */

/* ══════════════════════════════════════════
   CONFIGURACIÓN
   ══════════════════════════════════════════ */
const CONFIG = {
  whatsappNumber: "573152248880",   // número destino
  storeName:      "Mimitos"
};

/* ══════════════════════════════════════════
   ESTADO (persiste en sessionStorage mientras
   el usuario esté en la pestaña abierta)
   ══════════════════════════════════════════ */
const STORAGE_KEY = "mimitos_cart_v2";

let cart      = loadCart();   // [{key, cat, idx, name, img, retail, wholesale, qty}]
let priceType = "retail";     // "retail" | "wholesale"

// stock en sesión (se reduce según lo que hay en el carrito)
const stockSession = {};      // key → stock disponible restante

function initStock() {
  Object.entries(CATALOG).forEach(([cat, products]) => {
    products.forEach((p, idx) => {
      const key = `${cat}-${idx}`;
      const inCart = cart.find(i => i.key === key);
      stockSession[key] = p.stock - (inCart ? inCart.qty : 0);
    });
  });
}

/* ══════════════════════════════════════════
   PERSISTENCIA
   ══════════════════════════════════════════ */
function saveCart() {
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(cart)); } catch(e){}
}
function loadCart() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch(e) { return []; }
}

/* ══════════════════════════════════════════
   UTILIDADES
   ══════════════════════════════════════════ */
const $ = id => document.getElementById(id);

function formatCOP(n) {
  return "$" + Number(n).toLocaleString("es-CO");
}

let toastTimer;
function showToast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2400);
}

function bumpCount() {
  const el = $("cart-count");
  el.classList.remove("bump");
  void el.offsetWidth;
  el.classList.add("bump");
  setTimeout(() => el.classList.remove("bump"), 350);
}

function stockClass(n) {
  if (n <= 0)  return "out";
  if (n <= 5)  return "low";
  return "ok";
}
function stockLabel(n) {
  if (n <= 0)  return "Sin stock";
  if (n <= 5)  return `¡Solo ${n} disponibles!`;
  return `${n} disponibles`;
}

function orderNumber() {
  // simple: fecha + random
  const d = new Date();
  return `MIM-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${Math.floor(Math.random()*9000+1000)}`;
}

/* ══════════════════════════════════════════
   RENDER CATÁLOGO
   ══════════════════════════════════════════ */
const CAT_META = {
  llaveros:  { label:"Llaveros",  icon:"🔑" },
  bisuteria: { label:"Bisutería", icon:"💎" },
  didacticos:{ label:"Didácticos",icon:"🎨" }
};

function fallbackSrc() {
  return "data:image/svg+xml," + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
    '<rect fill="#FAD4DB" width="100" height="100"/>' +
    '<text y="54%" x="50%" dominant-baseline="middle" text-anchor="middle" font-size="32">🎁</text></svg>'
  );
}

function renderCatalog() {
  Object.entries(CATALOG).forEach(([cat, products]) => {
    const grid = $("grid-" + cat);
    if (!grid) return;

    if (!products || products.length === 0) {
      grid.innerHTML = `<div class="empty-state">
        <div class="big">${CAT_META[cat]?.icon || "🎁"}</div>
        <p>Agrega imágenes en <code>img/${cat}/</code> y regístralas en <code>js/catalog.js</code>.</p>
      </div>`;
      return;
    }

    grid.innerHTML = "";
    products.forEach((p, idx) => {
      const key   = `${cat}-${idx}`;
      const avail = stockSession[key] ?? p.stock;
      const sc    = stockClass(avail);
      const inCart = cart.find(i => i.key === key);

      const card = document.createElement("div");
      card.className = "card";
      card.dataset.key = key;
      card.innerHTML = `
        <div class="card-img-wrap" onclick="openModal('${cat}',${idx})" title="Ver detalle">
          <img src="${p.img}" alt="${p.name}" loading="lazy" onerror="this.src='${fallbackSrc()}'"/>
          ${p.tag ? `<span class="tag">${p.tag}</span>` : ""}
          <div class="zoom-hint"><span>🔍</span></div>
        </div>
        <div class="card-body">
          <div class="card-name">${p.name}</div>
          <div class="divider"></div>
          <div class="card-prices">
            <div class="price-row">
              <span class="price-label retail">Normal / Detal</span>
              <span class="price-value retail">
                <s>${formatCOP(p.retail)}</s>
              </span>
            </div>
            <div class="price-row">
              <span class="price-label wholesale">Mayorista</span>
              <span class="price-value wholesale">${formatCOP(p.wholesale)}</span>
            </div>
          </div>
          <div class="stock-info ${sc}" id="stock-${key}">
            <span class="stock-dot"></span>
            <span>${stockLabel(avail)}</span>
          </div>
          <button class="btn-add" id="btn-${key}"
            onclick="addToCart('${cat}',${idx})"
            ${avail <= 0 ? "disabled" : ""}
          >
            🛒 Agregar al carrito
          </button>
        </div>`;
      grid.appendChild(card);

      // si ya está en el carrito, mostrar estado visual
      if (inCart) refreshCardBtn(key);
    });
  });
}

/* ══════════════════════════════════════════
   CARRITO — operaciones
   ══════════════════════════════════════════ */
function addToCart(cat, idx, qty = 1) {
  const product = CATALOG[cat][idx];
  const key     = `${cat}-${idx}`;
  const avail   = stockSession[key] ?? product.stock;

  if (avail <= 0) { showToast("⚠️ Sin stock disponible"); return; }

  const toAdd = Math.min(qty, avail);
  const existing = cart.find(i => i.key === key);

  if (existing) {
    existing.qty += toAdd;
  } else {
    cart.push({ key, cat, idx, name:product.name, img:product.img,
                retail:product.retail, wholesale:product.wholesale, qty:toAdd });
  }

  stockSession[key] = avail - toAdd;
  saveCart();
  updateCartUI();
  bumpCount();
  showToast(`♥ "${product.name}" agregado (×${toAdd})`);
  refreshCardBtn(key);
  refreshStockEl(key);
}

function removeFromCart(key) {
  const item = cart.find(i => i.key === key);
  if (!item) return;
  stockSession[key] = (stockSession[key] ?? 0) + item.qty;
  cart = cart.filter(i => i.key !== key);
  saveCart();
  updateCartUI();
  refreshCardBtn(key);
  refreshStockEl(key);
}

function changeQtyInCart(key, delta) {
  const item = cart.find(i => i.key === key);
  if (!item) return;

  const newQty  = item.qty + delta;
  const avail   = stockSession[key] ?? 0;

  if (newQty < 1) return;
  if (delta > 0 && avail <= 0) { showToast("⚠️ No hay más stock disponible"); return; }

  const realDelta = delta > 0 ? Math.min(delta, avail) : delta;
  item.qty       += realDelta;
  stockSession[key] -= realDelta;

  saveCart();
  updateCartUI();
  refreshStockEl(key);
}


function clearCart() {
  // 1. Restaurar stock completo desde catálogo original
  Object.entries(CATALOG).forEach(([cat, products]) => {
    products.forEach((p, idx) => {
      const key = `${cat}-${idx}`;
      stockSession[key] = p.stock;
    });
  });

  // 2. Vaciar carrito
  cart = [];
  saveCart();

  // 3. Forzar re-render completo del catálogo (clave 🔥)
  renderCatalog();

  // 4. Actualizar carrito UI
  updateCartUI();
}


/* ── helpers para refrescar tarjeta ──────── */
function refreshCardBtn(key) {
  const btn   = $(`btn-${key}`);
  const avail = stockSession[key] ?? 0;
  if (!btn) return;
  const inCart = cart.find(i => i.key === key);
  if (avail <= 0) {
    btn.disabled = true;
    btn.textContent = "Sin stock";
    btn.classList.remove("added");
  } else if (inCart) {
    btn.disabled = false;
    btn.classList.add("added");
    btn.textContent = `✓ En carrito (${inCart.qty})`;
  } else {
    btn.disabled = false;
    btn.classList.remove("added");
    btn.innerHTML = "🛒 Agregar al carrito";
  }
}

function refreshStockEl(key) {
  const el    = $(`stock-${key}`);
  const avail = stockSession[key] ?? 0;
  if (!el) return;
  const sc = stockClass(avail);
  el.className = `stock-info ${sc}`;
  el.innerHTML = `<span class="stock-dot"></span><span>${stockLabel(avail)}</span>`;
}

/* ══════════════════════════════════════════
   CART UI
   ══════════════════════════════════════════ */
function updateCartUI() {
  const total = cart.reduce((s, i) => s + i[priceType] * i.qty, 0);
  const count = cart.reduce((s, i) => s + i.qty, 0);

  $("cart-count").textContent = count;
  $("total-value").textContent = formatCOP(total);
  $("btn-whatsapp").disabled = cart.length === 0;

  const container = $("cart-items");

  if (cart.length === 0) {
    container.innerHTML = `<div class="cart-empty"><div class="big">🛒</div><span>Tu carrito está vacío</span></div>`;
    return;
  }

  container.innerHTML = "";
  cart.forEach(item => {
    const price    = item[priceType];
    const avail    = stockSession[item.key] ?? 0;
    const catMeta  = CAT_META[item.cat] || {};
    const row = document.createElement("div");
    row.className = "cart-item";
    row.innerHTML = `
      <img src="${item.img}" alt="${item.name}" onerror="this.src='${fallbackSrc()}'"/>
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-cat">${catMeta.icon || ""} ${catMeta.label || item.cat}</div>
        <div class="cart-item-price">${formatCOP(price * item.qty)}</div>
        <div class="cart-item-qty">
          <button class="qty-btn" onclick="changeQtyInCart('${item.key}',-1)" ${item.qty<=1?'disabled':''}>−</button>
          <span class="qty-num">${item.qty}</span>
          <button class="qty-btn" onclick="changeQtyInCart('${item.key}',1)" ${avail<=0?'disabled':''} title="${avail<=0?'Sin más stock':'Agregar uno más'}">+</button>
        </div>
      </div>
      <button class="remove-item" title="Quitar" onclick="removeFromCart('${item.key}')">✕</button>`;
    container.appendChild(row);
  });
}

/* ══════════════════════════════════════════
   MODAL DE PRODUCTO
   ══════════════════════════════════════════ */
let modalCurrentKey = null;
let modalQty = 1;

function openModal(cat, idx) {
  const p      = CATALOG[cat][idx];
  const key    = `${cat}-${idx}`;
  const avail  = stockSession[key] ?? p.stock;
  const sc     = stockClass(avail);

  modalCurrentKey = key;
  modalQty = 1;

  // imagen
  const mImg = document.querySelector("#product-modal .modal-img img");
  mImg.src = p.img;
  mImg.onerror = () => { mImg.src = fallbackSrc(); };

  // tag
  const tagEl = document.querySelector("#product-modal .modal-tag");
  tagEl.textContent = p.tag || CAT_META[cat]?.label || "";
  tagEl.style.display = p.tag ? "" : "none";

  // nombre
  document.getElementById("modal-name").textContent = p.name;

  // precios
  document.getElementById("modal-price-normal").textContent    = formatCOP(p.retail);
  document.getElementById("modal-price-detal").textContent     = formatCOP(p.retail);
  document.getElementById("modal-price-wholesale").textContent = formatCOP(p.wholesale);

  // descripción y meta
  document.getElementById("modal-desc").textContent      = p.description || "Sin descripción disponible.";
  document.getElementById("modal-size").textContent      = p.size        || "—";
  document.getElementById("modal-occasions").textContent = p.occasions   || "—";

  // stock badge
  const badge = document.getElementById("modal-stock-badge");
  badge.className = `modal-stock-badge ${sc}`;
  badge.textContent = stockLabel(avail);

  // cantidad
  document.getElementById("modal-qty-num").textContent = modalQty;
  updateModalQtyBtns(avail);

  // botón agregar
  const addBtn = $("modal-btn-add");
  addBtn.disabled = avail <= 0;
  addBtn.textContent = avail <= 0 ? "Sin stock" : "🛒 Agregar al carrito";

  $("modal-overlay").classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  $("modal-overlay").classList.remove("open");
  document.body.style.overflow = "";
  modalCurrentKey = null;
}

function updateModalQtyBtns(avail) {
  $("modal-qty-minus").disabled = modalQty <= 1;
  $("modal-qty-plus").disabled  = modalQty >= avail;
}

function modalQtyChange(delta) {
  if (!modalCurrentKey) return;
  const key   = modalCurrentKey;
  const parts = key.split("-");
  const cat   = parts[0]; const idx = parseInt(parts[1]);
  const p     = CATALOG[cat][idx];
  const avail = stockSession[key] ?? p.stock;

  modalQty = Math.max(1, Math.min(modalQty + delta, avail));
  $("modal-qty-num").textContent = modalQty;
  updateModalQtyBtns(avail);
}

function modalAddToCart() {
  if (!modalCurrentKey) return;
  const parts = modalCurrentKey.split("-");
  const cat   = parts[0]; const idx = parseInt(parts[1]);
  addToCart(cat, idx, modalQty);

  // actualizar badge y botón dentro del modal
  const avail = stockSession[modalCurrentKey] ?? 0;
  const badge = $("modal-stock-badge");
  const sc    = stockClass(avail);
  badge.className = `modal-stock-badge ${sc}`;
  badge.textContent = stockLabel(avail);

  const addBtn = $("modal-btn-add");
  addBtn.disabled  = avail <= 0;
  addBtn.textContent = avail <= 0 ? "Sin stock" : "🛒 Agregar al carrito";

  // reset qty
  modalQty = 1;
  $("modal-qty-num").textContent = 1;
  updateModalQtyBtns(avail);
}

/* ══════════════════════════════════════════
   DRAWER CARRITO
   ══════════════════════════════════════════ */
function openCart() {
  $("cart-overlay").classList.add("open");
  $("cart-drawer").classList.add("open");
  document.body.style.overflow = "hidden";
}
function closeCart() {
  $("cart-overlay").classList.remove("open");
  $("cart-drawer").classList.remove("open");
  document.body.style.overflow = "";
}

/* ══════════════════════════════════════════
   FILTRO
   ══════════════════════════════════════════ */
function filterCategory(cat, btn) {
  document.querySelectorAll(".pill").forEach(p => p.classList.remove("active"));
  btn.classList.add("active");
  document.querySelectorAll(".category-section").forEach(sec => {
    sec.style.display = (cat === "all" || sec.dataset.cat === cat) ? "" : "none";
  });
}

/* ══════════════════════════════════════════
   WHATSAPP
   ══════════════════════════════════════════ */
function sendWhatsApp() {
  if (cart.length === 0) return;

  const typeLabel = priceType === "retail" ? "Detal" : "Mayorista";
  const total     = cart.reduce((s, i) => s + i[priceType] * i.qty, 0);
  const orden     = orderNumber();

  let lines = [];
  lines.push(`🛍️ *PEDIDO ${CONFIG.storeName}*`);
  lines.push(`📋 N° de orden: *${orden}*`);
  lines.push(`💰 Tipo de precio: *${typeLabel}*`);
  lines.push("─────────────────────");

  cart.forEach((item, i) => {
    const price    = item[priceType];
    const subtotal = price * item.qty;
    const cat      = CAT_META[item.cat]?.label || item.cat;
    lines.push(
      `${i+1}. *${item.name}*\n` +
      `   Categoría: ${cat}\n` +
      `   Cantidad: ${item.qty} × ${formatCOP(price)} = *${formatCOP(subtotal)}*`
    );
  });

  lines.push("─────────────────────");
  lines.push(`💵 *TOTAL: ${formatCOP(total)}*`);
  lines.push("");
  lines.push("Por favor confirmar disponibilidad y forma de pago. ¡Gracias! 🌸");

  const text = lines.join("\n");
  const url  = `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank");
}

/* ══════════════════════════════════════════
   INIT
   ══════════════════════════════════════════ */
document.addEventListener("DOMContentLoaded", () => {
  initStock();
  renderCatalog();
  updateCartUI();

  // header cart
  $("cart-btn").addEventListener("click", openCart);
  $("close-cart").addEventListener("click", closeCart);
  $("cart-overlay").addEventListener("click", closeCart);
  $("btn-whatsapp").addEventListener("click", sendWhatsApp);
  $("btn-clear").addEventListener("click", () => { if(cart.length > 0) clearCart(); });
  $("price-type-select").addEventListener("change", e => { priceType = e.target.value; updateCartUI(); });

  // modal
  $("modal-overlay").addEventListener("click", e => { if(e.target === $("modal-overlay")) closeModal(); });
  $("modal-x").addEventListener("click", closeModal);
  $("modal-close-btn").addEventListener("click", closeModal);
  $("modal-btn-add").addEventListener("click", modalAddToCart);
  $("modal-qty-minus").addEventListener("click", () => modalQtyChange(-1));
  $("modal-qty-plus").addEventListener("click",  () => modalQtyChange(1));

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") { closeModal(); closeCart(); }
  });
});
