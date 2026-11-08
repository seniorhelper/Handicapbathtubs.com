/* Aging Safely network lead router, v1 2026-11-08.
   Sends every quote form on this site to the company lead server (clients.eyetoad.com/lead/send.php),
   which saves each lead to disk first and then emails the sales inbox. If that server says this domain
   is not on its allow-list (403), or cannot be reached, the form falls back to the sender it used before
   (FormSubmit or EmailJS), so no lead is lost either way. Nothing here changes what the visitor sees.
   Privacy: details travel in the POST body only, never in a URL; no cookies; no third-party trackers. */
(function () {
  "use strict";
  if (window.__asbLeadRouter) { return; }
  window.__asbLeadRouter = true;
  var LEAD = "https://clients.eyetoad.com/lead/send.php";
  var shown = Date.now();
  var SITE = location.hostname.replace(/^www\./, "");

  function meta(fd) {
    fd.append("site", SITE);
    fd.append("page", location.pathname.slice(0, 300));
    fd.append("_t", String(shown));
    if (!fd.has("_subject")) { fd.append("_subject", "New lead — " + SITE); }
    try {
      var q = new URLSearchParams(location.search);
      ["utm_source", "utm_medium", "utm_campaign", "gclid"].forEach(function (k) {
        var v = q.get(k); if (v) { fd.append("lead_" + k, v.slice(0, 120)); }
      });
      var ref = document.referrer && document.referrer.indexOf(location.host) === -1 ? document.referrer.slice(0, 200) : "";
      if (ref) { fd.append("lead_referrer", ref); }
    } catch (e) { /* ignore */ }
    fd.append("lead_device", window.innerWidth < 760 ? "phone" : "desktop");
    return fd;
  }

  function toFormData(body) {
    var fd = new FormData();
    if (!body) { return fd; }
    if (typeof FormData !== "undefined" && body instanceof FormData) {
      body.forEach(function (v, k) { fd.append(k, v); });
      return fd;
    }
    if (typeof body === "string") {
      try {
        var j = JSON.parse(body);
        Object.keys(j).forEach(function (k) { if (j[k] != null && typeof j[k] !== "object") { fd.append(k, String(j[k])); } });
        return fd;
      } catch (e) {
        try { new URLSearchParams(body).forEach(function (v, k) { fd.append(k, v); }); } catch (e2) { /* ignore */ }
      }
    }
    return fd;
  }

  // Returns a promise of {ok:true,id} when the lead server took the lead; rejects when it should fall back.
  function sendToLeadServer(fd) {
    return fetchOrig(LEAD, { method: "POST", body: meta(fd), headers: { "Accept": "application/json" }, credentials: "omit", referrerPolicy: "strict-origin-when-cross-origin" })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (r.ok && j && j.ok) { return { ok: true, id: j.id || "" }; }
          // 422 = the server rejected the details (no name or phone); let the page's own sender handle it.
          throw new Error("lead-server " + r.status);
        });
      });
  }

  function fakeOk(id) {
    var body = JSON.stringify({ success: "true", ok: true, id: id, message: "Thanks. We got your request." });
    try { return new Response(body, { status: 200, headers: { "Content-Type": "application/json" } }); }
    catch (e) { return { ok: true, status: 200, json: function () { return Promise.resolve(JSON.parse(body)); }, text: function () { return Promise.resolve(body); } }; }
  }

  var fetchOrig = window.fetch ? window.fetch.bind(window) : null;
  if (fetchOrig) {
    window.fetch = function (url, opts) {
      var u = typeof url === "string" ? url : (url && url.url) || "";
      var isForm = /formsubmit\.co\/ajax\//i.test(u) || /api\.emailjs\.com\/api\/v1\.0\/email\/send/i.test(u);
      if (!isForm || !opts || String(opts.method || "GET").toUpperCase() !== "POST") { return fetchOrig(url, opts); }
      var fd = toFormData(opts.body);
      ["service_id", "template_id", "user_id", "accessToken", "_captcha", "_template"].forEach(function (k) { fd.delete(k); });
      return sendToLeadServer(fd).then(function (res) {
        if (/emailjs/i.test(u)) { try { return new Response("OK", { status: 200 }); } catch (e) { return { ok: true, status: 200, text: function () { return Promise.resolve("OK"); } }; } }
        return fakeOk(res.id);
      }).catch(function () { return fetchOrig(url, opts); });
    };
  }

  // EmailJS SDK sites: wrap emailjs.sendForm the same way.
  function wrapEmailJs() {
    var ej = window.emailjs;
    if (!ej || !ej.sendForm || ej.__asbWrapped) { return; }
    var orig = ej.sendForm.bind(ej);
    ej.__asbWrapped = true;
    ej.sendForm = function (serviceId, templateId, form, opts) {
      var el = typeof form === "string" ? document.querySelector(form) : form;
      if (!el || !(el instanceof HTMLFormElement) || !fetchOrig) { return orig(serviceId, templateId, form, opts); }
      return sendToLeadServer(new FormData(el)).then(function (res) { return { status: 200, text: "OK", id: res.id }; })
        .catch(function () { return orig(serviceId, templateId, form, opts); });
    };
  }
  wrapEmailJs();
  if (!window.emailjs) { document.addEventListener("DOMContentLoaded", wrapEmailJs); window.addEventListener("load", wrapEmailJs); }
})();
