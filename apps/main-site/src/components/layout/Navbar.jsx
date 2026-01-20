import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ArrowRight, Terminal } from 'lucide-react';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'About', path: '/about' },
    { name: 'Events', path: '/events' },
    { name: 'Team', path: '/team' },
    { name: 'Nexus', path: '/nexus' }
  ];

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location]);

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-300 border-b ${
        isScrolled 
          ? 'bg-white/95 backdrop-blur-md border-gray-200 py-3' 
          : 'bg-white border-transparent py-5'
      }`}
    >
      <div className="container mx-auto px-6">
        <div className="flex justify-between items-center">
          
          {/* --- LOGO BLOCK --- */}
          <Link 
            to="/" 
            className="flex items-center gap-3 group"
          >
            <div className="relative w-10 h-10  flex items-center justify-center text-white overflow-hidden transition-transform group-hover:scale-105">
              <img 
                src="/favicon.ico" 
                alt="Logo" 
                className="w-full h-full object-cover p-1"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-lg leading-none tracking-tight text-text-dark">IEDC</span>
              <span className="font-mono text-[10px] font-bold tracking-widest text-gray-500 uppercase">LBSCEK</span>
            </div>
          </Link>

          {/* --- DESKTOP NAVIGATION --- */}
          <div className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.name}
                  to={link.path}
                  className={`relative px-4 py-2 text-sm font-bold uppercase tracking-wider transition-colors duration-200 ${
                    isActive 
                      ? 'text-accent' 
                      : 'text-gray-500 hover:text-text-dark'
                  }`}
                >
                  {link.name}
                  {isActive && (
                    <span className="absolute bottom-0 left-4 right-4 h-[2px] bg-accent"></span>
                  )}
                </Link>
              );
            })}
            
            <div className="w-[1px] h-6 bg-gray-200 mx-4"></div>

            <Link
              to="/register"
              className="group flex items-center gap-2 px-5 py-2.5 bg-text-dark text-white text-xs font-mono font-bold uppercase tracking-widest hover:bg-accent transition-all hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]"
            >
              <Terminal className="w-3 h-3" />
              Join_Network
            </Link>
          </div>

          {/* --- MOBILE MENU BUTTON --- */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 text-text-dark hover:bg-gray-100 transition-colors border border-transparent hover:border-gray-200"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* --- MOBILE MENU DROPDOWN --- */}
        <div 
          className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
            isMenuOpen ? 'max-h-96 opacity-100 mt-4 border-t border-gray-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="py-4 space-y-2">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.name}
                  to={link.path}
                  className={`block px-4 py-3 text-sm font-bold uppercase tracking-wider border-l-4 transition-all ${
                    isActive
                      ? 'border-accent text-text-dark bg-gray-50'
                      : 'border-transparent text-gray-500 hover:text-text-dark hover:bg-gray-50'
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
            
            <div className="pt-4 px-4">
              <Link
                to="/register"
                className="flex w-full items-center justify-center gap-2 py-3 bg-accent text-white font-mono text-xs font-bold uppercase tracking-widest hover:bg-accent-dark transition-colors"
              >
                Join_Network
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;