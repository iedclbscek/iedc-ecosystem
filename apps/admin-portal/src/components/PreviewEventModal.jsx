import React from 'react';
import { X, CalendarDays, MapPin, ArrowRight } from 'lucide-react';

export default function PreviewEventModal({ event, onClose }) {
  // Use sensible fallbacks for previewing incomplete forms
  const title = event?.title?.trim() || 'UNTITLED EVENT';
  const category = event?.category || 'Preview';
  
  // Use the uploaded poster URL if it exists, otherwise leave empty for fallback
  const posterUrl = event?.posterUrl;

  const dateObj = event?.startAt ? new Date(event.startAt) : null;
  const dateNum = dateObj && !isNaN(dateObj.getTime()) ? dateObj.getDate() : '??';
  const monthStr = dateObj && !isNaN(dateObj.getTime()) ? dateObj.toLocaleString('default', { month: 'short' }) : 'TBD';
  const timeStr = dateObj && !isNaN(dateObj.getTime()) ? dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Time TBD';
  
  const location = event?.location?.trim() || event?.venue?.trim() || 'Location TBD';

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm" style={{ zIndex: 9999 }}>
      <div className="w-full max-w-md bg-transparent flex flex-col items-center">
        
        {/* Header / Close button */}
        <div className="w-full flex justify-end mb-4">
          <button 
            onClick={onClose}
            className="bg-white/20 hover:bg-white/40 text-white rounded-full p-2 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* --- EVENT CARD PREVIEW --- */}
        <div className="w-full bg-white border border-gray-200 shadow-2xl flex flex-col relative overflow-hidden group">
          
          {/* 1. Header Protocol Strip */}
          <div className="flex justify-between items-center px-4 py-2 border-b border-gray-100 bg-gray-50/50">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-gray-500">
              ID: PRE-000
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
          <div className="relative h-64 overflow-hidden bg-gray-100 flex items-center justify-center">
            {posterUrl ? (
              <img 
                src={posterUrl} 
                alt={title} 
                className="w-full h-full object-contain grayscale group-hover:grayscale-0 transition-all duration-500 scale-100 group-hover:scale-105"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                <span className="font-mono text-4xl font-black mb-2 text-gray-300">IEDC</span>
                <span className="text-xs font-mono uppercase tracking-widest">No Banner Uploaded</span>
              </div>
            )}
            
            {/* Date Ticket Stub */}
            <div className="absolute top-0 left-0 bg-white border-r border-b border-gray-200 p-3 text-center min-w-[70px]">
              <span className="block text-2xl font-black text-slate-900 leading-none">
                {dateNum}
              </span>
              <span className="block text-[10px] font-bold text-gray-400 uppercase">
                {monthStr}
              </span>
            </div>
          </div>

          {/* 3. Content Body */}
          <div className="p-6 flex flex-col flex-grow">
            <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-blue-600 transition-colors leading-tight">
              {title}
            </h3>
            
            <div className="space-y-2 mb-6">
              <div className="flex items-center text-sm text-slate-500">
                 <MapPin className="mr-3 text-gray-400" size={14} />
                 <span className="truncate">{location}</span>
              </div>
              <div className="flex items-center text-sm text-slate-500">
                 <CalendarDays className="mr-3 text-gray-400" size={14} />
                 <span>
                    {timeStr}
                 </span>
              </div>
            </div>

            {/* 4. Action Footer */}
            <div className="mt-auto pt-4 border-t border-gray-100 flex justify-between items-center">
               <span className="text-xs font-mono font-bold text-gray-400 uppercase group-hover:text-slate-900 transition-colors">
                 View_Dossier
               </span>
               <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-all">
                 <ArrowRight size={14} className="transform -rotate-45 group-hover:rotate-0 transition-transform duration-300" />
               </div>
            </div>
          </div>
          
        </div>
        {/* --- END EVENT CARD PREVIEW --- */}

      </div>
    </div>
  );
}
