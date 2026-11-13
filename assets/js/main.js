/* ==========================================================================
   Pinebo Palace – sidlogik
   - Mobilmeny
   - Sökformulär (datum + gäster)
   - Prisberäkning och bokningsöversikt
   - Steg 1 (tillval) och steg 2 (kassa)
   ========================================================================== */
(function () {
  "use strict";

  var C = window.PINEBO;
  var KEY = "pinebo-booking";
  var REQ_KEY = "pinebo-request";
  var page = document.body.getAttribute("data-page");

  /* ---------- Hjälpfunktioner ---------- */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function num(n) { return Math.round(n).toLocaleString("sv-SE"); }
  function kr(n) { return (n < 0 ? "−" + num(-n) : num(n)) + " kr"; }
  function clamp(n, lo, hi) { n = Number(n) || 0; return Math.max(lo, Math.min(hi, n)); }
  function plural(n, one, many) { return n + " " + (n === 1 ? one : many); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  var storage = {
    get: function (k) { try { return JSON.parse(sessionStorage.getItem(k)) || null; } catch (e) { return null; } },
    set: function (k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del: function (k) { try { sessionStorage.removeItem(k); } catch (e) {} },
  };

  function parseDate(s) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s || "")) return null;
    var p = s.split("-").map(Number);
    var d = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
    return isNaN(d) ? null : d;
  }
  function isoDate(d) { return d.toISOString().slice(0, 10); }
  function todayIso() {
    var n = new Date();
    return isoDate(new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate())));
  }
  function addDays(iso, days) {
    var d = parseDate(iso);
    d.setUTCDate(d.getUTCDate() + days);
    return isoDate(d);
  }
  function fmt(d, opts) {
    var o = Object.assign({ timeZone: "UTC" }, opts);
    return new Intl.DateTimeFormat("sv-SE", o).format(d).replace(/\./g, "");
  }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function dayLabel(iso) { return cap(fmt(parseDate(iso), { weekday: "short", day: "numeric", month: "short" })); }
  function rangeLabel(b) {
    var f = parseDate(b.from), t = parseDate(b.to);
    var sameYear = f.getUTCFullYear() === t.getUTCFullYear();
    return fmt(f, sameYear ? { day: "numeric", month: "short" } : { day: "numeric", month: "short", year: "numeric" }) +
      " – " + fmt(t, { day: "numeric", month: "short", year: "numeric" });
  }

  /* ---------- Bokningsstatus ---------- */
  function getBooking() {
    var q = new URLSearchParams(location.search);
    var saved = storage.get(KEY) || {};
    var b = {
      from: q.get("from") || saved.from || "",
      to: q.get("to") || saved.to || "",
      guests: clamp(q.get("guests") || saved.guests || 2, 1, C.maxGuests),
      addons: Object.assign({ bastu: 0, spa: 0, stad: false, linne: false }, saved.addons),
    };
    return normalize(b);
  }

  function normalize(b) {
    var f = parseDate(b.from), t = parseDate(b.to);
    b.nights = f && t ? Math.round((t - f) / 864e5) : 0;
    b.valid = b.nights >= C.minNights;
    if (!b.valid) b.nights = 0;
    b.addons.bastu = clamp(b.addons.bastu, 0, b.nights);
    b.addons.spa = clamp(b.addons.spa, 0, b.nights);
    b.addons.stad = !!b.addons.stad;
    b.addons.linne = !!b.addons.linne;
    return b;
  }

  function saveBooking(b) {
    storage.set(KEY, { from: b.from, to: b.to, guests: b.guests, addons: b.addons });
  }

  function spaPrice(days) {
    if (days <= 0) return 0;
    var tiers = C.addons.spa.tiers;
    if (tiers[days]) return tiers[days];
    var maxTier = Math.max.apply(null, Object.keys(tiers).map(Number));
    return tiers[maxTier] + (days - maxTier) * C.addons.spa.extraDay;
  }

  function calc(b) {
    var a = b.addons;
    var r = {
      stay: b.nights * C.nightlyPrice,
      bastu: a.bastu * C.addons.bastu.perDay,
      spa: spaPrice(a.spa),
      stad: a.stad ? C.addons.stad.price : 0,
      linne: a.linne ? C.addons.linne.price : 0,
    };
    r.combo = a.bastu > 0 && a.spa > 0 ? Math.round((r.bastu + r.spa) * C.comboDiscount) : 0;
    r.addonsTotal = r.bastu + r.spa + r.stad + r.linne;
    r.total = r.stay + r.addonsTotal - r.combo;
    return r;
  }

  function lineItems(b, r) {
    var a = b.addons;
    return [
      { key: "stay", base: true, on: true, label: "Pinebo Classic (" + plural(b.nights, "natt", "nätter") + ")", amount: r.stay },
      { key: "bastu", on: a.bastu > 0, label: C.addons.bastu.name + (a.bastu ? " (" + plural(a.bastu, "dag", "dagar") + " × " + num(C.addons.bastu.perDay) + " kr)" : ""), amount: r.bastu },
      { key: "spa", on: a.spa > 0, label: C.addons.spa.name + (a.spa ? " (" + plural(a.spa, "dag", "dagar") + ")" : ""), amount: r.spa },
      { key: "stad", on: a.stad, label: C.addons.stad.name, amount: r.stad },
      { key: "linne", on: a.linne, label: C.addons.linne.name, amount: r.linne },
    ];
  }

  function bookingText(b, r) {
    var lines = lineItems(b, r).filter(function (l) { return l.on; }).map(function (l) {
      return "- " + l.label + ": " + kr(l.amount);
    });
    if (r.combo) lines.push("- Komborabatt (" + Math.round(C.comboDiscount * 100) + " % på bastu & bad): " + kr(-r.combo));
    return [
      "Incheckning: " + dayLabel(b.from) + " " + b.from.slice(0, 4) + ", " + C.checkInTime,
      "Utcheckning: " + dayLabel(b.to) + " " + b.to.slice(0, 4) + ", " + C.checkOutTime,
      "Gäster: " + b.guests,
      "",
    ].concat(lines, ["", "Totalbelopp: " + kr(r.total)]).join("\n");
  }

  /* ---------- Bokningsöversikt (sidopanel) ---------- */
  function renderSummary(el, b) {
    var mode = el.getAttribute("data-summary"); // "all" | "selected"
    var set = function (k, v) { var n = $('[data-sum="' + k + '"]', el); if (n) n.innerHTML = v; };

    if (!b.valid) {
      set("checkin", "Välj datum");
      set("checkout", "Välj datum");
      set("lines", '<li class="off"><span>Välj datum för att se priset.</span><span></span></li>');
      set("discounts", "");
      set("total", "–");
      set("totalnote", "");
      return;
    }

    var r = calc(b);
    set("checkin", dayLabel(b.from) + ", " + C.checkInTime);
    set("checkout", dayLabel(b.to) + ", " + C.checkOutTime);

    var items = lineItems(b, r).filter(function (l) { return mode === "all" || l.on; });
    set("lines", items.map(function (l) {
      var icon = l.base ? "" : '<i data-icon="' + (l.on ? "check-circle" : "circle") + '"></i>';
      var cls = l.base ? "base" : l.on ? "" : "off";
      return '<li class="' + cls + '"><span>' + icon + esc(l.label) + "</span><span>" + kr(l.amount) + "</span></li>";
    }).join(""));

    var disc = "";
    if (r.combo) {
      disc += '<li class="discount"><span>Komborabatt (' + Math.round(C.comboDiscount * 100) + " % på bastu & bad)</span><span>" + kr(-r.combo) + "</span></li>";
    }
    disc += '<li class="discount"><span>Direktbokning</span><span>Ingen serviceavgift</span></li>';
    set("discounts", disc);

    set("total", kr(r.total));
    var note = "inkl. moms";
    if (mode === "all" && r.addonsTotal) {
      note = "Tillval " + kr(r.addonsTotal) + (r.combo ? " · " + Math.round(C.comboDiscount * 100) + " % rabatt: " + kr(-r.combo) : "");
    }
    set("totalnote", note);
    $$("[data-sum-total-inline]").forEach(function (n) { n.textContent = kr(r.total); });

    if (window.PineboIcons) window.PineboIcons.render(el);
  }

  function renderSummaries(b) {
    $$("[data-summary]").forEach(function (el) { renderSummary(el, b); });
  }

  /* ---------- Gemensamt ---------- */
  function initNav() {
    var btn = $(".nav-toggle"), nav = $(".main-nav");
    if (!btn || !nav) return;
    function setOpen(open) {
      nav.classList.toggle("is-open", open);
      btn.setAttribute("aria-expanded", open);
      btn.setAttribute("aria-label", open ? "Stäng meny" : "Öppna meny");
      btn.innerHTML = '<i data-icon="' + (open ? "x" : "menu") + '"></i>';
      window.PineboIcons.render(btn);
    }
    btn.addEventListener("click", function () { setOpen(!nav.classList.contains("is-open")); });
    $$("a", nav).forEach(function (a) {
      a.addEventListener("click", function () { setOpen(false); });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) { setOpen(false); btn.focus(); }
    });
  }

  // Länkar/knappar markerade som inaktiva ska inte gå att aktivera (mus eller tangentbord)
  document.addEventListener("click", function (e) {
    if (e.target.closest('[aria-disabled="true"]')) e.preventDefault();
  });

  function fillConfigValues() {
    var map = {
      night: num(C.nightlyPrice),
      bastu: num(C.addons.bastu.perDay),
      spa: num(C.addons.spa.tiers[1]),
      spaTiers: num(C.addons.spa.tiers[1]) + "–" + num(C.addons.spa.tiers[2]),
      spaExtra: num(C.addons.spa.extraDay),
      stad: num(C.addons.stad.price),
      linne: num(C.addons.linne.price),
      combo: Math.round(C.comboDiscount * 100),
      cancel: C.freeCancellationDays,
      checkin: C.checkInTime,
      checkout: C.checkOutTime,
      hosts: C.hosts,
      email: C.email,
      maxGuests: C.maxGuests,
    };
    $$("[data-cfg]").forEach(function (el) {
      var v = map[el.getAttribute("data-cfg")];
      if (v !== undefined) el.textContent = v;
    });
    $$("a[data-mail]").forEach(function (a) { a.href = "mailto:" + C.email; });
    $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
  }

  function fillGuestSelects(selected) {
    $$("select[data-guests]").forEach(function (sel) {
      sel.innerHTML = "";
      for (var i = 1; i <= C.maxGuests; i++) {
        var o = document.createElement("option");
        o.value = i;
        o.textContent = plural(i, "gäst", "gäster");
        if (i === selected) o.selected = true;
        sel.appendChild(o);
      }
    });
  }

  /* ---------- Sökformulär ---------- */
  function initSearchForms(b) {
    $$("form[data-search]").forEach(function (form) {
      var from = form.elements.from, to = form.elements.to, guests = form.elements.guests;
      var err = $("[data-search-error]", form);
      var quote = $("[data-quote]", form);
      var today = todayIso();

      from.min = today;
      if (b.from && b.from >= today) from.value = b.from;
      if (b.to && b.valid && b.from >= today) to.value = b.to;
      to.min = from.value ? addDays(from.value, C.minNights) : addDays(today, C.minNights);

      function update() {
        if (from.value) {
          to.min = addDays(from.value, C.minNights);
          if (to.value && to.value < to.min) to.value = "";
        }
        if (err) err.hidden = true;
        if (quote) {
          var q = normalize({ from: from.value, to: to.value, guests: +guests.value, addons: {} });
          var lines = $("[data-quote-lines]", quote), total = $("[data-quote-total]", quote);
          if (q.valid) {
            lines.textContent = plural(q.nights, "natt", "nätter") + " × " + kr(C.nightlyPrice);
            total.textContent = kr(q.nights * C.nightlyPrice);
          } else {
            lines.textContent = "Välj datum för att se priset";
            total.textContent = "–";
          }
        }
      }
      from.addEventListener("change", update);
      to.addEventListener("change", update);
      guests.addEventListener("change", update);
      update();

      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var msg = "";
        if (!from.value || !to.value) msg = "Välj både incheckning och utcheckning.";
        else if (from.value < today) msg = "Incheckningen kan inte vara bakåt i tiden.";
        else if (to.value <= from.value) msg = "Utcheckningen måste vara efter incheckningen.";
        if (msg) {
          if (err) { err.textContent = msg; err.hidden = false; } else alert(msg);
          (!from.value || from.value < today ? from : to).focus();
          return;
        }
        var saved = getBooking();
        var nb = normalize({ from: from.value, to: to.value, guests: +guests.value, addons: saved.addons });
        saveBooking(nb);
        var params = new URLSearchParams({ from: nb.from, to: nb.to, guests: nb.guests });
        location.href = "boka.html?" + params.toString();
      });
    });
  }

  /* ---------- Steg 1: Välj upplevelse ---------- */
  function initBooking(b) {
    var searchBox = $("[data-booking-search]");
    var toggle = $("[data-toggle-search]");
    if (toggle && searchBox) {
      toggle.addEventListener("click", function () {
        searchBox.hidden = !searchBox.hidden;
        toggle.setAttribute("aria-expanded", !searchBox.hidden);
      });
    }

    var dateBadge = $("[data-dates-badge]");
    if (!b.valid) {
      if (searchBox) searchBox.hidden = false;
      $$("[data-requires-dates]").forEach(function (n) { n.setAttribute("aria-disabled", "true"); });
      $("[data-bar-dates]").textContent = "Inga datum valda";
      if (dateBadge) dateBadge.textContent = "Välj datum för att fortsätta";
    } else {
      $("[data-bar-dates]").innerHTML = esc(rangeLabel(b)) + ' <span class="muted">(' + plural(b.nights, "natt", "nätter") + ")</span>";
    }
    $("[data-bar-guests]").textContent = plural(b.guests, "gäst", "gäster");
    $$("[data-intro-nights]").forEach(function (n) { n.textContent = b.valid ? plural(b.nights, "natt", "nätter") : "dina nätter"; });
    $$("[data-intro-guests]").forEach(function (n) { n.textContent = plural(b.guests, "person", "personer"); });
    $$("[data-linne-guests]").forEach(function (n) { n.textContent = plural(b.guests, "person", "personer"); });

    function refresh() {
      var r = calc(b);
      var pkg = $("[data-pkg-total]");
      if (pkg) pkg.textContent = b.valid ? kr(r.stay) : num(C.nightlyPrice) + " kr/natt";
      var det = $("[data-pkg-detail]");
      if (det) det.textContent = b.valid
        ? plural(b.nights, "natt", "nätter") + " · " + num(C.nightlyPrice) + " kr/natt · " + kr(r.stay) + " totalt"
        : "Välj datum för att se totalpris";

      ["bastu", "spa"].forEach(function (k) {
        var box = $('.option[data-addon="' + k + '"]');
        if (!box) return;
        var v = b.addons[k];
        $("[data-value]", box).textContent = v;
        $("[data-dec]", box).disabled = v <= 0;
        $("[data-inc]", box).disabled = !b.valid || v >= b.nights;
        $("[data-period]", box).textContent = v ? plural(v, "dag", "dagar") + " · " + kr(r[k]) : "Ej valt";
        box.classList.toggle("is-active", v > 0);
      });
      ["stad", "linne"].forEach(function (k) {
        var box = $('.option[data-addon="' + k + '"]');
        if (!box) return;
        var on = b.addons[k], btn = $("[data-toggle]", box);
        btn.textContent = on ? "Ta bort" : "Lägg till";
        btn.className = "btn btn-sm " + (on ? "btn-outline" : "btn-primary");
        btn.setAttribute("aria-label", (on ? "Ta bort " : "Lägg till ") + C.addons[k].name.toLowerCase());
        btn.disabled = !b.valid;
        box.classList.toggle("is-active", on);
      });

      var comboNote = $("[data-combo-note]");
      if (comboNote) comboNote.hidden = !r.combo;

      saveBooking(b);
      renderSummaries(b);
    }

    $$(".option[data-addon]").forEach(function (box) {
      var k = box.getAttribute("data-addon");
      box.addEventListener("click", function (e) {
        var t = e.target.closest("button");
        if (!t) return;
        if (t.hasAttribute("data-inc")) b.addons[k] = clamp(b.addons[k] + 1, 0, b.nights);
        else if (t.hasAttribute("data-dec")) b.addons[k] = clamp(b.addons[k] - 1, 0, b.nights);
        else if (t.hasAttribute("data-toggle")) b.addons[k] = !b.addons[k];
        else return;
        refresh();
      });
    });

    refresh();
  }

  /* ---------- Steg 2: Kassa ---------- */
  function initCheckout(b) {
    var form = $("form[data-checkout]");
    if (!form) return;

    if (!b.valid) {
      $("[data-need-dates]").hidden = false;
      $$("[data-requires-dates]").forEach(function (n) { n.setAttribute("aria-disabled", "true"); n.disabled = true; });
    }

    var guestSel = form.elements.guests;
    guestSel.addEventListener("change", function () {
      b.guests = +guestSel.value;
      saveBooking(b);
    });

    // Betalsätt
    var swishNr = form.elements.swish;
    function syncPay() {
      var m = form.elements.payment.value;
      $$("[data-pay-panel]").forEach(function (p) { p.hidden = p.getAttribute("data-pay-panel") !== m; });
      swishNr.required = m === "swish";
      if (swishNr.hasAttribute("aria-invalid")) fieldError(swishNr);
    }
    $$('input[name="payment"]', form).forEach(function (r) { r.addEventListener("change", syncPay); });
    syncPay();

    // Förifyll Swish-nummer från telefon
    form.elements.phone.addEventListener("change", function () {
      if (!swishNr.value) swishNr.value = form.elements.phone.value;
    });

    var msg = $("[data-form-msg]");
    var submitBtns = $$("[data-submit]");

    // Tydliga felmeddelanden på svenska direkt under respektive fält
    var messages = {
      firstName: "Fyll i ditt förnamn.",
      lastName: "Fyll i ditt efternamn.",
      email: { valueMissing: "Fyll i din e-postadress.", typeMismatch: "Skriv e-postadressen i formatet namn@exempel.se." },
      phone: "Fyll i ditt telefonnummer.",
      swish: "Fyll i mobilnumret som ska ta emot Swish-förfrågan.",
    };
    function fieldError(input) {
      var id = input.id + "-error";
      var el = document.getElementById(id);
      var m = messages[input.name];
      var text = "";
      if (!input.validity.valid) {
        text = typeof m === "string" ? m : (input.validity.typeMismatch ? m.typeMismatch : m.valueMissing);
      }
      if (!el && text) {
        el = document.createElement("p");
        el.id = id;
        el.className = "field-error";
        input.insertAdjacentElement("afterend", el);
        input.setAttribute("aria-describedby", id);
      }
      if (el) { el.textContent = text; el.hidden = !text; }
      if (text) input.setAttribute("aria-invalid", "true"); else input.removeAttribute("aria-invalid");
      return !text;
    }
    var validated = Object.keys(messages).map(function (n) { return form.elements[n]; });
    validated.forEach(function (input) {
      // Visa fel först när fältet lämnats, och ta bort felet direkt när det rättats
      input.addEventListener("blur", function () { if (input.value) fieldError(input); });
      input.addEventListener("input", function () { if (input.hasAttribute("aria-invalid")) fieldError(input); });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      msg.hidden = true;
      if (!b.valid) return;
      var firstInvalid = null;
      validated.forEach(function (input) {
        if (!fieldError(input) && !firstInvalid) firstInvalid = input;
      });
      if (firstInvalid) { firstInvalid.focus(); return; }

      var r = calc(b);
      var f = form.elements;
      var guest = {
        firstName: f.firstName.value.trim(),
        lastName: f.lastName.value.trim(),
        email: f.email.value.trim(),
        phone: f.phone.value.trim(),
        message: f.message.value.trim(),
        payment: f.payment.value,
        swish: f.payment.value === "swish" ? f.swish.value.trim() : "",
      };

      var text =
        "Ny bokningsförfrågan – Pinebo Palace\n\n" +
        "Namn: " + guest.firstName + " " + guest.lastName + "\n" +
        "E-post: " + guest.email + "\n" +
        "Telefon: " + guest.phone + "\n" +
        "Betalsätt: " + (guest.payment === "swish" ? "Swish (" + guest.swish + ")" : "Kort") + "\n\n" +
        bookingText(b, r) +
        (guest.message ? "\n\nMeddelande:\n" + guest.message : "");

      var record = { booking: { from: b.from, to: b.to, guests: b.guests, addons: b.addons }, guest: guest, total: r.total, sentAt: new Date().toISOString() };

      function done(via) {
        record.via = via;
        storage.set(REQ_KEY, record);
        storage.del(KEY);
        location.href = "tack.html";
      }

      if (C.bookingEndpoint) {
        submitBtns.forEach(function (btn) { btn.disabled = true; });
        fetch(C.bookingEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(Object.assign({ _subject: "Bokningsförfrågan " + b.from + " – " + b.to, sammanfattning: text }, record)),
        }).then(function (res) {
          if (!res.ok) throw new Error(res.status);
          done("endpoint");
        }).catch(function () {
          submitBtns.forEach(function (btn) { btn.disabled = false; });
          msg.textContent = "Något gick fel när förfrågan skulle skickas. Försök igen eller mejla oss på " + C.email + ".";
          msg.hidden = false;
        });
      } else {
        var subject = "Bokningsförfrågan " + b.from + " – " + b.to;
        location.href = "mailto:" + C.email + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(text);
        setTimeout(function () { done("mail"); }, 400);
      }
    });
  }

  /* ---------- Tack-sidan ---------- */
  function initThanks() {
    var rec = storage.get(REQ_KEY);
    if (!rec) { $("[data-no-request]").hidden = false; $("[data-request]").hidden = true; return; }
    var b = normalize(rec.booking);
    $("[data-thanks-name]").textContent = rec.guest.firstName;
    $("[data-thanks-email]").textContent = rec.guest.email;
    $$("[data-via]").forEach(function (n) { n.hidden = n.getAttribute("data-via") !== rec.via; });
    renderSummaries(b);
    var h = $("[data-focus]");
    if (h) h.focus();
  }

  /* ---------- Herofilm (YouTube) ----------
     - Spelaren skapas direkt när sidan öppnas. Tills filmen spelar syns heron mörkgrön.
     - Cookie-fri domän (youtube-nocookie.com). Spelaren styrs med postMessage,
       så YouTubes separata API-skript behöver inte laddas.
     - Loopar, startar alltid utan ljud. Egna knappar för paus/spela och ljud.
     - Ingen autostart vid "reducerad rörelse" eller datasparläge – då visas en play-knapp.
     - Pausas när den inte syns och fortsätter när den syns igen,
       om inte besökaren själv har pausat. */
  function initHeroVideo() {
    var box = $("[data-hero-video]");
    if (!box || !("IntersectionObserver" in window)) return;
    var id = box.getAttribute("data-youtube-id");
    var ORIGIN = "https://www.youtube-nocookie.com";
    var root = box.parentNode;
    var controls = $(".video-controls", root);
    var toggle = $("[data-video-toggle]", root);
    var sound = $("[data-video-sound]", root);

    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var conn = navigator.connection || {};
    var saveData = !!conn.saveData || /(^|-)2g$/.test(conn.effectiveType || "");
    var autoplay = !reduceMotion && !saveData;

    var frame = null;
    var ready = false;
    var playing = false;
    var muted = true;
    var userPaused = !autoplay;
    var inView = true;

    function setBtn(btn, icon, label) {
      btn.innerHTML = '<i data-icon="' + icon + '"></i><span class="video-btn-text">' + label + "</span>";
      window.PineboIcons.render(btn);
    }
    function updateUI() {
      setBtn(toggle, playing ? "pause" : "play", playing ? "Pausa filmen" : "Spela filmen");
      setBtn(sound, muted ? "volume-x" : "volume", muted ? "Slå på ljud" : "Stäng av ljud");
      // Filmen tonas in första gången den spelar och ligger sedan kvar (även pausad)
      if (playing) box.classList.add("video-ready");
    }
    function send(data) {
      if (frame && frame.contentWindow) {
        data.id = 1;
        data.channel = "widget";
        frame.contentWindow.postMessage(JSON.stringify(data), ORIGIN);
      }
    }
    function cmd(func, args) { if (ready) send({ event: "command", func: func, args: args || [] }); }

    function create() {
      if (frame) return;
      var params = new URLSearchParams({
        autoplay: 1, mute: 1, loop: 1, playlist: id, controls: 0, playsinline: 1,
        rel: 0, iv_load_policy: 3, disablekb: 1, fs: 0, modestbranding: 1,
        enablejsapi: 1, origin: location.origin,
      });
      frame = document.createElement("iframe");
      frame.className = "hero-video";
      frame.src = ORIGIN + "/embed/" + encodeURIComponent(id) + "?" + params.toString();
      frame.title = "Film från Pinebo Palace";
      frame.allow = "autoplay; encrypted-media; picture-in-picture";
      frame.referrerPolicy = "strict-origin-when-cross-origin";
      // Styrs via knapparna ovan – spelaren själv ska inte gå att tabba in i
      frame.tabIndex = -1;
      frame.setAttribute("aria-hidden", "true");
      frame.addEventListener("load", function () { send({ event: "listening" }); });
      box.appendChild(frame);
    }

    window.addEventListener("message", function (e) {
      if (e.origin !== ORIGIN || !frame || e.source !== frame.contentWindow) return;
      var d;
      try { d = typeof e.data === "string" ? JSON.parse(e.data) : e.data; } catch (err) { return; }
      if (!d || !d.event) return;
      var info = d.info || {};
      if (d.event === "onReady" || d.event === "initialDelivery") {
        if (!ready) {
          ready = true;
          if (!muted) cmd("unMute");
          if (userPaused || !inView) cmd("pauseVideo");
        }
      }
      var state = d.event === "onStateChange" ? d.info : (typeof info.playerState === "number" ? info.playerState : null);
      if (state === 1) playing = true;        // spelar
      else if (state === 2) playing = false;  // pausad (övriga lägen, t.ex. loop-omstart, ignoreras)
      if (typeof info.muted === "boolean") muted = info.muted;
      updateUI();
    });

    toggle.addEventListener("click", function () {
      if (playing) {
        userPaused = true;
        playing = false;
        cmd("pauseVideo");
        updateUI();
      } else {
        userPaused = false;
        if (frame) cmd("playVideo"); else create();
      }
    });
    sound.addEventListener("click", function () {
      muted = !muted;
      if (frame) cmd(muted ? "mute" : "unMute");
      if (!muted && !playing) {
        userPaused = false;
        if (frame) cmd("playVideo"); else create();
      }
      updateUI();
    });

    new IntersectionObserver(function (entries) {
      inView = entries[0].isIntersecting;
      if (!frame) return;
      if (!inView && playing) { cmd("pauseVideo"); }
      else if (inView && !userPaused && !playing) { cmd("playVideo"); }
    }, { threshold: 0.25 }).observe(box);

    function start() {
      controls.hidden = false;
      updateUI();
      if (autoplay) create();
    }
    // Starta direkt (skriptet ligger sist i body, så sidans innehåll är redan på plats)
    start();
  }

  /* ---------- Start ---------- */
  var booking = getBooking();
  initNav();
  initHeroVideo();
  fillConfigValues();
  fillGuestSelects(booking.guests);
  initSearchForms(booking);
  if (page === "boka") initBooking(booking);
  if (page === "kassa") { initCheckout(booking); renderSummaries(booking); }
  if (page === "tack") initThanks();
})();
