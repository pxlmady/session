import * as bookingService from '../services/booking.service.js';

// FR-15, FR-16
export async function create(req, res) {
  const booking = await bookingService.createBooking(req.user.id, req.body);
  res.status(201).json(booking);
}

// FR-20
export async function cancel(req, res) {
  res.json(await bookingService.cancelBooking(req.user, req.validated.params.id));
}
