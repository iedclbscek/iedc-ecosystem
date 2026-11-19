const normalizeId = (value) => String(value?._id || value || "");

export const buildAuthorizedEventFilter = ({
  clubIds = [],
  requestedClubId,
  canUseIedc = false,
}) => {
  const authorizedClubIds = [...new Set(clubIds.map(normalizeId).filter(Boolean))];
  const requested = normalizeId(requestedClubId);

  if (requested) {
    if (!authorizedClubIds.includes(requested)) {
      return { allowed: false, filter: null };
    }
    return { allowed: true, filter: { club: requested } };
  }

  const alternatives = [];
  if (authorizedClubIds.length > 0) {
    alternatives.push({ club: { $in: authorizedClubIds } });
  }
  if (canUseIedc) {
    alternatives.push(
      { scope: "iedc" },
      { club: null },
      { club: { $exists: false } },
    );
  }

  if (alternatives.length === 0) return { allowed: false, filter: null };
  if (alternatives.length === 1) return { allowed: true, filter: alternatives[0] };
  return { allowed: true, filter: { $or: alternatives } };
};
