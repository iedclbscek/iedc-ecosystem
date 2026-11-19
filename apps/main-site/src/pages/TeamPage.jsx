import { teamSection } from '../../../../shared/teamSections';
import { createElement, useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion as Motion, useMotionValue, useTransform } from "framer-motion";
import {
  FaArrowLeft, FaSearch, FaLinkedinIn, FaGithub, FaTwitter,
  FaTimes,
} from "react-icons/fa";
import axios from "axios";
import ExecomProfilePage from "./ExecomProfilePage";
import { PublicErrorState, TeamSkeleton } from "../components/ui/PublicPageState";

// ─────────────────────────────────────────────────────────────────────────────
// TEAM PAGE
// ─────────────────────────────────────────────────────────────────────────────
const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:5000" : "");
if (import.meta.env.PROD && !import.meta.env.VITE_API_URL) throw new Error("VITE_API_URL is required in production");

const formatMember = (member) => {
  const rawName = member.user?.name || member.name || "Unknown";
  return {
    id: member.id || member._id,
    name: String(rawName).toUpperCase(),
    role: member.roleTitle || member.role || "Member",
    image: member.imageUrl || member.user?.image || null,
    membershipId: (member.user?.membershipId || "").toUpperCase(),
    linkedin: member.linkedin || member.user?.linkedin || "",
    github: member.github || member.user?.github || "",
    twitter: member.twitter || member.user?.twitter || "",
  };
};

const processMembers = (members, query) => {
  const q = query.toLowerCase().trim();
  const filtered = members.filter(
    (m) => m.name.toLowerCase().includes(q) || m.role.toLowerCase().includes(q)
  );
  const cat = { nodalOfficers: [], facultyMembers: [], coreTeam: [], teamMembers: [] };
  filtered.forEach((m) => {
    cat[teamSection(m.role, m.membershipId)].push(m);
  });
  return cat;
};

const TeamPage = () => {
  const [availableYears, setAvailableYears]   = useState([]);
  const [selectedYear,   setSelectedYear]     = useState(null);
  const [rawData,        setRawData]          = useState([]);
  const [searchQuery,    setSearchQuery]      = useState("");
  const [loading,        setLoading]          = useState(true);
  const [isYearsLoading, setIsYearsLoading]   = useState(true);
  const [selectedMember, setSelectedMember]   = useState(null); // profile modal
  const [loadError, setLoadError] = useState("");
  const [retryNonce, setRetryNonce] = useState(0);
  const [rosterRetry, setRosterRetry] = useState(0);
  const initialRosterYearRef = useRef(null);
  function openProfile(event, member) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    setSelectedMember({ member, opener: event.currentTarget });
  }

  // 1. Fetch available years
  useEffect(() => {
    const controller = new AbortController();
    const fetchYears = async () => {
      try {
        setIsYearsLoading(true);
        setLoading(true);
        setLoadError("");
        const { data } = await axios.get(`${API_BASE_URL}/api/public/execom/years`, {
          params: { includeRoster: true },
          signal: controller.signal,
        });
        let years = Array.isArray(data) ? data : data.years ?? data.data ?? [];
        const sorted = years.map(String).sort((a, b) => b.localeCompare(a));
        setAvailableYears(sorted);
        if (sorted.length > 0) {
          const initialYear = sorted[0];
          const formatted = (data.roster || []).map(formatMember);
          initialRosterYearRef.current = Array.isArray(data.roster) ? initialYear : null;
          setSelectedYear(initialYear);
          setRawData(formatted);
          setLoading(false);
        }
        else { const y = String(new Date().getFullYear()); setAvailableYears([y]); setSelectedYear(y); }
      } catch {
        if (controller.signal.aborted) return;
        setLoadError("We could not load the team roster. Check your connection and try again.");
        setLoading(false);
      } finally { if (!controller.signal.aborted) setIsYearsLoading(false); }
    };
    fetchYears();
    return () => controller.abort();
  }, [retryNonce]);

  // 2. Fetch roster (AbortController prevents race conditions)
  useEffect(() => {
    if (!selectedYear) return;
    if (initialRosterYearRef.current === selectedYear) {
      initialRosterYearRef.current = null;
      return;
    }
    const controller = new AbortController();

    const fetchYearData = async () => {
      try {
        setLoading(true);
        setLoadError("");
        const { data } = await axios.get(`${API_BASE_URL}/api/public/execom`, {
          params: { year: selectedYear },
          signal: controller.signal,
        });
        const yearData =
          (data.years || []).find((y) => y.year === selectedYear) ||
          data.years?.[0] || { members: [] };

        const formatted = (yearData.members || []).map(formatMember);
        setRawData(formatted);
      } catch (err) {
        if (axios.isCancel(err)) return;
        setLoadError("We could not load the selected team year. Please try again.");
        setRawData([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    fetchYearData();
    return () => controller.abort();
  }, [selectedYear, rosterRetry]);

  const displayData = processMembers(rawData, searchQuery);

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
              <Motion.span
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="text-accent font-mono font-bold tracking-widest text-sm uppercase mb-4 block"
              >
                06 // PERSONNEL_DATABASE
              </Motion.span>
              <Motion.h1
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="text-5xl md:text-7xl font-black text-text-dark tracking-tighter leading-[0.9]"
              >
                THE PEOPLE<br />
                <span className="text-gray-300">BEHIND IT.</span>
              </Motion.h1>
            </div>
            <Motion.p
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
              className="text-text-light max-w-sm text-base border-l-4 border-accent pl-5 leading-relaxed"
            >
              Meet the builders, leaders, and dreamers driving innovation at LBSCEK.
            </Motion.p>
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
              type="search" aria-label="Search team by name or role"
              placeholder="Search name or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-gray-200 pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all placeholder:text-gray-300 font-mono"
            />
          </div>
        </div>
      </section>

      {/* ── CONTENT ──────────────────────────────────────────────────────── */}
      <div className="py-20">
        {loading ? (
          <TeamSkeleton />
        ) : loadError ? (
          <PublicErrorState title="Team unavailable" message={loadError} onRetry={() => availableYears.length ? setRosterRetry(value => value + 1) : setRetryNonce(value => value + 1)} />
        ) : hasData ? (
          <>
            {/* LEVEL 1 — Nodal Officers: editorial large portraits */}
            {displayData.nodalOfficers.length > 0 && (
              <EditorialSection
                title="Nodal Officers"
                accent="#FF6B6B"
                members={displayData.nodalOfficers}
                onSelect={openProfile}
              />
            )}

            {/* LEVEL 1 — Faculty Board: editorial */}
            {displayData.facultyMembers.length > 0 && (
              <EditorialSection
                title="Faculty Board"
                accent="#A8D5BA"
                members={displayData.facultyMembers}
                onSelect={openProfile}
              />
            )}

            {/* LEVEL 2 — Executive Committee: editorial large portraits */}
            {displayData.coreTeam.length > 0 && (
              <EditorialSection
                title="Executive Committee"
                accent="#2E2E2E"
                members={displayData.coreTeam}
                onSelect={openProfile}
              />
            )}

            {/* LEVEL 3 — Member Network: compact grid */}
            {displayData.teamMembers.length > 0 && (
              <MemberGridSection
                title="Member Network"
                members={displayData.teamMembers}
                onSelect={openProfile}
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
      </div>

      {/* ── PROFILE MODAL ─────────────────────────────────────────────────── */}
      {selectedMember && <ProfileModal member={selectedMember.member} opener={selectedMember.opener} onClose={() => setSelectedMember(null)} />}
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
          <Motion.div
            key={m.id}
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07, duration: 0.4, ease: "easeOut" }}
          >
            <EditorialCard member={m} onSelect={onSelect} />
          </Motion.div>
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
  const [focused, setFocused] = useState(false);
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
    <Motion.div
      ref={cardRef}
      style={{ rotateX, rotateY, perspective: 900, transformStyle: "preserve-3d" }}
      whileHover={{ y: -10, boxShadow: "0 24px 60px rgba(0,0,0,0.15)" }}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={e => { if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false); }}
      onMouseMove={onMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={onMouseLeave}
      transition={{ type: "spring", damping: 22, stiffness: 280 }}
      className="cursor-pointer overflow-hidden bg-white border border-gray-100 group"
    >
      {/* Portrait */}
      <div className="aspect-[3/4] relative overflow-hidden bg-gray-900">
        {!imgError && member.image ? (
          <Motion.img
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
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 p-5">
          {/* Animated accent bar */}
          <Motion.div
            className="h-[2px] bg-accent rounded-full mb-3"
            animate={{ width: hovered ? 52 : 20 }}
            transition={{ duration: 0.3 }}
          />
          <h3 className="font-black text-white text-base leading-tight">{member.name}</h3>
          <p className="font-mono text-white/55 text-[10px] uppercase tracking-widest mt-1 line-clamp-1">
            {member.role}
          </p>

          {/* Social links */}
          <Motion.div
            className="flex gap-2 mt-3"
            animate={{ opacity: hovered || focused ? 1 : 0, y: hovered || focused ? 0 : 8 }}
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
                  className={`${hovered || focused ? "pointer-events-auto" : "pointer-events-none"} w-7 h-7 bg-white/15 hover:bg-accent flex items-center justify-center rounded-full transition-colors text-white text-xs`}
                >
                  {createElement(Icon, { "aria-hidden": true })}
                </a>
              ))}
          </Motion.div>
        </div>

        {/* "View Profile" chip */}
        <Motion.div
          className="absolute top-4 right-4 bg-black/40 backdrop-blur-sm px-2 py-1 font-mono text-[9px] text-white/70 uppercase tracking-widest"
          animate={{ opacity: hovered || focused ? 1 : 0 }}
          transition={{ duration: 0.2 }}
        >
          View Profile
        </Motion.div>
        <a href={`/team/${encodeURIComponent(member.id)}`} aria-haspopup="dialog"
          aria-label={`View profile of ${member.name}`} onClick={(event) => onSelect(event, member)}
          className="absolute inset-0 focus-visible:outline-4 focus-visible:-outline-offset-4 focus-visible:outline-accent" />
      </div>
    </Motion.div>
  );
};


// ─────────────────────────────────────────────────────────────────────────────
// MEMBER GRID SECTION
// ─────────────────────────────────────────────────────────────────────────────
const MemberGridSection = ({ title, members, onSelect }) => (
  <section className="mb-20">
    <SectionHeader title={title} count={members.length} accent="#8A8A8A" />
    <div className="container mx-auto px-6">
      <Motion.div
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
      </Motion.div>
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
    <Motion.a
      variants={{ hidden: { opacity: 0, scale: 0.9 }, visible: { opacity: 1, scale: 1 } }}
      whileHover={{ y: -4, boxShadow: "0 10px 24px rgba(0,0,0,0.08)" }}
      href={`/team/${encodeURIComponent(member.id)}`}
      aria-label={`View profile of ${member.name}`} aria-haspopup="dialog"
      onClick={(event) => onSelect(event, member)}
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
    </Motion.a>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE MODAL — click-to-expand with spring animation
// ─────────────────────────────────────────────────────────────────────────────
function ProfileModal({ member, opener, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    const overflow = document.documentElement.style.overflow;
    dialog.showModal();
    document.documentElement.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.documentElement.style.overflow = overflow;
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [opener]);

  function closeOnBackdrop(event) {
    if (event.target !== ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
  }

  return (
    <dialog ref={ref} aria-label={`Full profile of ${member.name}`} onClick={closeOnBackdrop}
      onCancel={event => { event.preventDefault(); onClose(); }}
      className="m-auto max-h-[90dvh] w-[calc(100%_-_1.5rem)] max-w-[52rem] overflow-auto overscroll-contain bg-white text-text-dark shadow-2xl backdrop:bg-black/60">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-gray-200 bg-white px-5 py-2">
        <span className="font-mono text-xs uppercase tracking-widest">Execom profile</span>
        <button type="button" onClick={onClose} aria-label="Close profile" className="grid h-10 w-10 place-items-center hover:bg-gray-100"><FaTimes /></button>
      </header>
      <ExecomProfilePage memberId={member.id} />
    </dialog>
  );
}
export default TeamPage;
