import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { communities } from '../../data/communitiesData';
import { FaArrowRight, FaCube } from 'react-icons/fa';

const CommunitiesSection = () => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <section id="nexus" className="py-32 bg-white border-b border-gray-200 overflow-hidden">
      <div className="container mx-auto px-6 mb-16">
        
        {/* Industrial Header */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-8">
          <div>
            <span className="text-accent font-mono font-bold tracking-widest text-sm uppercase mb-4 block">
              SYNERGY_HUBS
            </span>
            <h2 className="text-5xl md:text-7xl font-black text-text-dark tracking-tighter leading-[0.9]">
              NEXUS <br />
              <span className="text-gray-300">CLUSTERS.</span>
            </h2>
          </div>
          
          <div className="max-w-md text-right hidden md:block">
            <p className="text-text-light font-medium leading-relaxed">
              Specialized verticles designed to accelerate domain-specific 
              startups. Select your protocol.
            </p>
          </div>
        </div>
      </div>

      {/* The Conveyor Belt (Marquee) */}
      <div className="relative w-full border-y border-gray-200 bg-bg-secondary/30 py-12">
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.05] [background-image:linear-gradient(to_right,#000_1px,transparent_1px),linear-gradient(to_bottom,#000_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none"></div>

        <div 
          className={`marquee-wrapper ${isHovered ? 'paused' : ''} flex`}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div className="marquee-track flex gap-8 pl-8">
            {/* We render the list 3 times to create an infinite loop illusion */}
            {[...communities, ...communities, ...communities].map((community, idx) => (
              <CommunityCard 
                key={`${community.id}-${idx}`} 
                community={community} 
                index={idx} 
              />
            ))}
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="container mx-auto px-6 mt-16 flex justify-center">
        <Link 
          to="/nexus"
          className="group relative px-8 py-4 bg-text-dark text-white font-mono font-bold text-sm uppercase tracking-widest hover:bg-accent transition-colors duration-300"
        >
          <span className="flex items-center gap-3">
             Initialize_All_Protocols
             <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
          </span>
          {/* Hard Shadow Box */}
          <div className="absolute top-2 left-2 w-full h-full border border-text-dark -z-10 group-hover:top-0 group-hover:left-0 transition-all"></div>
        </Link>
      </div>
    </section>
  );
};

// The "Schematic" Card Component
const CommunityCard = ({ community, index }) => {
  return (
    <div className="group relative w-[300px] h-[360px] flex-shrink-0 bg-white border-2 border-gray-200 hover:border-text-dark transition-all duration-300 flex flex-col justify-between p-6 hover:-translate-y-2 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
      
      {/* Top Tech Specs */}
      <div className="flex justify-between items-start mb-6">
        <div className="w-12 h-12 bg-gray-50 border border-gray-200 flex items-center justify-center text-2xl group-hover:bg-accent group-hover:text-white group-hover:border-accent transition-colors duration-300">
          {/* If community.icon is a string/emoji, render it, else render a fallback */}
          {community.icon || <FaCube />}
        </div>
        <span className="font-mono text-[10px] text-gray-400 border border-gray-200 px-2 py-1">
          NEX-{String(index % 6 + 1).padStart(2, '0')}
        </span>
      </div>

      {/* Content */}
      <div className="flex-grow">
        <h3 className="text-2xl font-black text-text-dark uppercase leading-none mb-3 group-hover:text-accent transition-colors">
          {community.name}
        </h3>
        <div className="w-8 h-1 bg-gray-200 mb-4 group-hover:w-full group-hover:bg-accent transition-all duration-500"></div>
        <p className="text-text-light text-sm leading-relaxed line-clamp-3 font-medium">
          {community.description || "A specialized hub for developing high-impact solutions in this domain."}
        </p>
      </div>

      {/* Bottom Status Bar */}
      <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between items-center">
        <div className="flex items-center gap-2">
           <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
           <span className="text-[10px] font-mono font-bold text-gray-500 uppercase">Active</span>
        </div>
        <Link 
          to={community.path || `/nexus/${community.id}`} 
          className="text-xs font-black uppercase tracking-wider text-text-dark group-hover:underline decoration-accent decoration-2 underline-offset-4"
        >
          Access_Hub &gt;
        </Link>
      </div>
    </div>
  );
};

export default CommunitiesSection;