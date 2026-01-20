import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Search, 
  Terminal, 
  ArrowRight, 
  Network,
  Cpu 
} from 'lucide-react';
import { communities } from '../data/communitiesData'; // Make sure path is correct

const CommunitiesPage = () => {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter logic
  const filteredCommunities = communities.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Stagger animation
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  return (
    <div className="min-h-screen bg-bg-main">
      
      {/* --- HERO SECTION --- */}
      <section className="pt-32 pb-12 bg-white border-b border-gray-200">
        <div className="container mx-auto px-6">
          <Link to="/" className="inline-flex items-center text-gray-400 hover:text-text-dark mb-8 transition-colors font-mono text-xs uppercase tracking-widest group">
            <ArrowLeft className="mr-2 w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Abort_To_Home
          </Link>
          
          <div className="max-w-4xl">
            <motion.span 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-accent font-mono font-bold tracking-widest text-sm uppercase mb-4 flex items-center gap-2"
            >
              <Network className="w-4 h-4" />
              04 // NEXUS_ARCHITECTURE
            </motion.span>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl md:text-7xl font-black text-text-dark tracking-tighter leading-[0.9] mb-6"
            >
              DOMAIN <br />
              <span className="text-gray-300">CLUSTERS.</span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-xl text-text-light max-w-2xl border-l-4 border-text-dark pl-6"
            >
              Specialized verticals designed to accelerate domain-specific startups. 
              Plug into a cluster to access mentorship, resources, and peer networks.
            </motion.p>
          </div>
        </div>
      </section>

      {/* --- DASHBOARD CONTROLS --- */}
      <section className="sticky top-20 z-30 bg-bg-main/95 backdrop-blur-md border-b border-gray-200 py-4 shadow-sm">
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          
          {/* Status Indicators */}
          <div className="flex items-center gap-6 text-xs font-mono font-bold uppercase text-gray-500 w-full md:w-auto">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              System_Online
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-text-dark">{filteredCommunities.length}</span>
              Active_Nodes
            </div>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-96 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-accent transition-colors" />
            <input 
              type="text" 
              placeholder="Search protocols (e.g. AI, Web, IoT)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-gray-200 pl-10 pr-4 py-2 text-sm font-medium focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all placeholder:text-gray-300 font-mono"
            />
          </div>
        </div>
      </section>

      {/* --- GRID SYSTEM --- */}
      <section className="py-20 bg-bg-secondary/30 min-h-[60vh]">
        <div className="container mx-auto px-6">
          
          {filteredCommunities.length > 0 ? (
            <motion.div 
              variants={container}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              {filteredCommunities.map((community, index) => (
                <NexusCard 
                  key={community.id} 
                  community={community} 
                  index={index} 
                />
              ))}
            </motion.div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-gray-300 text-center">
              <Terminal className="text-4xl text-gray-300 mb-4 w-12 h-12" />
              <h3 className="text-xl font-bold text-text-dark uppercase mb-2">Signal Lost</h3>
              <p className="text-gray-400 font-mono text-sm">
                No clusters found matching query "{searchQuery}"
              </p>
              <button 
                onClick={() => setSearchQuery("")}
                className="mt-6 text-accent font-bold hover:underline"
              >
                Reset_Parameters
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

// --- SUB-COMPONENT: The "Module" Card ---
const NexusCard = ({ community, index }) => {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
      }}
      className="group relative h-full"
    >
      <Link to={community.path} className="block h-full">
        <div className="bg-white border-2 border-gray-200 h-full flex flex-col p-6 transition-all duration-300 hover:border-text-dark hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1">
          
          {/* 1. Header Protocol */}
          <div className="flex justify-between items-start mb-6 border-b border-gray-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-500 group-hover:bg-accent group-hover:text-white group-hover:border-accent transition-colors duration-300">
                {/* Fallback to generic icon if not found */}
                {community.icon || <Cpu className="w-6 h-6" />}
              </div>
              <div className="flex flex-col">
                <span className="font-mono text-[10px] text-gray-400 uppercase tracking-wider">
                  Node_ID
                </span>
                <span className="font-bold text-text-dark leading-none">
                  NEX-{String(index + 1).padStart(2, '0')}
                </span>
              </div>
            </div>
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          </div>

          {/* 2. Content Body */}
          <div className="flex-grow">
            <h3 className="text-2xl font-black text-text-dark uppercase mb-3 leading-tight group-hover:text-accent transition-colors">
              {community.name}
            </h3>
            <p className="text-text-light text-sm leading-relaxed mb-6">
              {community.description}
            </p>
          </div>

          {/* 3. Action Footer */}
          <div className="mt-auto pt-4 flex justify-between items-center border-t border-gray-100 group-hover:border-gray-200 transition-colors">
            <div className="flex items-center gap-2">
              <Terminal className="w-3 h-3 text-gray-400" />
              <span className="font-mono text-[10px] font-bold text-gray-500 uppercase group-hover:text-text-dark">
                /root/access
              </span>
            </div>
            <span className="text-xs font-black uppercase tracking-widest text-text-dark flex items-center gap-2 group-hover:gap-3 transition-all">
              Initialize
              <ArrowRight className="w-3 h-3 text-accent" />
            </span>
          </div>

        </div>
      </Link>
    </motion.div>
  );
};

export default CommunitiesPage;