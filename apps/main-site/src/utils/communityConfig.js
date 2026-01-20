// Dynamic section configuration for communities
export const getSectionConfig = (community) => {
  const sections = [];

  // About section (always first)
  if (community.longDescription) {
    sections.push({
      title: "About",
      content: community.longDescription,
      type: "text",
    });
  }

  // Global Presence
  if (community.globalPresence) {
    sections.push({
      title: "Global Presence",
      content: community.globalPresence,
      type: "text",
    });
  }

  // Purpose
  if (community.purpose && community.purpose.length > 0) {
    sections.push({
      title: "Purpose",
      content: community.purpose,
      type: "list",
    });
  }

  // Benefits
  if (community.benefits && community.benefits.length > 0) {
    sections.push({
      title: "Benefits",
      content: community.benefits,
      type: "list",
    });
  }

  // Why It's Important
  if (community.whyImportant && community.whyImportant.length > 0) {
    sections.push({
      title: "Why It's Important",
      content: community.whyImportant,
      type: "list",
    });
  }

  // What We Provide
  if (community.whatWeProvide && community.whatWeProvide.items) {
    sections.push({
      title: community.whatWeProvide.title || "What We Provide",
      content: community.whatWeProvide,
      type: "cards",
    });
  }

  // Join Us
  if (community.joinUs) {
    sections.push({
      title: "Join Us",
      content: community.joinUs,
      type: "highlight",
    });
  }

  // Why We Do It
  if (community.whyWeDoIt) {
    sections.push({
      title: "Why We Do It",
      content: community.whyWeDoIt,
      type: "text",
    });
  }

  // What We Do
  if (community.whatWeDo) {
    sections.push({
      title: "What We Do",
      content: community.whatWeDo,
      type: "text",
    });
  }

  // Vision
  if (community.vision) {
    sections.push({
      title: "Vision",
      content: community.vision,
      type: "text",
    });
  }

  // Mission
  if (community.mission) {
    sections.push({
      title: "Mission",
      content: community.mission,
      type: "text",
    });
  }

  // Activities
  if (community.activities && community.activities.length > 0) {
    sections.push({
      title: "Activities",
      content: community.activities,
      type: "list",
    });
  }

  return sections;
};
