import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  DollarSign, 
  User, 
  Tag, 
  CheckCircle, 
  XCircle,
  ArrowLeft,
  Share2,
  Heart,
  Eye,
  Camera,
  X
} from 'lucide-react';
import axios from 'axios';
import Loader from '../components/ui/Loader';
import EventRegistrationModal from '../components/ui/EventRegistrationModal';

const EventPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(null);

  useEffect(() => {
    fetchEvent();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchEvent = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/events/${id}`);
      
      if (response.data.success) {
        setEvent(response.data.event);
      } else {
        navigate('/404');
      }
    } catch (error) {
      console.error('Error fetching event:', error);
      navigate('/404');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: event.title,
          text: event.shortDescription,
          url: window.location.href,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback to copying URL
      navigator.clipboard.writeText(window.location.href);
      alert('Event URL copied to clipboard!');
    }
  };

  const getEventStatus = () => {
    const now = new Date();
    const startDate = new Date(event.startDate);
    const endDate = new Date(event.endDate);

    if (event.status === 'cancelled') return { status: 'Cancelled', color: 'bg-red-100 text-red-800' };
    if (event.status === 'completed') return { status: 'Completed', color: 'bg-blue-100 text-blue-800' };
    if (endDate < now) return { status: 'Past', color: 'bg-gray-100 text-gray-800' };
    if (startDate <= now && endDate >= now) return { status: 'Ongoing', color: 'bg-green-100 text-green-800' };
    return { status: 'Upcoming', color: 'bg-yellow-100 text-yellow-800' };
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) return <Loader />;
  if (!event) return <div>Event not found</div>;

  const eventStatus = getEventStatus();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="relative h-96 bg-gradient-to-br from-blue-600 to-purple-700 overflow-hidden">
        {event.images && event.images.length > 0 && (
          <img
            src={`${import.meta.env.VITE_API_URL}${event.images[0]}`}
            alt={event.title}
            className="absolute inset-0 w-full h-full object-cover opacity-30"
          />
        )}
        
        <div className="absolute inset-0 bg-black bg-opacity-40" />
        
        <div className="relative max-w-7xl mx-auto px-6 h-full flex items-center">
          <div className="text-white">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors"
            >
              <ArrowLeft size={20} />
              Back
            </button>
            
            <div className="flex items-center gap-4 mb-4">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${eventStatus.color}`}>
                {eventStatus.status}
              </span>
              <span className="bg-white/20 text-white px-3 py-1 rounded-full text-sm font-medium">
                {event.category}
              </span>
              {event.featured && (
                <span className="bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-sm font-medium">
                  Featured
                </span>
              )}
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold mb-4">{event.title}</h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl">{event.shortDescription}</p>
            
            <div className="flex items-center gap-6 mt-8">
              <button
                onClick={handleShare}
                className="flex items-center gap-2 bg-white/20 text-white px-4 py-2 rounded-lg hover:bg-white/30 transition-colors"
              >
                <Share2 size={18} />
                Share
              </button>
              
              <div className="flex items-center gap-2 text-white/80">
                <Eye size={18} />
                <span>{event.registrationCount || 0} interested</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Event Details */}
            <div className="bg-white rounded-lg shadow-sm p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Event Details</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="flex items-center gap-3">
                  <Calendar className="text-blue-600" size={20} />
                  <div>
                    <p className="font-medium text-gray-900">Date</p>
                    <p className="text-gray-600">{formatDate(event.startDate)}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Clock className="text-blue-600" size={20} />
                  <div>
                    <p className="font-medium text-gray-900">Time</p>
                    <p className="text-gray-600">
                      {formatTime(event.startDate)} - {formatTime(event.endDate)}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <MapPin className="text-blue-600" size={20} />
                  <div>
                    <p className="font-medium text-gray-900">Location</p>
                    <p className="text-gray-600">{event.location}</p>
                    {event.venue && <p className="text-gray-500 text-sm">{event.venue}</p>}
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Users className="text-blue-600" size={20} />
                  <div>
                    <p className="font-medium text-gray-900">Participants</p>
                    <p className="text-gray-600">
                      {event.registrationCount || 0} registered
                      {event.maxParticipants > 0 && ` / ${event.maxParticipants} max`}
                    </p>
                  </div>
                </div>
                
                {event.registrationFee > 0 && (
                  <div className="flex items-center gap-3">
                    <DollarSign className="text-blue-600" size={20} />
                    <div>
                      <p className="font-medium text-gray-900">Registration Fee</p>
                      <p className="text-gray-600">₹{event.registrationFee}</p>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="prose max-w-none">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">About This Event</h3>
                <div className="text-gray-700 whitespace-pre-wrap">{event.description}</div>
              </div>
            </div>

            {/* Speakers */}
            {event.speakers && event.speakers.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Speakers</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {event.speakers.map((speaker, index) => (
                    <div key={index} className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                      <User className="text-gray-400" size={24} />
                      <span className="font-medium text-gray-900">{speaker}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Event Photos */}
            {event.eventPhotos && event.eventPhotos.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <Camera size={24} />
                  Event Photos
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {event.eventPhotos.map((photo, index) => (
                    <img
                      key={index}
                      src={`${import.meta.env.VITE_API_URL}${photo}`}
                      alt={`Event photo ${index + 1}`}
                      className="w-full h-40 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setSelectedPhotoIndex(index)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            {event.tags && event.tags.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {event.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="flex items-center gap-1 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                    >
                      <Tag size={14} />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Registration Card */}
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-6">
              <div className="text-center mb-6">
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  {event.registrationFee > 0 ? `₹${event.registrationFee}` : 'Free'}
                </div>
                <div className="text-gray-600">
                  Registration {event.isRegistrationOpen ? 'Open' : 'Closed'}
                </div>
              </div>

              {event.isRegistrationOpen && !event.isFull && (
                <button
                  onClick={() => setShowRegistrationModal(true)}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Register Now
                </button>
              )}

              {event.isFull && (
                <div className="w-full bg-red-100 text-red-800 py-3 px-4 rounded-lg text-center font-medium">
                  Event Full
                </div>
              )}

              {!event.isRegistrationOpen && (
                <div className="w-full bg-gray-100 text-gray-800 py-3 px-4 rounded-lg text-center font-medium">
                  Registration Closed
                </div>
              )}

              <div className="mt-6 pt-6 border-t">
                <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                  <span>Registration Deadline</span>
                </div>
                <div className="text-gray-900 font-medium">
                  {formatDate(event.registrationDeadline)}
                </div>
              </div>

              {event.maxParticipants > 0 && (
                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                    <span>Availability</span>
                    <span>{event.maxParticipants - (event.registrationCount || 0)} spots left</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${Math.min(((event.registrationCount || 0) / event.maxParticipants) * 100, 100)}%` 
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Coordinators */}
            {event.coordinators && event.coordinators.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Coordinators</h3>
                <div className="space-y-3">
                  {event.coordinators.map(coordinator => (
                    <div key={coordinator._id} className="flex items-center gap-3">
                      <img
                        src={coordinator.profilePicture 
                          ? `${import.meta.env.VITE_API_URL}${coordinator.profilePicture}`
                          : `https://ui-avatars.com/api/?name=${encodeURIComponent(coordinator.name)}&background=random&size=40`
                        }
                        alt={coordinator.name}
                        className="w-10 h-10 rounded-full"
                      />
                      <div>
                        <div className="font-medium text-gray-900">{coordinator.name}</div>
                        <div className="text-sm text-gray-600">{coordinator.role}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Event Statistics */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Stats</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Registrations</span>
                  <span className="font-medium text-gray-900">{event.registrationCount || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Category</span>
                  <span className="font-medium text-gray-900">{event.category}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Status</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${eventStatus.color}`}>
                    {eventStatus.status}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Registration Modal */}
      {showRegistrationModal && (
        <EventRegistrationModal
          isOpen={showRegistrationModal}
          onClose={() => setShowRegistrationModal(false)}
          event={event}
          onSuccess={() => {
            setShowRegistrationModal(false);
            fetchEvent(); // Refresh event data
          }}
        />
      )}

      {/* Photo Viewer Modal */}
      {selectedPhotoIndex !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50" onClick={() => setSelectedPhotoIndex(null)}>
          <div className="relative max-w-4xl max-h-full p-4">
            <button
              onClick={() => setSelectedPhotoIndex(null)}
              className="absolute top-6 right-6 text-white hover:text-gray-300 z-10"
            >
              <X size={32} />
            </button>
            <img
              src={`${import.meta.env.VITE_API_URL}${event.eventPhotos[selectedPhotoIndex]}`}
              alt={`Event photo ${selectedPhotoIndex + 1}`}
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-2">
              <button
                onClick={() => setSelectedPhotoIndex(Math.max(0, selectedPhotoIndex - 1))}
                disabled={selectedPhotoIndex === 0}
                className="bg-white/20 text-white px-3 py-2 rounded-lg hover:bg-white/30 transition-colors disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setSelectedPhotoIndex(Math.min(event.eventPhotos.length - 1, selectedPhotoIndex + 1))}
                disabled={selectedPhotoIndex === event.eventPhotos.length - 1}
                className="bg-white/20 text-white px-3 py-2 rounded-lg hover:bg-white/30 transition-colors disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventPage;
