# Pinebo Palace

Webbplats för Pinebo Palace – en privat skogsstuga i Ulricehamn som hyrs ut direkt
(tidigare via Airbnb).

Ren HTML/CSS/JavaScript utan byggsteg. Öppna `index.html` i webbläsaren, eller
kör en lokal server:

```bash
python3 -m http.server 8000
```

…och gå till http://localhost:8000.

## Sidor

| Fil              | Innehåll                                                |
|------------------|---------------------------------------------------------|
| `index.html`     | Startsida: hero + datumsök, boendet, bastu, priser, FAQ |
| `boendet.html`   | Detaljsida om stugan med galleri och priskort           |
| `bastu-bad.html` | Vedbastu och spabad                                     |
| `boka.html`      | Bokning steg 1: välj tillval, live-prisberäkning        |
| `kassa.html`     | Bokning steg 2: gästuppgifter och betalsätt             |
| `tack.html`      | Bekräftelse efter skickad förfrågan                     |

## Ändra priser och kontaktuppgifter

Allt finns i **`assets/js/config.js`** – nattpris, tillval, komborabatt,
in-/utcheckningstider, värdarnas namn och e-post. Sidorna uppdateras automatiskt.

## Uppdatera CSS/JS – öka versionsnumret

GitHub Pages låter webbläsare spara CSS och JS i upp till 10 minuter. Varje gång
`style.css` eller någon `.js`-fil ändras: öka `?v=`-numret i alla `.html`-filer
(t.ex. `?v=2` → `?v=3`), annars kan besökare få en blandning av ny och gammal kod.

## Bilder

Se `assets/img/README.md` för vilka filnamn som behövs.

## Herofilm på startsidan

Startsidan börjar med en hero som täcker hela skärmen, med en YouTube-film (ca 1 minut)
som loopar och rubriken ovanpå. Film-id:t står i `index.html` på `data-youtube-id`.

- Filmen startar direkt utan ljud. Egna knappar för paus/spela och ljud på/av.
- Cookie-fri YouTube-domän (`youtube-nocookie.com`), utan YouTubes separata API-skript.
- YouTubes egna kontroller döljs, och filmen beskärs så att den alltid fyller ytan.
- Ingen autostart vid "reducerad rörelse" eller datasparläge – då visas en play-knapp.
- Filmen pausas när den scrollas ur bild och fortsätter när den syns igen.

## Hur bokningen fungerar just nu

Sajten tar emot en **bokningsförfrågan** – ingen betalning sker på sajten.

- Om `bookingEndpoint` i `config.js` är tom öppnas gästens e-postprogram med ett
  färdigifyllt mejl till värdarnas adress.
- Sätter man `bookingEndpoint` till t.ex. en [Formspree](https://formspree.io)-adress
  skickas förfrågan direkt från sidan och hamnar i värdarnas inkorg.

Värdarna bekräftar sedan datumen och skickar Swish-förfrågan eller betallänk.

## SEO och tillgänglighet

- Varje publik sida har unik titel, beskrivning, canonical-länk och Open Graph-taggar
  (för snygga förhandsvisningar när länken delas). Startsidan har strukturerad data
  (`LodgingBusiness`) för Google.
- `sitemap.xml` och `robots.txt` finns i roten. Bokningssidorna har `noindex`.
- Byter ni till egen domän: sök-och-ersätt `https://isamod.github.io/Pinebo-palace/`
  i alla `.html`-filer, `sitemap.xml` och `robots.txt`.
- Byggd mot WCAG 2.2 AA: semantiska landmärken och rubriker, "hoppa till innehållet",
  synligt fokus, kontrast ≥ 4.5:1, felmeddelanden kopplade till fälten, respekt för
  "reducerad rörelse". Testad med axe-core (0 fel) på desktop och mobil.

## Att göra

- [ ] Riktiga foton (se `assets/img/README.md`)
- [x] Riktiga gästomdömen (från Airbnb)
- [ ] Korrekt e-post, priser och värdnamn i `config.js`
- [ ] Tillgänglighetskalender (t.ex. synk mot Airbnb-kalendern via iCal)
- [ ] Bokningsvillkor/ordningsregler som sida
- [ ] Publicering (t.ex. GitHub Pages) och domän
