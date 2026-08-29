/* Compresión LZW ligera para enlaces de pedido, compatible con navegadores móviles. */
window.OrderCodec = (function () {
  function toUtf8(text) {
    return unescape(encodeURIComponent(text));
  }

  function fromUtf8(bytes) {
    return decodeURIComponent(escape(bytes));
  }

  function toBase64Url(bytes) {
    return btoa(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  function fromBase64Url(value) {
    const base64 = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4);
    return atob(base64);
  }

  function compress(text) {
    const input = toUtf8(text);
    const dictionary = new Map();
    for (let i = 0; i < 256; i += 1) dictionary.set(String.fromCharCode(i), i);

    let nextCode = 256;
    let word = "";
    const codes = [];
    for (let i = 0; i < input.length; i += 1) {
      const candidate = word + input.charAt(i);
      if (dictionary.has(candidate)) {
        word = candidate;
      } else {
        codes.push(dictionary.get(word));
        if (nextCode > 65535) throw new Error("order-too-large");
        dictionary.set(candidate, nextCode++);
        word = input.charAt(i);
      }
    }
    if (word) codes.push(dictionary.get(word));

    let packed = "";
    codes.forEach(code => { packed += String.fromCharCode(code >> 8, code & 255); });
    return toBase64Url(packed);
  }

  function decompress(value) {
    const packed = fromBase64Url(value);
    if (!packed || packed.length % 2) throw new Error("invalid-order");
    const codes = [];
    for (let i = 0; i < packed.length; i += 2) codes.push((packed.charCodeAt(i) << 8) | packed.charCodeAt(i + 1));

    const dictionary = [];
    for (let i = 0; i < 256; i += 1) dictionary[i] = String.fromCharCode(i);
    let nextCode = 256;
    let word = dictionary[codes[0]];
    if (word === undefined) throw new Error("invalid-order");
    let output = word;

    for (let i = 1; i < codes.length; i += 1) {
      const code = codes[i];
      const entry = dictionary[code] || (code === nextCode ? word + word.charAt(0) : null);
      if (entry === null) throw new Error("invalid-order");
      output += entry;
      dictionary[nextCode++] = word + entry.charAt(0);
      word = entry;
    }
    return fromUtf8(output);
  }

  return { compress, decompress };
}());
