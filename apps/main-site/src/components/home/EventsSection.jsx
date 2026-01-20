import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FaRocket, FaArrowRight, FaChevronRight, FaChevronLeft } from 'react-icons/fa';
import { events } from '../../data/eventsData';
import EventDetailModal from '../ui/EventDetailModal';

const EventsSection = () => {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const scrollContainerRef = useRef(null);

  // Get upcoming events
  const upcomingEvents = [...events]
    .filter(event => !event.isPast)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 5); 

  const openEventDetail = (event) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  const scroll = (direction) => {
    if (scrollContainerRef.current) {
      const { current } = scrollContainerRef;
      const scrollAmount = 420; // Slightly wider for better breathing room
      if (direction === 'left') {
        current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
      } else {
        current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
    }
  };

  return (
    <section id="events" className="py-32 bg-bg-secondary border-t border-gray-200 overflow-hidden">
      <div className="container mx-auto px-6">
        
        {/* Entrepreneurial Header */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
          <div>
            <span className="text-accent font-mono font-bold tracking-widest text-sm uppercase mb-4 block">
              VENTURE_PIPELINE 
            </span>
            <h2 className="text-5xl md:text-7xl font-black text-text-dark tracking-tighter leading-[0.9]">
              STARTUP <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-text-light to-text-light/20">
                ECOSYSTEM.
              </span>
            </h2>
          </div>

          {/* Controls */}
          <div className="flex flex-col items-end gap-6">
            <Link to="/events" className="group flex items-center gap-2 font-mono text-sm font-bold text-text-dark border-b-2 border-transparent hover:border-accent transition-all">
              FULL_CALENDAR_ACCESS
              <FaArrowRight className="group-hover:translate-x-1 transition-transform text-accent" />
            </Link>
            
            <div className="flex gap-2">
              <button 
                onClick={() => scroll('left')}
                className="w-12 h-12 border border-gray-300 flex items-center justify-center hover:bg-text-dark hover:text-white transition-colors"
              >
                <FaChevronLeft />
              </button>
              <button 
                onClick={() => scroll('right')}
                className="w-12 h-12 border border-text-dark bg-text-dark text-white flex items-center justify-center hover:bg-accent hover:border-accent transition-colors"
              >
                <FaChevronRight />
              </button>
            </div>
          </div>
        </div>

        {/* The Timeline Scroll */}
        <div 
          ref={scrollContainerRef}
          className="flex gap-8 overflow-x-auto pb-12 snap-x snap-mandatory scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {upcomingEvents.length === 0 ? (
            <div className="w-full h-64 border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 font-mono uppercase tracking-widest">
              [ NO_ACTIVE_OPPORTUNITIES ]
            </div>
          ) : (
            upcomingEvents.map((event, index) => (
              <EventCard 
                key={event.title} 
                event={event} 
                index={index} 
                onClick={() => openEventDetail(event)} 
              />
            ))
          )}
        </div>
      </div>

      <EventDetailModal 
        event={selectedEvent}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </section>
  );
};

const EventCard = ({ event, index, onClick }) => {
  const dateObj = new Date(event.date);
  const day = dateObj.getDate();
  const month = dateObj.toLocaleString('default', { month: 'short' }).toUpperCase();

  return (
    <motion.div 
      initial={{ opacity: 0, x: 50 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      className="min-w-[350px] md:min-w-[400px] snap-start group cursor-pointer bg-white border border-gray-200 hover:border-text-dark transition-colors duration-300"
      onClick={onClick}
    >
      {/* Date Stamp & Status */}
      <div className="flex border-b border-gray-200">
        <div className="bg-text-dark text-white p-4 min-w-[80px] text-center">
          <span className="block text-2xl font-black leading-none">{day}</span>
          <span className="block text-xs font-bold text-gray-400">{month}</span>
        </div>
        <div className="flex-grow p-3 flex justify-between items-center bg-gray-50">
          <span className="font-mono text-xs font-bold text-accent tracking-wider">
             OPPORTUNITY_0{index + 1}
          </span>
          {/* Pulsing Dot for 'Live' feel */}
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="font-mono text-[10px] text-gray-500 font-bold">OPEN</span>
          </div>
        </div>
      </div>

      {/* Image Block */}
      <div className="relative h-[200px] overflow-hidden grayscale group-hover:grayscale-0 transition-all duration-500">
        {event.image ? (
          <img 
            src={event.image} 
            alt={event.title} 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
             <span className="text-gray-300 font-black text-4xl">IEDC</span>
          </div>
        )}
      </div>

      {/* Content Block */}
      <div className="p-6">
        <div className="mb-4">
           {/* Entrepreneurial Label */}
           <span className="inline-block px-2 py-1 border border-gray-200 text-[10px] font-mono font-bold uppercase text-gray-400 mb-2">
              {event.category || "INCUBATION"}
           </span>
           <h3 className="text-xl font-black text-text-dark leading-tight group-hover:text-accent transition-colors uppercase">
             {event.title}
           </h3>
        </div>
        
        <div className="flex items-center gap-2 text-text-light text-sm mb-6 font-medium">
          <FaRocket className="text-accent text-xs" />
          <span className="truncate">{event.location || "Incubation Center"}</span>
        </div>

        {/* The Action Button */}
        <button className="w-full py-4 bg-gray-50 text-text-dark font-black font-mono text-xs uppercase tracking-widest border-t border-gray-200 group-hover:bg-text-dark group-hover:text-white transition-all duration-300 flex justify-between px-6 items-center">
          <span>Secure_Seat</span>
          <FaArrowRight className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
        </button>
      </div>
    </motion.div>
  );
};

export default EventsSection;