#!/usr/bin/env node
/*
 * Bygger engelska (/en/) och tyska (/de/) versioner av sajten från de svenska
 * sidorna i roten och översättningsfilerna i i18n/.
 *
 *   node scripts/build-i18n.mjs            bygger alla språk (avbryter om något saknas)
 *   node scripts/build-i18n.mjs --extract  lägger till saknade texter (tomma) i i18n/*.json
 *
 * Översättningsfilerna är uppslag från svensk text till översatt text. Texten
 * jämförs med normaliserade mellanslag. Strängar utan bokstäver (siffror, symboler),
 * e-postadresser och strängar i "__keep" lämnas orörda.
 *
 * Skriptet uppdaterar även de svenska sidorna (språkväljare och hreflang-länkar),
 * så kör det efter varje ändring av de svenska sidorna.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "node-html-parser";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = "https://isamod.github.io/Pinebo-palace/";
const PAGES = ["index.html", "boendet.html", "bastu-bad.html", "boka.html", "kassa.html", "tack.html"];
const PUBLIC = ["index.html", "boendet.html", "bastu-bad.html"];
const LANGS = {
  sv: { dir: "", locale: "sv_SE", short: "SV", name: "Svenska" },
  en: { dir: "en/", locale: "en_GB", short: "EN", name: "English" },
  de: { dir: "de/", locale: "de_DE", short: "DE", name: "Deutsch" },
};
const SWITCH_LABEL = { sv: "Välj språk", en: "Choose language", de: "Sprache wählen" };
const TRANSLATED_ATTRS = ["alt", "title", "placeholder", "aria-label"];
const META_CONTENT = ['meta[name="description"]', 'meta[property="og:title"]', 'meta[property="og:description"]'];
const PATH_ATTRS = ["src", "href", "srcset"];
const extract = process.argv.includes("--extract");

const norm = (s) => s.replace(/\s+/g, " ").trim();
const hasLetters = (s) => /\p{L}/u.test(s);
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const isEmail = (s) => /^\S+@\S+\.\S+$/.test(s);

async function loadDict(lang) {
  try { return JSON.parse(await readFile(join(root, "i18n", lang + ".json"), "utf8")); }
  catch { return { __keep: [] }; }
}

function translator(dict, missing) {
  const keep = new Set(dict.__keep || []);
  return (text) => {
    const key = norm(text);
    if (!key || key.startsWith("<!") || !hasLetters(key) || isEmail(key) || keep.has(key)) return null;
    const val = dict[key];
    if (typeof val === "string" && val.trim()) return val;
    missing.add(key);
    return null;
  };
}

function walkText(node, cb) {
  for (const child of node.childNodes) {
    if (child.nodeType === 3) cb(child);
    else if (child.nodeType === 1) {
      const tag = child.rawTagName && child.rawTagName.toLowerCase();
      if (tag === "script" || tag === "style" || child.getAttribute("translate") === "no") continue;
      walkText(child, cb);
    }
  }
}

function prefixPath(value) {
  return /^(assets|data)\//.test(value) ? "../" + value : value;
}

function relLink(fromLang, toLang, page) {
  return (LANGS[fromLang].dir ? "../" : "") + LANGS[toLang].dir + page;
}

// Tar bort ett element och mellanrummet (radbrytningen) före det, så att
// upprepade byggen inte lämnar tomma rader efter sig
function removeWithSpace(node) {
  const siblings = node.parentNode.childNodes;
  const i = siblings.indexOf(node);
  const prev = siblings[i - 1];
  if (prev && prev.nodeType === 3 && !prev.text.trim()) prev.remove();
  node.remove();
}

function langSwitch(lang, page, cls) {
  const items = Object.entries(LANGS).map(([code, l]) =>
    `<a href="${relLink(lang, code, page)}" hreflang="${code}" lang="${code}"${code === lang ? ' aria-current="true"' : ""}>` +
    `${l.short}<span class="visually-hidden"> – ${l.name}</span></a>`).join("");
  return `<nav class="lang-switch ${cls}" data-lang-switch translate="no" aria-label="${SWITCH_LABEL[lang]}">${items}</nav>`;
}

function processPage(html, lang, page, t) {
  const doc = parse(html, { comment: true, blockTextElements: { script: true, style: true } });
  const htmlEl = doc.querySelector("html");
  htmlEl.setAttribute("lang", lang);
  if (LANGS[lang].dir) htmlEl.setAttribute("data-root", "../");
  else htmlEl.removeAttribute("data-root");

  // Språkväljare (en i menyraden för stora skärmar, en i mobilmenyn)
  doc.querySelectorAll("[data-lang-switch]").forEach((n) => n.remove());
  const aside = doc.querySelector(".header-aside");
  const nav = doc.querySelector(".main-nav");
  if (aside) aside.insertAdjacentHTML("afterbegin", langSwitch(lang, page, "lang-switch--bar"));
  if (nav) nav.insertAdjacentHTML("beforeend", langSwitch(lang, page, "lang-switch--menu"));

  // hreflang och canonical för publika sidor
  const head = doc.querySelector("head");
  doc.querySelectorAll('link[rel="alternate"][hreflang]').forEach(removeWithSpace);
  if (PUBLIC.includes(page)) {
    const urlFor = (code) => BASE + LANGS[code].dir + (page === "index.html" ? "" : page);
    const canon = doc.querySelector('link[rel="canonical"]');
    if (canon) canon.setAttribute("href", urlFor(lang));
    const ogUrl = doc.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.setAttribute("content", urlFor(lang));
    const alts = Object.keys(LANGS).map((code) => `<link rel="alternate" hreflang="${code}" href="${urlFor(code)}">`)
      .concat(`<link rel="alternate" hreflang="x-default" href="${urlFor("en")}">`).join("\n  ");
    (canon || head.querySelector("title")).insertAdjacentHTML("afterend", "\n  " + alts);
  }
  const ogLocale = doc.querySelector('meta[property="og:locale"]');
  if (ogLocale) ogLocale.setAttribute("content", LANGS[lang].locale);

  if (lang === "sv") return doc.toString();

  // Texter
  walkText(doc, (node) => {
    const out = t(node.text);
    if (out === null) return;
    const lead = node.text.match(/^\s*/)[0], trail = node.text.match(/\s*$/)[0];
    node.rawText = esc(lead + out + trail).replace(/ /g, "&nbsp;");
  });
  for (const el of doc.querySelectorAll("*")) {
    if (el.closest('[translate="no"]')) continue;
    for (const a of TRANSLATED_ATTRS) {
      const v = el.getAttribute(a);
      if (v) { const out = t(v); if (out !== null) el.setAttribute(a, out); }
    }
    for (const a of PATH_ATTRS) {
      const v = el.getAttribute(a);
      if (!v) continue;
      const nv = a === "srcset" ? v.split(",").map((p) => prefixPath(p.trim())).join(", ") : prefixPath(v);
      if (nv !== v) el.setAttribute(a, nv);
    }
  }
  for (const sel of META_CONTENT) {
    const m = doc.querySelector(sel);
    if (m) { const out = t(m.getAttribute("content")); if (out !== null) m.setAttribute("content", out); }
  }
  // Strukturerad data: översätt beskrivande fält
  for (const s of doc.querySelectorAll('script[type="application/ld+json"]')) {
    const data = JSON.parse(s.rawText);
    const tr = (v) => { const out = t(v); return out === null ? v : out; };
    for (const k of ["description", "priceRange", "paymentAccepted"]) if (typeof data[k] === "string") data[k] = tr(data[k]);
    if (typeof data.petsAllowed === "string") data.petsAllowed = tr(data.petsAllowed);
    (data.amenityFeature || []).forEach((f) => { f.name = tr(f.name); });
    if (data.url) data.url = BASE + LANGS[lang].dir;
    s.set_content("\n  " + JSON.stringify(data, null, 2).replace(/\n/g, "\n  ") + "\n  ");
  }
  return doc.toString();
}

async function main() {
  let failed = false;
  for (const lang of Object.keys(LANGS)) {
    const dict = await loadDict(lang);
    const missing = new Set();
    const t = translator(dict, missing);
    for (const page of PAGES) {
      const src = await readFile(join(root, page), "utf8");
      const out = processPage(src, lang, page, t);
      if (extract && lang !== "sv") continue;
      const dest = join(root, LANGS[lang].dir, page);
      await mkdir(dirname(dest), { recursive: true });
      await writeFile(dest, out);
    }
    if (lang === "sv") continue;
    if (extract) {
      for (const k of missing) dict[k] = "";
      await mkdir(join(root, "i18n"), { recursive: true });
      await writeFile(join(root, "i18n", lang + ".json"), JSON.stringify(dict, null, 2) + "\n");
      console.log(`${lang}: ${missing.size} texter saknar översättning (tillagda som tomma i i18n/${lang}.json)`);
    } else if (missing.size) {
      failed = true;
      console.error(`${lang}: ${missing.size} texter saknar översättning:`);
      for (const k of missing) console.error("  - " + k);
    } else {
      console.log(`${lang}: klart (${PAGES.length} sidor)`);
    }
  }
  if (failed) process.exitCode = 1;
}

main();
