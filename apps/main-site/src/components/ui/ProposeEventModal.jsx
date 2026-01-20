import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { FaTimes, FaCalendarAlt, FaUsers, FaClock, FaMapMarkerAlt, FaDollarSign } from 'react-icons/fa';
import axios from 'axios';

const ProposeEventModal = ({ isOpen, onClose, onProposalSubmitted }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    shortDescription: '',
    category: '',
    targetAudience: '',
    estimatedDuration: '',
    estimatedParticipants: '',
    proposedDate: '',
    alternativeDate: '',
    venue: '',
    budget: {
      estimated: '',
      breakdown: '',
      sponsorshipRequired: false,
    },
    resources: {
      techRequirements: '',
      materialNeeds: '',
      speakerRequired: false,
      speakerDetails: '',
    },
    objectives: '',
    expectedOutcomes: '',
    additionalNotes: '',
    proposerContact: '',
  });

  const categories = [
    "Workshop",
    "Bootcamp", 
    "Hackathon",
    "Competition",
    "Seminar",
    "Conference",
    "Networking",
    "Startup Pitch",
    "Innovation Challenge",
    "Ideathon",
    "Other"
  ];

  const targetAudiences = [
    "All Students",
    "1st Year",
    "2nd Year", 
    "3rd Year",
    "4th Year",
    "Specific Department",
    "Entrepreneurs",
    "Developers",
    "Designers",
    "Other"
  ];

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: type === 'checkbox' ? checked : value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/events/propose`,
        formData,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        toast.success('Event proposal submitted successfully!');
        onProposalSubmitted?.(response.data.proposal);
        onClose();
        setFormData({
          title: '',
          description: '',
          shortDescription: '',
          category: '',
          targetAudience: '',
          estimatedDuration: '',
          estimatedParticipants: '',
          proposedDate: '',
          alternativeDate: '',
          venue: '',
          budget: {
            estimated: '',
            breakdown: '',
            sponsorshipRequired: false,
          },
          resources: {
            techRequirements: '',
            materialNeeds: '',
            speakerRequired: false,
            speakerDetails: '',
          },
          objectives: '',
          expectedOutcomes: '',
          additionalNotes: '',
          proposerContact: '',
        });
      }
    } catch (error) {
      console.error('Error submitting proposal:', error);
      toast.error(error.response?.data?.message || 'Failed to submit proposal');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Propose New Event</h2>
            <p className="text-gray-600 mt-1">Submit your event idea for review by the IEDC team</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FaTimes size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <FaCalendarAlt className="mr-2 text-blue-600" />
              Basic Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Event Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  maxLength="100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter event title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select category</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Audience *
                </label>
                <select
                  name="targetAudience"
                  value={formData.targetAudience}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select target audience</option>
                  {targetAudiences.map(audience => (
                    <option key={audience} value={audience}>{audience}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Short Description *
                </label>
                <textarea
                  name="shortDescription"
                  value={formData.shortDescription}
                  onChange={handleInputChange}
                  required
                  maxLength="200"
                  rows="2"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Brief description (max 200 characters)"
                />
                <div className="text-xs text-gray-500 mt-1">
                  {formData.shortDescription.length}/200 characters
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Detailed Description *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                  maxLength="2000"
                  rows="4"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Detailed description of the event"
                />
                <div className="text-xs text-gray-500 mt-1">
                  {formData.description.length}/2000 characters
                </div>
              </div>
            </div>
          </div>

          {/* Event Details */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <FaUsers className="mr-2 text-green-600" />
              Event Details
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <FaClock className="inline mr-1" />
                  Estimated Duration *
                </label>
                <input
                  type="text"
                  name="estimatedDuration"
                  value={formData.estimatedDuration}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 2 hours, 1 day, 3 days"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <FaUsers className="inline mr-1" />
                  Expected Participants *
                </label>
                <input
                  type="number"
                  name="estimatedParticipants"
                  value={formData.estimatedParticipants}
                  onChange={handleInputChange}
                  required
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Number of participants"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Proposed Date *
                </label>
                <input
                  type="date"
                  name="proposedDate"
                  value={formData.proposedDate}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Alternative Date
                </label>
                <input
                  type="date"
                  name="alternativeDate"
                  value={formData.alternativeDate}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <FaMapMarkerAlt className="inline mr-1" />
                  Venue Preference *
                </label>
                <input
                  type="text"
                  name="venue"
                  value={formData.venue}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Auditorium, Lab, Outdoor space"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your Contact Number
                </label>
                <input
                  type="tel"
                  name="proposerContact"
                  value={formData.proposerContact}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Your phone number"
                />
              </div>
            </div>
          </div>

          {/* Budget & Resources */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <FaDollarSign className="mr-2 text-yellow-600" />
              Budget & Resources
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estimated Budget (₹)
                </label>
                <input
                  type="number"
                  name="budget.estimated"
                  value={formData.budget.estimated}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter amount in rupees"
                />
              </div>

              <div className="flex items-center">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="budget.sponsorshipRequired"
                    checked={formData.budget.sponsorshipRequired}
                    onChange={handleInputChange}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Sponsorship Required</span>
                </label>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Budget Breakdown
                </label>
                <textarea
                  name="budget.breakdown"
                  value={formData.budget.breakdown}
                  onChange={handleInputChange}
                  maxLength="1000"
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Break down the budget items (venue, materials, speaker fees, etc.)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Technical Requirements
                </label>
                <textarea
                  name="resources.techRequirements"
                  value={formData.resources.techRequirements}
                  onChange={handleInputChange}
                  maxLength="500"
                  rows="2"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Projector, microphone, laptops, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Material Needs
                </label>
                <textarea
                  name="resources.materialNeeds"
                  value={formData.resources.materialNeeds}
                  onChange={handleInputChange}
                  maxLength="500"
                  rows="2"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Stationery, certificates, refreshments, etc."
                />
              </div>

              <div className="md:col-span-2">
                <label className="flex items-center mb-2">
                  <input
                    type="checkbox"
                    name="resources.speakerRequired"
                    checked={formData.resources.speakerRequired}
                    onChange={handleInputChange}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">External Speaker Required</span>
                </label>
                {formData.resources.speakerRequired && (
                  <textarea
                    name="resources.speakerDetails"
                    value={formData.resources.speakerDetails}
                    onChange={handleInputChange}
                    maxLength="500"
                    rows="2"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Speaker requirements, preferred profile, topic expertise, etc."
                  />
                )}
              </div>
            </div>
          </div>

          {/* Objectives & Outcomes */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Objectives & Expected Outcomes
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Event Objectives *
                </label>
                <textarea
                  name="objectives"
                  value={formData.objectives}
                  onChange={handleInputChange}
                  required
                  maxLength="1000"
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="What do you hope to achieve with this event?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expected Outcomes
                </label>
                <textarea
                  name="expectedOutcomes"
                  value={formData.expectedOutcomes}
                  onChange={handleInputChange}
                  maxLength="1000"
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="What impact or results do you expect?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Additional Notes
                </label>
                <textarea
                  name="additionalNotes"
                  value={formData.additionalNotes}
                  onChange={handleInputChange}
                  maxLength="1000"
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Any other details you'd like to mention"
                />
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Submitting...
                </>
              ) : (
                'Submit Proposal'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProposeEventModal;
