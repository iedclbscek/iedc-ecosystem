import { Link } from 'react-router-dom';
import { FaFacebookF, FaInstagram, FaLinkedinIn, FaMapMarkerAlt, FaHeart, FaArrowRight } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    organization: [
      {name: 'Home', path: '/' },
      { name: 'About Us', path: '/about' },
      { name: 'Events', path: '/events' },
      { name: 'Our Team', path: '/team' },
      { name: 'Nexus', path: '/nexus' }
    ],
    communities: [
      { name: 'Mulearn', path: '/nexus/mulearn' },
      { name: 'Tinkerhub', path: '/nexus/tinkerhub' },
      { name: 'Cyber', path: '/nexus/cyber' },
      { name: 'Foss', path: '/nexus/foss' },
      { name: 'MLSA', path: '/nexus/mlsa' }
    ],
  };

  return (
    <footer className="bg-text-dark text-white pt-20 pb-10 border-t border-white/10">
      <div className="container mx-auto px-6">
        
        {/* Top Section: CTA & Newsletter */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-20 border-b border-white/10 pb-12">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to build the future?
            </h2>
            <p className="text-gray-400 max-w-md text-lg">
              Join the community of innovators, creators, and entrepreneurs at LBSCEK.
            </p>
          </div>
          
          <div className="flex flex-col justify-center">
            <a
              href="https://www.whatsapp.com/channel/0029VaAYL1D2f3EAIot5Yl2N"
              target="_blank"
              rel="noopener noreferrer"
              className="relative max-w-md w-full inline-flex items-center justify-between bg-white/5 border border-white/10 rounded-full py-4 px-6 text-white hover:border-accent transition-colors"
            >
              <span className="text-white/80">Join our WhatsApp Channel</span>
              <span className="w-12 h-12 bg-accent rounded-full flex items-center justify-center text-white hover:bg-white hover:text-accent transition-all duration-300">
                <FaArrowRight />
              </span>
            </a>
            <p className="text-xs text-gray-500 mt-3 ml-4">
              Get updates, announcements, and event drops.
            </p>
          </div>
        </div>

        {/* Middle Section: Links & Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 mb-16">
          
          {/* Brand Column */}
          <div className="lg:col-span-4 space-y-6">
            <Link to="/" className="flex items-center space-x-2 text-2xl font-bold">
              <img src="/favicon.ico" alt="IEDC" className="w-8 h-8 filter brightness-0 invert" />
              <span>IEDC LBSCEK</span>
            </Link>
            <p className="text-gray-400 leading-relaxed max-w-sm">
              The Innovation and Entrepreneurship Development Cell at LBS College of Engineering, Kasaragod. Fostering a culture of innovation since 2015.
            </p>
            
            <div className="flex items-center space-x-4 pt-2">
              <SocialLink href="https://www.instagram.com/lbsiedc/" icon={<FaInstagram />} />
              <SocialLink href="https://www.linkedin.com/company/iedc-lbscek/" icon={<FaLinkedinIn />} />
              <SocialLink href="https://x.com/lbsiedc" icon={<FaXTwitter />} />
              <SocialLink href="https://www.facebook.com/iedclbs" icon={<FaFacebookF />} />
            </div>
          </div>

          {/* Links Columns */}
          <div className="lg:col-span-2 md:col-span-1">
            <h4 className="font-bold text-lg mb-6 text-white">Organization</h4>
            <ul className="space-y-4">
              {footerLinks.organization.map((link) => (
                <li key={link.name}>
                  <Link to={link.path} className="text-gray-400 hover:text-accent transition-colors inline-block hover:translate-x-1 duration-200">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-3 md:col-span-1">
            <h4 className="font-bold text-lg mb-6 text-white">Nexus Hubs</h4>
            <ul className="space-y-4">
              {footerLinks.communities.map((link) => (
                <li key={link.name}>
                  <Link to={link.path} className="text-gray-400 hover:text-accent transition-colors inline-block hover:translate-x-1 duration-200">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Column */}
          <div className="lg:col-span-3">
            <h4 className="font-bold text-lg mb-6 text-white">Headquarters</h4>
            <ul className="space-y-6">
              <li className="flex items-start space-x-3 text-gray-400 group">
                <FaMapMarkerAlt className="mt-1 text-accent group-hover:text-white transition-colors" />
                <span>
                  LBS College of Engineering,<br />
                  Povval, Muliyar P.O,<br />
                  Kasaragod, Kerala - 671542
                </span>
              </li>
              <li className="flex items-center space-x-3 text-gray-400 group">
                <span className="text-accent group-hover:text-white transition-colors">●</span>
                <a
                  href="https://www.whatsapp.com/channel/0029VaAYL1D2f3EAIot5Yl2N"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  WhatsApp Channel
                </a>
              </li>
              
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-500 text-sm">
            &copy; {currentYear} IEDC LBSCEK. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

// Helper component for social icons
const SocialLink = ({ href, icon }) => {
  return (
    <a 
      href={href} 
      target="_blank" 
      rel="noopener noreferrer"
      className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:bg-accent hover:text-white transition-all duration-300 hover:-translate-y-1"
    >
      {icon}
    </a>
  );
};

export default Footer;