import { motion } from 'framer-motion';
import { 
  BrainCircuit, 
  Cpu, 
  Rocket, 
  Network, 
  ArrowRight, 
  Terminal 
} from 'lucide-react';

const WhatWeDoSection = () => {
  const activities = [
    {
      id: "01",
      title: "Innovation & Ideation",
      description: "A launchpad for refining raw concepts through design thinking frameworks and intensive hackathons.",
      tag: "STRATEGY",
      icon: <BrainCircuit className="w-8 h-8" />
    },
    {
      id: "02",
      title: "Skill Development",
      description: "Technical stacks, business intelligence, and leadership modules designed for the modern entrepreneur.",
      tag: "EXECUTION",
      icon: <Cpu className="w-8 h-8" />
    },
    {
      id: "03",
      title: "Incubation Support",
      description: "Structural guidance for early-stage startups, bridging the gap between prototypes and market entry.",
      tag: "VENTURES",
      icon: <Rocket className="w-8 h-8" />
    },
    {
      id: "04",
      title: "Industry Connections",
      description: "Direct pipelines to industry veterans, investors, and a global network of IEDC alumni.",
      tag: "NETWORKING",
      icon: <Network className="w-8 h-8" />
    }
  ];

  return (
    <section id="what-we-do" className="py-32 bg-bg-main border-b border-gray-200">
      <div className="container mx-auto px-6">
        
        {/* Section Title */}
        <div className="flex flex-col md:flex-row items-baseline gap-6 mb-20">
          <h2 className="text-6xl md:text-7xl font-black text-text-dark tracking-tighter uppercase leading-none">
            OPERATIONS<span className="text-accent">.</span>
          </h2>
          <div className="h-[2px] flex-grow bg-gray-200 hidden md:block"></div>
          <p className="text-text-light font-mono text-xs tracking-widest uppercase flex items-center gap-2">
            <Terminal className="w-4 h-4" />
            [ System_Capabilities_V4 ]
          </p>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-0 border border-gray-200 overflow-hidden bg-white">
          
          {/* Main Visual Block (Large) */}
          <div className="md:col-span-7 border-b md:border-b-0 md:border-r border-gray-200 p-12 relative flex flex-col justify-between group">
            <div className="relative z-10">
              <span className="text-accent font-mono font-bold text-sm mb-4 block">// CORE_HUB</span>
              <h3 className="text-4xl font-black text-text-dark tracking-tighter mb-6 max-w-md">
                WE ENGINEER THE INFRASTRUCTURE FOR SUCCESS.
              </h3>
              <p className="text-text-light max-w-sm mb-8">
                LBSCEK provides more than just space. We provide the technical and 
                entrepreneurial rigorousness required to turn a student into a founder.
              </p>
            </div>
            
            {/* Hard-lined image container */}
            <div className="relative mt-8 grayscale hover:grayscale-0 transition-all duration-500">
              <img 
                src="/img/IMG_3351.JPG" 
                alt="IEDC Activities" 
                className="w-full h-64 object-cover border-2 border-text-dark"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <div className="absolute -top-3 -right-3 w-12 h-12 bg-accent -z-10"></div>
            </div>
          </div>

          {/* Activity Cards (Grid) */}
          <div className="md:col-span-5 grid grid-cols-1 divide-y divide-gray-200">
            {activities.map((activity) => (
              <motion.div
                key={activity.id}
                whileHover={{ backgroundColor: "var(--color-primary-light)" }}
                className="p-8 flex flex-col justify-between group transition-colors relative"
              >
                <div>
                  <div className="flex justify-between items-start mb-6">
                    {/* Icon Container */}
                    <div className="text-text-light group-hover:text-accent transition-colors duration-300">
                      {activity.icon}
                    </div>
                    
                    {/* Tag */}
                    <span className="text-[10px] font-mono font-bold text-gray-400 border border-gray-200 px-2 py-1">
                      {activity.tag}
                    </span>
                  </div>
                  
                  <h4 className="text-xl font-black text-text-dark uppercase tracking-tight mb-3 flex items-center gap-2">
                    {activity.title}
                  </h4>
                  <p className="text-sm text-text-light leading-relaxed">
                    {activity.description}
                  </p>
                </div>
                
                {/* ID Number Watermark */}
                <div className="absolute bottom-4 right-4 text-6xl font-black text-gray-100/50 group-hover:text-accent/10 transition-colors pointer-events-none">
                  {activity.id}
                </div>

                {/* Visual Accent Line */}
                <div className="absolute bottom-0 left-0 w-0 h-[2px] bg-accent group-hover:w-full transition-all duration-500"></div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Bottom CTA bar */}
        <div className="mt-12 flex flex-wrap items-center justify-between gap-6 border-l-4 border-text-dark pl-6">
          <p className="text-text-dark font-bold italic">
            Ready to convert your potential energy into kinetic?
          </p>
          <a href='/register' className="group flex items-center gap-2 px-8 py-3 bg-accent text-white font-black uppercase tracking-widest text-xs hover:bg-text-dark transition-colors">
            Join_Network
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </a>
        </div>
      </div>
    </section>
  );
};

export default WhatWeDoSection;