import { useState } from 'react';
import { X, User, Mail, Phone, Calendar, Upload, MapPin } from 'lucide-react';

const EventRegistrationModal = ({ isOpen, onClose, event, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    customFields: {}
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCustomFieldChange = (fieldId, value) => {
    setFormData(prev => ({
      ...prev,
      customFields: {
        ...prev.customFields,
        [fieldId]: value
      }
    }));
  };

  const handleFileUpload = (fieldId, file) => {
    setFormData(prev => ({
      ...prev,
      customFields: {
        ...prev.customFields,
        [fieldId]: file
      }
    }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Name is required');
      return false;
    }

    if (!formData.email.trim()) {
      setError('Email is required');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }

    // Validate required custom fields
    for (const field of event.customRegistrationFields || []) {
      if (field.required && !formData.customFields[field.fieldId]) {
        setError(`${field.label} is required`);
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      // Always use FormData for consistency
      const submitData = new FormData();
      
      // Add basic fields
      submitData.append('name', formData.name);
      submitData.append('email', formData.email);
      submitData.append('phone', formData.phone || '');
      


      // Add custom fields
      const customFieldsArray = [];
      Object.entries(formData.customFields).forEach(([fieldId, value]) => {
        if (value instanceof File) {
          submitData.append(`customField_${fieldId}`, value);
          customFieldsArray.push({ fieldId, value: `file_${fieldId}` });
        } else {
          customFieldsArray.push({ fieldId, value });
        }
      });

      // Important: Stringify the customFields array
      submitData.append('customFields', JSON.stringify(customFieldsArray));
      

      
      // Create a simple test to check if basic registration works
      const testData = new URLSearchParams();
      testData.append('name', formData.name);
      testData.append('email', formData.email);
      testData.append('phone', formData.phone || '');
      testData.append('customFields', JSON.stringify([]));


      
      // Try with direct data submission for debugging
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/events/${event._id}/register`, {
        method: 'POST',
        body: submitData,
      }).then(res => res.json());

      if (response.success) {
        onSuccess();
      } else {
        // Handle success: false from server
        setError(response.message || 'Registration failed. Please try again.');
      }
    } catch (error) {
      console.error('Registration error:', error);
      if (error.message === 'Network Error') {
        setError('Network error. Please check your connection and try again.');
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const renderCustomField = (field) => {
    const fieldValue = formData.customFields[field.fieldId] || '';

    switch (field.fieldType) {
      case 'text':
      case 'email':
      case 'phone':
        return (
          <input
            type={field.fieldType}
            value={fieldValue}
            onChange={(e) => handleCustomFieldChange(field.fieldId, e.target.value)}
            placeholder={field.placeholder}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required={field.required}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={fieldValue}
            onChange={(e) => handleCustomFieldChange(field.fieldId, e.target.value)}
            placeholder={field.placeholder}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required={field.required}
          />
        );

      case 'textarea':
        return (
          <textarea
            value={fieldValue}
            onChange={(e) => handleCustomFieldChange(field.fieldId, e.target.value)}
            placeholder={field.placeholder}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            required={field.required}
          />
        );

      case 'select':
        return (
          <select
            value={fieldValue}
            onChange={(e) => handleCustomFieldChange(field.fieldId, e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required={field.required}
          >
            <option value="">{field.placeholder || 'Select an option'}</option>
            {field.options?.map((option, index) => (
              <option key={index} value={option}>{option}</option>
            ))}
          </select>
        );

      case 'radio':
        return (
          <div className="space-y-2">
            {field.options?.map((option, index) => (
              <label key={index} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={field.fieldId}
                  value={option}
                  checked={fieldValue === option}
                  onChange={(e) => handleCustomFieldChange(field.fieldId, e.target.value)}
                  className="text-blue-600 focus:ring-blue-500"
                  required={field.required}
                />
                <span className="text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        );

      case 'checkbox':
        return (
          <div className="space-y-2">
            {field.options?.map((option, index) => (
              <label key={index} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  value={option}
                  checked={Array.isArray(fieldValue) && fieldValue.includes(option)}
                  onChange={(e) => {
                    const currentValues = Array.isArray(fieldValue) ? fieldValue : [];
                    if (e.target.checked) {
                      handleCustomFieldChange(field.fieldId, [...currentValues, option]);
                    } else {
                      handleCustomFieldChange(field.fieldId, currentValues.filter(v => v !== option));
                    }
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        );

      case 'date':
        return (
          <input
            type="date"
            value={fieldValue}
            onChange={(e) => handleCustomFieldChange(field.fieldId, e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required={field.required}
          />
        );

      case 'file':
        return (
          <div>
            <input
              type="file"
              onChange={(e) => handleFileUpload(field.fieldId, e.target.files[0])}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              accept={field.validation?.fileTypes?.join(',') || '*'}
              required={field.required}
            />
            {field.validation?.fileTypes && (
              <p className="text-xs text-gray-500 mt-1">
                Accepted formats: {field.validation.fileTypes.join(', ')}
              </p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Register for Event</h2>
            <p className="text-gray-600">{event.title}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="inline mr-1" size={16} />
                Full Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Mail className="inline mr-1" size={16} />
                Email Address *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your email address"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Phone className="inline mr-1" size={16} />
                Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your phone number"
              />
            </div>
          </div>

          {/* Custom Fields */}
          {event.customRegistrationFields && event.customRegistrationFields.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h3>
              <div className="space-y-4">
                {event.customRegistrationFields
                  .sort((a, b) => (a.order || 0) - (b.order || 0))
                  .map((field) => (
                    <div key={field.fieldId}>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      {renderCustomField(field)}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Event Details Summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Event Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="text-gray-400" size={16} />
                <span>{new Date(event.startDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="text-gray-400" size={16} />
                <span>{event.location}</span>
              </div>
              {event.registrationFee > 0 && (
                <div className="flex items-center gap-2">
                  <span className="font-medium">Registration Fee: ₹{event.registrationFee}</span>
                </div>
              )}
            </div>
          </div>

          {/* Terms and Conditions */}
          <div className="text-sm text-gray-600">
            <p>
              By registering for this event, you agree to receive communications related to the event
              and acknowledge that your registration information may be shared with event organizers.
            </p>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-4 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Registering...' : 'Register Now'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EventRegistrationModal;
