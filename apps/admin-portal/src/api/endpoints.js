export const API_KEYS = {
  REGISTRATIONS: "REGISTRATION_API",
  EVENTS: "EVENTS_API",
  MAILER: "MAILER_SERVICE_API",
};

// Default paths if the DB hasn't overridden them yet
export const DEFAULT_PATHS = {
  [API_KEYS.REGISTRATIONS]: "/admin/registrations",
  [API_KEYS.EVENTS]: "/admin/events",
  [API_KEYS.MAILER]: "/admin/mail/send",
};
