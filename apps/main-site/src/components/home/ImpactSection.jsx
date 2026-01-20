import { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';

// Optimized Counter Component
const AnimatedCounter = ({ value, label, suffix = "" }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  
  useEffect(() => {
    if (isInView) {
      let start = 0;
      // Parse the number from string (e.g., "500+" -> 500)
      const end = parseInt(value.toString().replace(/\D/g, '')); 
      const duration = 2000;
      
      // Custom easing function for "landing" effect
      let startTime = null;
      const animate = (currentTime) => {
        if (!startTime) startTime = currentTime;
        const progress = Math.min((currentTime - startTime) / duration, 1);
        
        // EaseOutExpo: 1 - Math.pow(2, -10 * progress)
        const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        
        setCount(Math.floor(easeProgress * end));

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setCount(end);
        }
      };
      
      requestAnimationFrame(animate);
    }
  }, [isInView, value]);

  return (
    <div ref={ref} className="relative p-8 group border-r border-b border-white/10 hover:bg-white/5 transition-colors duration-300">
      <div className="flex flex-col h-full justify-between">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          <span className="text-5xl md:text-7xl font-black text-white mb-2 block tracking-tight">
            {count}{suffix}
          </span>
        </motion.div>
        
        <div className="mt-4">
          <div className="w-8 h-1 bg-accent mb-4 group-hover:w-full transition-all duration-500"></div>
          <p className="text-gray-400 font-mono text-xs uppercase tracking-widest">
            {label}
          </p>
        </div>
      </div>
    </div>
  );
};

const ImpactSection = () => {
  return (
    <section className="bg-text-dark text-white py-0 border-t border-gray-800">
      
      {/* 1. Header Area */}
      <div className="container mx-auto px-6 py-24">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
          <div>
            <span className="text-accent font-mono font-bold tracking-widest text-sm uppercase mb-4 block">
               GROWTH_METRICS
            </span>
            <h2 className="text-5xl md:text-6xl font-black tracking-tighter leading-[0.9]">
              YEAR-TO-DATE <br />
              <span className="text-gray-500">TRACTION.</span>
            </h2>
          </div>
          <div className="max-w-md text-right hidden md:block">
            <p className="text-gray-400 leading-relaxed border-l border-gray-700 pl-6">
              Measuring our success not just by events conducted, but by the 
              tangible density of innovation created on campus.
            </p>
          </div>
        </div>
      </div>

      {/* 2. The Metrics Grid (Full Width) */}
      <div className="border-t border-white/10">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
            
            {/* Metric 1 */}
            <AnimatedCounter 
              value="500" 
              suffix="+" 
              label="Active Student Developers" 
            />
            
            {/* Metric 2 */}
            <AnimatedCounter 
              value="50" 
              suffix="+" 
              label="Successful Deployments" 
            />
            
            {/* Metric 3 */}
            <AnimatedCounter 
              value="20" 
              suffix="" 
              label="Startups Incubated" 
            />
            
            {/* Metric 4 */}
            <AnimatedCounter 
              value="10" 
              suffix=" YRS" 
              label="Operational Excellence" 
            />
            
          </div>
        </div>
      </div>

      {/* 3. The Manifesto / Quote Block */}
      <div className="bg-accent py-20">
        <div className="container mx-auto px-6 text-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="max-w-4xl mx-auto"
          >
            <h3 className="text-3xl md:text-5xl font-bold text-text-dark leading-tight mb-8">
              "We don't just build startups. We build the <span className="underline decoration-white decoration-4 underline-offset-4">founders</span> that build the future."
            </h3>
          </motion.div>
        </div>
      </div>

    </section>
  );
};

export default ImpactSection;