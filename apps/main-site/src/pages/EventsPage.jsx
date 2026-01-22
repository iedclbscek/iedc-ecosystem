import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCalendarAlt, FaMapMarkerAlt, FaFilter, FaArrowRight, FaHistory, FaPlus } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Loader from '../components/ui/Loader'; // Assuming you have this
import EventDetailModal from '../components/ui/EventDetailModal'; // Assuming you have this
import ProposeEventModal from '../components/ui/ProposeEventModal'; // Assuming you have this

const EventsPage = () => {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState('All');
  const [events, setEvents] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [pastEvents, setPastEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showProposeModal, setShowProposeModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState(['All']);

  // --- 1. Data Fetching (Kept logic same, just structure) ---
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        // Using sample data fallback if API fails (for preview purposes)
        // Replace with your actual API call in production
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/events`, {
          params: { status: 'published', limit: 100 }
        }).catch(() => ({ data: { success: false } }));

        let fetchedEvents = [];
        if (response.data && response.data.success) {
          fetchedEvents = response.data.events;
        } else {
            // Fallback to manual data if API fails (Optional: Remove in prod)
            // You can import your local data here if needed
            fetchedEvents = []; 
        }

        setEvents(fetchedEvents);

        // Extract Categories
        const uniqueCategories = ['All', ...new Set(fetchedEvents
          .map(event => event.category)
          .filter(Boolean))];
        setCategories(uniqueCategories);

      } catch (error) {
        console.error('Error fetching events:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  // --- 2. Filtering Logic ---
  useEffect(() => {
    // If no events, stop
    // if (!events.length) return; 

    const now = new Date();
    
    // Filter by Category
    let filtered = events;
    if (activeFilter !== 'All') {
      filtered = events.filter(event => event.category === activeFilter);
    }
    
    // Split Time
    setUpcomingEvents(filtered.filter(event => {
      const date = event.endDate ? new Date(event.endDate) : new Date(event.date);
      return date >= now;
    }));
    
    setPastEvents(filtered.filter(event => {
      const date = event.endDate ? new Date(event.endDate) : new Date(event.date);
      return date < now;
    }));
  }, [events, activeFilter]);

  const openEventDetail = (event) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  const handleProposalSubmitted = () => {
    setShowProposeModal(false);
    // Add toast notification logic here
  };

  if (loading) return <div className="min-h-screen bg-bg-main flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full"></div></div>;

  return (
    <div className="min-h-screen bg-bg-main">
      
      {/* --- HERO SECTION --- */}
      <section className="pt-32 pb-16 bg-white border-b border-gray-200">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl">
            <motion.span 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-accent font-mono font-bold tracking-widest text-sm uppercase mb-4 block"
            >
              01 // SYSTEM_LOGS
            </motion.span>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl md:text-7xl font-black text-text-dark tracking-tighter leading-[0.9] mb-8"
            >
              OPERATIONAL <br />
              <span className="text-gray-300">TIMELINE.</span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-xl text-text-light max-w-2xl border-l-4 border-text-dark pl-6"
            >
              Synchronize with upcoming workshops, hackathons, and venture drills. 
              Secure your slot in the deployment queue.
            </motion.p>
          </div>
        </div>
      </section>

      {/* --- FILTERS & CONTROLS --- */}
      <section className="sticky top-20 z-30 bg-bg-main/90 backdrop-blur-md border-b border-gray-200 py-4">
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          
          {/* Category Tabs */}
          <div className="flex overflow-x-auto no-scrollbar gap-2 w-full md:w-auto pb-2 md:pb-0">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveFilter(category)}
                className={`
                  px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider transition-all border
                  ${activeFilter === category 
                    ? 'bg-text-dark text-white border-text-dark' 
                    : 'bg-white text-gray-500 border-gray-200 hover:border-text-dark hover:text-text-dark'}
                `}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Action Button temporarily hidden */}
          {/*
          <button 
            onClick={() => setShowProposeModal(true)}
            className="flex items-center gap-2 px-6 py-2 bg-accent text-white font-bold text-sm hover:bg-accent-dark transition-colors shadow-lg shadow-accent/20 whitespace-nowrap"
          >
            <FaPlus className="text-xs" />
            <span className="uppercase tracking-wide">Initiate_Event</span>
          </button>
          */}
        </div>
      </section>

      {/* --- UPCOMING DEPLOYMENTS --- */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="flex items-baseline justify-between mb-12">
             <h2 className="text-3xl font-black text-text-dark uppercase tracking-tight">
               Pending Deployments <span className="text-accent text-lg align-top ml-1">●</span>
             </h2>
             <span className="font-mono text-xs text-gray-400 hidden md:block">
               STATUS: REGISTERING
             </span>
          </div>

          {upcomingEvents.length === 0 ? (
            <div className="w-full py-24 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-center">
              <div className="text-6xl mb-4">🔭</div>
              <h3 className="text-xl font-bold text-text-dark uppercase mb-2">No Active Protocols Found</h3>
              <p className="text-text-light max-w-md">
                There are currently no upcoming events in this category. 
                Why not initiate one yourself?
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <AnimatePresence>
                {upcomingEvents.map((event, index) => (
                  <EventCard 
                    key={event._id || event.title} 
                    event={event} 
                    index={index} 
                    onClick={() => openEventDetail(event)} 
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </section>

      {/* --- ARCHIVED LOGS (Past Events) --- */}
      {pastEvents.length > 0 && (
        <section className="py-20 bg-gray-50 border-t border-gray-200">
          <div className="container mx-auto px-6">
            <div className="flex items-center gap-4 mb-12">
              <FaHistory className="text-gray-400" />
              <h2 className="text-2xl font-bold text-gray-500 uppercase tracking-widest">
                Archived_Logs
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-75 hover:opacity-100 transition-opacity duration-500">
              {pastEvents.map((event) => (
                <div 
                  key={event.title}
                  onClick={() => openEventDetail(event)}
                  className="group flex items-center bg-white border border-gray-200 p-4 hover:border-text-dark cursor-pointer transition-all"
                >
                  <div className="bg-gray-100 p-3 mr-4 font-mono text-xs text-center min-w-[60px]">
                     <span className="block font-bold text-gray-600">
                       {new Date(event.date).getDate()}
                     </span>
                     <span className="block text-gray-400 uppercase">
                       {new Date(event.date).toLocaleString('default', { month: 'short' })}
                     </span>
                  </div>
                  <div className="flex-grow">
                    <h4 className="font-bold text-text-dark group-hover:text-accent transition-colors">
                      {event.title}
                    </h4>
                    <span className="text-xs text-gray-400 font-mono uppercase">
                      {event.category}
                    </span>
                  </div>
                  <FaArrowRight className="text-gray-300 group-hover:text-text-dark -translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all" />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* --- MODALS --- */}
      <EventDetailModal 
        event={selectedEvent}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      <ProposeEventModal
        isOpen={showProposeModal}
        onClose={() => setShowProposeModal(false)}
        onProposalSubmitted={handleProposalSubmitted}
      />
    </div>
  );
};

// --- SUB-COMPONENT: The "Dossier" Card ---
const EventCard = ({ event, index, onClick }) => {
  const dateObj = new Date(event.date);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ delay: index * 0.05 }}
      layout
      className="group relative bg-white border border-gray-200 hover:border-text-dark hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all duration-300 cursor-pointer flex flex-col h-full"
      onClick={onClick}
    >
      {/* 1. Header Protocol Strip */}
      <div className="flex justify-between items-center px-4 py-2 border-b border-gray-100 bg-gray-50/50">
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-gray-500">
          ID: {event.category.substring(0, 3).toUpperCase()}-{index + 100}
        </span>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
             <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
             <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <span className="font-mono text-[10px] font-bold text-green-600 uppercase">
            OPEN
          </span>
        </div>
      </div>

      {/* 2. Image Area */}
      <div className="relative h-48 overflow-hidden bg-gray-200">
        {event.image ? (
          <img 
            src={event.image} 
            alt={event.title} 
            className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500 scale-100 group-hover:scale-105"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 font-mono text-4xl font-black">
             IEDC
          </div>
        )}
        
        {/* Date Ticket Stub */}
        <div className="absolute top-0 left-0 bg-white border-r border-b border-gray-200 p-3 text-center min-w-[70px]">
          <span className="block text-2xl font-black text-text-dark leading-none">
            {dateObj.getDate()}
          </span>
          <span className="block text-[10px] font-bold text-gray-400 uppercase">
            {dateObj.toLocaleString('default', { month: 'short' })}
          </span>
        </div>
      </div>

      {/* 3. Content Body */}
      <div className="p-6 flex flex-col flex-grow">
        <h3 className="text-xl font-bold text-text-dark mb-3 group-hover:text-accent transition-colors leading-tight">
          {event.title}
        </h3>
        
        <div className="space-y-2 mb-6">
          <div className="flex items-center text-sm text-text-light">
             <FaMapMarkerAlt className="mr-3 text-gray-400 text-xs" />
             <span className="truncate">{event.location || "TBA"}</span>
          </div>
          <div className="flex items-center text-sm text-text-light">
             <FaCalendarAlt className="mr-3 text-gray-400 text-xs" />
             <span>
                {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
             </span>
          </div>
        </div>

        {/* 4. Action Footer */}
        <div className="mt-auto pt-4 border-t border-gray-100 flex justify-between items-center">
           <span className="text-xs font-mono font-bold text-gray-400 uppercase group-hover:text-text-dark transition-colors">
             View_Dossier
           </span>
           <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-text-dark group-hover:text-white transition-all">
             <FaArrowRight className="text-xs transform -rotate-45 group-hover:rotate-0 transition-transform duration-300" />
           </div>
        </div>
      </div>
    </motion.div>
  );
};

export default EventsPage;