import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import {
  FaArrowLeft, FaSearch, FaLinkedinIn, FaGithub, FaTwitter,
  FaTimes, FaChevronLeft, FaChevronRight,
} from "react-icons/fa";
import axios from "axios";

// ─────────────────────────────────────────────────────────────────────────────
// TEAM PAGE
// ─────────────────────────────────────────────────────────────────────────────
const TeamPage = () => {
  const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:5000" : "");
  if (import.meta.env.PROD && !import.meta.env.VITE_API_URL) throw new Error("VITE_API_URL is required in production");

  const [availableYears, setAvailableYears]   = useState([]);
  const [selectedYear,   setSelectedYear]     = useState(null);
  const [displayData,    setDisplayData]      = useState({ nodalOfficers: [], facultyMembers: [], coreTeam: [], teamMembers: [] });
  const [rawData,        setRawData]          = useState([]);
  const [searchQuery,    setSearchQuery]      = useState("");
  const [loading,        setLoading]          = useState(true);
  const [isYearsLoading, setIsYearsLoading]   = useState(true);
  const [selectedMember, setSelectedMember]   = useState(null); // profile modal

  // 1. Fetch available years
  useEffect(() => {
    const fetchYears = async () => {
      try {
        setIsYearsLoading(true);
        const { data } = await axios.get(`${API_BASE_URL}/api/public/execom/years`);
        let years = Array.isArray(data) ? data : data.years ?? data.data ?? [];
        const sorted = years.map(String).sort((a, b) => b.localeCompare(a));
        setAvailableYears(sorted);
        if (sorted.length > 0) setSelectedYear(sorted[0]);
        else { const y = String(new Date().getFullYear()); setAvailableYears([y]); setSelectedYear(y); }
      } catch {
        const y = String(new Date().getFullYear()); setAvailableYears([y]); setSelectedYear(y);
      } finally { setIsYearsLoading(false); }
    };
    fetchYears();
  }, []);

  // 2. Fetch roster (AbortController prevents race conditions)
  useEffect(() => {
    if (!selectedYear) return;
    const controller = new AbortController();

    const fetchYearData = async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(`${API_BASE_URL}/api/public/execom`, {
          params: { year: selectedYear },
          signal: controller.signal,
        });
        const yearData =
          (data.years || []).find((y) => y.year === selectedYear) ||
          data.years?.[0] || { members: [] };

        const formatted = (yearData.members || []).map((m) => {
          const rawName = m.user?.name || m.name || "Unknown";
          return {
            id: m.id || m._id,
            name: String(rawName).toUpperCase(),
            role: m.roleTitle || m.role || "Member",
            image: m.imageUrl || m.user?.image || null,
            // membershipId embedded — no index-based raw lookup needed
            membershipId: (m.user?.membershipId || "").toUpperCase(),
            linkedin: m.linkedin || m.user?.linkedin || "",
            github:   m.github   || m.user?.github   || "",
            twitter:  m.twitter  || m.user?.twitter  || "",
          };
        });

        setRawData(formatted);
        processMembers(formatted, searchQuery);
      } catch (err) {
        if (axios.isCancel(err)) return;
        setRawData([]);
        setDisplayData({ nodalOfficers: [], facultyMembers: [], coreTeam: [], teamMembers: [] });
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    fetchYearData();
    return () => controller.abort();
  }, [selectedYear]);

  // 3. Client-side search
  useEffect(() => {
    if (rawData.length > 0) processMembers(rawData, searchQuery);
  }, [searchQuery, rawData]);

  // Helper: categorise members
  const processMembers = (members, query) => {
    const q = query.toLowerCase().trim();
    const filtered = members.filter(
      (m) => m.name.toLowerCase().includes(q) || m.role.toLowerCase().includes(q)
    );
    const cat = { nodalOfficers: [], facultyMembers: [], coreTeam: [], teamMembers: [] };
    filtered.forEach((m) => {
      const r = m.role.toLowerCase();
      const isStaff = m.membershipId.includes("ST");
      if (r.includes("nodal officer") || r.includes("president") || isStaff)
        cat.nodalOfficers.push(m);
      else if (r.includes("faculty") || r.includes("advisor") || r.includes("mentor") || r.includes("principal"))
        cat.facultyMembers.push(m);
      else if (
        r.includes("ceo") || r.includes("cto") || r.includes("coo") || r.includes("cfo") ||
        r.includes("cmo") || r.includes("lead") || r.includes("head") || r.includes("chief") ||
        r.includes("chair") || r.includes("coordinator")
      ) cat.coreTeam.push(m);
      else cat.teamMembers.push(m);
    });
    setDisplayData(cat);
  };

  const hasData =
    displayData.nodalOfficers.length > 0 || displayData.facultyMembers.length > 0 ||
    displayData.coreTeam.length > 0 || displayData.teamMembers.length > 0;

  return (
    <div className="min-h-screen bg-[#F5F5F0]">

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="pt-32 pb-16 bg-white border-b border-gray-200">
        <div className="container mx-auto px-6">
          <Link
            to="/"
            className="inline-flex items-center text-gray-400 hover:text-text-dark mb-10 transition-colors font-mono text-xs uppercase tracking-widest group"
          >
            <FaArrowLeft className="mr-2 group-hover:-translate-x-1 transition-transform" />
            Return_Home
          </Link>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div>
              <motion.span
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="text-accent font-mono font-bold tracking-widest text-sm uppercase mb-4 block"
              >
                06 // PERSONNEL_DATABASE
              </motion.span>
              <motion.h1
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="text-5xl md:text-7xl font-black text-text-dark tracking-tighter leading-[0.9]"
              >
                THE PEOPLE<br />
                <span className="text-gray-300">BEHIND IT.</span>
              </motion.h1>
            </div>
            <motion.p
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
              className="text-text-light max-w-sm text-base border-l-4 border-accent pl-5 leading-relaxed"
            >
              Meet the builders, leaders, and dreamers driving innovation at LBSCEK.
            </motion.p>
          </div>
        </div>
      </section>

      {/* ── STICKY CONTROLS ──────────────────────────────────────────────── */}
      <section className="sticky top-20 z-30 bg-[#F5F5F0]/95 backdrop-blur-md border-b border-gray-200 py-3 shadow-sm">
        <div className="container mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-3">
          {/* Year pills */}
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            <span className="font-mono text-[10px] font-bold text-gray-400 mr-2 whitespace-nowrap uppercase tracking-widest">
              TEAM_YEAR:
            </span>
            {isYearsLoading ? (
              <div className="h-8 w-32 bg-gray-200 animate-pulse rounded" />
            ) : (
              availableYears.map((year) => (
                <button
                  key={year}
                  onClick={() => { setSelectedYear(year); setSearchQuery(""); }}
                  aria-pressed={selectedYear === year}
                  className={`px-4 py-2 font-mono text-xs font-bold transition-all border whitespace-nowrap ${
                    selectedYear === year
                      ? "bg-text-dark text-white border-text-dark"
                      : "bg-white text-gray-500 border-gray-200 hover:border-text-dark hover:text-text-dark"
                  }`}
                >
                  {year}
                </button>
              ))
            )}
          </div>
          {/* Search */}
          <div className="relative w-full sm:w-64 group">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs group-focus-within:text-accent transition-colors" />
            <input
              type="text"
              placeholder="Search name or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-gray-200 pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all placeholder:text-gray-300 font-mono"
            />
          </div>
        </div>
      </section>

      {/* ── CONTENT ──────────────────────────────────────────────────────── */}
      <main className="py-20">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="animate-spin w-10 h-10 border-[3px] border-accent border-t-transparent rounded-full" />
            <p className="font-mono text-xs text-gray-400 uppercase tracking-widest">Loading Roster...</p>
          </div>
        ) : hasData ? (
          <>
            {/* LEVEL 1 — Nodal Officers: editorial large portraits */}
            {displayData.nodalOfficers.length > 0 && (
              <EditorialSection
                title="Nodal Officers"
                accent="#FF6B6B"
                members={displayData.nodalOfficers}
                onSelect={setSelectedMember}
              />
            )}

            {/* LEVEL 1 — Faculty Board: editorial */}
            {displayData.facultyMembers.length > 0 && (
              <EditorialSection
                title="Faculty Board"
                accent="#A8D5BA"
                members={displayData.facultyMembers}
                onSelect={setSelectedMember}
              />
            )}

            {/* LEVEL 2 — Executive Committee: editorial large portraits */}
            {displayData.coreTeam.length > 0 && (
              <EditorialSection
                title="Executive Committee"
                accent="#2E2E2E"
                members={displayData.coreTeam}
                onSelect={setSelectedMember}
              />
            )}

            {/* LEVEL 3 — Member Network: compact grid */}
            {displayData.teamMembers.length > 0 && (
              <MemberGridSection
                title="Member Network"
                members={displayData.teamMembers}
                onSelect={setSelectedMember}
              />
            )}
          </>
        ) : (
          /* Empty state */
          <div className="container mx-auto px-6 max-w-md">
            <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-gray-200 text-center">
              <div className="w-14 h-14 bg-gray-100 flex items-center justify-center mb-5 text-xl text-gray-300">
                <FaSearch />
              </div>
              <p className="text-gray-400 font-mono text-sm">
                {rawData.length === 0
                  ? `NO_ROSTER_FOR_${selectedYear}`
                  : `NO_MATCH — "${searchQuery}"`}
              </p>
              {rawData.length > 0 && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="mt-4 text-accent font-bold text-sm hover:underline"
                >
                  Clear Search
                </button>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ── PROFILE MODAL ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedMember && (
          <ProfileModal
            member={selectedMember}
            year={selectedYear}
            onClose={() => setSelectedMember(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SECTION HEADER
// ─────────────────────────────────────────────────────────────────────────────
const SectionHeader = ({ title, count, accent }) => (
  <div className="container mx-auto px-6 mb-10 flex items-center gap-4">
    <div className="w-1 h-12 rounded-full flex-shrink-0" style={{ background: accent }} />
    <div>
      <h2 className="text-2xl md:text-3xl font-black text-text-dark uppercase tracking-tight leading-none">
        {title}
      </h2>
      <p className="font-mono text-[10px] text-gray-400 mt-1 uppercase tracking-widest">
        {count} {count === 1 ? "Member" : "Members"}
      </p>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// EDITORIAL SECTION (Nodal Officers / Faculty)
// Large portrait cards with 3D tilt + magnetic hover
// ─────────────────────────────────────────────────────────────────────────────
const EditorialSection = ({ title, accent, members, onSelect }) => (
  <section className="mb-24">
    <SectionHeader title={title} count={members.length} accent={accent} />
    <div className="container mx-auto px-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {members.map((m, i) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07, duration: 0.4, ease: "easeOut" }}
          >
            <EditorialCard member={m} onSelect={onSelect} />
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

// ─────────────────────────────────────────────────────────────────────────────
// EDITORIAL CARD
// ─────────────────────────────────────────────────────────────────────────────
const EditorialCard = ({ member, onSelect }) => {
  const [imgError, setImgError] = useState(false);
  const [hovered, setHovered]   = useState(false);
  const cardRef = useRef(null);
  const mouseX  = useMotionValue(0);
  const mouseY  = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-60, 60], [5, -5]);
  const rotateY = useTransform(mouseX, [-60, 60], [-5, 5]);

  const initials = (member.name || "?").split(" ").map((w) => w[0]).slice(0, 2).join("");

  const onMouseMove = (e) => {
    const r = cardRef.current?.getBoundingClientRect();
    if (!r) return;
    mouseX.set(e.clientX - r.left - r.width / 2);
    mouseY.set(e.clientY - r.top - r.height / 2);
  };
  const onMouseLeave = () => { mouseX.set(0); mouseY.set(0); setHovered(false); };

  return (
    <motion.div
      ref={cardRef}
      style={{ rotateX, rotateY, perspective: 900, transformStyle: "preserve-3d" }}
      whileHover={{ y: -10, boxShadow: "0 24px 60px rgba(0,0,0,0.15)" }}
      onMouseMove={onMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={onMouseLeave}
      onClick={() => onSelect(member)}
      transition={{ type: "spring", damping: 22, stiffness: 280 }}
      className="cursor-pointer overflow-hidden bg-white border border-gray-100 group"
    >
      {/* Portrait */}
      <div className="aspect-[3/4] relative overflow-hidden bg-gray-900">
        {!imgError && member.image ? (
          <motion.img
            src={member.image}
            alt={member.name}
            className="w-full h-full object-cover object-top"
            animate={{ scale: hovered ? 1.07 : 1 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-700">
            <span className="text-7xl font-black text-white/10 select-none">{initials}</span>
          </div>
        )}

        {/* Always-on gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

        {/* Info block — always visible, socials slide in on hover */}
        <div className="absolute bottom-0 left-0 right-0 p-5">
          {/* Animated accent bar */}
          <motion.div
            className="h-[2px] bg-accent rounded-full mb-3"
            animate={{ width: hovered ? 52 : 20 }}
            transition={{ duration: 0.3 }}
          />
          <h3 className="font-black text-white text-base leading-tight">{member.name}</h3>
          <p className="font-mono text-white/55 text-[10px] uppercase tracking-widest mt-1 line-clamp-1">
            {member.role}
          </p>

          {/* Social links */}
          <motion.div
            className="flex gap-2 mt-3"
            animate={{ opacity: hovered ? 1 : 0, y: hovered ? 0 : 8 }}
            transition={{ duration: 0.2, delay: hovered ? 0.06 : 0 }}
          >
            {[
              { href: member.linkedin, Icon: FaLinkedinIn, label: "LinkedIn" },
              { href: member.github,   Icon: FaGithub,    label: "GitHub"   },
              { href: member.twitter,  Icon: FaTwitter,   label: "Twitter"  },
            ]
              .filter(({ href }) => href)
              .map(({ href, Icon, label }) => (
                <a
                  key={label}
                  href={href.startsWith("http") ? href : `https://${href}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${label} profile of ${member.name}`}
                  onClick={(e) => e.stopPropagation()}
                  className="w-7 h-7 bg-white/15 hover:bg-accent flex items-center justify-center rounded-full transition-colors text-white text-xs"
                >
                  <Icon aria-hidden="true" />
                </a>
              ))}
          </motion.div>
        </div>

        {/* "View Profile" chip */}
        <motion.div
          className="absolute top-4 right-4 bg-black/40 backdrop-blur-sm px-2 py-1 font-mono text-[9px] text-white/70 uppercase tracking-widest"
          animate={{ opacity: hovered ? 1 : 0 }}
          transition={{ duration: 0.2 }}
        >
          View Profile ↗
        </motion.div>
      </div>
    </motion.div>
  );
};


// ─────────────────────────────────────────────────────────────────────────────
// MEMBER GRID SECTION
// ─────────────────────────────────────────────────────────────────────────────
const MemberGridSection = ({ title, members, onSelect }) => (
  <section className="mb-20">
    <SectionHeader title={title} count={members.length} accent="#8A8A8A" />
    <div className="container mx-auto px-6">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          hidden:  { opacity: 0 },
          visible: { opacity: 1, transition: { staggerChildren: 0.035 } },
        }}
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3"
      >
        {members.map((m) => (
          <MemberCard key={m.id} member={m} onSelect={onSelect} />
        ))}
      </motion.div>
    </div>
  </section>
);

// ─────────────────────────────────────────────────────────────────────────────
// MEMBER CARD (compact circular)
// ─────────────────────────────────────────────────────────────────────────────
const MemberCard = ({ member, onSelect }) => {
  const [imgError, setImgError] = useState(false);
  const initials = (member.name || "?").split(" ").map((w) => w[0]).slice(0, 2).join("");

  return (
    <motion.div
      variants={{ hidden: { opacity: 0, scale: 0.9 }, visible: { opacity: 1, scale: 1 } }}
      whileHover={{ y: -4, boxShadow: "0 10px 24px rgba(0,0,0,0.08)" }}
      onClick={() => onSelect(member)}
      className="group flex flex-col items-center text-center p-4 bg-white border border-gray-200 hover:border-accent/40 transition-all duration-200 cursor-pointer"
    >
      <div className="relative w-16 h-16 mb-3 overflow-hidden rounded-full ring-2 ring-gray-100 group-hover:ring-accent/40 transition-all flex-shrink-0">
        {!imgError && member.image ? (
          <img
            src={member.image}
            alt={member.name}
            className="w-full h-full object-cover object-top"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-600">
            <span className="text-lg font-black text-white/30 select-none">{initials}</span>
          </div>
        )}
      </div>
      <h4 className="font-bold text-xs text-text-dark leading-tight line-clamp-2 group-hover:text-accent transition-colors">
        {member.name}
      </h4>
      <p className="text-[9px] font-mono text-gray-400 uppercase tracking-widest mt-1 line-clamp-1">
        {member.role}
      </p>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE MODAL — click-to-expand with spring animation
// ─────────────────────────────────────────────────────────────────────────────
const ProfileModal = ({ member, year, onClose }) => {
  const [imgError, setImgError] = useState(false);
  const initials = (member.name || "?").split(" ").map((w) => w[0]).slice(0, 2).join("");

  // Lock scroll + Escape key to close
  useEffect(() => {
    const esc = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", esc);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const safeHref = (href) =>
    href ? (href.startsWith("http") ? href : `https://${href}`) : null;

  const socials = [
    { href: safeHref(member.linkedin), Icon: FaLinkedinIn, label: "LinkedIn",  color: "#0A66C2", bg: "#0A66C2/10" },
    { href: safeHref(member.github),   Icon: FaGithub,    label: "GitHub",    color: "#1a1a1a", bg: "gray-900/10" },
    { href: safeHref(member.twitter),  Icon: FaTwitter,   label: "Twitter",   color: "#1DA1F2", bg: "#1DA1F2/10" },
  ].filter(({ href }) => href);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/82 backdrop-blur-md"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />

      {/* Profile card */}
      <motion.div
        className="relative z-10 bg-white w-full max-w-2xl max-h-[92vh] flex flex-col md:flex-row overflow-hidden shadow-2xl"
        initial={{ scale: 0.87, opacity: 0, y: 28 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.93, opacity: 0, y: 16 }}
        transition={{ type: "spring", damping: 26, stiffness: 320 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Photo column ── */}
        <div className="w-full md:w-[44%] flex-shrink-0 relative overflow-hidden min-h-[280px]">
          {!imgError && member.image ? (
            <img
              src={member.image}
              alt={member.name}
              className="w-full h-full object-cover object-top absolute inset-0"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-700">
              <span className="text-[9rem] font-black text-white/8 select-none leading-none">{initials}</span>
            </div>
          )}
          {/* Photo gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          {/* Year badge */}
          <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm px-3 py-1 font-mono text-[10px] text-white uppercase tracking-widest">
            IEDC // {year}
          </div>
        </div>

        {/* ── Info column ── */}
        <div className="flex-1 flex flex-col p-7 md:p-8 overflow-y-auto">
          {/* Close button */}
          <button
            onClick={onClose}
            aria-label="Close profile"
            className="absolute top-4 right-4 z-20 w-9 h-9 bg-gray-100 hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-colors"
          >
            <FaTimes className="text-sm" />
          </button>

          {/* Name + role */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-[2px] bg-accent" />
              <span className="font-mono text-[10px] text-gray-400 uppercase tracking-widest">
                {year} Executive
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-text-dark leading-tight tracking-tighter">
              {member.name}
            </h2>
            <p className="font-mono text-sm text-gray-500 uppercase tracking-widest mt-3">
              {member.role}
            </p>
          </div>

          <div className="border-t border-gray-100 mb-6" />

          {/* Social profiles */}
          <div className="space-y-3 flex-1">
            <p className="font-mono text-[10px] text-gray-400 uppercase tracking-widest mb-3">
              Connect
            </p>
            {socials.length > 0 ? socials.map(({ href, Icon, label }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${label} profile of ${member.name}`}
                className="flex items-center gap-4 p-4 border border-gray-100 hover:border-accent hover:bg-accent/5 group transition-all"
              >
                <div className="w-8 h-8 bg-gray-100 text-text-dark flex items-center justify-center rounded-full group-hover:bg-accent group-hover:text-white transition-all text-sm">
                  <Icon aria-hidden="true" />
                </div>
                <span className="text-sm font-semibold text-text-dark">{label}</span>
                <span className="ml-auto text-accent font-bold opacity-0 group-hover:opacity-100 transition-opacity">→</span>
              </a>
            )) : (
              <p className="text-gray-300 font-mono text-xs">No social profiles linked yet.</p>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default TeamPage;
