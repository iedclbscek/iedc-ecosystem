import { motion } from 'framer-motion';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Linkedin, 
  Github, 
  ExternalLink, 
  Instagram, 
  Globe, 
  Mail, 
  Cpu,
  Trophy,
  Users,
  Terminal,
  Network
} from 'lucide-react';

// FIX: Import the 'communityData' object directly
import { communityData } from '../data/communitiesData'; 

import CommunitySection from '../components/community/CommunitySection';
// import CommunityGallery from '../components/community/CommunityGallery';
import { getSectionConfig } from '../utils/communityConfig';

const CommunityPage = () => {
  const { id } = useParams();
  
  // FIX: Access object by key
  const community = communityData[id] || {
    name: "UNKNOWN_PROTOCOL",
    description: "Signal lost. The requested cluster could not be located.",
    icon: <Terminal className="w-12 h-12" />, 
    longDescription: "Please return to the Nexus to re-initialize connection.",
    activities: [],
    achievements: [],
    contact: { email: "", coordinator: "" },
    execomTeam: []
  };

  // Get dynamic sections configuration
  const sections = getSectionConfig(community);

  // Animation Variants
  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  return (
    <div className="min-h-screen bg-bg-main font-sans">
      
      {/* --- HERO: System Header --- */}
      <section className="pt-32 pb-12 bg-white border-b border-gray-200 relative overflow-hidden">
        {/* Background Grid */}
        <div className="absolute inset-0 opacity-[0.03] [background-image:linear-gradient(to_right,#000_1px,transparent_1px),linear-gradient(to_bottom,#000_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none"></div>

        <div className="container mx-auto px-6 relative z-10">
          <Link 
            to="/nexus" 
            className="inline-flex items-center text-gray-400 hover:text-text-dark mb-8 transition-colors font-mono text-xs uppercase tracking-widest group"
          >
            <ArrowLeft className="mr-2 w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Abort_To_Nexus
          </Link>
          
          <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
            {/* Icon Block */}
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-24 h-24 bg-bg-secondary border-2 border-gray-200 flex items-center justify-center text-text-dark shadow-sm"
            >
              <div className="text-accent w-10 h-10">
                {community.icon || <Cpu className="w-full h-full" />}
              </div>
            </motion.div>

            <div className="flex-1">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="flex items-center gap-3 mb-2"
              >
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="font-mono text-xs font-bold text-gray-400 uppercase tracking-widest">
                  System_Online
                </span>
              </motion.div>
              
              <motion.h1 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-4xl md:text-6xl font-black text-text-dark tracking-tighter uppercase leading-none mb-4"
              >
                {community.name}
              </motion.h1>
              
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-lg text-text-light max-w-2xl leading-relaxed"
              >
                {community.description}
              </motion.p>
            </div>
          </div>
        </div>
      </section>

      {/* --- MAIN DASHBOARD LAYOUT --- */}
      <div className="container mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-12 gap-12">
          
          {/* LEFT COLUMN: Main Content (8 cols) */}
          <div className="lg:col-span-8 space-y-12">
            
            {/* Dynamic Sections */}
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeInUp}
              className="bg-white border border-gray-200 p-8 shadow-sm"
            >
              {sections.map((section, index) => (
                <div key={index} className="mb-10 last:mb-0">
                  <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-2">
                    <Terminal className="w-5 h-5 text-accent" />
                    <h3 className="text-xl font-bold text-text-dark uppercase tracking-tight">
                      {section.title}
                    </h3>
                  </div>
                  <div className="prose prose-gray max-w-none text-text-light">
                    <CommunitySection
                      title="" 
                      content={section.content}
                      type={section.type}
                    />
                  </div>
                </div>
              ))}
            </motion.div>

            {/* Achievements Module */}
            {community.achievements && community.achievements.length > 0 && (
              <motion.div 
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeInUp}
                className="bg-bg-secondary/30 border border-gray-200 p-8"
              >
                <div className="flex items-center gap-3 mb-6">
                  <Trophy className="w-5 h-5 text-yellow-600" />
                  <h2 className="text-xl font-bold text-text-dark uppercase tracking-tight">
                    System_Benchmarks
                  </h2>
                </div>
                <div className="grid gap-4">
                  {community.achievements.map((achievement, index) => (
                    <div key={index} className="flex items-start gap-4 p-4 bg-white border border-gray-200 hover:border-accent transition-colors">
                      <div className="font-mono text-xs text-gray-400 mt-1">
                        LOG_{String(index + 1).padStart(2, '0')}
                      </div>
                      <p className="text-text-dark font-medium">{achievement}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Gallery Module */}
            {community.galleryImages && (
              <motion.div 
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeInUp}
              >
                <div className="flex items-center gap-3 mb-6">
                  <Network className="w-5 h-5 text-accent" />
                  <h2 className="text-xl font-bold text-text-dark uppercase tracking-tight">
                    Visual_Records
                  </h2>
                </div>
                <CommunityGallery galleryImages={community.galleryImages} />
              </motion.div>
            )}
          </div>

          {/* RIGHT COLUMN: Sidebar (4 cols) */}
          <div className="lg:col-span-4 space-y-8">
            
            {/* 1. Command Unit (Execom) */}
            {community.execomTeam && community.execomTeam.length > 0 && (
              <motion.div 
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeInUp}
                className="bg-white border border-gray-200 p-6"
              >
                <div className="flex items-center gap-3 mb-6">
                  <Users className="w-5 h-5 text-text-dark" />
                  <h2 className="text-sm font-bold text-text-dark uppercase tracking-widest">
                    Command_Unit
                  </h2>
                </div>
                
                <div className="space-y-4">
                  {community.execomTeam.map((member, index) => (
                    <div key={index} className="group flex items-center gap-4 p-3 border border-gray-100 hover:border-text-dark hover:bg-gray-50 transition-all">
                      <div className="w-12 h-12 bg-gray-200 overflow-hidden border border-gray-300">
                        <img
                          src={member.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=1a1a1a&color=fff`}
                          alt={member.name}
                          className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-text-dark text-sm truncate">{member.name}</h4>
                        <p className="font-mono text-[10px] text-accent uppercase tracking-wider">{member.role}</p>
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         {member.linkedin && <a href={member.linkedin} target="_blank" className="text-gray-400 hover:text-blue-600"><Linkedin className="w-4 h-4" /></a>}
                         {member.github && <a href={member.github} target="_blank" className="text-gray-400 hover:text-black"><Github className="w-4 h-4" /></a>}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* 2. Contact Uplink */}
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeInUp}
              className="bg-text-dark text-white p-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <Mail className="w-5 h-5 text-accent" />
                <h2 className="text-sm font-bold text-white uppercase tracking-widest">
                  Secure_Uplink
                </h2>
              </div>

              <div className="space-y-4 font-mono text-sm">
                <div className="border-b border-white/20 pb-2">
                  <span className="text-gray-500 block text-[10px] uppercase">Coordinator</span>
                  <span className="text-white">
                    {community.contact?.coordinator || community.execomTeam?.[0]?.name || "N/A"}
                  </span>
                </div>
                
                {community.contact?.email && (
                  <div>
                    <span className="text-gray-500 block text-[10px] uppercase">Signal Frequency</span>
                    <a href={`mailto:${community.contact.email}`} className="text-accent hover:text-white transition-colors break-all">
                      {community.contact.email}
                    </a>
                  </div>
                )}
              </div>
            </motion.div>

            {/* 3. Socials */}
            {community.socialMedia && (
               <motion.div 
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeInUp}
                className="bg-white border border-gray-200 p-6"
              >
                <div className="flex items-center gap-3 mb-6">
                  <Globe className="w-5 h-5 text-gray-400" />
                  <h2 className="text-sm font-bold text-text-dark uppercase tracking-widest">
                    Network_Protocols
                  </h2>
                </div>
                
                <div className="flex flex-col gap-3">
                  {community.socialMedia.instagram && <SocialLink href={community.socialMedia.instagram} icon={<Instagram className="w-4 h-4" />} label="Instagram" />}
                  {community.socialMedia.linkedin && <SocialLink href={community.socialMedia.linkedin} icon={<Linkedin className="w-4 h-4" />} label="LinkedIn" />}
                  {community.socialMedia.website && <SocialLink href={community.socialMedia.website} icon={<Globe className="w-4 h-4" />} label="Website" />}
                </div>
              </motion.div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

const SocialLink = ({ href, icon, label }) => {
  const finalHref = href.startsWith('http') ? href : `https://${href}`;
  return (
    <a href={finalHref} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 bg-gray-50 hover:bg-text-dark hover:text-white transition-all group border border-gray-100">
      <div className="flex items-center gap-3">{icon}<span className="font-bold text-sm">{label}</span></div>
      <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
    </a>
  );
};

export default CommunityPage;