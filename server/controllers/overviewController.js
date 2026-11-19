import mongoose from "mongoose";
import Club from "../models/Club.js";
import Event from "../models/Event.js";
import Application from "../models/FirstYearRepresentativeApplication.js";
import Registration from "../models/Registration.js";
import { resolveClubAccess } from "../utils/clubAccess.js";
import { canUseIedcWorkspace, hasWorkspacePermission } from "../utils/authorization.js";
import {
  buildActivityResult,
  getKolkataActivityWindow,
  parseOverviewDays,
} from "../utils/overviewMetrics.js";

export async function getOverview(req, res, next) {
  try {
    res.set("Cache-Control", "private, no-store");
    const { user, query } = req;
    const days = parseOverviewDays(query.days);
    const now = new Date();
    const activityWindow = getKolkataActivityWindow({ days, now });
    const scoped = query.clubId !== undefined;
    let eventScope = { scope: "iedc", club: null };
    let club = null;
    if (scoped) {
      if (!mongoose.isObjectIdOrHexString(query.clubId)) return res.sendStatus(400);
      club = await Club.findById(query.clubId)
        .select("name managerUsers editorUsers memberUsers").lean();
      if (!club || !(await resolveClubAccess({ user, club })).view) return res.sendStatus(403);
      eventScope = { club: club._id };
    } else if (!canUseIedcWorkspace(user) || !hasWorkspacePermission(user, "dashboard")) {
      return res.sendStatus(403);
    }
    const eventsAllowed = scoped || hasWorkspacePermission(user, "events");
    const registrationsAllowed = !scoped && hasWorkspacePermission(user, "registrations");
    const [eventMetricsRows, upcoming, students, newStudents, pending] = await Promise.all([
      eventsAllowed ? Event.aggregate([
        { $match: eventScope },
        {
          $facet: {
            counts: [
              { $group: { _id: { $ifNull: ["$status", "published"] }, count: { $sum: 1 } } },
            ],
            activity: [
              {
                $match: {
                  createdAt: {
                    $gte: activityWindow.previousStart,
                    $lt: activityWindow.currentEnd,
                  },
                },
              },
              {
                $group: {
                  _id: {
                    $dateToString: {
                      date: "$createdAt",
                      format: "%Y-%m-%d",
                      timezone: "Asia/Kolkata",
                    },
                  },
                  count: { $sum: 1 },
                },
              },
            ],
          },
        },
      ]) : null,
      eventsAllowed ? Event.find({ ...eventScope, startAt: { $gte: now }, status: { $nin: ["cancelled", "completed"] } })
        .sort({ startAt: 1, _id: 1 }).limit(5).select("title startAt location venue status").lean() : [],
      registrationsAllowed ? Registration.countDocuments({}).hint("_id_") : null,
      registrationsAllowed ? Registration.countDocuments({
        createdAt: { $gte: activityWindow.currentStart, $lt: activityWindow.currentEnd },
      }) : null,
      !scoped && hasWorkspacePermission(user, "firstYearReps") ? Application.countDocuments({ status: "Applied" }) : null,
    ]);
    const eventMetrics = eventMetricsRows?.[0] || null;
    res.json({
      name: club?.name || "IEDC",
      events: eventMetrics && Object.fromEntries(eventMetrics.counts.map(({ _id, count }) => [_id, count])),
      upcoming,
      students,
      pending,
      activity: eventMetrics
        ? buildActivityResult({ days, window: activityWindow, rows: eventMetrics.activity })
        : null,
      newStudents,
    });
  } catch (error) {
    next(error);
  }
}
