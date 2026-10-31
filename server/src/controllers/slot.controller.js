import * as slotService from '../services/slot.service.js';

// FR-09
export async function listMy(req, res) {
  res.json(await slotService.listTeacherSlots(req.user.id));
}

// FR-08
export async function create(req, res) {
  const slot = await slotService.createSlot(req.user.id, req.body);
  res.status(201).json(slot);
}

// FR-10
export async function update(req, res) {
  res.json(await slotService.updateSlot(req.user.id, req.validated.params.id, req.body));
}

// FR-11: 204 – слот без записів видалено; 200 – слот із записами скасовано
export async function remove(req, res) {
  const cancelledSlot = await slotService.deleteSlot(req.user.id, req.validated.params.id);
  if (cancelledSlot) {
    res.json(cancelledSlot);
  } else {
    res.status(204).end();
  }
}
