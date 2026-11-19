export const PUBLIC_EVENT_FILTER = {
  $or: [
    { status: "published", visibility: "public" },
    {
      status: { $exists: false },
      visibility: { $exists: false },
      scope: { $exists: false },
    },
  ],
};

const hasKeys = (value) => value && Object.keys(value).length > 0;

const timeCandidateFilter = (time, now) => {
  if (time !== "upcoming" && time !== "past") return {};
  const comparison = time === "upcoming" ? "$gte" : "$lt";
  return {
    $or: [
      { endAt: { [comparison]: now } },
      { endAt: { $exists: false }, startAt: { [comparison]: now } },
      { endAt: null, startAt: { [comparison]: now } },
      { startDate: { $exists: true } },
      { endDate: { $exists: true } },
      { date: { $exists: true } },
    ],
  };
};

export const buildPublicEventsPipeline = ({
  now,
  time,
  page,
  limit,
  categoryFilter = {},
  extraMatch = {},
}) => {
  const initialFilters = [PUBLIC_EVENT_FILTER];
  const candidateFilter = timeCandidateFilter(time, now);
  if (hasKeys(candidateFilter)) initialFilters.push(candidateFilter);
  if (hasKeys(categoryFilter)) initialFilters.push(categoryFilter);
  if (hasKeys(extraMatch)) initialFilters.push(extraMatch);

  const pipeline = [
    { $match: initialFilters.length === 1 ? initialFilters[0] : { $and: initialFilters } },
    {
      $set: {
        _effectiveStartAt: {
          $convert: {
            input: { $ifNull: ["$startAt", { $ifNull: ["$startDate", "$date"] }] },
            to: "date",
            onError: null,
            onNull: null,
          },
        },
      },
    },
    {
      $set: {
        _effectiveEndAt: {
          $convert: {
            input: { $ifNull: ["$endAt", { $ifNull: ["$endDate", "$_effectiveStartAt"] }] },
            to: "date",
            onError: "$_effectiveStartAt",
            onNull: "$_effectiveStartAt",
          },
        },
        posterUrl: { $ifNull: ["$posterUrl", "$image"] },
      },
    },
  ];

  if (time === "upcoming" || time === "past") {
    pipeline.push({
      $match: {
        _effectiveEndAt: { [time === "upcoming" ? "$gte" : "$lt"]: now },
      },
    });
  }

  const direction = time === "upcoming" ? 1 : -1;
  pipeline.push(
    { $sort: { _effectiveStartAt: direction, createdAt: direction, _id: direction } },
    { $skip: (page - 1) * limit },
    { $limit: limit + 1 },
    {
      $lookup: {
        from: "clubs",
        localField: "club",
        foreignField: "_id",
        pipeline: [{ $project: { name: 1 } }],
        as: "_clubData",
      },
    },
    { $set: { club: { $ifNull: [{ $arrayElemAt: ["$_clubData", 0] }, "$club"] } } },
    { $project: { _effectiveStartAt: 0, _effectiveEndAt: 0, _clubData: 0 } },
  );
  return pipeline;
};
