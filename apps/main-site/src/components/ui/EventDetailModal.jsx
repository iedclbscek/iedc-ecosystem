import { motion, AnimatePresence } from 'framer-motion';
import { FaMapMarkerAlt, FaClock, FaCalendarAlt, FaTimes, FaUser } from 'react-icons/fa';

const EventDetailModal = ({ event, isOpen, onClose }) => {
  if (!event) return null;
  
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-text-dark/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header with color strip */}
            <div className={`h-2 ${getCategoryColor(event.category)}`}></div>
            
            <div className="p-6">
              <div className="flex justify-between items-start">
                <h2 className="text-2xl font-bold text-text-dark">{event.title}</h2>
                <button 
                  className="text-text-light hover:text-accent p-1 rounded-full transition-colors"
                  onClick={onClose}
                >
                  <FaTimes size={20} />
                </button>
              </div>
              
              <div className="flex items-center gap-2 mt-2">
                <span className="px-3 py-1 bg-primary text-text-light text-sm font-medium rounded-full">
                  {event.category}
                </span>
                <span className={`px-3 py-1 ${event.isPast ? 'bg-text-light/20' : 'bg-cta/20'} text-sm font-medium rounded-full`}>
                  {event.isPast ? 'Past Event' : 'Upcoming'}
                </span>
              </div>
              
              {/* Event image */}
              <div className="mt-6 rounded-lg overflow-hidden bg-primary/20 h-48 flex items-center justify-center">
                {event.image ? (
                  <img 
                    src={event.image} 
                    alt={event.title} 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/img/event-placeholder.jpg';
                    }}
                  />
                ) : (
                  <div className="text-text-light">No image available</div>
                )}
              </div>
              
              {/* Event details */}
              <div className="mt-6 space-y-4">
                {/* Date and Time */}
                <div className="flex items-start gap-3">
                  <FaCalendarAlt className="text-accent mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-text-dark">Date</h3>
                    <p className="text-text-light">{formatDate(event.date)}</p>
                  </div>
                </div>
                
                {/* Time */}
                <div className="flex items-start gap-3">
                  <FaClock className="text-accent mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-text-dark">Time</h3>
                    <p className="text-text-light">{event.time}</p>
                  </div>
                </div>
                
                {/* Location */}
                <div className="flex items-start gap-3">
                  <FaMapMarkerAlt className="text-accent mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-text-dark">Location</h3>
                    <p className="text-text-light">{event.location}</p>
                  </div>
                </div>
                
                {/* Speakers */}
                {event.speakers && event.speakers.length > 0 && (
                  <div className="flex items-start gap-3">
                    <FaUser className="text-accent mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-text-dark">Speakers</h3>
                      <p className="text-text-light">{event.speakers.join(', ')}</p>
                    </div>
                  </div>
                )}
                
                {/* Description */}
                <div className="mt-6">
                  <h3 className="font-semibold text-text-dark mb-2">About this event</h3>
                  <p className="text-text-light">{event.fullDescription}</p>
                </div>
              </div>
              
              {/* Action Button */}
              {!event.isPast && (
                <div className="mt-8">
                  <button className="w-full py-3 bg-cta hover:bg-cta-hover text-white font-medium rounded-lg transition-colors">
                    Register Now
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Helper function to get color based on category
const getCategoryColor = (category) => {
  switch (category) {
    case 'Workshop':
      return 'bg-blue-500';
    case 'Bootcamp':
      return 'bg-purple-500';
    case 'Hackathon':
      return 'bg-green-500';
    case 'Competition':
      return 'bg-accent';
    case 'Talk':
      return 'bg-yellow-500';
    default:
      return 'bg-gray-500';
  }
};

// Helper function to format date
const formatDate = (dateString) => {
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  try {
    return new Date(dateString).toLocaleDateString(undefined, options);
  } catch (e) {
    return dateString; // Return original string if parsing fails
  }
};

export default EventDetailModal;
