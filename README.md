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

## Språk: svenska, engelska och tyska

De svenska sidorna i roten är källan. Engelska (`/en/`) och tyska (`/de/`) sidor
**byggs** från dem med översättningarna i `i18n/en.json` och `i18n/de.json`:

```bash
npm install
npm run build
```

- **Ändrar du en svensk text** måste översättningen uppdateras. Kör `npm run extract`
  – då läggs nya texter till som tomma i `i18n/*.json`. Fyll i dem och kör `npm run build`.
  Bygget stoppar om någon text saknar översättning, så inget svenskt slinker igenom.
- Texter som skapas av JavaScript (felmeddelanden, kalender, prisöversikt) översätts
  i `assets/js/i18n.js`.
- Varje sida har `hreflang`-länkar till sina språkversioner och en språkväljare i menyn.
- Omdömena på engelska/tyska är översatta från Airbnbs svenska version och märkta
  "Translated"/"Übersetzt".
- Bokningsmejlet till värdarna är alltid på svenska, med en rad om gästens språk.

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

## Hur bokningen fungerar

Sajten tar emot **bokningsförfrågningar** – ingen betalning sker på sajten.
Gästen väljer datum och tillval, fyller i sina uppgifter och önskat betalsätt
(Swish eller banköverföring). Värdarna bekräftar och skickar betalningsinstruktioner.

- Om `bookingEndpoint` i `config.js` är tom öppnas gästens e-postprogram med ett
  färdigifyllt mejl till värdarnas adress.
- Sätter man `bookingEndpoint` till t.ex. en [Formspree](https://formspree.io)-adress
  skickas förfrågan direkt från sidan och hamnar i värdarnas inkorg.

## Kalendersynk med Airbnb och Booking.com

Bokade datum hämtas automatiskt varje timme från Airbnb och Booking.com och visas
som en kalender på bokningssidan. Gäster kan inte skicka förfrågan på upptagna datum.

Så fungerar det: `.github/workflows/publicera.yml` kör `scripts/sync-calendars.mjs`,
som skriver `data/bokade-datum.json`, och publicerar sedan sajten på GitHub Pages.

### Engångsinställning

1. **Koden måste ligga på `main`** – schemalagda körningar går bara där.
2. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
3. **Hämta kalenderlänkarna** (de är hemliga – lägg dem aldrig i koden):
   - *Airbnb:* Annonser → välj annonsen → Tillgänglighet → Anslut kalendrar /
     Synkronisera kalendrar → Exportera kalender → kopiera länken.
   - *Booking.com (extranätet):* Priser och tillgänglighet → Synkronisera kalendrar
     → Exportera kalender → kopiera länken.
4. **Settings → Secrets and variables → Actions → New repository secret:**
   `AIRBNB_ICAL_URL` och `BOOKING_ICAL_URL` med respektive länk.
5. **Actions → Publicera sajten → Run workflow** för att köra direkt första gången.

Utan länkar publiceras sajten ändå, men kalendern döljs.

### Viktigt
- **Direktbokningar** från sajten måste blockeras manuellt i Airbnb och Booking.com
  när ni bekräftar dem – annars kan någon boka samma datum där.
- Se till att **Airbnb och Booking.com även synkar med varandra** (importera den ena
  kalendern i den andra), om ni inte redan gör det.

## Att göra

- [ ] Riktiga foton (se `assets/img/README.md`)
- [x] Riktiga gästomdömen (från Airbnb)
- [ ] Korrekt e-post, priser och värdnamn i `config.js`
- [x] Tillgänglighetskalender (synk mot Airbnb och Booking.com)
- [ ] Lägg in kalenderlänkarna som hemligheter (se ovan)
- [ ] Bokningsvillkor/ordningsregler som sida
- [ ] Integritetspolicy (GDPR)
- [ ] Publicering (t.ex. GitHub Pages) och domän
