import Event from "../models/Event.js";
import Club from "../models/Club.js";
import {
  hasIedcScopePermission,
  isSuperAdmin,
} from "../utils/permissionHelpers.js";
import { isAdmin } from "../middleware/requireAuth.js";

const EVENT_STATUSES = new Set(["draft", "published", "completed", "cancelled"]);
const EVENT_VISIBILITIES = new Set(["public", "private"]);
const EVENT_SCOPES = new Set(["iedc", "club"]);
const DEFAULT_EVENT_STATUS = "draft";
const DEFAULT_EVENT_VISIBILITY = "public";

const toDateOrUndefined = (value) => {
  if (value === null || value === undefined || value === "") return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date;
};

const normalize = (v) => String(v ?? "").trim();

const normalizeStatus = (value) => {
  const status = normalize(value);
  return EVENT_STATUSES.has(status) ? status : undefined;
};

const normalizeVisibility = (value) => {
  const visibility = normalize(value);
  return EVENT_VISIBILITIES.has(visibility) ? visibility : undefined;
};

const normalizeScope = (value) => {
  const scope = normalize(value);
  return EVENT_SCOPES.has(scope) ? scope : undefined;
};

const normalizeId = (value) => {
  const text = normalize(value);
  return text || undefined;
};

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
  if (isAdmin(user) || isSuperAdmin(user)) return { club };
  if (!canAccessClub(club, user.id)) {
    return { status: 403, body: { message: "Forbidden" } };
  }
  return { club };
};

const populateEvent = (query) =>
  query
    .populate("club", "name")
    .populate("coordinatorUsers", "name email membershipId role")
    .populate("coordinatorUser", "name email membershipId role")
    .populate("assignedTo", "name email membershipId role")
    .populate("createdBy", "name email membershipId role")
    .populate("updatedBy", "name email membershipId role")
    .populate("publishedBy", "name email membershipId role");

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

const publicEventFilter = {
  $and: [
    { $or: [{ status: { $exists: false } }, { status: "published" }] },
    { $or: [{ visibility: { $exists: false } }, { visibility: "public" }] },
  ],
};

const toCoordinatorIds = (value) => {
  if (value === undefined) return undefined;
  if (value === null) return [];
  if (Array.isArray(value)) return value;
  const text = normalize(value);
  if (!text) return [];
  return [text];
};

const parseEventWorkflow = (body) => {
  const payload = body || {};
  const legacyRegistrationLink = normalize(payload.registrationUrl);
  const registrationLink = normalize(payload.registrationLink);
  return {
    scope: normalizeScope(payload.scope),
    status: normalizeStatus(payload.status),
    visibility: normalizeVisibility(payload.visibility),
    shortDescription: normalize(payload.shortDescription),
    location: normalize(payload.location),
    venue: normalize(payload.venue),
    mode: normalize(payload.mode),
    posterUrl: normalize(payload.posterUrl),
    posterPublicId: normalize(payload.posterPublicId),
    registrationLink: registrationLink || legacyRegistrationLink,
    externalLink: normalize(payload.externalLink),
    assignedTo: normalizeId(payload.assignedTo),
    startAt: toDateOrUndefined(payload.startAt ?? payload.startDate),
    endAt: toDateOrUndefined(payload.endAt ?? payload.endDate),
  };
};

const setPublishAudit = ({ event, currentStatus, nextStatus, userId }) => {
  if (!userId) return;
  if (nextStatus !== "published") return;
  if (currentStatus === "published") return;

  event.publishedBy = userId;
  event.publishedAt = new Date();
};

// Legacy: list all accessible events (admin: all, member: their clubs)
export const listEvents = async (req, res) => {
  try {
    const search = String(req.query.search ?? "");
    const clubId = normalize(req.query.clubId);

    const searchQuery = buildSearchQuery(search);

    if (isAdmin(req.user) || isSuperAdmin(req.user)) {
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
  try {
    const workflow = parseEventWorkflow(req.body);
    const requestedScope = workflow.scope || "iedc";
    const clubId = normalize(req.body?.clubId);

    if (requestedScope === "iedc" && !clubId) {
      if (!hasIedcScopePermission(req.user, "events")) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const { title, description } = req.body;
      const finalTitle = normalize(title);
      if (!finalTitle) {
        return res.status(400).json({ message: "title is required" });
      }

      const coordinatorUserIds = toCoordinatorIds(req.body?.coordinatorUserIds);
      const actorId = normalizeId(req.user?.id);
      const eventData = {
        scope: "iedc",
        title: finalTitle,
        description: normalize(description) || undefined,
        location: workflow.location || workflow.venue || undefined,
        venue: workflow.venue || workflow.location || undefined,
        startAt: workflow.startAt,
        endAt: workflow.endAt,
        status: workflow.status || DEFAULT_EVENT_STATUS,
        visibility: workflow.visibility || DEFAULT_EVENT_VISIBILITY,
        shortDescription: workflow.shortDescription,
        mode: workflow.mode,
        posterUrl: workflow.posterUrl,
        posterPublicId: workflow.posterPublicId,
        registrationUrl: workflow.registrationLink,
        registrationLink: workflow.registrationLink,
        externalLink: workflow.externalLink,
        assignedTo: workflow.assignedTo,
        coordinatorUsers: coordinatorUserIds || [],
        coordinatorUser: normalizeId(req.body?.coordinatorUserId),
        createdBy: actorId || undefined,
        updatedBy: actorId || undefined,
      };

      if (eventData.status === "published") {
        setPublishAudit({
          event: eventData,
          currentStatus: undefined,
          nextStatus: eventData.status,
          userId: actorId,
        });
      }

      const event = await Event.create(eventData);
      const populated = await populateEvent(Event.findById(event._id));
      return res.status(201).json({ event: populated });
    }

    if (requestedScope === "iedc" && clubId) {
      return res
        .status(400)
        .json({ message: "clubId is not allowed for iedc events" });
    }

    req.params.clubId = clubId;
    if (!req.params.clubId) {
      return res.status(400).json({ message: "clubId is required" });
    }
    return createClubEvent(req, res);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to create event", error: error.message });
  }
};

export const createClubEvent = async (req, res) => {
  try {
    const clubId = normalize(req.params.clubId || req.body?.clubId);
    if (!clubId) return res.status(400).json({ message: "clubId is required" });

    const access = await ensureClubAccess({ clubId, user: req.user });
    if (access.status) return res.status(access.status).json(access.body);

    const workflow = parseEventWorkflow(req.body);
    const { title, description, coordinatorUserIds = req.body?.coordinatorUserIds } =
      req.body;

    const finalTitle = normalize(title);
    if (!finalTitle)
      return res.status(400).json({ message: "title is required" });

    const finalCoordinatorUserIds = toCoordinatorIds(coordinatorUserIds);
    const actorId = normalizeId(req.user?.id);
      const eventData = {
        club: clubId,
        scope: "club",
        title: finalTitle,
        description: normalize(description) || undefined,
        shortDescription: workflow.shortDescription,
        venue: workflow.venue || workflow.location || undefined,
        location: workflow.location || workflow.venue || undefined,
        mode: workflow.mode || undefined,
        startAt: workflow.startAt,
        endAt: workflow.endAt,
        status: workflow.status || DEFAULT_EVENT_STATUS,
        visibility: workflow.visibility || DEFAULT_EVENT_VISIBILITY,
        posterUrl: workflow.posterUrl,
        posterPublicId: workflow.posterPublicId,
        registrationUrl: workflow.registrationLink,
        registrationLink: workflow.registrationLink,
        externalLink: workflow.externalLink,
        assignedTo: workflow.assignedTo,
        coordinatorUsers: finalCoordinatorUserIds || [],
      coordinatorUser: normalize(req.body?.coordinatorUserId) || undefined,
      createdBy: actorId || undefined,
      updatedBy: actorId || undefined,
    };

    if (workflow.status === "published") {
      setPublishAudit({
        event: eventData,
        currentStatus: undefined,
        nextStatus: workflow.status,
        userId: actorId,
      });
    }

    const event = await Event.create({
      ...eventData,
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
    } else if (!hasIedcScopePermission(req.user, "events")) {
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
  const workflow = parseEventWorkflow(req.body);
  const actorId = normalizeId(req.user?.id);
  const previousStatus = event.status;
  const isClubEvent = Boolean(event?.club);

  if (title !== undefined) {
    const finalTitle = normalize(title);
    if (!finalTitle)
      return res.status(400).json({ message: "title is required" });
    event.title = finalTitle;
  }

  if (description !== undefined)
    event.description = normalize(description) || undefined;
  if (location !== undefined || workflow.location !== undefined) {
    const effectiveLocation =
      workflow.location !== undefined ? workflow.location : normalize(location);
    event.location = effectiveLocation || undefined;
  }

  if (workflow.scope !== undefined) {
    if (isClubEvent && workflow.scope !== "club") {
      return res
        .status(400)
        .json({ message: "Cannot change scope for club-scoped events." });
    }
    if (!isClubEvent && workflow.scope !== "iedc") {
      return res
        .status(400)
        .json({ message: "Cannot change scope for IEDC events." });
    }
    event.scope = workflow.scope;
  }

  if (workflow.status !== undefined) {
    event.status = workflow.status;
    setPublishAudit({
      event,
      currentStatus: previousStatus,
      nextStatus: workflow.status,
      userId: actorId,
    });
  }

  if (workflow.visibility !== undefined) event.visibility = workflow.visibility;
  if (workflow.shortDescription !== undefined)
    event.shortDescription = workflow.shortDescription || undefined;
  if (workflow.venue !== undefined) event.venue = workflow.venue || undefined;
  if (workflow.mode !== undefined) event.mode = workflow.mode || undefined;
  if (workflow.posterUrl !== undefined) event.posterUrl = workflow.posterUrl || undefined;
  if (workflow.posterPublicId !== undefined)
    event.posterPublicId = workflow.posterPublicId || undefined;
  if (workflow.registrationLink !== undefined) {
    event.registrationLink = workflow.registrationLink || undefined;
    event.registrationUrl = workflow.registrationLink || undefined;
  }
  if (workflow.externalLink !== undefined)
    event.externalLink = workflow.externalLink || undefined;
  if (workflow.assignedTo !== undefined) event.assignedTo = workflow.assignedTo;

  if (workflow.startAt !== undefined) event.startAt = workflow.startAt;
  if (workflow.endAt !== undefined) event.endAt = workflow.endAt;
  if (startAt !== undefined) event.startAt = toDateOrUndefined(startAt);
  if (endAt !== undefined) event.endAt = toDateOrUndefined(endAt);
  if (actorId) event.updatedBy = actorId;

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
    } else if (!hasIedcScopePermission(req.user, "events")) {
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

// Public: list all events for main website
export const listPublicEvents = async (req, res) => {
  try {
    const events = await Event.find(publicEventFilter)
      .populate("club", "name")
      .sort({ startAt: -1, createdAt: -1 })
      .lean();

    return res.json({ success: true, events });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch events" });
  }
};

// Public: get one event by id for main website
export const getPublicEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .where(publicEventFilter)
      .populate("club", "name")
      .lean();

    if (!event) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });
    }

    return res.json({ success: true, event });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch event" });
  }
};
