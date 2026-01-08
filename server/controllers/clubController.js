import Club from "../models/Club.js";
import { isAdmin } from "../middleware/requireAuth.js";

const normalize = (v) => String(v ?? "").trim();

const canManageClub = (club, userId) => {
  const id = String(userId);
  const managers = Array.isArray(club?.managerUsers) ? club.managerUsers : [];
  return managers.some((m) => String(m) === id);
};

const canAccessClub = (club, userId) => {
  const id = String(userId);
  const members = Array.isArray(club?.memberUsers) ? club.memberUsers : [];
  const managers = Array.isArray(club?.managerUsers) ? club.managerUsers : [];
  return (
    members.some((m) => String(m) === id) ||
    managers.some((m) => String(m) === id)
  );
};

export const listClubs = async (req, res) => {
  try {
    const user = req.user;
    const query = isAdmin(user)
      ? {}
      : {
          $or: [{ memberUsers: user.id }, { managerUsers: user.id }],
        };

    const clubs = await Club.find(query)
      .populate("memberUsers", "name email membershipId role")
      .populate("managerUsers", "name email membershipId role")
      .sort({ name: 1 });

    res.json({ clubs });
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

    const memberUsers = Array.isArray(req.body?.memberUserIds)
      ? req.body.memberUserIds
      : [];
    const managerUsers = Array.isArray(req.body?.managerUserIds)
      ? req.body.managerUserIds
      : [];

    const club = await Club.create({
      name,
      description: description || undefined,
      memberUsers,
      managerUsers,
    });

    const populated = await Club.findById(club._id)
      .populate("memberUsers", "name email membershipId role")
      .populate("managerUsers", "name email membershipId role");

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

    const user = req.user;
    if (!isAdmin(user) && !canManageClub(club, user.id)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (req.body?.name !== undefined) {
      const name = normalize(req.body.name);
      if (!name) return res.status(400).json({ message: "name is required" });
      club.name = name;
    }

    if (req.body?.description !== undefined) {
      const description = normalize(req.body.description);
      club.description = description || undefined;
    }

    if (req.body?.memberUserIds !== undefined) {
      club.memberUsers = Array.isArray(req.body.memberUserIds)
        ? req.body.memberUserIds
        : [];
    }

    if (req.body?.managerUserIds !== undefined) {
      club.managerUsers = Array.isArray(req.body.managerUserIds)
        ? req.body.managerUserIds
        : [];
    }

    await club.save();

    const populated = await Club.findById(club._id)
      .populate("memberUsers", "name email membershipId role")
      .populate("managerUsers", "name email membershipId role");

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

    const deleted = await Club.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Club not found" });

    res.json({ message: "Club deleted" });
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
      .populate("managerUsers", "name email membershipId role");

    if (!club) return res.status(404).json({ message: "Club not found" });

    const user = req.user;
    if (!isAdmin(user) && !canAccessClub(club, user.id)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    res.json({ club });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch club", error: error.message });
  }
};
