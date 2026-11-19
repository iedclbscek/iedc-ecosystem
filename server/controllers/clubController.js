import ClubPage from "../models/ClubPage.js";
import Club from "../models/Club.js";
import { isAdmin } from "../middleware/requireAuth.js";
import ClubMembership from "../models/ClubMembership.js";
import { resolveClubAccess } from "../utils/clubAccess.js";
import { findRemovedClubUserIds, getClubEventAccess } from "../utils/authorization.js";

const normalize = (v) => String(v ?? "").trim();

function presentClub(club, user, memberships) {
  const ownMembership = memberships.find((row) => String(row.userId) === String(user.id));
  const access = getClubEventAccess({ club, user, membership: ownMembership });
  if (!access.view) return null;
  const clubMembership = ownMembership && { status: ownMembership.status, permissions: ownMembership.permissions };
  if (access.managePermissions) return { ...club.toObject(), access, clubMembership, memberships };
  return { _id: club._id, name: club.name, description: club.description, access, clubMembership };
}

export const listClubs = async (req, res) => {
  try {
    const user = req.user;
    const memberships = isAdmin(user)
      ? []
      : await ClubMembership.find({ userId: user.id }).select("clubId").lean();
    const query = isAdmin(user)
      ? {}
      : {
          $or: [
            { _id: { $in: memberships.map((membership) => membership.clubId) } },
            { memberUsers: user.id },
            { managerUsers: user.id },
            { editorUsers: user.id },
          ],
        };

    const clubs = await Club.find(query)
      .populate("memberUsers", "name email membershipId role")
      .populate("managerUsers", "name email membershipId role")
      .populate("editorUsers", "name email membershipId role")
      .populate(
        "memberRegistrations",
        "firstName lastName membershipId email department semester status"
      )
      .sort({ name: 1 });

    const scopedMemberships = await ClubMembership.find({
      clubId: { $in: clubs.map((club) => club._id) },
    }).select("userId clubId role status permissions").lean();
    const membershipsByClub = new Map();
    for (const row of scopedMemberships) {
      const id = String(row.clubId);
      if (!membershipsByClub.has(id)) membershipsByClub.set(id, []);
      membershipsByClub.get(id).push(row);
    }
    res.json({ clubs: clubs.map((club) =>
      presentClub(club, user, membershipsByClub.get(String(club._id)) || [])
    ).filter(Boolean) });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch clubs", error: error.message });
  }
};

export const createClub = async (req, res) => {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const name = normalize(req.body?.name);
    const description = normalize(req.body?.description);
    if (!name) return res.status(400).json({ message: "name is required" });
    if (name.toLowerCase() === "iedc") return res.status(409).json({ message: "IEDC is the main organisation. Use the IEDC workspace instead of creating a club." });

    const managerUsers = Array.isArray(req.body?.managerUserIds)
      ? req.body.managerUserIds
      : [];

    // Spec: when creating a club, only add club leads (managerUsers).
    // Editors/members can be added later by the leads.
    const editorUsers = [];
    const memberUsers = [];
    const memberRegistrations = [];

    const club = await Club.create({
      name,
      description: description || undefined,
      memberUsers,
      managerUsers,
      editorUsers,
      memberRegistrations,
    });
    if (managerUsers.length > 0) {
      await Promise.all(
        managerUsers.map((userId) =>
          ClubMembership.findOneAndUpdate(
            { clubId: club._id, userId },
            { $set: { role: "lead", scope: "club", status: "active" } },
            { upsert: true, setDefaultsOnInsert: true },
          ),
        ),
      );
    }

    const populated = await Club.findById(club._id)
      .populate("memberUsers", "name email membershipId role")
      .populate("managerUsers", "name email membershipId role")
      .populate("editorUsers", "name email membershipId role")
      .populate(
        "memberRegistrations",
        "firstName lastName membershipId email department semester status"
      );

    res.status(201).json({ club: populated });
  } catch (error) {
    // duplicate key
    if (error?.code === 11000) {
      return res.status(409).json({ message: "Club name already exists" });
    }
    res
      .status(500)
      .json({ message: "Failed to create club", error: error.message });
  }
};

export const updateClub = async (req, res) => {
  try {
    const { id } = req.params;
    const club = await Club.findById(id);
    if (!club) return res.status(404).json({ message: "Club not found" });
    const previousAssignments = {
      managerUsers: [...(club.managerUsers || [])],
      editorUsers: [...(club.editorUsers || [])],
      memberUsers: [...(club.memberUsers || [])],
    };

    const user = req.user;
    const { managePermissions: isLead } = await resolveClubAccess({ club, user });

    if (!isLead) {
      return res.status(403).json({ message: "Forbidden" });
    }

    // Only admins can rename a club.
    if (req.body?.name !== undefined) {
      if (!isAdmin(user)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const name = normalize(req.body.name);
      if (!name) return res.status(400).json({ message: "name is required" });
      if (name.toLowerCase() === "iedc") return res.status(409).json({ message: "IEDC is the main organisation. Use the IEDC workspace instead of renaming a club." });
      club.name = name;
    }

    if (req.body?.description !== undefined) {
      const description = normalize(req.body.description);
      club.description = description || undefined;
    }

    // Membership management:
    // - Admin can manage everything
    // - Club leads can manage editors + members
    if (req.body?.managerUserIds !== undefined) {
      if (!isAdmin(user)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      club.managerUsers = Array.isArray(req.body.managerUserIds)
        ? req.body.managerUserIds
        : [];
    }

    if (req.body?.editorUserIds !== undefined) {
      if (!isAdmin(user) && !isLead) {
        return res.status(403).json({ message: "Forbidden" });
      }
      club.editorUsers = Array.isArray(req.body.editorUserIds)
        ? req.body.editorUserIds
        : [];
    }

    if (req.body?.memberUserIds !== undefined) {
      if (!isAdmin(user) && !isLead) {
        return res.status(403).json({ message: "Forbidden" });
      }
      club.memberUsers = Array.isArray(req.body.memberUserIds)
        ? req.body.memberUserIds
        : [];
    }

    if (req.body?.memberRegistrationIds !== undefined) {
      if (!isAdmin(user) && !isLead) {
        return res.status(403).json({ message: "Forbidden" });
      }
      club.memberRegistrations = Array.isArray(req.body.memberRegistrationIds)
        ? req.body.memberRegistrationIds
        : [];
    }

    await club.save();

    const removedUserIds = findRemovedClubUserIds(previousAssignments, club);
    if (removedUserIds.length > 0) {
      await ClubMembership.updateMany(
        { clubId: club._id, userId: { $in: removedUserIds } },
        { $set: { status: "inactive" } },
      );
    }
    if (club.managerUsers.length > 0) {
      await Promise.all(
        club.managerUsers.map((userId) =>
          ClubMembership.findOneAndUpdate(
            { clubId: club._id, userId },
            { $set: { role: "lead", scope: "club", status: "active" } },
            { upsert: true, setDefaultsOnInsert: true },
          ),
        ),
      );
    }

    const populated = await Club.findById(club._id)
      .populate("memberUsers", "name email membershipId role")
      .populate("managerUsers", "name email membershipId role")
      .populate("editorUsers", "name email membershipId role")
      .populate(
        "memberRegistrations",
        "firstName lastName membershipId email department semester status"
      );

    res.json({ club: populated });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "Club name already exists" });
    }
    res
      .status(500)
      .json({ message: "Failed to update club", error: error.message });
  }
};

export const deleteClub = async (req, res) => {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    // Keep the slug tombstone so deleting a club cannot resurrect its legacy page.
    await ClubPage.updateOne({ clubId: req.params.id }, {
      $set: { published: null, adopted: true, publishedBy: String(req.user.id), publishedAt: new Date() },
      $inc: { revision: 1 },
    });
    const deleted = await Club.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Club not found" });

    res.json({ message: "Club deleted. Its Nexus page has been withdrawn." });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to delete club", error: error.message });
  }
};

export const getClubAccess = async (req, res) => {
  try {
    const club = await Club.findById(req.params.id)
      .populate("memberUsers", "name email membershipId role")
      .populate("managerUsers", "name email membershipId role")
      .populate("editorUsers", "name email membershipId role")
      .populate(
        "memberRegistrations",
        "firstName lastName membershipId email department semester status"
      );

    if (!club) return res.status(404).json({ message: "Club not found" });

    const user = req.user;
    const memberships = await ClubMembership.find({ clubId: club._id }).select("userId role status permissions").lean();
    const visibleClub = presentClub(club, user, memberships);
    if (!visibleClub) return res.status(403).json({ message: "Forbidden" });
    res.json({ club: visibleClub });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch club", error: error.message });
  }
};
