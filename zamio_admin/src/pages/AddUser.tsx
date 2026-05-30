import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  User,
  Music,
  Radio,
  Building,
  Mail,
  Phone,
  MapPin,
  Calendar,
  FileText,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { Card } from '@zamio/ui';

interface UserFormData {
  name: string;
  email: string;
  phone: string;
  territory: string;
  type: 'artist' | 'station' | 'publisher';
  bio?: string;
  // Artist-specific
  genre?: string;
  totalTracks?: number;
  // Station-specific
  stationType?: 'Radio' | 'TV' | 'Digital';
  broadcastHours?: number;
  coverage?: string;
  // Publisher-specific
  companyName?: string;
  activeAgreements?: number;
  catalogSize?: number;
}

const AddUser = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<UserFormData>({
    name: '',
    email: '',
    phone: '',
    territory: '',
    type: 'artist',
  });
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field: keyof UserFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string | undefined> = {};

    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone is required';
    if (!formData.territory.trim()) newErrors.territory = 'Territory is required';

    // Type-specific validation
    if (formData.type === 'artist') {
      if (!formData.bio?.trim()) newErrors.bio = 'Bio is required for artists';
    } else if (formData.type === 'station') {
      if (!formData.stationType) newErrors.stationType = 'Station type is required';
    } else if (formData.type === 'publisher') {
      if (!formData.companyName?.trim()) newErrors.companyName = 'Company name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    setIsSubmitting(false);
    // In a real app, you'd handle the response here
    navigate('/user-management');
  };

  const renderTypeSpecificFields = () => {
    switch (formData.type) {
      case 'artist':
        return (
          <>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Bio *
              </label>
              <textarea
                rows={4}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white ${errors.bio ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="Artist biography and background..."
                value={formData.bio || ''}
                onChange={(e) => handleInputChange('bio', e.target.value)}
              />
              {errors.bio && <p className="mt-1 text-sm text-red-600">{errors.bio}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Primary Genre
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                value={formData.genre || ''}
                onChange={(e) => handleInputChange('genre', e.target.value)}
              >
                <option value="">Select Genre</option>
                <option value="afrobeats">Afrobeats</option>
                <option value="hiplife">Hiplife</option>
                <option value="gospel">Gospel</option>
                <option value="highlife">Highlife</option>
                <option value="drill">Drill</option>
              </select>
            </div>
          </>
        );
      case 'station':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Station Type *
              </label>
              <select
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white ${errors.stationType ? 'border-red-500' : 'border-gray-300'}`}
                value={formData.stationType || ''}
                onChange={(e) => handleInputChange('stationType', e.target.value)}
              >
                <option value="">Select Type</option>
                <option value="Radio">Radio</option>
                <option value="TV">TV</option>
                <option value="Digital">Digital</option>
              </select>
              {errors.stationType && <p className="mt-1 text-sm text-red-600">{errors.stationType}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Daily Broadcast Hours
              </label>
              <input
                type="number"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                placeholder="18"
                value={formData.broadcastHours || ''}
                onChange={(e) => handleInputChange('broadcastHours', parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Coverage Area
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                placeholder="Greater Accra Region"
                value={formData.coverage || ''}
                onChange={(e) => handleInputChange('coverage', e.target.value)}
              />
            </div>
          </>
        );
      case 'publisher':
        return (
          <>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Company Name *
              </label>
              <input
                type="text"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white ${errors.companyName ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="Universal Music Publishing Ghana"
                value={formData.companyName || ''}
                onChange={(e) => handleInputChange('companyName', e.target.value)}
              />
              {errors.companyName && <p className="mt-1 text-sm text-red-600">{errors.companyName}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Active Agreements
              </label>
              <input
                type="number"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                placeholder="45"
                value={formData.activeAgreements || ''}
                onChange={(e) => handleInputChange('activeAgreements', parseInt(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Catalog Size (tracks)
              </label>
              <input
                type="number"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                placeholder="15000"
                value={formData.catalogSize || ''}
                onChange={(e) => handleInputChange('catalogSize', parseInt(e.target.value) || 0)}
              />
            </div>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <main className="w-full px-6 py-8 min-h-screen">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-6">
            <button
              onClick={() => navigate('/user-management')}
              className="flex items-center space-x-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Users</span>
            </button>
          </div>

          <div className="flex items-center space-x-6">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <User className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Add New User</h1>
              <p className="text-lg text-gray-600 dark:text-gray-400">Create a new user account for the platform</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* User Type Selection */}
          <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-8">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">User Type</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { type: 'artist', icon: Music, label: 'Artist', desc: 'Individual music creators and performers' },
                { type: 'station', icon: Radio, label: 'Station', desc: 'Radio, TV, or digital broadcast stations' },
                { type: 'publisher', icon: Building, label: 'Publisher', desc: 'Music publishing companies and rights holders' },
              ].map(({ type, icon: Icon, label, desc }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleInputChange('type', type as any)}
                  className={`p-6 border-2 rounded-xl text-left transition-all duration-200 ${
                    formData.type === type
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500'
                  }`}
                >
                  <Icon className={`w-8 h-8 mb-3 ${formData.type === type ? 'text-blue-600' : 'text-gray-400'}`} />
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-1">{label}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{desc}</p>
                </button>
              ))}
            </div>
          </Card>

          {/* Basic Information */}
          <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-8">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="Enter full name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                />
                {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="email"
                    className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="user@example.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                  />
                </div>
                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Phone Number *
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="tel"
                    className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white ${errors.phone ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="+233 20 123 4567"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                  />
                </div>
                {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Territory *
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white ${errors.territory ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="Ghana, West Africa"
                    value={formData.territory}
                    onChange={(e) => handleInputChange('territory', e.target.value)}
                  />
                </div>
                {errors.territory && <p className="mt-1 text-sm text-red-600">{errors.territory}</p>}
              </div>
            </div>
          </Card>

          {/* Type-Specific Fields */}
          {formData.type && (
            <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-8">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                {formData.type === 'artist' && 'Artist Information'}
                {formData.type === 'station' && 'Station Information'}
                {formData.type === 'publisher' && 'Publisher Information'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {renderTypeSpecificFields()}
              </div>
            </Card>
          )}

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-8 py-3 bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-400 dark:to-blue-500 text-white rounded-lg font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center space-x-2 ${
                isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Creating User...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Create User</span>
                </>
              )}
            </button>
          </div>
        </form>
      </main>
  );
};

export default AddUser;
