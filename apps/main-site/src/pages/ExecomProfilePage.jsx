import { createElement, useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { motion as Motion } from "framer-motion";
import {
  FaArrowLeft,
  FaLinkedinIn,
  FaGithub,
  FaTwitter,
  FaShareAlt,
  FaCheck,
} from "react-icons/fa";
import axios from "axios";
import { ProfileSkeleton, PublicErrorState } from "../components/ui/PublicPageState";

// ─────────────────────────────────────────────────────────────────────────────
// EXECOM PROFILE PAGE — /team/:id
// ─────────────────────────────────────────────────────────────────────────────
const ExecomProfilePage = ({ memberId }) => {
  const API_BASE_URL =
    import.meta.env.VITE_API_URL ||
    (import.meta.env.DEV ? "http://localhost:5000" : "");
  if (import.meta.env.PROD && !import.meta.env.VITE_API_URL)
    throw new Error("VITE_API_URL is required in production");

  const params = useParams();
  const id = memberId || params.id;

  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imgError, setImgError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);
  const [showLink, setShowLink] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const fetchMember = async () => {
      try {
        setLoading(true);
        setError(null);
        const { data } = await axios.get(
          `${API_BASE_URL}/api/public/execom/${encodeURIComponent(id)}`, { signal: controller.signal }
        );
        setMember(data.member);
        setImgError(false);
        setCopied(false);
        setShowLink(false);
      } catch (err) {
        if (controller.signal.aborted) return;
        if (err.response?.status === 404) {
          setError("Member not found");
        } else {
          setError("Failed to load profile");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    if (id) fetchMember();
    return () => controller.abort();
  }, [id, retryNonce, API_BASE_URL]);

  const url = new URL(`/team/${encodeURIComponent(id)}`, window.location.origin).href;
  const handleShare = async () => {
    try {
      if (navigator.share) await navigator.share({ title: `${name} — IEDC LBSCEK`, url });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
      }
    } catch (err) {
      if (err.name !== "AbortError") setShowLink(true);
    }
  };

  if (loading) {
    return <ProfileSkeleton compact={Boolean(memberId)} />;
  }

  if (error || !member) {
    return <div className={memberId ? "" : "pt-24"}>
      <PublicErrorState title="Profile unavailable" message={error || "This member could not be found."} onRetry={() => setRetryNonce(value => value + 1)} />
      {!memberId && <div className="pb-12 text-center"><Link to="/team" className="font-semibold underline">Back to team</Link></div>}
    </div>;
  }

  const name = member.user?.name || "Unknown";
  const role = member.roleTitle || "Member";
  const year = member.year || "";
  const image = member.imageUrl || "";
  const membershipId = (member.user?.membershipId || "").toUpperCase();
  const registration = member.user?.registration;
  const department = registration?.department || "";
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");

  const safeHref = (href) =>
    href ? (href.startsWith("http") ? href : `https://${href}`) : null;

  const Heading = memberId ? "h2" : "h1";
  const socials = [
    {
      href: safeHref(member.linkedin),
      Icon: FaLinkedinIn,
      label: "LinkedIn",
      color: "#0A66C2",
    },
    {
      href: safeHref(member.github),
      Icon: FaGithub,
      label: "GitHub",
      color: "#1a1a1a",
    },
    {
      href: safeHref(member.twitter),
      Icon: FaTwitter,
      label: "Twitter",
      color: "#1DA1F2",
    },
  ].filter(({ href }) => href);

  return (
    <div className={memberId ? "bg-white" : "min-h-screen bg-[#F5F5F0]"}>
      {/* ── BACK NAV ── */}
      {!memberId && <section className="pt-32 pb-0 bg-white border-b border-gray-200">
        <div className="container mx-auto px-6 pb-6">
          <Link
            to="/team"
            className="inline-flex items-center text-gray-400 hover:text-text-dark transition-colors font-mono text-xs uppercase tracking-widest group"
          >
            <FaArrowLeft className="mr-2 group-hover:-translate-x-1 transition-transform" />
            Back_to_Team
          </Link>
        </div>
      </section>}

      {/* ── PROFILE ── */}
      <section className={memberId ? "bg-white py-6" : "bg-white pb-16"}>
        <div className="container mx-auto px-6">
          <div className="max-w-5xl mx-auto">
            <div className={memberId ? "grid gap-6 sm:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)]" : "flex flex-col lg:flex-row gap-10 lg:gap-16"}>
              {/* ── Photo column ── */}
              <Motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className={memberId ? "w-full" : "w-full lg:w-[380px] flex-shrink-0"}
              >
                <div className={`relative overflow-hidden bg-gray-900 ${memberId ? "aspect-[2/1] sm:aspect-[3/4]" : "aspect-[3/4]"}`}>
                  {!imgError && image ? (
                    <img
                      src={image}
                      alt={name}
                      className="w-full h-full object-cover object-top"
                      onError={() => setImgError(true)}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-700">
                      <span className="text-[8rem] font-black text-white/8 select-none leading-none">
                        {initials}
                      </span>
                    </div>
                  )}
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                  {/* Year badge */}
                  {year && (
                    <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm px-3 py-1 font-mono text-[10px] text-white uppercase tracking-widest">
                      IEDC // {year}
                    </div>
                  )}
                </div>
              </Motion.div>

              {/* ── Info column ── */}
              <Motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.15, ease: "easeOut" }}
                className="flex-1 pt-2 lg:pt-4"
              >
                {/* Label */}
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-[2px] bg-accent" />
                  <span className="font-mono text-[10px] text-gray-400 uppercase tracking-widest">
                    {year ? `${year} Executive` : "Executive"}
                  </span>
                </div>

                {/* Name */}
                <Heading className={`break-words font-black text-text-dark leading-[0.95] tracking-tighter mb-4 ${memberId ? "text-3xl md:text-4xl" : "text-4xl md:text-5xl lg:text-6xl"}`}>
                  {name.toUpperCase()}
                </Heading>

                {/* Role */}
                <p className="font-mono text-sm text-gray-500 uppercase tracking-widest mb-6">
                  {role}
                </p>

                {/* Details grid */}
                <div className="border-t border-gray-100 pt-6 mb-8">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {membershipId && (
                      <div>
                        <p className="font-mono text-[10px] text-gray-400 uppercase tracking-widest mb-1">
                          Membership ID
                        </p>
                        <p className="text-sm font-bold text-text-dark">
                          {membershipId}
                        </p>
                      </div>
                    )}
                    {department && (
                      <div>
                        <p className="font-mono text-[10px] text-gray-400 uppercase tracking-widest mb-1">
                          Department
                        </p>
                        <p className="text-sm font-bold text-text-dark">
                          {department}
                        </p>
                      </div>
                    )}
                    {year && (
                      <div>
                        <p className="font-mono text-[10px] text-gray-400 uppercase tracking-widest mb-1">
                          Term
                        </p>
                        <p className="text-sm font-bold text-text-dark">
                          {year}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Social profiles */}
                <div className="border-t border-gray-100 pt-6 mb-8">
                  <p className="font-mono text-[10px] text-gray-400 uppercase tracking-widest mb-4">
                    Connect
                  </p>
                  {socials.length > 0 ? (
                    <div className="space-y-3">
                      {socials.map(({ href, Icon, label }) => (
                        <a
                          key={label}
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`${label} profile of ${name}`}
                          className="flex items-center gap-4 p-4 border border-gray-100 hover:border-accent hover:bg-accent/5 group transition-all"
                        >
                          <div className="w-9 h-9 bg-gray-100 text-text-dark flex items-center justify-center rounded-full group-hover:bg-accent group-hover:text-white transition-all text-sm">
                            {createElement(Icon, { "aria-hidden": true })}
                          </div>
                          <span className="text-sm font-semibold text-text-dark">
                            {label}
                          </span>
                          <span className="ml-auto text-accent font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                            →
                          </span>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-600 font-mono text-xs">
                      No social profiles linked yet.
                    </p>
                  )}
                </div>

                {/* Share button */}
                <button
                  onClick={handleShare}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-text-dark font-mono text-xs font-bold uppercase tracking-widest transition-colors"
                >
                  {copied ? (
                    <>
                      <FaCheck className="text-green-500" />
                      Link Copied!
                    </>
                  ) : (
                    <>
                      <FaShareAlt />
                      Share Profile
                    </>
                  )}
                </button>
                {showLink && <input aria-label="Profile link" className="mt-2 w-full border border-gray-300 p-2" readOnly value={url} onFocus={e => e.target.select()} />}
              </Motion.div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ExecomProfilePage;
