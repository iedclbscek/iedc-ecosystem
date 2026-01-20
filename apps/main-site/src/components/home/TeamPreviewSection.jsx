import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FaLinkedinIn, FaTwitter, FaArrowRight } from 'react-icons/fa';
import { getTeamForYear } from '../../data/teamData'; // Ensure this path matches your project structure

const TeamPreviewSection = () => {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  
  // 1. Data Retrieval Strategy
  const currentYear = new Date().getFullYear();
  // Fallback to empty object if getTeamForYear fails or returns null
  const teamData = getTeamForYear(currentYear) || { facultyMembers: [], coreTeam: [] };
  
  const allMembers = [
    ...(teamData.facultyMembers || []),
    ...(teamData.coreTeam || [])
  ];

  // 2. Filter Logic: Nodal Officers + Top Core Leaders (CEO/COO/Leads)
  const displayMembers = [];

  // Priority 1: Nodal Officer
  const nodalOfficer = allMembers.find(m => m.role?.toLowerCase().includes('nodal officer'));
  if (nodalOfficer) displayMembers.push(nodalOfficer);

  // Priority 2: CEOs & Leads
  const leaders = allMembers.filter(m => 
    m.role && (m.role.toLowerCase().includes('ceo') || m.role.toLowerCase().includes('chief'))
  );
  displayMembers.push(...leaders);

  // Limit to 3 or 4 cards max for the preview
  const finalDisplayMembers = displayMembers.slice(0, 4);

  return (
    <section id="team" className="py-32 bg-bg-main border-t border-gray-200">
      <div className="container mx-auto px-6">
        
        {/* Header: Executive Style */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
          <div>
            <span className="text-accent font-mono font-bold tracking-widest text-sm uppercase mb-4 block">
              LEADERSHIP_COUNCIL
            </span>
            <h2 className="text-5xl md:text-6xl font-black text-text-dark tracking-tighter leading-[0.9]">
              VISIONARIES <br />
              <span className="text-gray-400">& EXECUTORS.</span>
            </h2>
          </div>
          
          <div className="hidden md:block">
            <Link 
              to="/team" 
              className="group flex items-center gap-2 font-mono text-sm font-bold text-text-dark border-b-2 border-transparent hover:border-accent transition-all pb-1"
            >
              FULL_ROSTER
              <FaArrowRight className="group-hover:translate-x-1 transition-transform text-accent" />
            </Link>
          </div>
        </div>
        
        {/* Executive Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {finalDisplayMembers.length > 0 ? (
            finalDisplayMembers.map((member, index) => (
              <TeamCard 
                key={member._id || index} 
                member={member} 
                index={index}
                isHovered={hoveredIndex === index}
                setHovered={() => setHoveredIndex(index)}
                clearHover={() => setHoveredIndex(null)}
              />
            ))
          ) : (
            // Fallback State
            <div className="col-span-full py-12 text-center border-2 border-dashed border-gray-200 rounded-xl">
              <p className="font-mono text-gray-400">LEADERSHIP_DATA_UNAVAILABLE</p>
            </div>
          )}
        </div>

        {/* Mobile CTA (only shows on small screens) */}
        <div className="mt-12 text-center md:hidden">
           <Link 
              to="/team" 
              className="inline-block px-8 py-3 bg-text-dark text-white font-mono text-xs font-bold uppercase tracking-widest"
            >
              View Full Team
            </Link>
        </div>
      </div>
    </section>
  );
};

// Sub-component: The "Executive" Card
const TeamCard = ({ member, index, isHovered, setHovered, clearHover }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      viewport={{ once: true }}
      className="group relative h-[400px] w-full cursor-pointer overflow-hidden bg-gray-100"
      onMouseEnter={setHovered}
      onMouseLeave={clearHover}
    >
      {/* 1. Image Layer */}
      <img 
        src={member.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=1a1a1a&color=fff&size=400`}
        alt={member.name}
        className="h-full w-full object-cover transition-transform duration-700 ease-out will-change-transform group-hover:scale-110 grayscale group-hover:grayscale-0"
        onError={(e) => {
          e.target.onerror = null;
          e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=1a1a1a&color=fff&size=400`;
        }}
      />

      {/* 2. Gradient Overlay (Always visible but stronger at bottom) */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 transition-opacity duration-300 group-hover:opacity-90"></div>

      {/* 3. Text Content (Bottom Aligned) */}
      <div className="absolute bottom-0 left-0 w-full p-6 translate-y-2 transform transition-transform duration-300 group-hover:translate-y-0">
        
        {/* Role Tag */}
        <div className="mb-2 flex items-center gap-2">
          <div className="h-[1px] w-4 bg-accent"></div>
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-accent">
            {member.role || 'CORE MEMBER'}
          </span>
        </div>

        {/* Name */}
        <h3 className="text-2xl font-bold text-white mb-4 leading-tight">
          {member.name}
        </h3>

        {/* Hidden Socials - Slide Up on Hover */}
        <div className="h-0 overflow-hidden opacity-0 transition-all duration-300 group-hover:h-10 group-hover:opacity-100">
          <div className="flex gap-4">
            <a href="#" className="text-gray-400 hover:text-white transition-colors">
              <FaLinkedinIn />
            </a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors">
              <FaTwitter />
            </a>
          </div>
        </div>
      </div>

      {/* 4. Top Right Corner Accent */}
      <div className="absolute top-0 right-0 p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <FaArrowRight className="text-white -rotate-45" />
      </div>
    </motion.div>
  );
};

export default TeamPreviewSection;