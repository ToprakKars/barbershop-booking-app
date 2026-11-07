// Booking logic – pure functions, no DOM. Used by the app and by the tests.

export const SERVICES = [
  { id: "cut", minutes: 30, price: 25, name: { en: "Haircut", de: "Haarschnitt" } },
  { id: "fade", minutes: 45, price: 30, name: { en: "Skin fade", de: "Skin Fade" } },
  { id: "beard", minutes: 20, price: 15, name: { en: "Beard trim", de: "Bart trimmen" } },
  { id: "combo", minutes: 60, price: 38, name: { en: "Cut + beard", de: "Schnitt + Bart" } }
];

export const BARBERS = [
  { id: "ali", name: "Ali", days: [1, 2, 3, 4, 5, 6] },
  { id: "mia", name: "Mia", days: [2, 3, 4, 5, 6] },
  { id: "jonas", name: "Jonas", days: [1, 3, 5, 6] }
];

// Opening hours in minutes since midnight, per weekday (0 = Sunday). null = closed.
export const OPENING_HOURS = {
  0: null,
  1: [10 * 60, 19 * 60],
  2: [10 * 60, 19 * 60],
  3: [10 * 60, 19 * 60],
  4: [10 * 60, 20 * 60],
  5: [10 * 60, 20 * 60],
  6: [9 * 60, 16 * 60]
};

export const LUNCH_BREAK = [13 * 60, 13 * 60 + 30];
export const SLOT_STEP = 15;

export function toMinutes(time) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function toTime(minutes) {
  const h = String(Math.floor(minutes / 60)).padStart(2, "0");
  const m = String(minutes % 60).padStart(2, "0");
  return `${h}:${m}`;
}

export function overlaps(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
}

function weekday(dateStr) {
  // Parse YYYY-MM-DD as a local date (avoids timezone shifts).
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
}

export function getService(id) {
  const service = SERVICES.find(s => s.id === id);
  if (!service) throw new Error(`Unknown service: ${id}`);
  return service;
}

export function barberWorks(barberId, dateStr) {
  const barber = BARBERS.find(b => b.id === barberId);
  return Boolean(barber && barber.days.includes(weekday(dateStr)));
}

/**
 * Free start times for a barber on a date, for a given service.
 * bookings: [{ barberId, date, start: "HH:MM", serviceId }]
 * now: optional Date – slots in the past are hidden.
 */
export function availableSlots({ barberId, date, serviceId, bookings = [], now = null }) {
  const hours = OPENING_HOURS[weekday(date)];
  if (!hours || !barberWorks(barberId, date)) return [];

  const duration = getService(serviceId).minutes;
  const [open, close] = hours;

  const taken = bookings
    .filter(b => b.barberId === barberId && b.date === date)
    .map(b => {
      const start = toMinutes(b.start);
      return [start, start + getService(b.serviceId).minutes];
    });
  taken.push(LUNCH_BREAK);

  let earliest = open;
  if (now) {
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    if (date < today) return [];
    if (date === today) earliest = Math.max(open, now.getHours() * 60 + now.getMinutes() + 30);
  }

  const slots = [];
  for (let start = open; start + duration <= close; start += SLOT_STEP) {
    if (start < earliest) continue;
    const end = start + duration;
    if (taken.some(([s, e]) => overlaps(start, end, s, e))) continue;
    slots.push(toTime(start));
  }
  return slots;
}

export function validateCustomer({ name, phone }) {
  const errors = {};
  if (!name || name.trim().length < 2) errors.name = "name";
  const digits = (phone || "").replace(/[\s()+-]/g, "");
  if (!/^\d{7,15}$/.test(digits)) errors.phone = "phone";
  return errors;
}

export function createBooking(input, bookings) {
  const { barberId, date, start, serviceId } = input;
  const free = availableSlots({ barberId, date, serviceId, bookings });
  if (!free.includes(start)) throw new Error("Slot is no longer available");
  const errors = validateCustomer(input);
  if (Object.keys(errors).length) throw new Error("Invalid customer data");
  return {
    id: `${date}-${start}-${barberId}-${Math.random().toString(36).slice(2, 7)}`,
    barberId, date, start, serviceId,
    name: input.name.trim(),
    phone: input.phone.trim()
  };
}
