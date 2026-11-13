#!/usr/bin/env node
/*
 * Hämtar bokade datum från Airbnb och Booking.com (iCal-länkar) och skriver
 * data/bokade-datum.json, som sajten använder för tillgänglighetskalendern.
 *
 * Länkarna läses från miljövariabler (GitHub-hemligheter), aldrig från koden:
 *   AIRBNB_ICAL_URL, BOOKING_ICAL_URL   – en länk var (valfria)
 *   EXTRA_ICAL_URLS                     – fler länkar, en per rad (valfritt)
 *
 * Om en länk inte går att hämta avbryts skriptet med fel, så att sajten inte
 * publiceras med ofullständiga uppgifter (den förra versionen ligger kvar).
 * Om inga länkar alls är satta skrivs en tom fil med "updated": null, vilket
 * gör att sajten döljer kalendern.
 *
 * Kör lokalt: AIRBNB_ICAL_URL="https://..." node scripts/sync-calendars.mjs
 */
import { writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outFile = join(root, "data", "bokade-datum.json");
const MONTHS_AHEAD = 18;

const urls = [
  process.env.AIRBNB_ICAL_URL,
  process.env.BOOKING_ICAL_URL,
  ...(process.env.EXTRA_ICAL_URLS || "").split(/\s+/),
].map((u) => (u || "").trim()).filter(Boolean);

function iso(d) { return d.toISOString().slice(0, 10); }
function addDays(isoDate, n) {
  const d = new Date(isoDate + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return iso(d);
}

// Läser "20261214" eller "20261214T150000Z" -> "2026-12-14"
function parseDate(value) {
  const m = /^(\d{4})(\d{2})(\d{2})/.exec(value || "");
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

function parseIcal(text) {
  // Radbrytningar i iCal kan vara "vikta": en rad som börjar med mellanslag hör till raden ovanför.
  const lines = text.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "").split(/\r?\n/);
  const events = [];
  let ev = null;
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") ev = {};
    else if (line === "END:VEVENT") { if (ev) events.push(ev); ev = null; }
    else if (ev) {
      const i = line.indexOf(":");
      if (i < 0) continue;
      const key = line.slice(0, i).split(";")[0].toUpperCase();
      const val = line.slice(i + 1);
      if (key === "DTSTART") ev.from = parseDate(val);
      if (key === "DTEND") ev.to = parseDate(val);
      if (key === "STATUS") ev.status = val.trim().toUpperCase();
    }
  }
  return events
    .filter((e) => e.from && e.status !== "CANCELLED")
    .map((e) => ({ from: e.from, to: e.to && e.to > e.from ? e.to : addDays(e.from, 1) }));
}

// Slår ihop överlappande eller angränsande perioder
function merge(ranges) {
  const sorted = [...ranges].sort((a, b) => a.from.localeCompare(b.from));
  const out = [];
  for (const r of sorted) {
    const last = out[out.length - 1];
    if (last && r.from <= last.to) { if (r.to > last.to) last.to = r.to; }
    else out.push({ ...r });
  }
  return out;
}

async function fetchCalendar(url) {
  const res = await fetch(url, { headers: { "User-Agent": "calendar-sync" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  if (!text.includes("BEGIN:VCALENDAR")) throw new Error("svaret är inte en iCal-kalender");
  return parseIcal(text);
}

async function main() {
  let data = { updated: null, blocked: [] };
  if (urls.length === 0) {
    console.warn("Inga kalenderlänkar är inställda – skriver tom fil (kalendern döljs på sajten).");
  } else {
    const all = [];
    for (const [i, url] of urls.entries()) {
      try {
        const events = await fetchCalendar(url);
        console.log(`Kalender ${i + 1}: ${events.length} bokningar/blockeringar`);
        all.push(...events);
      } catch (err) {
        // Länken skrivs inte ut – den är hemlig
        console.error(`Kalender ${i + 1} gick inte att hämta: ${err.message}`);
        process.exit(1);
      }
    }
    const today = iso(new Date());
    const until = new Date();
    until.setUTCMonth(until.getUTCMonth() + MONTHS_AHEAD);
    const limit = iso(until);
    const blocked = merge(all)
      .filter((r) => r.to > today && r.from < limit)
      .map((r) => ({ from: r.from < today ? today : r.from, to: r.to }));
    data = { updated: new Date().toISOString(), blocked };
    console.log(`Totalt ${blocked.length} upptagna perioder framåt.`);
  }
  await mkdir(dirname(outFile), { recursive: true });
  await writeFile(outFile, JSON.stringify(data, null, 2) + "\n");
}

main();
