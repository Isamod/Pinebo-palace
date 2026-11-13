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

## Bilder

Se `assets/img/README.md` för vilka filnamn som behövs.

## Herofilm på startsidan

Startsidans toppbild kan vara en film. Skapa webbfilerna från originalfilmen med:

```bash
scripts/encode-hero-video.sh /sökväg/till/originalfilm.mp4
```

Valfritt andra argument kortar filmen, t.ex. `30` för de första 30 sekunderna.
Skriptet skapar `assets/video/hero-1080.mp4`, `assets/video/hero-720.mp4` och
`assets/img/hero.jpg` (stillbild). Lägg aldrig originalfilen i repot.

Så påverkar filmen inte sidan negativt:
- Stillbilden visas direkt, och filmen hämtas först när resten av sidan har laddat.
- Mobiler får 720p-versionen.
- Ingen autostart vid "reducerad rörelse" eller datasparläge – då visas en play-knapp.
- Ljudet är av från start. Det finns knappar för paus/spela och ljud på/av.
- Filmen pausas när den scrollas ur bild.
- Saknas filmfilerna visas bara stillbilden.

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
- [ ] Riktiga gästomdömen (platshållare på startsidan)
- [ ] Korrekt e-post, priser och värdnamn i `config.js`
- [ ] Tillgänglighetskalender (t.ex. synk mot Airbnb-kalendern via iCal)
- [ ] Bokningsvillkor/ordningsregler som sida
- [ ] Publicering (t.ex. GitHub Pages) och domän
