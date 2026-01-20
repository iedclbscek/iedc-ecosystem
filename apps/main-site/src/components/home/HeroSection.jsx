import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center bg-[#FAFAFA] overflow-hidden">
      {/* Structural Grid Background */}
      <div className="absolute inset-0 border-x border-gray-200 container mx-auto pointer-events-none" />
      
      <div className="container mx-auto px-6 relative flex flex-col lg:flex-row items-stretch">
        
        {/* Left: Content Block with Vertical "Stem" */}
        <div className="w-full lg:w-7/12 py-20 lg:pr-12 border-b lg:border-b-0 lg:border-r border-gray-200">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col h-full justify-center"
          >
            {/* Contextual Header (No pill, just clean typography) */}
            <span className="text-accent font-mono font-bold tracking-[0.2em] mb-4 text-sm">
              01 // EST. LBSCEK KASARAGOD
            </span>

            <h1 className="text-6xl md:text-8xl font-black text-text-dark leading-[0.85] tracking-tighter mb-8">
              IDEAS <br />
              <span className="italic font-light text-gray-400">ARE</span> RAW <br />
              MATERIAL.
            </h1>

            <p className="text-xl text-text-light max-w-lg mb-12 border-l-4 border-accent pl-6 py-2 leading-relaxed">
              IEDC LBSCEK is the forge where student curiosity meets industrial expertise. 
              We don't just "innovate"—we build functional solutions for the real world.
            </p>

            <div className="flex flex-col sm:flex-row gap-0">
              <Link to="/events" className="px-10 py-5 bg-text-dark text-white font-bold text-lg hover:bg-accent transition-colors flex items-center justify-between group border border-text-dark">
                EXPLORE PROGRAMS
                <span className="ml-4 group-hover:translate-x-2 transition-transform">→</span>
              </Link>
              <Link to="/register" className="px-10 py-5 border border-text-dark border-t-0 sm:border-t sm:border-l-0 text-text-dark font-bold text-lg hover:bg-gray-100 transition-colors">
                JOIN THE CELL
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Right: Visual Block (The "Industrial" look) */}
        <div className="w-full lg:w-5/12 relative bg-gray-50 flex items-center justify-center p-12">
          {/* Large Background Lettering */}
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none select-none">
            <span className="text-[20rem] font-black text-gray-100/80 leading-none">I</span>
          </div>

          {/* Floating Focal Point */}
          <motion.div 
            initial={{ opacity: 0, rotate: -5 }}
            animate={{ opacity: 1, rotate: 0 }}
            transition={{ delay: 0.3, duration: 1 }}
            className="relative z-10 w-full aspect-square bg-white border border-gray-200 shadow-[20px_20px_0px_0px_rgba(255,107,107,1)] p-8 flex flex-col justify-between"
          >
            <div className="flex justify-between items-start">
              <img 
                src="/img/logo/IEDCLBSLogoColor.webp" 
                alt="IEDC" 
                className="w-24 grayscale contrast-125"
              />
              <span className="font-mono text-xs text-gray-400 uppercase tracking-widest">[ Protocol 04 ]</span>
            </div>
            
            <div className="mt-auto">
              <h3 className="text-2xl font-black text-text-dark leading-none mb-2">INNOVATION<br />PIPELINE</h3>
              <div className="w-12 h-1 bg-accent mb-4"></div>
              <p className="text-xs text-text-light font-mono uppercase tracking-tighter">
                Kasaragod • Kerala • India <br />
                92.4% Project Success Rate
              </p>
            </div>
          </motion.div>

          {/* Abstract Geometry */}
          <div className="absolute top-10 right-10 w-12 h-12 border-2 border-gray-200 rounded-full" />
          <div className="absolute bottom-10 left-10 w-24 h-2 bg-cta/30" />
        </div>

      </div>
    </section>
  );
};

export default HeroSection;