import * as bookingService from '../services/booking.service.js';

// FR-18, FR-19
export async function listMy(req, res) {
  res.json(await bookingService.listMyBookings(req.user, req.validated.query.period));
}

// FR-15, FR-16, FR-33, FR-35
export async function create(req, res) {
  const booking = await bookingService.createBooking(req.user, req.body, req.app.locals.academic);
  res.status(201).json(booking);
}

// FR-21
export async function confirm(req, res) {
  res.json(await bookingService.confirmBooking(req.user, req.validated.params.id));
}

// FR-21
export async function reject(req, res) {
  res.json(await bookingService.rejectBooking(req.user, req.validated.params.id));
}

// FR-20
export async function cancel(req, res) {
  res.json(await bookingService.cancelBooking(req.user, req.validated.params.id));
}

// Результат консультації після її завершення (етап 9б)
export async function complete(req, res) {
  res.json(
    await bookingService.completeBooking(
      req.user,
      req.validated.params.id,
      req.body,
      req.app.locals.academic,
    ),
  );
}

// Що викладач може зафіксувати за результатом консультації: заборгованості й оцінка (етап 9б)
export async function resultOptions(req, res) {
  res.json(
    await bookingService.getResultOptions(
      req.user,
      req.validated.params.id,
      req.app.locals.academic,
    ),
  );
}
