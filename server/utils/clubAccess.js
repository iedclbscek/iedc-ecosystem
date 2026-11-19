import ClubMembership from "../models/ClubMembership.js";
import { getClubEventAccess } from "./authorization.js";

export const resolveClubAccess = async ({ club, user }) => {
  const membership =
    club?._id && user?.id
      ? await ClubMembership.findOne({ clubId: club._id, userId: user.id }).lean()
      : null;
  return {
    membership,
    ...getClubEventAccess({ club, user, membership }),
  };
};
