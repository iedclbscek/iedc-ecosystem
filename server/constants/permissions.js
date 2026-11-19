export const PERMISSIONS = Object.freeze({
  DASHBOARD: "dashboard",
  REGISTRATIONS: "registrations",
  EVENTS: "events",
  USERS: "users",
  MAILER: "mailer",
  SETTINGS: "settings",
  MAKERSPACE: "makerspace",
  FIRST_YEAR_REPS: "firstYearReps",
  CLUB_PAGE_EDIT: "club_page_edit",
  CLUB_PAGE_PUBLISH: "club_page_publish",
  CLUB_EVENTS_EDIT: "club_events_edit",
  CLUB_EVENTS_PUBLISH: "club_events_publish",
  CLUB_EVENTS_DELETE: "club_events_delete",

  SECOND_YEAR_REPS: "secondYearReps",
});

export const SCOPED_PERMISSIONS = Object.freeze({
  IEDC: {
    DASHBOARD: PERMISSIONS.DASHBOARD,
    EVENTS: PERMISSIONS.EVENTS,
    USERS: PERMISSIONS.USERS,
    REGISTRATIONS: PERMISSIONS.REGISTRATIONS,
    SETTINGS: PERMISSIONS.SETTINGS,
    MAILER: PERMISSIONS.MAILER,
    FIRST_YEAR_REPS: PERMISSIONS.FIRST_YEAR_REPS,
    SECOND_YEAR_REPS: PERMISSIONS.SECOND_YEAR_REPS,
  },
  CLUB: {
    EVENTS: PERMISSIONS.EVENTS,
    USERS: PERMISSIONS.USERS,
  },
});
