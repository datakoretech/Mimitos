/* pedido.js — renderiza un pedido contenido en el enlace, sin servidor. */
(function () {
  const content = document.getElementById("order-content");

  function money(value) {
    return "$" + Number(value || 0).toLocaleString("es-CO");
  }

  function fallbackImage() {
    return "data:image/svg+xml," + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="#FAD4DB" width="100" height="100"/><text y="54%" x="50%" dominant-baseline="middle" text-anchor="middle" font-size="32">🎁</text></svg>'
    );
  }

  async function decodeOrder() {
    let value = "";
    if (window.location.hash.startsWith("#p/")) {
      value = window.location.hash.slice(3);
    } else if (window.location.hash.startsWith("#pedido=")) {
      // Compatibilidad con los enlaces creados antes de la compresión.
      value = `raw.${decodeURIComponent(window.location.hash.slice(8))}`;
    }
    if (!value) throw new Error("missing-order");
    const [format, encoded] = value.split(".", 2);
    if (!encoded || !["gz", "raw"].includes(format)) throw new Error("invalid-order");
    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - encoded.length % 4) % 4);
    let bytes = Uint8Array.from(atob(base64), char => char.charCodeAt(0));
    if (format === "gz") {
      if (!("DecompressionStream" in window)) throw new Error("unsupported-browser");
      const decompressed = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
      bytes = new Uint8Array(await new Response(decompressed).arrayBuffer());
    }
    const data = JSON.parse(new TextDecoder().decode(bytes));
    if (data.version !== 1 || !data.orderNumber || !Array.isArray(data.items) || !data.items.length) {
      throw new Error("invalid-order");
    }
    return data;
  }

  function appendText(parent, tag, text, className) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    element.textContent = text;
    parent.appendChild(element);
    return element;
  }

  function renderError() {
    content.className = "order-card order-error";
    appendText(content, "h1", "No pudimos abrir este pedido");
    appendText(content, "p", "El enlace está incompleto o no corresponde a una solicitud válida.");
    const link = document.createElement("a");
    link.href = "index.html";
    link.textContent = "Volver al catálogo";
    content.appendChild(link);
  }

  function renderOrder(order) {
    document.title = `Pedido ${order.orderNumber} — ${order.storeName || "Mimitos"}`;
    const title = document.createElement("div");
    title.className = "order-title";
    appendText(title, "span", "Solicitud de pedido", "eyebrow");
    appendText(title, "h1", order.storeName || "Mimitos");
    appendText(title, "p", `Orden ${order.orderNumber}`);
    content.appendChild(title);

    const details = document.createElement("div");
    details.className = "order-meta";
    const date = new Date(order.createdAt);
    appendText(details, "span", `Fecha: ${Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })}`);
    appendText(details, "span", `Precio: ${order.priceType === "wholesale" ? "Mayorista" : "Detal"}`);
    content.appendChild(details);

    const list = document.createElement("div");
    list.className = "order-items";
    order.items.forEach(item => {
      const row = document.createElement("article");
      row.className = "order-item";
      const image = document.createElement("img");
      image.src = item.img || fallbackImage();
      image.alt = item.name || "Producto";
      image.onerror = () => { image.src = fallbackImage(); };
      row.appendChild(image);
      const info = document.createElement("div");
      appendText(info, "h2", item.name || "Producto");
      appendText(info, "p", `${item.qty || 0} × ${money(item.price)} = ${money((item.qty || 0) * (item.price || 0))}`, "item-price");
      if (item.comment) appendText(info, "p", `Comentario: ${item.comment}`, "item-comment");
      row.appendChild(info);
      list.appendChild(row);
    });
    content.appendChild(list);

    const total = document.createElement("div");
    total.className = "order-total";
    appendText(total, "span", "Total");
    appendText(total, "strong", money(order.total));
    content.appendChild(total);
    appendText(content, "p", "Conserva este enlace para consultar los detalles de tu solicitud.", "order-note");
  }

  decodeOrder().then(renderOrder).catch(renderError);
}());
