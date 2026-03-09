// ==UserScript==
// @name         EDHREC Japanese Card Images
// @namespace    https://github.com/hawmec/edhrec-ja-images
// @version      1.0.0
// @description  Replaces card images on EDHREC with Japanese versions using the Scryfall API
// @description:ja  EDHRECのカード画像をScryfall APIを使って日本語版に自動で差し替えます
// @author       hawmec
// @match        https://edhrec.com/*
// @grant        none
// @run-at       document-idle
// @license      MIT
// ==/UserScript==

/**
 * MIT License
 * Copyright (c) 2025 hawmec
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 * -------------------------------------------------------------------------
 * DISCLAIMER
 * -------------------------------------------------------------------------
 * - Magic: The Gathering card images are property of Wizards of the Coast LLC.
 *   This script is an unofficial fan tool and is NOT affiliated with, sponsored
 *   by, or endorsed by Wizards of the Coast.
 *   Usage is subject to the WotC Fan Content Policy:
 *   https://company.wizards.com/en/legal/fancontentpolicy
 *
 * - Card data and images are served by Scryfall (https://scryfall.com).
 *   This script uses the Scryfall API for non-commercial purposes only.
 *   Please respect Scryfall's API terms:
 *   https://scryfall.com/docs/api
 *   Scryfall is not affiliated with Wizards of the Coast.
 *
 * - This script is not affiliated with EDHREC (https://edhrec.com).
 * -------------------------------------------------------------------------
 */

(function () {
  "use strict";

  // Scryfall API endpoints
  var SF_NAMED  = "https://api.scryfall.com/cards/named";
  var SF_CARD   = "https://api.scryfall.com/cards";
  var SF_SEARCH = "https://api.scryfall.com/cards/search";

  // Minimum interval between Scryfall API requests (ms) — respect rate limits
  var REQ_GAP = 80;

  // Cache TTL: 7 days
  var TTL = 7 * 24 * 60 * 60 * 1000;

  // ============================================================
  // Cache (sessionStorage + in-memory Map)
  // ============================================================
  var mem = new Map();

  function getCached(name) {
    if (mem.has(name)) return mem.get(name);
    try {
      var e = JSON.parse(sessionStorage.getItem("ejp_" + name));
      if (e && Date.now() - e.ts < TTL) {
        mem.set(name, e.url != null ? e.url : null);
        return mem.get(name);
      }
    } catch (_) {}
    return undefined;
  }

  function setCached(name, url) {
    var v = url != null ? url : null;
    mem.set(name, v);
    try {
      sessionStorage.setItem("ejp_" + name, JSON.stringify({ url: v, ts: Date.now() }));
    } catch (_) {}
  }

  // ============================================================
  // Rate-limited Scryfall fetch
  // ============================================================
  var lastReq = 0;

  async function sf(url) {
    var w = REQ_GAP - (Date.now() - lastReq);
    if (w > 0) await new Promise(function (r) { setTimeout(r, w); });
    lastReq = Date.now();
    return fetch(url);
  }

  // ============================================================
  // Image URL helpers
  // ============================================================
  function pick(uris) {
    if (!uris) return null;
    return uris.normal || uris.large || uris.png || uris.small || null;
  }

  function imgUrl(card) {
    if (!card) return null;
    if (card.image_uris) return pick(card.image_uris);
    if (Array.isArray(card.card_faces)) {
      for (var i = 0; i < card.card_faces.length; i++) {
        var u = pick(card.card_faces[i] && card.card_faces[i].image_uris);
        if (u) return u;
      }
    }
    return null;
  }

  // ============================================================
  // Fetch Japanese image URL from Scryfall
  // Strategy: same-set ja print → lang:ja search → newest reprint → English fallback
  // ============================================================
  async function getJaUrl(name) {
    var cached = getCached(name);
    if (cached !== undefined) return cached;

    var eng;
    try {
      var r1 = await sf(SF_NAMED + "?exact=" + encodeURIComponent(name));
      if (!r1.ok) { setCached(name, null); return null; }
      eng = await r1.json();
    } catch (_) { return null; }

    // 1. Same set, Japanese print
    try {
      var r2 = await sf(SF_CARD + "/" + eng.set + "/" + eng.collector_number + "/ja");
      if (r2.ok) {
        var u2 = imgUrl(await r2.json());
        if (u2) { setCached(name, u2); return u2; }
      }
    } catch (_) {}

    // 2. Any Japanese print (lang:ja search)
    try {
      var r3 = await sf(SF_SEARCH + "?q=" + encodeURIComponent("oracleid:" + eng.oracle_id + " lang:ja") + "&unique=prints");
      if (r3.ok) {
        var d3 = await r3.json();
        var u3 = imgUrl(d3.data && d3.data[0]);
        if (u3) { setCached(name, u3); return u3; }
      }
    } catch (_) {}

    // 3. Walk through all prints, newest first
    try {
      var r4 = await sf(SF_SEARCH + "?q=" + encodeURIComponent("oracleid:" + eng.oracle_id) + "&unique=prints&order=released&dir=desc");
      if (r4.ok) {
        var prints = (await r4.json()).data || [];
        for (var pi = 0; pi < prints.length; pi++) {
          var p = prints[pi];
          if (p.set === eng.set && p.collector_number === eng.collector_number) continue;
          if (p.lang === "ja") {
            var uf = imgUrl(p);
            if (uf) { setCached(name, uf); return uf; }
          }
          try {
            var rp = await sf(SF_CARD + "/" + p.set + "/" + p.collector_number + "/ja");
            if (rp.ok) {
              var up = imgUrl(await rp.json());
              if (up) { setCached(name, up); return up; }
            }
          } catch (_) {}
        }
      }
    } catch (_) {}

    // 4. Fallback: English image
    var fb = imgUrl(eng);
    setCached(name, fb);
    return fb;
  }

  // ============================================================
  // Card image detection and replacement
  // ============================================================
  function cardName(img) {
    var a = img.alt && img.alt.trim();
    if (a && a.length > 0 && !a.startsWith("http")) return a;
    if (img.dataset) {
      if (img.dataset.name) return img.dataset.name.trim();
      if (img.dataset.cardName) return img.dataset.cardName.trim();
    }
    var ar = img.getAttribute("aria-label");
    if (ar && ar.trim()) return ar.trim();
    var par = img.closest("[aria-label]");
    if (par) {
      var pa = par.getAttribute("aria-label");
      if (pa && pa.trim()) return pa.trim();
    }
    return null;
  }

  function isCard(img) {
    var s = img.src || "";
    return s.includes("cards.scryfall.io") ||
           s.includes("card.scryfall.io") ||
           s.includes("img.scryfall.com") ||
           (s.includes("edhrec.com") && /\.(jpg|png|webp)(\?|$)/.test(s));
  }

  var pending = new Set();

  async function replace(img) {
    if (img.dataset.ejpDone === "1") return;
    if (!isCard(img)) return;
    var name = cardName(img);
    if (!name) return;
    if (pending.has(name)) return;
    img.dataset.ejpDone = "1";
    pending.add(name);
    try {
      var url = await getJaUrl(name);
      if (url && url !== img.src) { img.srcset = ""; img.src = url; }
    } catch (_) {}
    finally { pending.delete(name); }
  }

  // ============================================================
  // MutationObserver — watch for dynamically loaded card images
  // ============================================================
  var obs = new MutationObserver(function (ms) {
    ms.forEach(function (m) {
      m.addedNodes.forEach(function (n) {
        if (n.nodeType !== 1) return;
        if (n.tagName === "IMG") replace(n);
        if (n.querySelectorAll) n.querySelectorAll("img").forEach(replace);
      });
      if (m.type === "attributes" && m.target.tagName === "IMG" && m.target.dataset.ejpDone !== "1") {
        replace(m.target);
      }
    });
  });

  obs.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["src"]
  });

  // Replace images already present on page load
  document.querySelectorAll("img").forEach(replace);

})();
