import { SERVICES, BARBERS, availableSlots, barberWorks, createBooking, getService, validateCustomer } from "./booking.js";

const T = {
  en: {
    demo: "Demo project – fictional barbershop. Bookings are only saved in your browser.",
    schedule: "Schedule", book: "Book",
    s_service: "Service", s_barber: "Barber", s_time: "Time", s_details: "Details",
    h_service: "What would you like?", h_barber: "Choose your barber", h_time: "Pick a day and time",
    h_details: "Your details", h_done: "You're booked!", h_schedule: "Schedule",
    no_slots: "No free times on this day. Try another day.",
    f_name: "Name", f_phone: "Phone", e_name: "Please enter your name.", e_phone: "Please enter a valid phone number.",
    confirm: "Confirm booking", again: "Book another", back: "← Back", cancel: "Cancel",
    min: "min", any: "Next free", off: "Not working", nothing: "No bookings.",
    done: (b, s, d, t) => `${s} with ${b} on ${d} at ${t}. See you soon!`,
    sum: (s, b, d, t, p) => `<b>${s}</b> with <b>${b}</b><br>${d}, ${t} · €${p}`
  },
  de: {
    demo: "Demoprojekt – fiktiver Barbershop. Buchungen werden nur in deinem Browser gespeichert.",
    schedule: "Terminplan", book: "Buchen",
    s_service: "Leistung", s_barber: "Barber", s_time: "Termin", s_details: "Daten",
    h_service: "Was darf es sein?", h_barber: "Wähle deinen Barber", h_time: "Tag und Uhrzeit wählen",
    h_details: "Deine Daten", h_done: "Termin gebucht!", h_schedule: "Terminplan",
    no_slots: "An diesem Tag ist nichts mehr frei. Probier einen anderen Tag.",
    f_name: "Name", f_phone: "Telefon", e_name: "Bitte gib deinen Namen ein.", e_phone: "Bitte gib eine gültige Telefonnummer ein.",
    confirm: "Termin bestätigen", again: "Neuen Termin buchen", back: "← Zurück", cancel: "Stornieren",
    min: "Min.", any: "Nächster freier", off: "Nicht im Dienst", nothing: "Keine Termine.",
    done: (b, s, d, t) => `${s} bei ${b} am ${d} um ${t}. Bis bald!`,
    sum: (s, b, d, t, p) => `<b>${s}</b> bei <b>${b}</b><br>${d}, ${t} Uhr · ${p} €`
  }
};

const STORAGE_KEY = "fadeco-bookings";
const state = { lang: "en", step: 1, serviceId: null, barberId: null, date: null, start: null, scheduleDate: null };

function loadBookings() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; }
}
function saveBookings(list) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch { /* storage unavailable */ }
}
let bookings = loadBookings();

const $ = sel => document.querySelector(sel);
const t = key => T[state.lang][key];

function isoDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function nextDays(count) {
  const days = [];
  const d = new Date();
  for (let i = 0; i < count; i++) {
    days.push(new Date(d.getFullYear(), d.getMonth(), d.getDate() + i));
  }
  return days;
}
function prettyDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(state.lang === "de" ? "de-DE" : "en-GB",
    { weekday: "long", day: "numeric", month: "long" });
}

function goTo(step) {
  state.step = step;
  document.querySelectorAll("[data-panel]").forEach(p => { p.hidden = Number(p.dataset.panel) !== step; });
  document.querySelectorAll("#steps li").forEach(li => {
    const n = Number(li.dataset.step);
    li.classList.toggle("active", n === step);
    li.classList.toggle("done", n < step);
  });
  $("#back").hidden = step === 1 || step === 5;
  render();
}

function renderServices() {
  $("#service-list").innerHTML = SERVICES.map(s => `
    <button class="option" data-service="${s.id}">
      <strong>${s.name[state.lang]}</strong>
      <small>${s.minutes} ${t("min")} · €${s.price}</small>
    </button>`).join("");
}

function renderBarbers() {
  const today = isoDate(new Date());
  $("#barber-list").innerHTML = BARBERS.map(b => {
    const next = nextDays(14).map(isoDate).find(date =>
      availableSlots({ barberId: b.id, date, serviceId: state.serviceId, bookings, now: new Date() }).length);
    const label = next ? `${t("any")}: ${next === today ? "✓" : prettyDate(next).split(",")[0]}` : t("off");
    return `
      <button class="option" data-barber="${b.id}">
        <span class="avatar">${b.name[0]}</span>
        <strong>${b.name}</strong>
        <small>${label}</small>
      </button>`;
  }).join("");
}

function renderDays(container, selected, onlyWorking) {
  container.innerHTML = nextDays(14).map(d => {
    const iso = isoDate(d);
    const closed = onlyWorking && !barberWorks(state.barberId, iso);
    const wd = d.toLocaleDateString(state.lang === "de" ? "de-DE" : "en-GB", { weekday: "short" });
    return `<button class="day ${iso === selected ? "active" : ""}" data-date="${iso}" ${closed ? "disabled" : ""}>
      <small>${wd}</small><b>${d.getDate()}</b></button>`;
  }).join("");
}

function renderSlots() {
  if (!state.date) {
    // Jump to the first day that still has a free slot
    state.date = nextDays(14).map(isoDate).find(date =>
      availableSlots({ barberId: state.barberId, date, serviceId: state.serviceId, bookings, now: new Date() }).length
    ) || null;
  }
  renderDays($("#day-list"), state.date, true);
  const slots = state.date
    ? availableSlots({ barberId: state.barberId, date: state.date, serviceId: state.serviceId, bookings, now: new Date() })
    : [];
  $("#slot-list").innerHTML = slots.map(s => `<button class="slot" data-slot="${s}">${s}</button>`).join("");
  $("#no-slots").hidden = slots.length > 0;
}

function renderSummary() {
  const s = getService(state.serviceId);
  const b = BARBERS.find(x => x.id === state.barberId);
  $("#summary").innerHTML = t("sum")(s.name[state.lang], b.name, prettyDate(state.date), state.start, s.price);
}

function renderSchedule() {
  if (!state.scheduleDate) state.scheduleDate = isoDate(new Date());
  renderDays($("#schedule-days"), state.scheduleDate, false);
  $("#schedule").innerHTML = BARBERS.map(b => {
    const list = bookings
      .filter(x => x.barberId === b.id && x.date === state.scheduleDate)
      .sort((a, c) => a.start.localeCompare(c.start));
    const items = list.length ? list.map(x => `
      <div class="appt">
        <div><b>${x.start}</b> · ${getService(x.serviceId).name[state.lang]}<small>${x.name} · ${x.phone}</small></div>
        <button data-cancel="${x.id}">${t("cancel")}</button>
      </div>`).join("") : `<p class="empty">${t("nothing")}</p>`;
    return `<div class="schedule-col"><h3>${b.name}</h3>${items}</div>`;
  }).join("");
}

function render() {
  document.querySelectorAll("[data-t]").forEach(el => {
    const value = t(el.dataset.t);
    if (typeof value === "string") el.textContent = value;
  });
  document.querySelectorAll(".lang button").forEach(b => b.classList.toggle("active", b.dataset.lang === state.lang));
  document.documentElement.lang = state.lang;

  if (!$("#booking-view").hidden) {
    if (state.step === 1) renderServices();
    if (state.step === 2) renderBarbers();
    if (state.step === 3) renderSlots();
    if (state.step === 4) renderSummary();
    $("#view-toggle").textContent = t("schedule");
  } else {
    renderSchedule();
    $("#view-toggle").textContent = t("book");
  }
}

document.addEventListener("click", e => {
  const el = e.target.closest("button");
  if (!el) return;

  if (el.dataset.lang) { state.lang = el.dataset.lang; render(); return; }
  if (el.dataset.service) { state.serviceId = el.dataset.service; goTo(2); return; }
  if (el.dataset.barber) { state.barberId = el.dataset.barber; state.date = null; goTo(3); return; }
  if (el.dataset.date && el.closest("#day-list")) { state.date = el.dataset.date; renderSlots(); return; }
  if (el.dataset.date && el.closest("#schedule-days")) { state.scheduleDate = el.dataset.date; renderSchedule(); return; }
  if (el.dataset.slot) { state.start = el.dataset.slot; goTo(4); return; }
  if (el.dataset.cancel) {
    bookings = bookings.filter(b => b.id !== el.dataset.cancel);
    saveBookings(bookings);
    renderSchedule();
    return;
  }
  if (el.id === "back") { goTo(state.step - 1); return; }
  if (el.id === "restart") { Object.assign(state, { serviceId: null, barberId: null, date: null, start: null }); goTo(1); return; }
  if (el.id === "view-toggle") {
    const showSchedule = !$("#booking-view").hidden;
    $("#booking-view").hidden = showSchedule;
    $("#schedule-view").hidden = !showSchedule;
    render();
  }
});

$("#details-form").addEventListener("submit", e => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  const errors = validateCustomer(data);
  document.querySelectorAll("#details-form label").forEach(label => {
    const field = label.querySelector("input").name;
    label.classList.toggle("invalid", Boolean(errors[field]));
  });
  if (Object.keys(errors).length) return;

  try {
    const booking = createBooking({ ...data, barberId: state.barberId, date: state.date, start: state.start, serviceId: state.serviceId }, bookings);
    bookings.push(booking);
    saveBookings(bookings);
    const b = BARBERS.find(x => x.id === state.barberId).name;
    $("#done-text").textContent = t("done")(b, getService(state.serviceId).name[state.lang], prettyDate(state.date), state.start);
    e.target.reset();
    goTo(5);
  } catch {
    goTo(3); // slot was taken in the meantime
  }
});

goTo(1);
