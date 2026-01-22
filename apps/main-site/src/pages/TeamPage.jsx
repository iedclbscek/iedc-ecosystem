import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FaArrowLeft, FaSearch, FaLinkedinIn, FaGithub, FaTwitter } from "react-icons/fa";
import axios from "axios";

const TeamPage = () => {
  // State Management
  const [availableYears, setAvailableYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null); // Initially null until years are fetched
  
  const [displayData, setDisplayData] = useState({ facultyMembers: [], coreTeam: [], teamMembers: [] });
  const [rawData, setRawData] = useState([]); // Store raw members list for local search
  
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [isYearsLoading, setIsYearsLoading] = useState(true);

  // 1. Fetch Available Years (First Step)
  useEffect(() => {
    const fetchYears = async () => {
      try {
        setIsYearsLoading(true);
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/public/execom/years`);
        
        // Handle response formats: ["2024", "2023"] or { years: [...] } or { data: [...] }
        let years = [];
        if (Array.isArray(response.data)) {
          years = response.data;
        } else if (response.data.years && Array.isArray(response.data.years)) {
          years = response.data.years;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          years = response.data.data;
        }

        // Sort descending (newest first)
        // Convert to string to ensure consistency in comparison
        const sortedYears = years.map(String).sort((a, b) => b.localeCompare(a));
        
        setAvailableYears(sortedYears);

        // Set default selected year to the most recent one
        if (sortedYears.length > 0) {
          setSelectedYear(sortedYears[0]);
        } else {
          // Fallback if no years found (e.g., current year)
          const current = new Date().getFullYear().toString();
          setAvailableYears([current]);
          setSelectedYear(current);
        }

      } catch (error) {
        console.error("Error fetching available years:", error);
        // Fallback to current year on error to prevent crash
        const current = new Date().getFullYear().toString();
        setAvailableYears([current]);
        setSelectedYear(current);
      } finally {
        setIsYearsLoading(false);
      }
    };

    fetchYears();
  }, []);

  // 2. Fetch Team Data Year-Wise (Runs when selectedYear changes)
  useEffect(() => {
    if (!selectedYear) return;

    const fetchYearData = async () => {
      try {
        setLoading(true);
        
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/public/execom`, {
          params: { year: selectedYear }
        });
        
        // Handle API structure: { years: [{ year: "2024", members: [...] }] }
        // The API might return an array of years, or a specific year object depending on implementation.
        // We look for the matching year object.
        const yearData = (response.data.years || []).find(y => y.year === selectedYear.toString()) || 
                         (response.data.years?.[0]) || // Fallback to first item if structure differs
                         { members: [] };

        const membersList = yearData.members || [];
        
        // Transform API data to UI format
        const formattedMembers = membersList.map(m => {
          const rawName = m.user?.name || m.name || "Unknown";
          const imageUrl = m.imageUrl || m.user?.image;
          const linkedin = m.linkedin || m.user?.linkedin;
          const github = m.github || m.user?.github;
          const twitter = m.twitter || m.user?.twitter;
          return {
            id: m.id || m._id,
            name: typeof rawName === "string" ? rawName.toUpperCase() : String(rawName).toUpperCase(),
            role: m.roleTitle || m.role || "Member",
            image: imageUrl, 
            linkedin,
            github,
            twitter
          };
        });

        setRawData(formattedMembers);
        processMembers(formattedMembers, searchQuery); // Process initial view

      } catch (error) {
        console.error(`Error fetching data for year ${selectedYear}:`, error);
        setRawData([]);
        setDisplayData({ facultyMembers: [], coreTeam: [], teamMembers: [] });
      } finally {
        setLoading(false);
      }
    };

    fetchYearData();
  }, [selectedYear]);

  // 3. Handle Search (Client-side filtering)
  useEffect(() => {
    if (rawData.length > 0) {
      processMembers(rawData, searchQuery);
    }
  }, [searchQuery, rawData]);

  // Helper: Categorize members
  const processMembers = (members, query) => {
    const lowerQuery = query.toLowerCase().trim();
    
    const filtered = members.filter(m => 
      m.name.toLowerCase().includes(lowerQuery) || 
      m.role.toLowerCase().includes(lowerQuery)
    );

    const categorized = {
      facultyMembers: [],
      coreTeam: [],
      teamMembers: []
    };

    filtered.forEach(member => {
      const role = member.role.toLowerCase();
      
      if (role.includes("nodal officer") || role.includes("faculty") || role.includes("advisor") || role.includes("mentor") || role.includes("principal")) {
        categorized.facultyMembers.push(member);
      } else if (
        role.includes("ceo") || 
        role.includes("cto") || 
        role.includes("coo") || 
        role.includes("cfo") || 
        role.includes("cmo") || 
        role.includes("lead") || 
        role.includes("head") || 
        role.includes("chief") || 
        role.includes("chair") ||
        role.includes("coordinator")
      ) {
        categorized.coreTeam.push(member);
      } else {
        categorized.teamMembers.push(member);
      }
    });

    setDisplayData(categorized);
  };

  // Animation Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  return (
    <div className="min-h-screen bg-bg-main">
      
      {/* --- HERO --- */}
      <section className="pt-32 pb-12 bg-white border-b border-gray-200">
        <div className="container mx-auto px-6">
          <Link
            to="/"
            className="inline-flex items-center text-gray-400 hover:text-text-dark mb-8 transition-colors font-mono text-xs uppercase tracking-widest"
          >
            <FaArrowLeft className="mr-2" />
            Return_Home
          </Link>
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <motion.span 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-accent font-mono font-bold tracking-widest text-sm uppercase mb-4 block"
              >
                06 // PERSONNEL_DATABASE
              </motion.span>
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-5xl md:text-7xl font-black text-text-dark tracking-tighter leading-[0.9]"
              >
                LEADERSHIP <br />
                <span className="text-gray-300">ROSTER.</span>
              </motion.h1>
            </div>
          </div>
        </div>
      </section>

      {/* --- CONTROLS --- */}
      <section className="sticky top-20 z-30 bg-bg-main/95 backdrop-blur-md border-b border-gray-200 py-4 shadow-sm">
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          
          {/* Year Selector */}
          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 no-scrollbar">
            <span className="font-mono text-xs font-bold text-gray-400 mr-2 whitespace-nowrap">FISCAL_YEAR:</span>
            
            {isYearsLoading ? (
              <div className="h-8 w-24 bg-gray-100 animate-pulse rounded"></div>
            ) : (
              availableYears.map((year) => (
                <button
                  key={year}
                  onClick={() => setSelectedYear(year)}
                  className={`
                    px-4 py-2 font-mono text-xs font-bold transition-all border whitespace-nowrap
                    ${selectedYear === year
                      ? "bg-text-dark text-white border-text-dark"
                      : "bg-white text-gray-500 border-gray-200 hover:border-text-dark hover:text-text-dark"}
                  `}
                >
                  {year}
                </button>
              ))
            )}
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-80 group">
            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-accent transition-colors" />
            <input 
              type="text" 
              placeholder="Search loaded records..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-gray-200 pl-10 pr-4 py-2 text-sm font-medium focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all placeholder:text-gray-300"
            />
          </div>
        </div>
      </section>

      {/* --- CONTENT AREA --- */}
      <section className="py-20 min-h-[50vh]">
        <div className="container mx-auto px-6">
          
          {loading ? (
             <div className="flex items-center justify-center h-64">
               <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full"></div>
             </div>
          ) : (
            <>
              {/* 1. Faculty Section */}
              {displayData.facultyMembers?.length > 0 && (
                <div className="mb-24">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-2 h-8 bg-accent"></div>
                    <h2 className="text-3xl font-black text-text-dark uppercase tracking-tight">Faculty Board</h2>
                  </div>
                  <motion.div 
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
                  >
                    {displayData.facultyMembers.map((member) => (
                      <DirectoryCard key={member.id} member={member} />
                    ))}
                  </motion.div>
                </div>
              )}

              {/* 2. Core Team Section */}
              {displayData.coreTeam?.length > 0 && (
                <div className="mb-24">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-2 h-8 bg-text-dark"></div>
                    <h2 className="text-3xl font-black text-text-dark uppercase tracking-tight">Executive Committee</h2>
                  </div>
                  <motion.div 
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
                  >
                    {displayData.coreTeam.map((member) => (
                      <DirectoryCard key={member.id} member={member} />
                    ))}
                  </motion.div>
                </div>
              )}

              {/* 3. General Members Section */}
              {displayData.teamMembers?.length > 0 && (
                <div className="mb-24">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-2 h-8 bg-gray-300"></div>
                    <h2 className="text-3xl font-black text-text-dark uppercase tracking-tight">Member Network</h2>
                  </div>
                  <motion.div 
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4"
                  >
                    {displayData.teamMembers.map((member) => (
                      <CompactMemberCard key={member.id} member={member} />
                    ))}
                  </motion.div>
                </div>
              )}

              {/* Empty State */}
              {!displayData.facultyMembers?.length && 
               !displayData.coreTeam?.length && 
               !displayData.teamMembers?.length && (
                <div className="text-center py-20 border-2 border-dashed border-gray-200">
                  <p className="text-gray-400 font-mono mb-2">
                    {rawData.length === 0 
                      ? `NO_DATA_AVAILABLE_FOR_YEAR_${selectedYear}` 
                      : "NO_MATCHING_RECORDS_FOUND"
                    }
                  </p>
                  {rawData.length > 0 && (
                    <button 
                      onClick={() => setSearchQuery("")}
                      className="text-accent hover:underline font-bold text-sm"
                    >
                      Reset Search
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
};

// --- SUB-COMPONENTS ---

const DirectoryCard = ({ member }) => {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
      }}
      className="group relative h-[380px] bg-white border border-gray-200 hover:border-text-dark transition-all duration-300 overflow-hidden flex flex-col"
    >
      <div className="relative h-[75%] overflow-hidden bg-gray-100">
        <img 
          src={member.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=1a1a1a&color=fff`}
          alt={member.name}
          className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
          onError={(e) => {
             e.target.onerror = null;
             e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=1a1a1a&color=fff`;
          }}
        />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-4 backdrop-blur-sm">
           {member.linkedin && <SocialIcon href={member.linkedin} icon={<FaLinkedinIn />} />}
           {member.github && <SocialIcon href={member.github} icon={<FaGithub />} />}
           {member.twitter && <SocialIcon href={member.twitter} icon={<FaTwitter />} />}
        </div>
      </div>
      <div className="flex-grow p-5 bg-white relative z-10 flex flex-col justify-center border-t border-gray-100">
        <h3 className="text-lg font-bold text-text-dark leading-tight group-hover:text-accent transition-colors">
          {member.name}
        </h3>
        <p className="font-mono text-xs text-gray-500 uppercase mt-1 truncate">
          {member.role}
        </p>
      </div>
    </motion.div>
  );
};

const CompactMemberCard = ({ member }) => {
  return (
    <motion.div
       variants={{
        hidden: { opacity: 0, scale: 0.9 },
        visible: { opacity: 1, scale: 1 }
      }}
      className="group bg-white p-4 border border-gray-200 hover:border-accent/50 hover:shadow-lg transition-all duration-300 text-center"
    >
      <div className="w-16 h-16 mx-auto rounded-full overflow-hidden mb-3 bg-gray-100 ring-2 ring-gray-100 group-hover:ring-accent transition-all">
         <img 
            src={member.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=random`}
            alt={member.name}
            className="w-full h-full object-cover"
         />
      </div>
      <h4 className="font-bold text-sm text-text-dark truncate">{member.name}</h4>
      <p className="text-[10px] text-gray-400 font-mono uppercase truncate">{member.role}</p>
    </motion.div>
  );
};

const SocialIcon = ({ href, icon }) => {
  if (!href) return null;
  return (
    <a 
      href={href} 
      target="_blank" 
      rel="noopener noreferrer"
      className="w-8 h-8 bg-white text-text-dark rounded-full flex items-center justify-center hover:bg-accent hover:text-white transition-all hover:-translate-y-1"
    >
      {icon}
    </a>
  );
};

export default TeamPage;