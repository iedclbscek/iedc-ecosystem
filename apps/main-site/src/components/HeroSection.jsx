import { motion } from 'framer-motion';

const HeroSection = () => {
  return (
    <section className="bg-background pt-24 md:pt-32 pb-16 md:pb-24">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-xl"
          >
            <h5 className="text-accent mb-3 font-medium">Welcome to</h5>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-text-dark">
              IEDC <span className="text-accent">LBSCEK</span>
            </h1>
            <p className="text-text-light text-lg md:text-xl mb-8">
              Empowering students to innovate, create, and lead through entrepreneurship and technology.
            </p>
            
            <div className="flex flex-wrap gap-4">
              <button className="px-8 py-3 bg-cta text-white rounded-md hover:bg-cta-hover transition-colors shadow-sm">
                Explore Programs
              </button>
              <button className="px-8 py-3 border-2 border-accent text-accent rounded-md hover:bg-accent hover:text-white transition-colors">
                Join Community
              </button>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative hidden md:block"
          >
            <div className="relative">
              <div className="w-full h-96 bg-primary/30 rounded-lg overflow-hidden shadow-sm">
                <img 
                  src="/img/IMG_3351.JPG" 
                  alt="IEDC Activities" 
                  className="w-full h-full object-cover opacity-90"
                />
              </div>
              <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-accent/20 rounded-lg"></div>
              <div className="absolute -top-6 -left-6 w-16 h-16 bg-cta/20 rounded-full"></div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
