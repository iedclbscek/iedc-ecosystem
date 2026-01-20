import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal } from 'lucide-react';

const Loader = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState([]);
  
  // The boot sequence messages
  const bootSequence = [
    "INITIALIZING_KERNEL...",
    "LOADING_MODULES...",
    "CONNECTING_TO_NEXUS...",
    "VERIFYING_PROTOCOLS...",
    "SYSTEM_READY."
  ];

  useEffect(() => {
    // 1. Progress Bar Logic
    const duration = 2000; // 2 seconds total load time
    const intervalTime = 20;
    const steps = duration / intervalTime;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      const newProgress = Math.min(Math.round((currentStep / steps) * 100), 100);
      setProgress(newProgress);

      // Trigger log messages based on progress milestones
      const logIndex = Math.floor((newProgress / 100) * (bootSequence.length - 1));
      setLogs((prev) => {
        const newLog = bootSequence[logIndex];
        if (!prev.includes(newLog)) return [...prev, newLog];
        return prev;
      });

      if (currentStep >= steps) {
        clearInterval(timer);
        // Add a small delay at 100% before unmounting
        setTimeout(() => onComplete(), 500);
      }
    }, intervalTime);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-text-dark z-[100] flex flex-col items-center justify-center font-mono text-white overflow-hidden">
      
      {/* Background Grid Pattern (Subtle) */}
      <div className="absolute inset-0 opacity-5 pointer-events-none" 
           style={{ backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
      </div>

      <div className="relative w-full max-w-md px-6">
        
        {/* Header Icon */}
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 border-2 border-white/20 flex items-center justify-center bg-white/5 animate-pulse">
            <Terminal className="w-8 h-8 text-accent" />
          </div>
        </div>

        {/* Main Title with "Glitch" Text Effect */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-2">
            IEDC <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/50">LBSCEK</span>
          </h1>
          <div className="h-[1px] w-24 bg-accent mx-auto"></div>
        </div>

        {/* The Progress Bar */}
        <div className="mb-2 flex justify-between text-xs text-gray-400 font-bold uppercase tracking-widest">
          <span>System_Boot</span>
          <span>{progress}%</span>
        </div>
        
        <div className="w-full h-2 bg-gray-800 border border-gray-700 relative overflow-hidden">
          <motion.div 
            className="h-full bg-accent"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ ease: "linear", duration: 0.1 }}
          />
        </div>

        {/* System Logs (The "Terminal" Output) */}
        <div className="mt-4 h-24 flex flex-col justify-end items-start overflow-hidden">
          <AnimatePresence mode='popLayout'>
            {logs.slice(-3).map((log, index) => (
              <motion.div
                key={log}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="text-xs text-gray-500 font-mono uppercase tracking-wide py-0.5 flex items-center gap-2"
              >
                <span className="text-accent">{'>'}</span> {log}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

      </div>

      {/* Footer Version Number */}
      <div className="absolute bottom-8 text-[10px] text-gray-700 font-mono uppercase tracking-[0.2em]">
        Version 2.0.4 // Build_Ready
      </div>
    </div>
  );
};

export default Loader;