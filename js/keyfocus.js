(function () {
  var STORAGE_KEY = "keyfocus_entries";
  var CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  function normalizeCode(code) {
    if (!code || typeof code !== "string") return "";
    return code.trim().toUpperCase();
  }

  function randomSegment(len) {
    var out = "";
    for (var i = 0; i < len; i++)
      out += CHARSET.charAt(Math.floor(Math.random() * CHARSET.length));
    return out;
  }

  function randomFocusCode() {
    return "KF-" + randomSegment(6);
  }

  function digitsOnly(s) {
    return String(s || "").replace(/\D/g, "");
  }

  function telHrefFromPhone(phone) {
    var d = digitsOnly(phone);
    if (!d) return "";
    if (d.charAt(0) === "0" && d.length === 11) return "tel:+44" + d.slice(1);
    return "tel:" + d;
  }

  function formatPhoneDisplay(phone) {
    var d = digitsOnly(phone);
    if (d.length === 11 && d.charAt(0) === "0")
      return d.slice(0, 5) + " " + d.slice(5);
    return phone;
  }

  function getLocalEntries() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") || {};
    } catch (_) {
      return {};
    }
  }

  function saveLocalEntry(code, entry) {
    var key = normalizeCode(code);
    if (!key || !entry || !entry.name || !entry.phone) return false;
    var all = getLocalEntries();
    all[key] = { name: String(entry.name).trim(), phone: String(entry.phone).trim() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    return true;
  }

  async function fetchApiEntries() {
    try {
      var res = await fetch("/api/entries", { cache: "no-store" });
      if (!res.ok) return {};
      var data = await res.json();
      if (!data || typeof data !== "object" || data.error) return {};
      return data;
    } catch (_) {
      return {};
    }
  }

  async function fetchFileEntries() {
    try {
      var res = await fetch("data/entries.json", { cache: "no-store" });
      if (!res.ok) return {};
      var data = await res.json();
      if (!data || typeof data !== "object") return {};
      return data;
    } catch (_) {
      return {};
    }
  }

  /**
   * Merge order (later wins on duplicate codes): legacy file → localStorage → Supabase API.
   * That keeps Supabase authoritative when the Flask app is deployed.
   */
  async function loadAllEntries() {
    var file = await fetchFileEntries();
    var local = getLocalEntries();
    var api = await fetchApiEntries();
    var merged = {};
    for (var k in file) if (Object.prototype.hasOwnProperty.call(file, k))
      merged[normalizeCode(k)] = file[k];
    for (var k2 in local) if (Object.prototype.hasOwnProperty.call(local, k2))
      merged[normalizeCode(k2)] = local[k2];
    for (var k3 in api) if (Object.prototype.hasOwnProperty.call(api, k3))
      merged[normalizeCode(k3)] = api[k3];
    return merged;
  }

  async function saveRemoteEntry(code, entry) {
    var key = normalizeCode(code);
    if (!key || !entry || !entry.name || !entry.phone) return false;
    try {
      var res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: key,
          name: String(entry.name).trim(),
          phone: String(entry.phone).trim(),
        }),
      });
      return res.ok;
    } catch (_) {
      return false;
    }
  }

  window.KeyFocus = {
    STORAGE_KEY: STORAGE_KEY,
    normalizeCode: normalizeCode,
    randomFocusCode: randomFocusCode,
    telHrefFromPhone: telHrefFromPhone,
    formatPhoneDisplay: formatPhoneDisplay,
    getLocalEntries: getLocalEntries,
    saveLocalEntry: saveLocalEntry,
    saveRemoteEntry: saveRemoteEntry,
    loadAllEntries: loadAllEntries,
  };
})();
