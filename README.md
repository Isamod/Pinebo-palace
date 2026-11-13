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

## Hur bokningen fungerar just nu

Sajten tar emot en **bokningsförfrågan** – ingen betalning sker på sajten.

- Om `bookingEndpoint` i `config.js` är tom öppnas gästens e-postprogram med ett
  färdigifyllt mejl till värdarnas adress.
- Sätter man `bookingEndpoint` till t.ex. en [Formspree](https://formspree.io)-adress
  skickas förfrågan direkt från sidan och hamnar i värdarnas inkorg.

Värdarna bekräftar sedan datumen och skickar Swish-förfrågan eller betallänk.

## Att göra

- [ ] Riktiga foton (se `assets/img/README.md`)
- [ ] Riktiga gästomdömen (platshållare på startsidan)
- [ ] Korrekt e-post, priser och värdnamn i `config.js`
- [ ] Tillgänglighetskalender (t.ex. synk mot Airbnb-kalendern via iCal)
- [ ] Bokningsvillkor/ordningsregler som sida
- [ ] Publicering (t.ex. GitHub Pages) och domän
