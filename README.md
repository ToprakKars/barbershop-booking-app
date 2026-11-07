# Barbershop Booking App – "Fade & Co."

A bilingual (English / German) online booking app for a barbershop.
Customers pick a service, a barber and a free time slot – the app works out which slots are really free.

🔗 **Live demo:** https://toprakkars.github.io/barbershop-booking-app/

<p align="center">
  <img src="https://raw.githubusercontent.com/ToprakKars/ToprakKars/main/assets/booking-service.jpg" width="49%" alt="Choosing a service">
  <img src="https://raw.githubusercontent.com/ToprakKars/ToprakKars/main/assets/booking-time.jpg" width="49%" alt="Picking a free time slot">
</p>

> Fade & Co. is a fictional shop. In the demo, bookings are stored in your browser (localStorage).
> `apps-script.gs` shows how to store them in Google Sheets instead.

## Features

- **4-step booking flow:** service → barber → day & time → contact details
- **Real availability logic** (`booking.js`):
  - opening hours per weekday, closed on Sundays
  - each barber has their own working days
  - service length matters – a 60-min service won't fit into a 30-min gap
  - lunch break is blocked
  - existing bookings block overlapping slots (per barber)
  - past times are hidden; today starts 30 min from now
- **Schedule view** for the shop: all bookings per barber and day, with cancel
- **Form validation** (name, phone) with inline error messages
- **EN / DE** language switch, dates formatted per language
- **Google Sheets backend** (optional) with a lock so two people can't book the same slot

## Tests

The booking logic is pure JavaScript without the DOM, so it's tested with Node's built-in test runner:

```bash
npm test
```

```
# tests 10
# pass 10
# fail 0
```

Tests run on every push with GitHub Actions.

## Structure

```
index.html       markup
style.css        dark/gold theme, responsive
app.js           UI: steps, rendering, events, localStorage
booking.js       pure booking logic (slots, overlaps, validation)
booking.test.js  unit tests (node:test)
apps-script.gs   optional Google Sheets backend
```

## Run locally

ES modules need a local server:

```bash
python -m http.server 8000
# open http://localhost:8000
```
