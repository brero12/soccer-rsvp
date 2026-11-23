const { parsePhoneNumberFromString } = require("libphonenumber-js");

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

function normalizePhone(raw) {
  const p = parsePhoneNumberFromString(String(raw || ""), "CA");
  if (!p || !p.isValid()) throw new HttpError(400, "Invalid phone number");
  return p.number; // E.164, e.g. +16045551234
}

module.exports = { HttpError, wrap, normalizePhone };