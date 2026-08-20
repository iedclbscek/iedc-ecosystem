import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FaArrowLeft,
  FaLinkedinIn,
  FaGithub,
  FaTwitter,
  FaShareAlt,
  FaCheck,
} from "react-icons/fa";
import axios from "axios";

// ─────────────────────────────────────────────────────────────────────────────
// EXECOM PROFILE PAGE — /team/:id
// ─────────────────────────────────────────────────────────────────────────────
const ExecomProfilePage = () => {
  const API_BASE_URL =
    import.meta.env.VITE_API_URL ||
    (import.meta.env.DEV ? "http://localhost:5000" : "");
  if (import.meta.env.PROD && !import.meta.env.VITE_API_URL)
    throw new Error("VITE_API_URL is required in production");

  const { id } = useParams();
  const navigate = useNavigate();

  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imgError, setImgError] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchMember = async () => {
      try {
        setLoading(true);
        setError(null);
        const { data } = await axios.get(
          `${API_BASE_URL}/api/public/execom/${id}`
        );
        setMember(data.member);
      } catch (err) {
        if (err.response?.status === 404) {
          setError("Member not found");
        } else {
          setError("Failed to load profile");
        }
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchMember();
  }, [id]);

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${name} — IEDC LBSCEK`, url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F0] flex flex-col items-center justify-center gap-4">
        <div className="animate-spin w-10 h-10 border-[3px] border-accent border-t-transparent rounded-full" />
        <p className="font-mono text-xs text-gray-400 uppercase tracking-widest">
          Loading Profile...
        </p>
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="min-h-screen bg-[#F5F5F0] flex flex-col items-center justify-center px-6">
        <div className="max-w-md w-full text-center p-10 border-2 border-dashed border-gray-300 bg-white/50 backdrop-blur-sm">
          <div className="w-16 h-16 bg-gray-50 border border-gray-200 flex items-center justify-center mx-auto mb-6 text-2xl text-gray-300">
            ?
          </div>
          <span className="font-mono text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">
            ERROR_CODE: 404_NOT_FOUND
          </span>
          <h1 className="text-3xl font-black text-text-dark mb-4 uppercase tracking-tighter">
            {error || "Profile Not Found"}
          </h1>
          <p className="text-text-light mb-8 font-medium leading-relaxed">
            This execom profile doesn't exist or has been removed.
          </p>
          <Link
            to="/team"
            className="inline-flex items-center gap-2 px-8 py-3 bg-text-dark text-white font-mono text-xs font-bold uppercase tracking-widest hover:bg-accent transition-colors"
          >
            <FaArrowLeft className="w-3 h-3" />
            Back to Team
          </Link>
        </div>
      </div>
    );
  }

  const name = member.user?.name || "Unknown";
  const role = member.roleTitle || "Member";
  const year = member.year || "";
  const image = member.imageUrl || "";
  const membershipId = (member.user?.membershipId || "").toUpperCase();
  const registration = member.user?.registration;
  const department = registration?.department || "";
  const semester = registration?.semester || "";
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");

  const safeHref = (href) =>
    href ? (href.startsWith("http") ? href : `https://${href}`) : null;

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
    <div className="min-h-screen bg-[#F5F5F0]">
      {/* ── BACK NAV ── */}
      <section className="pt-32 pb-0 bg-white border-b border-gray-200">
        <div className="container mx-auto px-6 pb-6">
          <Link
            to="/team"
            className="inline-flex items-center text-gray-400 hover:text-text-dark transition-colors font-mono text-xs uppercase tracking-widest group"
          >
            <FaArrowLeft className="mr-2 group-hover:-translate-x-1 transition-transform" />
            Back_to_Team
          </Link>
        </div>
      </section>

      {/* ── PROFILE ── */}
      <section className="bg-white pb-16">
        <div className="container mx-auto px-6">
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col lg:flex-row gap-10 lg:gap-16">
              {/* ── Photo column ── */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="w-full lg:w-[380px] flex-shrink-0"
              >
                <div className="aspect-[3/4] relative overflow-hidden bg-gray-900">
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
              </motion.div>

              {/* ── Info column ── */}
              <motion.div
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
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-text-dark leading-[0.95] tracking-tighter mb-4">
                  {name.toUpperCase()}
                </h1>

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
                    {semester && (
                      <div>
                        <p className="font-mono text-[10px] text-gray-400 uppercase tracking-widest mb-1">
                          Semester
                        </p>
                        <p className="text-sm font-bold text-text-dark">
                          {semester}
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
                            <Icon aria-hidden="true" />
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
                    <p className="text-gray-300 font-mono text-xs">
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
              </motion.div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ExecomProfilePage;
