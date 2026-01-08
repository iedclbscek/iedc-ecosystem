import Event from "../models/Event.js";
import Club from "../models/Club.js";
import { isAdmin } from "../middleware/requireAuth.js";

const toDateOrUndefined = (value) => {
  if (value === null || value === undefined || value === "") return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date;
};

const normalize = (v) => String(v ?? "").trim();

const canAccessClub = (club, userId) => {
  const id = String(userId);
  const members = Array.isArray(club?.memberUsers) ? club.memberUsers : [];
  const managers = Array.isArray(club?.managerUsers) ? club.managerUsers : [];
  const editors = Array.isArray(club?.editorUsers) ? club.editorUsers : [];
  return (
    members.some((m) => String(m) === id) ||
    managers.some((m) => String(m) === id) ||
    editors.some((e) => String(e) === id)
  );
};

const ensureClubAccess = async ({ clubId, user }) => {
  const club = await Club.findById(clubId);
  if (!club) {
    return { status: 404, body: { message: "Club not found" } };
  }
  if (isAdmin(user)) return { club };
  if (!canAccessClub(club, user.id)) {
    return { status: 403, body: { message: "Forbidden" } };
  }
  return { club };
};

const populateEvent = (query) =>
  query
    .populate("club", "name")
    .populate("coordinatorUsers", "name email membershipId role")
    .populate("coordinatorUser", "name email membershipId role");

const buildSearchQuery = (search) => {
  const text = normalize(search);
  if (!text) return {};
  return {
    $or: [
      { title: { $regex: text, $options: "i" } },
      { location: { $regex: text, $options: "i" } },
    ],
  };
};

const toCoordinatorIds = (value) => {
  if (value === undefined) return undefined;
  if (value === null) return [];
  if (Array.isArray(value)) return value;
  const text = normalize(value);
  if (!text) return [];
  return [text];
};

// Legacy: list all accessible events (admin: all, member: their clubs)
export const listEvents = async (req, res) => {
  try {
    const search = String(req.query.search ?? "");
    const clubId = normalize(req.query.clubId);

    const searchQuery = buildSearchQuery(search);

    if (isAdmin(req.user)) {
      const query = {
        ...(clubId ? { club: clubId } : {}),
        ...searchQuery,
      };

      const events = await populateEvent(Event.find(query)).sort({
        startAt: -1,
        createdAt: -1,
      });
      return res.json({ events });
    }

    const clubs = await Club.find({
      $or: [{ memberUsers: req.user.id }, { managerUsers: req.user.id }],
    }).select("_id");

    const clubIds = clubs.map((c) => c._id);
    if (clubIds.length === 0) return res.json({ events: [] });

    const query = {
      club: { $in: clubIds },
      ...(clubId ? { club: clubId } : {}),
      ...searchQuery,
    };

    const events = await populateEvent(Event.find(query)).sort({
      startAt: -1,
      createdAt: -1,
    });
    return res.json({ events });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch events", error: error.message });
  }
};

// New: list events for a specific club
export const listClubEvents = async (req, res) => {
  try {
    const clubId = req.params.clubId;
    const access = await ensureClubAccess({ clubId, user: req.user });
    if (access.status) return res.status(access.status).json(access.body);

    const searchQuery = buildSearchQuery(req.query.search);
    const events = await populateEvent(
      Event.find({ club: clubId, ...searchQuery })
    ).sort({
      startAt: -1,
      createdAt: -1,
    });

    res.json({ events });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch events", error: error.message });
  }
};

// Legacy: create event (expects clubId in body)
export const createEvent = async (req, res) => {
  req.params.clubId = normalize(req.body?.clubId);
  return createClubEvent(req, res);
};

export const createClubEvent = async (req, res) => {
  try {
    const clubId = normalize(req.params.clubId || req.body?.clubId);
    if (!clubId) return res.status(400).json({ message: "clubId is required" });

    const access = await ensureClubAccess({ clubId, user: req.user });
    if (access.status) return res.status(access.status).json(access.body);

    const { title, description, location, startAt, endAt } = req.body;

    const finalTitle = normalize(title);
    if (!finalTitle)
      return res.status(400).json({ message: "title is required" });

    const coordinatorUserIds = toCoordinatorIds(req.body?.coordinatorUserIds);

    const event = await Event.create({
      club: clubId,
      title: finalTitle,
      description: normalize(description) || undefined,
      location: normalize(location) || undefined,
      startAt: toDateOrUndefined(startAt),
      endAt: toDateOrUndefined(endAt),
      coordinatorUsers: coordinatorUserIds || [],
      coordinatorUser: normalize(req.body?.coordinatorUserId) || undefined,
    });

    const populated = await populateEvent(Event.findById(event._id));
    res.status(201).json({ event: populated });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to create event", error: error.message });
  }
};

export const updateEvent = async (req, res) => {
  try {
    const event = await populateEvent(Event.findById(req.params.id));
    if (!event) return res.status(404).json({ message: "Event not found" });

    const clubId = String(event.club?._id || event.club || "");
    if (clubId) {
      const access = await ensureClubAccess({ clubId, user: req.user });
      if (access.status) return res.status(access.status).json(access.body);
    } else if (!isAdmin(req.user)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    return updateEventCommon(req, res, event);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to update event", error: error.message });
  }
};

export const updateClubEvent = async (req, res) => {
  try {
    const clubId = req.params.clubId;
    const access = await ensureClubAccess({ clubId, user: req.user });
    if (access.status) return res.status(access.status).json(access.body);

    const event = await populateEvent(
      Event.findOne({ _id: req.params.eventId, club: clubId })
    );
    if (!event) return res.status(404).json({ message: "Event not found" });

    return updateEventCommon(req, res, event);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to update event", error: error.message });
  }
};

const updateEventCommon = async (req, res, event) => {
  const { title, description, location, startAt, endAt } = req.body;

  if (title !== undefined) {
    const finalTitle = normalize(title);
    if (!finalTitle)
      return res.status(400).json({ message: "title is required" });
    event.title = finalTitle;
  }

  if (description !== undefined)
    event.description = normalize(description) || undefined;
  if (location !== undefined) event.location = normalize(location) || undefined;

  if (startAt !== undefined) event.startAt = toDateOrUndefined(startAt);
  if (endAt !== undefined) event.endAt = toDateOrUndefined(endAt);

  const coordinatorUserIds = toCoordinatorIds(req.body?.coordinatorUserIds);
  if (coordinatorUserIds !== undefined) {
    event.coordinatorUsers = coordinatorUserIds;
  }

  if (req.body?.coordinatorUserId !== undefined) {
    event.coordinatorUser = normalize(req.body.coordinatorUserId) || undefined;
  }

  await event.save();
  const populated = await populateEvent(Event.findById(event._id));
  res.json({ event: populated });
};

export const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    if (event.club) {
      const access = await ensureClubAccess({
        clubId: event.club,
        user: req.user,
      });
      if (access.status) return res.status(access.status).json(access.body);
    } else if (!isAdmin(req.user)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    await Event.deleteOne({ _id: event._id });
    res.json({ message: "Event deleted" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to delete event", error: error.message });
  }
};

export const deleteClubEvent = async (req, res) => {
  try {
    const clubId = req.params.clubId;
    const access = await ensureClubAccess({ clubId, user: req.user });
    if (access.status) return res.status(access.status).json(access.body);

    const deleted = await Event.findOneAndDelete({
      _id: req.params.eventId,
      club: clubId,
    });

    if (!deleted) return res.status(404).json({ message: "Event not found" });
    res.json({ message: "Event deleted" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to delete event", error: error.message });
  }
};
