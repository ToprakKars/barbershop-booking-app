import { test } from "node:test";
import assert from "node:assert/strict";
import {
  availableSlots, barberWorks, createBooking, overlaps, toMinutes, toTime, validateCustomer
} from "./booking.js";

// 2026-11-09 is a Monday, 2026-11-08 a Sunday.
const MONDAY = "2026-11-09";
const SUNDAY = "2026-11-08";

test("time helpers convert both ways", () => {
  assert.equal(toMinutes("13:45"), 825);
  assert.equal(toTime(825), "13:45");
});

test("overlap detection", () => {
  assert.equal(overlaps(600, 630, 620, 650), true);
  assert.equal(overlaps(600, 630, 630, 660), false);
});

test("shop is closed on Sunday", () => {
  assert.deepEqual(availableSlots({ barberId: "ali", date: SUNDAY, serviceId: "cut" }), []);
});

test("barber days off are respected", () => {
  assert.equal(barberWorks("mia", MONDAY), false);
  assert.deepEqual(availableSlots({ barberId: "mia", date: MONDAY, serviceId: "cut" }), []);
});

test("first and last slot fit inside opening hours", () => {
  const slots = availableSlots({ barberId: "ali", date: MONDAY, serviceId: "combo" });
  assert.equal(slots[0], "10:00");
  assert.equal(slots.at(-1), "18:00"); // 60 min service, closes 19:00
});

test("lunch break is blocked", () => {
  const slots = availableSlots({ barberId: "ali", date: MONDAY, serviceId: "cut" });
  assert.ok(!slots.includes("13:00"));
  assert.ok(!slots.includes("12:45")); // would run into the break
  assert.ok(slots.includes("13:30"));
});

test("existing bookings block overlapping slots for that barber only", () => {
  const bookings = [{ barberId: "ali", date: MONDAY, start: "11:00", serviceId: "fade" }];
  const ali = availableSlots({ barberId: "ali", date: MONDAY, serviceId: "cut", bookings });
  assert.ok(!ali.includes("11:00"));
  assert.ok(!ali.includes("11:30"));
  assert.ok(ali.includes("11:45"));
  const jonas = availableSlots({ barberId: "jonas", date: MONDAY, serviceId: "cut", bookings });
  assert.ok(jonas.includes("11:00"));
});

test("past slots are hidden for today", () => {
  const now = new Date(2026, 10, 9, 15, 10); // Monday 15:10
  const slots = availableSlots({ barberId: "ali", date: MONDAY, serviceId: "cut", now });
  assert.equal(slots[0], "15:45");
});

test("customer validation", () => {
  assert.deepEqual(validateCustomer({ name: "Toprak", phone: "+49 162 1234567" }), {});
  assert.deepEqual(Object.keys(validateCustomer({ name: "T", phone: "12" })), ["name", "phone"]);
});

test("createBooking rejects a taken slot", () => {
  const first = createBooking(
    { barberId: "ali", date: MONDAY, start: "10:00", serviceId: "cut", name: "Can", phone: "015112345678" }, []
  );
  assert.throws(() => createBooking(
    { barberId: "ali", date: MONDAY, start: "10:15", serviceId: "cut", name: "Eda", phone: "015112345679" }, [first]
  ), /no longer available/);
});
