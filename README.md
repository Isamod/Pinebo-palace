# Pinebo Palace

Webbplats för Pinebo Palace – en privat skogsstuga i Ulricehamn som hyrs ut direkt
(tidigare via Airbnb).

Ren HTML/CSS/JavaScript utan byggsteg. Öppna `index.html` i webbläsaren, eller
kör en lokal server:

```bash
python3 -m http.server 8000
```

…och gå till http://localhost:8000.

Sajten finns på **https://pinebo.se** (GitHub Pages, domänen och DNS hos one.com).

## Sidor

| Fil              | Innehåll                                                |
|------------------|---------------------------------------------------------|
| `index.html`     | Startsida: hero + datumsök, boendet, bastu, priser, FAQ |
| `boendet.html`   | Detaljsida om stugan med galleri och priskort           |
| `bastu-bad.html` | Vedbastu och spabad                                     |
| `boka.html`      | Bokning med Sirvoys bokningsformulär                    |

## Utseende på Sirvoys bokningsformulär

`sirvoy/anpassad.css` ger Sirvoys formulär webbplatsens färger, typsnitt och former.
Klistra in hela filen i Sirvoy: **Webbverktyg → Bokningsformulär → Anpassad CSS**.
Ändras webbplatsens färger behöver filen uppdateras och klistras in igen.

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

## Ändra priser och kontaktuppgifter

I **`assets/js/config.js`**: lägsta nattpris, in-/utcheckningstider, värdarnas namn och
e-post. Priser för tillval står i texterna – och styrs i Sirvoy.

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

## Bokning via Sirvoy

Bokningen sker i **Sirvoys bokningsformulär**, inbäddat på `boka.html`
(Sirvoy → Webbverktyg → Bokningsformulär). Sirvoy är kopplat till Airbnb,
Booking.com och Stripe, så tillgänglighet, priser, tillval, betalning och
bekräftelser sköts där – och en bokning via sajten blockerar datumen automatiskt
i de andra kanalerna.

- Sökrutorna på startsidan och Boendet skickar `check_in`, `check_out` och `adults`
  i adressen till `boka.html`. Sirvoys formulär läser dem och visar lediga
  alternativ direkt (`target=results`). Utan datum öppnas formuläret på datumvalet.
- Formulärets språk sätts per sida (`data-lang`) av byggskriptet.
- **Priser och tillval ändras i Sirvoy.** Texterna på sajten (t.ex. "Från 1 000 kr/natt",
  bastu- och spabadspriser) måste hållas i samma nivå – nattpriset i `config.js`,
  övriga priser i HTML-texterna och `i18n/*.json`.
- Tillvalens namn och beskrivningar visas som de är skrivna i Sirvoy – lägg in
  engelska och tyska översättningar där om möjligt.

## Att göra

- [ ] Riktiga foton (se `assets/img/README.md`)
- [x] Riktiga gästomdömen (från Airbnb)
- [x] Korrekt e-post i `config.js`
- [ ] Priser som stämmer med Sirvoy (bekräfta lägsta nattpris)
- [x] Bokning, tillgänglighet och betalning via Sirvoy
- [x] Bokningsvillkor (bokningsvillkor.html)
- [x] Integritetspolicy (integritetspolicy.html)
- [ ] Länka bokningsvillkor och integritetspolicy i Sirvoy när den egna domänen finns
- [x] Publicering på GitHub Pages med domänen pinebo.se (DNS hos one.com)
