import Event from "../models/Event.js";

const toDateOrUndefined = (value) => {
  if (value === null || value === undefined || value === "") return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date;
};

export const listEvents = async (req, res) => {
  try {
    const search = String(req.query.search ?? "").trim();

    const query = search
      ? {
          $or: [
            { title: { $regex: search, $options: "i" } },
            { location: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const events = await Event.find(query)
      .populate("coordinatorUser", "name email membershipId role")
      .sort({ startAt: -1, createdAt: -1 });

    res.json({ events });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch events", error: error.message });
  }
};

export const createEvent = async (req, res) => {
  try {
    const { title, description, location, startAt, endAt, coordinatorUserId } =
      req.body;

    const finalTitle = String(title ?? "").trim();
    if (!finalTitle)
      return res.status(400).json({ message: "title is required" });

    const event = await Event.create({
      title: finalTitle,
      description: String(description ?? "").trim() || undefined,
      location: String(location ?? "").trim() || undefined,
      startAt: toDateOrUndefined(startAt),
      endAt: toDateOrUndefined(endAt),
      coordinatorUser: coordinatorUserId || undefined,
    });

    const populated = await Event.findById(event._id).populate(
      "coordinatorUser",
      "name email membershipId role"
    );

    res.status(201).json({ event: populated });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to create event", error: error.message });
  }
};

export const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, location, startAt, endAt, coordinatorUserId } =
      req.body;

    const event = await Event.findById(id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    if (title !== undefined) {
      const finalTitle = String(title ?? "").trim();
      if (!finalTitle)
        return res.status(400).json({ message: "title is required" });
      event.title = finalTitle;
    }

    if (description !== undefined)
      event.description = String(description ?? "").trim() || undefined;
    if (location !== undefined)
      event.location = String(location ?? "").trim() || undefined;

    if (startAt !== undefined) event.startAt = toDateOrUndefined(startAt);
    if (endAt !== undefined) event.endAt = toDateOrUndefined(endAt);

    if (coordinatorUserId !== undefined) {
      event.coordinatorUser = coordinatorUserId || undefined;
    }

    await event.save();

    const populated = await Event.findById(event._id).populate(
      "coordinatorUser",
      "name email membershipId role"
    );

    res.json({ event: populated });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to update event", error: error.message });
  }
};

export const deleteEvent = async (req, res) => {
  try {
    const deleted = await Event.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Event not found" });
    res.json({ message: "Event deleted" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to delete event", error: error.message });
  }
};
