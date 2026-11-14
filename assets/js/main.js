/* ==========================================================================
   Pinebo Palace – sidlogik
   - Språk och mobilmeny
   - Sökformulär som skickar datum och gäster vidare till Sirvoys bokningsformulär
   - Herofilm och bildvisare
   ========================================================================== */
(function () {
  "use strict";

  var C = window.PINEBO;

  /* ---------- Språk ----------
     Sidans språk läses från <html lang>. Texter i koden skrivs på svenska och slås
     upp i window.PINEBO_I18N (assets/js/i18n.js). sv = true ger alltid svenska,
     t.ex. i bokningsmejlet till värdarna. */
  var LANG = document.documentElement.getAttribute("lang") || "sv";
  var ROOT = document.documentElement.getAttribute("data-root") || "";
  var LOCALE = { sv: "sv-SE", en: "en-GB", de: "de-DE" }[LANG] || "sv-SE";
  var DICT = (window.PINEBO_I18N || {})[LANG] || {};
  function t(s, vars, sv) {
    var out = (!sv && DICT[s]) || s;
    if (vars) out = out.replace(/\{(\w+)\}/g, function (m, k) { return vars[k]; });
    return out;
  }

  /* ---------- Hjälpfunktioner ---------- */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function num(n) { return Math.round(n).toLocaleString(LOCALE); }
  function plural(n, one, many) { return n + " " + t(n === 1 ? one : many); }
  function isoDate(d) { return d.toISOString().slice(0, 10); }
  function todayIso() {
    var n = new Date();
    return isoDate(new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate())));
  }
  function addDays(iso, days) {
    var p = iso.split("-").map(Number);
    return isoDate(new Date(Date.UTC(p[0], p[1] - 1, p[2] + days)));
  }

  /* ---------- Gemensamt ---------- */
  function initNav() {
    var btn = $(".nav-toggle"), nav = $(".main-nav");
    if (!btn || !nav) return;
    function setOpen(open) {
      nav.classList.toggle("is-open", open);
      btn.setAttribute("aria-expanded", open);
      btn.setAttribute("aria-label", open ? t("Stäng meny") : t("Öppna meny"));
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

  function fillConfigValues() {
    var map = {
      night: num(C.nightlyPrice),
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

  /* ---------- Sökformulär → Sirvoys bokningsformulär ----------
     Datum och antal gäster skickas i adressen till boka.html. Sirvoys formulär läser
     check_in, check_out och adults och visar lediga alternativ och priser direkt
     (target=results). Utan datum öppnas formuläret på datumvalet. */
  function initSearchForms() {
    $$("form[data-search]").forEach(function (form) {
      var from = form.elements.from, to = form.elements.to, guests = form.elements.guests;
      var err = $("[data-search-error]", form);
      var today = todayIso();
      from.min = today;
      to.min = addDays(today, C.minNights);

      function update() {
        if (from.value) {
          to.min = addDays(from.value, C.minNights);
          if (to.value && to.value < to.min) to.value = "";
        }
        if (err) err.hidden = true;
      }
      from.addEventListener("change", update);
      to.addEventListener("change", update);

      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var params = new URLSearchParams({ adults: guests.value });
        if (from.value || to.value) {
          var msg = "";
          if (!from.value || !to.value) msg = t("Välj både incheckning och utcheckning.");
          else if (from.value < today) msg = t("Incheckningen kan inte vara bakåt i tiden.");
          else if (to.value <= from.value) msg = t("Utcheckningen måste vara efter incheckningen.");
          if (msg) {
            if (err) { err.textContent = msg; err.hidden = false; }
            (!from.value || from.value < today ? from : to).focus();
            return;
          }
          params.set("check_in", from.value);
          params.set("check_out", to.value);
          params.set("target", "results");
        }
        location.href = "boka.html?" + params.toString();
      });
    });
  }

  /* ---------- Herofilm (YouTube) ----------
     - Spelaren skapas direkt när sidan öppnas. Tills filmen spelar syns heron mörkgrön.
     - Cookie-fri domän (youtube-nocookie.com). Spelaren styrs med postMessage,
       så YouTubes separata API-skript behöver inte laddas.
     - Loopar och är alltid ljudlös. Egen knapp för paus/spela.
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

    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var conn = navigator.connection || {};
    var saveData = !!conn.saveData || /(^|-)2g$/.test(conn.effectiveType || "");
    var autoplay = !reduceMotion && !saveData;

    var frame = null;
    var ready = false;
    var playing = false;
    var userPaused = !autoplay;
    var inView = true;

    function setBtn(btn, icon, label) {
      btn.innerHTML = '<i data-icon="' + icon + '"></i><span class="video-btn-text">' + label + "</span>";
      window.PineboIcons.render(btn);
    }
    function updateUI() {
      setBtn(toggle, playing ? "pause" : "play", playing ? t("Pausa filmen") : t("Spela filmen"));
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
      frame.title = t("Film från Pinebo Palace");
      frame.allow = "autoplay; encrypted-media; picture-in-picture";
      frame.referrerPolicy = "strict-origin-when-cross-origin";
      // Styrs via knapparna ovan – spelaren själv ska inte gå att tabba in i
      frame.tabIndex = -1;
      frame.setAttribute("aria-hidden", "true");
      frame.addEventListener("load", function () {
        send({ event: "listening" });
        // Skydd: visa spelaren även om YouTube inte skulle rapportera sitt läge
        setTimeout(function () { box.classList.add("video-ready"); }, 2500);
      });
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
          if (userPaused || !inView) cmd("pauseVideo");
        }
      }
      var state = d.event === "onStateChange" ? d.info : (typeof info.playerState === "number" ? info.playerState : null);
      if (state === 1) playing = true;        // spelar
      else if (state === 2) playing = false;  // pausad (övriga lägen, t.ex. loop-omstart, ignoreras)
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

  /* ---------- Bildvisare (lightbox) ----------
     - Alla foton på sidan blir klickbara och öppnas i helskärm.
     - Bläddra med knappar, piltangenter eller svep. Stäng med kryss, Esc eller klick utanför.
     - Byggd på <dialog>: fokus stannar i visaren och återgår till bilden när den stängs.
     - Galleriet på Boendet visar fem rutor; den sista visar hur många bilder som finns till. */
  function initLightbox() {
    if (!window.HTMLDialogElement) return;
    var photos = $$(".photo").filter(function (p) {
      var i = $("img", p);
      return i && /\.webp$/.test(i.getAttribute("src") || "");
    });
    if (!photos.length) return;

    var items = photos.map(function (p) {
      var i = $("img", p);
      return { src: i.getAttribute("src"), srcset: i.getAttribute("srcset"), alt: i.alt, w: i.getAttribute("width"), h: i.getAttribute("height") };
    });

    var dlg = document.createElement("dialog");
    dlg.className = "lightbox";
    dlg.setAttribute("aria-label", t("Bildvisning"));
    dlg.innerHTML =
      '<figure class="lb-figure"><img class="lb-img" alt=""><figcaption class="lb-caption"></figcaption></figure>' +
      '<p class="lb-count" aria-live="polite"></p>' +
      '<button type="button" class="lb-btn lb-close" aria-label="' + t("Stäng bildvisningen") + '"><i data-icon="x"></i></button>' +
      '<button type="button" class="lb-btn lb-prev" aria-label="' + t("Föregående bild") + '"><i data-icon="chevron-left"></i></button>' +
      '<button type="button" class="lb-btn lb-next" aria-label="' + t("Nästa bild") + '"><i data-icon="chevron-right"></i></button>';
    document.body.appendChild(dlg);
    window.PineboIcons.render(dlg);

    var img = $(".lb-img", dlg), cap = $(".lb-caption", dlg), count = $(".lb-count", dlg);
    var idx = 0, opener = null;
    if (items.length < 2) { $(".lb-prev", dlg).hidden = true; $(".lb-next", dlg).hidden = true; }

    function setImage(el, it) {
      el.removeAttribute("srcset");
      if (it.srcset) { el.sizes = "100vw"; el.srcset = it.srcset; }
      el.src = it.src;
    }
    function show(n) {
      idx = (n + items.length) % items.length;
      var it = items[idx];
      setImage(img, it);
      img.alt = it.alt;
      if (it.w) img.width = it.w;
      if (it.h) img.height = it.h;
      cap.textContent = it.alt;
      count.textContent = t("Bild {n} av {total}", { n: idx + 1, total: items.length });
      // Förladda nästa bild så att bläddringen känns direkt
      if (items.length > 1) setImage(new Image(), items[(idx + 1) % items.length]);
    }
    function open(n, from) {
      opener = from;
      show(n);
      dlg.showModal();
      document.documentElement.classList.add("lb-open");
    }
    dlg.addEventListener("close", function () {
      document.documentElement.classList.remove("lb-open");
      if (opener) opener.focus();
    });
    $(".lb-close", dlg).addEventListener("click", function () { dlg.close(); });
    $(".lb-prev", dlg).addEventListener("click", function () { show(idx - 1); });
    $(".lb-next", dlg).addEventListener("click", function () { show(idx + 1); });
    dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { e.preventDefault(); show(idx - 1); }
      else if (e.key === "ArrowRight") { e.preventDefault(); show(idx + 1); }
    });
    var touchX = null;
    dlg.addEventListener("touchstart", function (e) { touchX = e.touches[0].clientX; }, { passive: true });
    dlg.addEventListener("touchend", function (e) {
      if (touchX === null) return;
      var dx = e.changedTouches[0].clientX - touchX;
      touchX = null;
      if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1));
    });

    photos.forEach(function (p, n) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "photo-zoom";
      btn.setAttribute("aria-label", t("Visa större bild: {alt}", { alt: items[n].alt }));
      btn.innerHTML = '<span class="photo-zoom-ico"><i data-icon="expand"></i></span>';
      btn.addEventListener("click", function () { open(n, btn); });
      p.appendChild(btn);
      window.PineboIcons.render(btn);
    });

    // "+N bilder" på sista synliga rutan i galleriet
    $$(".gallery").forEach(function (g) {
      var tiles = $$(".photo", g), visible = 5;
      if (tiles.length <= visible) return;
      var btn = $(".photo-zoom", tiles[visible - 1]);
      btn.setAttribute("aria-label", t("Visa alla {n} bilder", { n: tiles.length }));
      btn.insertAdjacentHTML("beforeend", '<span class="photo-more" aria-hidden="true">' + t("+{n} bilder", { n: tiles.length - visible }) + "</span>");
    });
  }

  /* ---------- Start ---------- */
  initNav();
  initHeroVideo();
  initLightbox();
  fillConfigValues();
  fillGuestSelects(2);
  initSearchForms();
})();
