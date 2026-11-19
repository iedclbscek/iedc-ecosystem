const normalize = (value) => String(value ?? "").trim();

export const normalizeOptionalString = (value) =>
  value === undefined ? undefined : normalize(value);

export const resolveOptionalRegistrationLink = (payload = {}) => {
  if (payload.registrationLink === undefined && payload.registrationUrl === undefined) {
    return undefined;
  }
  const registrationLink = normalizeOptionalString(payload.registrationLink);
  const legacyRegistrationLink = normalizeOptionalString(payload.registrationUrl);
  return registrationLink || legacyRegistrationLink || "";
};
