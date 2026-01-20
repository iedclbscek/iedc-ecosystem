import { motion } from 'framer-motion';

const AboutSection = () => {
  // Stagger animation for the values grid
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <section id="about" className="py-32 bg-white border-t border-gray-200">
      <div className="container mx-auto px-6">
        
        {/* Section Header: Left Aligned & Structural */}
        <div className="flex flex-col lg:flex-row justify-between items-end mb-20 gap-8">
          <div className="max-w-2xl">
            <span className="text-accent font-mono font-bold tracking-widest text-sm uppercase mb-4 block">
              02 // CORE_MISSION
            </span>
            <h2 className="text-5xl md:text-6xl font-black text-text-dark tracking-tighter leading-none">
              WE ARE THE <br />
              <span className="text-gray-300">ENGINE ROOM.</span>
            </h2>
          </div>
          <div className="hidden lg:block h-[2px] flex-grow bg-gray-100 mx-12 mb-4"></div>
          <p className="text-text-light font-mono text-sm uppercase tracking-tighter text-right">
            LBSCEK KASARAGOD<br />CHAPTER // 2024-25
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-12">
          
          {/* Left: Image with Brutalist Frame */}
          <div className="lg:col-span-5 relative">
            <div className="relative z-10 border-[12px] border-text-dark overflow-hidden group">
              <img 
                src="/img/IMG_3351.JPG" 
                alt="IEDC Overview" 
                className="w-full h-[500px] object-cover grayscale hover:grayscale-0 transition-all duration-700 scale-110 group-hover:scale-100"
              />
              {/* Overlay Label */}
              <div className="absolute bottom-0 left-0 bg-text-dark text-white px-4 py-2 font-mono text-xs">
                DATA_VISUAL_01.RAW
              </div>
            </div>
            {/* The "Ghost" Frame */}
            <div className="absolute top-8 left-8 w-full h-full border border-accent -z-10 hidden md:block"></div>
          </div>

          {/* Right: Content with Industrial Hierarchy */}
          <div className="lg:col-span-7 flex flex-col justify-center space-y-12">
            
            <div className="grid md:grid-cols-2 gap-12">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-[2px] bg-accent"></div>
                  <h3 className="text-xl font-black text-text-dark uppercase tracking-tight">Mission Statement</h3>
                </div>
                <p className="text-text-light leading-relaxed border-l border-gray-100 pl-6">
                  To provide the raw resources and elite mentorship required to transform 
                  untested academic theories into scalable, market-ready ventures.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-[2px] bg-accent"></div>
                  <h3 className="text-xl font-black text-text-dark uppercase tracking-tight">The Vision</h3>
                </div>
                <p className="text-text-light leading-relaxed border-l border-gray-100 pl-6">
                  Establishing LBSCEK as the primary terminal for technical innovation in North Kerala, 
                  fostering a culture where "Building" is the default setting.
                </p>
              </div>
            </div>

            {/* Core Values: The "Terminal" Grid */}
            <div className="pt-8 border-t border-gray-100">
              <h4 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-[0.3em] mb-8">
                System_Operational_Values
              </h4>
              <motion.div 
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="grid grid-cols-2 md:grid-cols-3 gap-0"
              >
                {["Innovation", "Collaboration", "Excellence", "Integrity", "Impact", "Growth"].map((value) => (
                  <motion.div 
                    key={value}
                    variants={itemVariants}
                    className="border border-gray-100 p-6 group hover:bg-text-dark transition-colors duration-300"
                  >
                    <span className="block text-gray-300 font-mono text-xs mb-2 group-hover:text-accent">
                      // {value.toUpperCase().substring(0, 3)}
                    </span>
                    <p className="text-text-dark font-black uppercase tracking-tighter group-hover:text-white">
                      {value}
                    </p>
                  </motion.div>
                ))}
              </motion.div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;