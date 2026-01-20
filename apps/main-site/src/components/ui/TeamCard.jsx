import { useState } from 'react';
import { motion } from 'framer-motion';
import { FaLinkedin, FaGithub, FaEnvelope } from 'react-icons/fa';

const TeamCard = ({ member, selectedYear }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  // Early return if member is undefined
  if (!member) return null;
  
  // Get role and team role for the selected year
  const getRoleForYear = (member, year) => {
    const yearlyRole = member.yearlyRoles?.find(yr => yr.year === year);
    if (yearlyRole) {
      return {
        role: yearlyRole.role,
        teamRole: yearlyRole.teamRole
      };
    }
    // Fallback to general role if no yearly role found
    return {
      role: member.role,
      teamRole: member.teamRole
    };
  };

  const { role, teamRole } = getRoleForYear(member, selectedYear);
  
  // Default image if member image is not available
const defaultImage = `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name || 'User')}&background=random`;

const imageSrc = member.image
  ? member.image.startsWith('/')
    ? member.image
    : member.image
  : defaultImage;

  return (
    <motion.div
      className="text-center"
      whileHover={{ y: -5 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      layout
    >
      {/* Member Photo in a clean circle format */}
      <div className="relative mx-auto mb-3">
        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-lg overflow-hidden mx-auto shadow-md">
          <img
  src={imageSrc}
  alt={member.name || 'Team Member'}
  className="w-full h-full object-cover"
  onError={e => {
    e.target.onerror = null;
    e.target.src = defaultImage;
  }}
/>
        </div>
        
        {/* Social links overlay on hover */}
        {isHovered && member && (member.linkedin || member.github || member.email) && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 flex items-center justify-center bg-accent/20 rounded-lg"
          >
            <div className="flex gap-2">
              {member.linkedin && (
                <a 
                  href={member.linkedin} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-white p-1.5 rounded-full text-accent hover:bg-accent hover:text-white transition-colors"
                  aria-label="LinkedIn Profile"
                >
                  <FaLinkedin size={14} />
                </a>
              )}
              {member.github && (
                <a 
                  href={member.github} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-white p-1.5 rounded-full text-accent hover:bg-accent hover:text-white transition-colors"
                  aria-label="GitHub Profile"
                >
                  <FaGithub size={14} />
                </a>
              )}
              {member.email && (
                <a 
                  href={`mailto:${member.email}`}
                  className="bg-white p-1.5 rounded-full text-accent hover:bg-accent hover:text-white transition-colors"
                  aria-label="Email Contact"
                >
                  <FaEnvelope size={14} />
                </a>
              )}
            </div>
          </motion.div>
        )}
      </div>
      
      {/* Member name and role */}
      <h3 className="font-bold text-text-dark text-sm">{member.name || 'Name Unavailable'}</h3>
      <p className="text-accent text-xs font-medium">{teamRole || role || 'Team Member'}</p>
    </motion.div>
  );
};

export default TeamCard;
