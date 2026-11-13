/* ==========================================================================
   Pinebo Palace – priser och inställningar
   Ändra här så uppdateras priserna på hela sajten.
   ========================================================================== */
window.PINEBO = {
  // Grundpris per natt (Pinebo Classic)
  nightlyPrice: 1300,
  maxGuests: 4,
  minNights: 1,
  checkInTime: "15:00",
  checkOutTime: "11:00",
  freeCancellationDays: 14,

  addons: {
    bastu: {
      name: "Vedbastu",
      perDay: 400,
    },
    spa: {
      name: "Spabad",
      // Pris för 1 resp. 2 dagar, därefter extraDay per ytterligare dag
      tiers: { 1: 400, 2: 600 },
      extraDay: 100,
    },
    stad: {
      name: "Städning vid avresa",
      price: 800,
    },
    linne: {
      name: "Sängkläder & handdukar",
      price: 250,
    },
  },

  // Rabatt på bastu + spabad när båda bokas (0.10 = 10 %)
  comboDiscount: 0.10,

  // Kontakt
  hosts: "Maria & Andreas",
  email: "kontakt@pinebo.se",

  // Dit bokningsförfrågningar skickas. Lämna tomt för att i stället öppna
  // gästens e-postprogram med ett ifyllt mejl till `email` ovan.
  // Exempel med Formspree: "https://formspree.io/f/xxxxxxx"
  bookingEndpoint: "",
};
