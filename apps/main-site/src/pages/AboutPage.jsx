import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FaLightbulb, FaRocket, FaHandshake, FaGlobe, FaArrowRight } from 'react-icons/fa';

const AboutPage = () => {
  // Stagger animation for list items
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  return (
    <div className="bg-bg-main min-h-screen">
      
      {/* 1. Hero: The Manifesto Header */}
      <section className="pt-40 pb-20 border-b border-gray-200 bg-white">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-4xl"
          >
            <span className="text-accent font-mono font-bold tracking-widest text-sm uppercase mb-6 block">
              01 // THE_ORIGIN_STORY
            </span>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-text-dark tracking-tighter leading-[0.9] mb-10">
              WE BUILD THE <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-300 to-gray-500">
                BUILDERS.
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-text-light leading-relaxed max-w-3xl border-l-4 border-accent pl-8">
              The Innovation and Entrepreneurship Development Cell (IEDC) at LBSCEK isn't just a club. 
              It is the primary engine for transforming engineering students into the founders, 
              leaders, and disruptors of tomorrow's economy.
            </p>
          </motion.div>
        </div>
      </section>

      {/* 2. Mission & Vision: Split Screen "Blueprint" */}
      <section className="py-24 bg-bg-secondary/30">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 lg:gap-24 items-start">
            
            {/* Mission Protocol */}
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative group"
            >
              <div className="absolute -top-10 left-0 text-9xl font-black text-gray-100 -z-10 select-none group-hover:text-accent/5 transition-colors duration-500">M</div>
              <h3 className="text-3xl font-black text-text-dark mb-6 uppercase tracking-tight">Mission Protocol</h3>
              <p className="text-text-light text-lg leading-relaxed mb-8">
                To construct a resilient ecosystem that identifies latent talent, provides 
                industry-grade mentorship, and facilitates the deployment of student-led 
                ventures into the open market.
              </p>
              <ul className="space-y-4 font-medium text-text-dark">
                <li className="flex items-center gap-3">
                  <span className="w-2 h-2 bg-accent rounded-full"></span>
                  Identify & Incubate Ideas
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-2 h-2 bg-accent rounded-full"></span>
                  Bridge Academia & Industry
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-2 h-2 bg-accent rounded-full"></span>
                  Foster Financial Independence
                </li>
              </ul>
            </motion.div>

            {/* Vision Protocol */}
            <motion.div 
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative group"
            >
              <div className="absolute -top-10 left-0 text-9xl font-black text-gray-100 -z-10 select-none group-hover:text-cta/10 transition-colors duration-500">V</div>
              <h3 className="text-3xl font-black text-text-dark mb-6 uppercase tracking-tight">Vision Protocol</h3>
              <p className="text-text-light text-lg leading-relaxed mb-8">
                To be the undisputed hub of innovation in North Kerala, where "Building" is the default state 
                of existence and every student graduates with an entrepreneurial mindset.
              </p>
              <div className="bg-white p-6 border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs text-gray-400 uppercase">Target_Impact</span>
                  <span className="font-mono text-xs text-accent font-bold">100%</span>
                </div>
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    whileInView={{ width: "100%" }}
                    transition={{ duration: 1.5, delay: 0.5 }}
                    className="h-full bg-accent"
                  ></motion.div>
                </div>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* 3. Core Values: The "Operating System" Grid */}
      <section className="py-32 bg-white">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-8">
            <h2 className="text-5xl md:text-6xl font-black text-text-dark tracking-tighter leading-[0.9]">
              OPERATING <br />
              <span className="text-gray-300">PRINCIPLES.</span>
            </h2>
            <div className="h-[2px] flex-grow bg-gray-100 mb-4 hidden md:block mx-8"></div>
            <p className="font-mono text-sm text-gray-400 uppercase tracking-widest text-right">
              [ Source_Code_v2.0 ]
            </p>
          </div>

          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {[
              {
                icon: <FaLightbulb />,
                title: "Radical Innovation",
                desc: "We reject the status quo. If it works, we ask how to break it and build it better."
              },
              {
                icon: <FaHandshake />,
                title: "Deep Collaboration",
                desc: "Silos kill startups. We build bridges between departments, years, and skill sets."
              },
              {
                icon: <FaRocket />,
                title: "Rapid Execution",
                desc: "Ideas are cheap. Execution is everything. We prioritize shipping over planning."
              },
              {
                icon: <FaGlobe />,
                title: "Global Excellence",
                desc: "We are local, but our standards are global. We benchmark against the best."
              }
            ].map((value, index) => (
              <motion.div 
                key={index}
                variants={itemVariants}
                className="group p-8 border border-gray-100 hover:border-text-dark hover:bg-bg-secondary/30 transition-all duration-300"
              >
                <div className="text-3xl text-gray-300 mb-6 group-hover:text-accent transition-colors duration-300">
                  {value.icon}
                </div>
                <h4 className="text-xl font-bold text-text-dark mb-4 group-hover:translate-x-1 transition-transform">
                  {value.title}
                </h4>
                <p className="text-text-light text-sm leading-relaxed">
                  {value.desc}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* 4. Legacy/Context: The "Institutional" Block */}
      <section className="py-24 bg-text-dark text-white relative overflow-hidden">
        {/* Abstract Background */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
        
        <div className="container mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-8">
              <span className="text-accent font-mono font-bold tracking-widest text-sm uppercase mb-4 block">
                // INSTITUTIONAL_BACKING
              </span>
              <h2 className="text-4xl font-bold mb-6">
                Powered by LBS College of Engineering
              </h2>
              <p className="text-gray-400 text-lg leading-relaxed mb-8 max-w-2xl">
                Established in 1993, LBSCEK has been a pioneer in technical education in North Kerala. 
                IEDC acts as the bridge between this rich academic legacy and the fast-paced world of 
                modern startups.
              </p>
              <div className="flex gap-4">
                <a href="https://lbscek.ac.in" target="_blank" rel="noopener noreferrer" className="px-6 py-3 border border-white/20 hover:bg-white hover:text-text-dark transition-all text-sm font-mono font-bold uppercase tracking-wider">
                  Visit College Website
                </a>
              </div>
            </div>
            
            {/* Stat Block */}
            <div className="lg:col-span-4 flex flex-col gap-4">
              <div className="bg-white/5 p-6 border-l-2 border-accent backdrop-blur-sm">
                <span className="block text-4xl font-black text-white mb-1">1993</span>
                <span className="text-xs text-gray-400 uppercase tracking-widest">College Established</span>
              </div>
              <div className="bg-white/5 p-6 border-l-2 border-cta backdrop-blur-sm">
                <span className="block text-4xl font-black text-white mb-1">2015</span>
                <span className="text-xs text-gray-400 uppercase tracking-widest">IEDC Founded</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Team CTA */}
      <section className="py-24 bg-white text-center">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-text-dark mb-6">
            The people behind the protocol.
          </h2>
          <p className="text-text-light max-w-2xl mx-auto mb-10">
            A diverse team of visionaries, hackers, and hustlers working together to keep the engine running.
          </p>
          <Link 
            to="/team" 
            className="inline-flex items-center gap-2 px-8 py-4 bg-accent text-white font-bold hover:bg-accent-dark transition-all hover:-translate-y-1 shadow-lg shadow-accent/20"
          >
            Meet the Leadership
            <FaArrowRight />
          </Link>
        </div>
      </section>

    </div>
  );
};

export default AboutPage;