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

  function mergeEntries(server, local) {
    var out = {};
    for (var k in server) if (Object.prototype.hasOwnProperty.call(server, k))
      out[normalizeCode(k)] = server[k];
    for (var k2 in local) if (Object.prototype.hasOwnProperty.call(local, k2))
      out[normalizeCode(k2)] = local[k2];
    return out;
  }

  async function loadAllEntries() {
    var server = {};
    try {
      var res = await fetch("data/entries.json", { cache: "no-store" });
      if (res.ok) server = await res.json();
      if (!server || typeof server !== "object") server = {};
    } catch (_) {
      server = {};
    }
    return mergeEntries(server, getLocalEntries());
  }

  window.KeyFocus = {
    STORAGE_KEY: STORAGE_KEY,
    normalizeCode: normalizeCode,
    randomFocusCode: randomFocusCode,
    telHrefFromPhone: telHrefFromPhone,
    formatPhoneDisplay: formatPhoneDisplay,
    getLocalEntries: getLocalEntries,
    saveLocalEntry: saveLocalEntry,
    loadAllEntries: loadAllEntries,
  };
})();
