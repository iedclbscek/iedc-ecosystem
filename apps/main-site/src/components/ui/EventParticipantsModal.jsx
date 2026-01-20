import { useState } from 'react';
import { X, Search, Download, Mail, User, Phone, Calendar, Users } from 'lucide-react';

const EventParticipantsModal = ({ isOpen, onClose, event }) => {
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen || !event) return null;

  // Filter participants based on search term
  const filteredParticipants = event.registrations?.filter(participant => {
    if (!participant) return false;
    
    const matchesSearch = searchTerm === '' || 
      participant.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      participant.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  }) || [];

  // Function to export participants as CSV
  const exportParticipantsCSV = () => {
    if (!event.registrations?.length) return;
    
    // Get all unique custom field labels
    const customFieldLabels = [];
    event.registrations.forEach(reg => {
      if (reg.customFields) {
        reg.customFields.forEach(field => {
          if (!customFieldLabels.includes(field.fieldId)) {
            customFieldLabels.push(field.fieldId);
          }
        });
      }
    });
    
    // Create header row
    let csv = ['Name,Email,Phone,Registration Date'];
    
    // Add custom field headers
    if (customFieldLabels.length > 0) {
      // Find the custom field definitions to get proper labels
      customFieldLabels.forEach(fieldId => {
        const fieldDef = event.customRegistrationFields?.find(f => f.fieldId === fieldId);
        if (fieldDef) {
          csv[0] += `,${fieldDef.label}`;
        } else {
          csv[0] += `,${fieldId}`;
        }
      });
    }
    
    // Add participant rows
    event.registrations.forEach(participant => {
      const registrationDate = new Date(participant.registeredAt).toLocaleDateString();
      let row = `${participant.name},${participant.email},${participant.phone || ''},${registrationDate}`;
      
      // Add custom field values
      if (customFieldLabels.length > 0) {
        customFieldLabels.forEach(fieldId => {
          const customField = participant.customFields?.find(f => f.fieldId === fieldId);
          row += `,${customField?.value || ''}`;
        });
      }
      
      csv.push(row);
    });
    
    // Create and download CSV file
    const csvContent = csv.join('\\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${event.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-participants.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Registered Participants</h2>
            <p className="text-gray-600">{event.title}</p>
            <div className="flex items-center mt-2 text-sm text-gray-500">
              <Calendar className="w-4 h-4 mr-1" />
              <span>{new Date(event.startDate).toLocaleDateString()}</span>
              <span className="mx-1">•</span>
              <Users className="w-4 h-4 mr-1" />
              <span>{event.registrations?.length || 0} participants</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6 border-b">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search participants..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <button 
              onClick={exportParticipantsCSV}
              disabled={!event.registrations?.length}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={18} />
              Export CSV
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto p-6">
          {!event.registrations?.length ? (
            <div className="text-center py-10 text-gray-500">
              No participants have registered for this event yet.
            </div>
          ) : filteredParticipants.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              No participants match your search.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">Name</th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">Email</th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">Phone</th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">Registration Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredParticipants.map((participant, index) => (
                    <tr 
                      key={index}
                      className={`border-b border-gray-100 hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                    >
                      <td className="py-3 px-4 text-sm">
                        <div className="flex items-center">
                          <User className="w-4 h-4 text-gray-400 mr-2" />
                          {participant.name}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <div className="flex items-center">
                          <Mail className="w-4 h-4 text-gray-400 mr-2" />
                          <a href={`mailto:${participant.email}`} className="text-blue-600 hover:underline">
                            {participant.email}
                          </a>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {participant.phone ? (
                          <div className="flex items-center">
                            <Phone className="w-4 h-4 text-gray-400 mr-2" />
                            <a href={`tel:${participant.phone}`} className="text-blue-600 hover:underline">
                              {participant.phone}
                            </a>
                          </div>
                        ) : (
                          <span className="text-gray-400">Not provided</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {new Date(participant.registeredAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        <div className="p-4 border-t bg-gray-50">
          <div className="text-sm text-gray-500 flex items-center justify-between">
            <div>
              Showing {filteredParticipants.length} of {event.registrations?.length || 0} participants
            </div>
            {event.maxParticipants > 0 && (
              <div className="flex items-center">
                <div className="w-full bg-gray-200 rounded-full h-2 max-w-[200px]">
                  <div 
                    className={`h-2 rounded-full ${event.isFull ? 'bg-red-500' : 'bg-green-500'}`}
                    style={{ width: `${(event.registrations?.length / event.maxParticipants) * 100}%` }}
                  ></div>
                </div>
                <span className="ml-2">{event.registrations?.length}/{event.maxParticipants} spots filled</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventParticipantsModal;
