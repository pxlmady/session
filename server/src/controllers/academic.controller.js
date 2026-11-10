// Відповіді академічних ендпоінтів мають вигляд { data, meta } (FR-37)
const academic = (req) => req.app.locals.academic;

export async function status(req, res) {
  res.json(await academic(req).getStatus(req.user));
}

// FR-28
export async function profile(req, res) {
  res.json(await academic(req).getMyProfile(req.user));
}

// FR-29
export async function records(req, res) {
  res.json(await academic(req).getMyRecords(req.user, req.validated.query));
}

// FR-30
export async function debts(req, res) {
  res.json(await academic(req).getMyDebts(req.user, req.validated.query));
}

// FR-31
export async function schedule(req, res) {
  res.json(await academic(req).getMySchedule(req.user, req.validated.query));
}
