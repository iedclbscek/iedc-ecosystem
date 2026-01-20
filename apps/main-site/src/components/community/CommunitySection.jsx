import { ArrowRight, Terminal } from 'lucide-react';

const CommunitySection = ({ title, content, type = 'paragraph' }) => {
  
  // 1. Render List (for Activities, Why Join, etc.)
  if (type === 'list' && Array.isArray(content)) {
    return (
      <div className="w-full">
        {title && (
          <h3 className="text-lg font-bold text-text-dark mb-4 uppercase tracking-wider flex items-center gap-2">
            <Terminal className="w-4 h-4 text-accent" />
            {title}
          </h3>
        )}
        <div className="grid md:grid-cols-2 gap-4">
          {content.map((item, index) => (
            <div 
              key={index} 
              className="group p-4 border border-gray-200 bg-gray-50/50 hover:bg-white hover:border-accent transition-all duration-300 hover:-translate-y-1"
            >
              <div className="flex items-center justify-between mb-2 opacity-50 group-hover:opacity-100 transition-opacity">
                <span className="font-mono text-[10px] font-bold text-accent">
                  ITEM_{String(index + 1).padStart(2, '0')}
                </span>
                <ArrowRight className="w-3 h-3 text-gray-400 group-hover:text-accent -translate-x-2 group-hover:translate-x-0 transition-transform" />
              </div>
              
              {/* Handle if item is an object (name/description) or just a string */}
              {typeof item === 'object' ? (
                <>
                  <h4 className="font-bold text-text-dark text-sm mb-1">{item.name}</h4>
                  <p className="text-xs text-text-light leading-relaxed">{item.description}</p>
                </>
              ) : (
                <p className="text-sm font-medium text-text-dark leading-snug">
                  {item}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 2. Render Standard Text (Vision, Mission, Long Description)
  return (
    <div className="w-full">
      {title && (
        <h3 className="text-lg font-bold text-text-dark mb-4 uppercase tracking-wider">
          {title}
        </h3>
      )}
      <div className="p-6 border-l-2 border-gray-200 hover:border-accent bg-gradient-to-r from-gray-50 to-transparent transition-colors duration-500">
        <p className="text-text-light leading-relaxed whitespace-pre-line text-base">
          {content}
        </p>
      </div>
    </div>
  );
};

export default CommunitySection;