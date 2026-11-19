import mongoose from "mongoose";
import Event from "../models/Event.js";
import Club from "../models/Club.js";
import {
  hasIedcScopePermission,
  isSuperAdmin,
} from "../utils/permissionHelpers.js";
import { isAdmin } from "../middleware/requireAuth.js";
import { v2 as cloudinary } from "cloudinary";
import { resolveClubAccess } from "../utils/clubAccess.js";
import ClubMembership from "../models/ClubMembership.js";
import {
  canApplyClubEventPatch,
  getClubEventAccess,
} from "../utils/authorization.js";
import { buildAuthorizedEventFilter } from "../utils/eventAuthorization.js";
import {
  normalizeOptionalString,
  resolveOptionalRegistrationLink,
} from "../utils/eventPatch.js";
import { setPublicNoStore } from "../utils/httpCache.js";
import { paginationMeta, parsePagination } from "../utils/pagination.js";
import {
  buildPublicEventsPipeline,
  PUBLIC_EVENT_FILTER,
} from "../utils/publicEventQuery.js";

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

const ensureClubAccess = async ({ clubId, user, action = "view" }) => {
  const club = await Club.findById(clubId);
  if (!club) {
    return { status: 404, body: { message: "Club not found" } };
  }
  if (isAdmin(user) || isSuperAdmin(user)) return { club, access: await resolveClubAccess({ club, user }) };
  const access = await resolveClubAccess({ club, user });
  if (!access[action]) {
    return { status: 403, body: { message: "Forbidden" } };
  }
  return { club, access };
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

const publicEventFilter = PUBLIC_EVENT_FILTER;

function publicEventResponse(event) {
  if (!Array.isArray(event.coordinators)) return event;
  const coordinators = event.coordinators
    .filter(person => typeof person?.name === "string" && person.name.trim())
    .map(person => ({ name: person.name }));
  return { ...event, coordinators };
}

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
  return {
    scope: normalizeScope(payload.scope),
    status: normalizeStatus(payload.status),
    visibility: normalizeVisibility(payload.visibility),
    shortDescription: normalizeOptionalString(payload.shortDescription),
    location: normalizeOptionalString(payload.location),
    venue: normalizeOptionalString(payload.venue),
    mode: normalizeOptionalString(payload.mode),
    posterUrl: normalizeOptionalString(payload.posterUrl),
    posterPublicId: normalizeOptionalString(payload.posterPublicId),
    registrationLink: resolveOptionalRegistrationLink(payload),
    externalLink: normalizeOptionalString(payload.externalLink),
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
    const scope = normalize(req.query.scope);

    const searchQuery = buildSearchQuery(search);

    const paginated = req.query.page !== undefined || req.query.limit !== undefined;
    const { page, limit } = parsePagination(req.query, { defaultLimit: 20 });
    if (isAdmin(req.user) || isSuperAdmin(req.user)) {
      const query = {
        ...(clubId ? { club: clubId } : {}),
        ...(scope === "iedc" || scope === "club" ? { scope } : {}),
        ...searchQuery,
      };

      const total = paginated ? await Event.countDocuments(query) : 0;
      const meta = paginated ? paginationMeta({ page, limit, total }) : null;
      let eventQuery = populateEvent(Event.find(query)).sort({
        startAt: -1,
        createdAt: -1,
        _id: -1,
      });
      if (meta) eventQuery = eventQuery.skip((meta.page - 1) * limit).limit(limit);
      const events = await eventQuery;
      return res.json({ events, ...(meta || {}) });
    }

    const memberships = await ClubMembership.find({ userId: req.user.id })
      .select("clubId status permissions role")
      .lean();
    const membershipByClubId = new Map(
      memberships.map((membership) => [String(membership.clubId), membership]),
    );
    const clubs = await Club.find({
      $or: [
        { _id: { $in: memberships.map((membership) => membership.clubId) } },
        { memberUsers: req.user.id },
        { managerUsers: req.user.id },
        { editorUsers: req.user.id },
      ],
    }).select("memberUsers managerUsers editorUsers").lean();
    const clubIds = clubs
      .filter((club) =>
        getClubEventAccess({
          club,
          user: req.user,
          membership: membershipByClubId.get(String(club._id)),
        }).view,
      )
      .map((club) => club._id);
    const authorization = buildAuthorizedEventFilter({
      clubIds,
      requestedClubId: clubId,
      canUseIedc: hasIedcScopePermission(req.user, "events"),
    });
    if (!authorization.allowed) {
      const emptyMeta = paginated ? paginationMeta({ page, limit, total: 0 }) : null;
      return res.json({ events: [], ...(emptyMeta || {}) });
    }

    const constraints = [authorization.filter];
    if (scope === "iedc" || scope === "club") constraints.push({ scope });
    if (Object.keys(searchQuery).length > 0) constraints.push(searchQuery);
    const query = constraints.length === 1 ? constraints[0] : { $and: constraints };

    const total = paginated ? await Event.countDocuments(query) : 0;
    const meta = paginated ? paginationMeta({ page, limit, total }) : null;
    let eventQuery = populateEvent(Event.find(query)).sort({
      startAt: -1,
      createdAt: -1,
      _id: -1,
    });
    if (meta) eventQuery = eventQuery.skip((meta.page - 1) * limit).limit(limit);
    const events = await eventQuery;
    return res.json({ events, ...(meta || {}) });
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
    const access = await ensureClubAccess({ clubId, user: req.user, action: "view" });
    if (access.status) return res.status(access.status).json(access.body);

    const searchQuery = buildSearchQuery(req.query.search);
    const query = { club: clubId, ...searchQuery };
    const paginated = req.query.page !== undefined || req.query.limit !== undefined;
    const { page, limit } = parsePagination(req.query, { defaultLimit: 20 });
    const total = paginated ? await Event.countDocuments(query) : 0;
    const meta = paginated ? paginationMeta({ page, limit, total }) : null;
    let eventQuery = populateEvent(Event.find(query)).sort({
      startAt: -1,
      createdAt: -1,
      _id: -1,
    });
    if (meta) eventQuery = eventQuery.skip((meta.page - 1) * limit).limit(limit);
    const events = await eventQuery;
    res.json({ events, ...(meta || {}) });
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

    const access = await ensureClubAccess({ clubId, user: req.user, action: "edit" });
    if (access.status) return res.status(access.status).json(access.body);

    const workflow = parseEventWorkflow(req.body);
    if (workflow.status === "published" && !access.access.publish) {
      return res.status(403).json({ message: "Publishing events is not permitted" });
    }
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
      const access = await ensureClubAccess({ clubId, user: req.user, action: "view" });
      if (access.status) return res.status(access.status).json(access.body);
      if (!canApplyClubEventPatch({
        access: access.access,
        currentStatus: event.status,
        currentVisibility: event.visibility,
        patch: req.body,
      })) {
        return res.status(403).json({ message: "Event update is not permitted" });
      }
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
    const access = await ensureClubAccess({ clubId, user: req.user, action: "view" });
    if (access.status) return res.status(access.status).json(access.body);
    const event = await populateEvent(
      Event.findOne({ _id: req.params.eventId, club: clubId })
    );
    if (!event) return res.status(404).json({ message: "Event not found" });
    if (!canApplyClubEventPatch({
      access: access.access,
      currentStatus: event.status,
      currentVisibility: event.visibility,
      patch: req.body,
    })) {
      return res.status(403).json({ message: "Event update is not permitted" });
    }

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
  
  let oldPosterPublicId = null;
  if (workflow.posterPublicId !== undefined && workflow.posterPublicId !== event.posterPublicId) {
    oldPosterPublicId = event.posterPublicId;
  }

  if (workflow.posterPublicId !== undefined) {
    event.posterPublicId = workflow.posterPublicId || undefined;
  }
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
  } else if (coordinatorUserIds !== undefined) {
    event.coordinatorUser = coordinatorUserIds[0] || undefined;
  }

  await event.save();

    // Clean up old cloudinary image if we replaced it
    if (oldPosterPublicId && event.posterPublicId !== oldPosterPublicId) {
      try {
        if (!cloudinary.config().cloud_name && process.env.CLOUDINARY_CLOUD_NAME) {
          cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
          });
        }
        console.log(`Cleaning up old event banner from Cloudinary: ${oldPosterPublicId}`);
        await cloudinary.uploader.destroy(oldPosterPublicId);
      } catch (err) {
        console.error("Failed to delete old poster from Cloudinary:", err);
      }
    }
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
        action: "delete",
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
    const access = await ensureClubAccess({ clubId, user: req.user, action: "delete" });
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
    const requestedLimit = Number.parseInt(String(req.query.limit || "50"), 10);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 100)
      : 50;
    const requestedPage = Number.parseInt(String(req.query.page || "1"), 10);
    const page = Number.isFinite(requestedPage) ? Math.max(requestedPage, 1) : 1;
    const now = new Date();
    if (req.query.clubId !== undefined && (typeof req.query.clubId !== "string" || !mongoose.isValidObjectId(req.query.clubId))) {
      return res.status(400).json({ success: false, message: "Choose a valid club." });
    }
    const clubFilter = req.query.clubId ? { club: new mongoose.Types.ObjectId(req.query.clubId) } : {};
    const time = normalize(req.query.time);
    const category = normalize(req.query.category);
    let categoryFilter = {};
    if (category && category.toLowerCase() !== "all") {
      const escapedCategory = category.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const exactCategory = new RegExp(`^${escapedCategory}$`, "i");
      const matchingClubs = await Club.find({ name: exactCategory }).select("_id").lean();
      const categoryOptions = [
        { category: exactCategory },
        { club: { $in: matchingClubs.map((club) => club._id) } },
      ];
      if (category.toLowerCase() === "iedc") {
        categoryOptions.push({
          $and: [
            { category: { $exists: false } },
            { $or: [{ club: { $exists: false } }, { club: null }] },
          ],
        });
      }
      categoryFilter = { $or: categoryOptions };
    }
    const eventsWithSentinel = await Event.aggregate(buildPublicEventsPipeline({
      now,
      time,
      page,
      limit,
      categoryFilter,
      extraMatch: clubFilter,
    }));
    const hasMore = eventsWithSentinel.length > limit;
    const events = hasMore ? eventsWithSentinel.slice(0, limit) : eventsWithSentinel;
    let categories;
    if (req.query.includeCategories === "true") {
      const categoryRows = await Event.aggregate([
        { $match: publicEventFilter },
        {
          $lookup: {
            from: "clubs",
            localField: "club",
            foreignField: "_id",
            as: "clubData",
          },
        },
        {
          $project: {
            category: {
              $ifNull: [
                "$category",
                {
                  $ifNull: [
                    { $arrayElemAt: ["$clubData.name", 0] },
                    "IEDC",
                  ],
                },
              ],
            },
          },
        },
        { $match: { category: { $type: "string", $ne: "" } } },
        { $group: { _id: "$category" } },
        { $sort: { _id: 1 } },
      ]);
      categories = categoryRows.map((row) => row._id);
    }

    setPublicNoStore(res);
    return res.json({ success: true, events: events.map(publicEventResponse), page, limit, hasMore, categories });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch events" });
  }
};

// Public: get one event by id for main website
export const getPublicEventById = async (req, res) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    return res.status(404).json({ success: false, message: "Event not found" });
  }
  try {
    const event = await Event.findById(req.params.id)
      .where(publicEventFilter)
      .populate("club", "name")
      .populate("coordinatorUsers", "name -_id")
      .populate("coordinatorUser", "name -_id")
      .lean();

    if (!event) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });
    }

    setPublicNoStore(res);
    return res.json({ success: true, event: publicEventResponse(event) });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch event" });
  }
};
