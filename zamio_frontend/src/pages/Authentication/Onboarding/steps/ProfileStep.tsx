import React, { useCallback, useEffect, useState } from 'react';
import { Camera, Instagram, Twitter, Facebook, Youtube } from 'lucide-react';
import { OnboardingStepProps } from '../../../../components/onboarding/OnboardingWizard';
import { useArtistOnboarding } from '../ArtistOnboardingContext';

const readString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

const ProfileStep: React.FC<OnboardingStepProps> = ({ registerNextHandler }) => {
  const { status, submitProfile } = useArtistOnboarding();
  const [formData, setFormData] = useState({
    artistName: '',
    bio: '',
    genre: '',
    style: '',
    location: '',
    website: '',
    instagram: '',
    twitter: '',
    facebook: '',
    youtube: '',
  });
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const profile = (status?.profile ?? {}) as Record<string, unknown>;
    const social = (status?.social_links ?? {}) as Record<string, unknown>;

    const stageName = readString(profile['stage_name']) ?? readString(profile['stageName']);
    const bio = readString(profile['bio']);
    const primaryGenre = readString(profile['primary_genre']);
    const musicStyle = readString(profile['music_style']);
    const location = readString(profile['location']);
    const website = readString(profile['website']);

    setFormData((prev) => ({
      ...prev,
      artistName: stageName ?? prev.artistName,
      bio: bio ?? prev.bio,
      genre: primaryGenre ?? prev.genre,
      style: musicStyle ?? prev.style,
      location: location ?? prev.location,
      website: website ?? prev.website,
      instagram: readString(social['instagram']) ?? prev.instagram,
      twitter: readString(social['twitter']) ?? prev.twitter,
      facebook: readString(social['facebook']) ?? prev.facebook,
      youtube: readString(social['youtube']) ?? prev.youtube,
    }));

    const photo =
      readString(profile['photo']) ??
      readString(profile['profile_image']) ??
      readString(profile['profileImage']);
    if (photo) {
      setProfileImage(photo);
    }
  }, [status]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfileImageFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setProfileImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const genres = [
    'Afrobeats',
    'Afro-Pop',
    'Afro-Fusion',
    'Highlife',
    'Hiplife',
    'Gospel',
    'Reggae/Dancehall',
    'Hip-Hop/Rap',
    "R&B/Soul",
    'Traditional',
    'Jazz',
    'Electronic',
    'Rock',
    'Other',
  ];

  const styles = [
    'Contemporary',
    'Traditional',
    'Fusion',
    'Experimental',
    'Commercial',
    'Underground',
    'Mainstream',
    'Alternative',
  ];

  const handleSubmit = useCallback(async () => {
    setErrorMessage(null);
    const trimmedName = formData.artistName.trim();
    const trimmedBio = formData.bio.trim();
    const trimmedGenre = formData.genre.trim();

    const missing: string[] = [];
    if (!trimmedName) {
      missing.push('artist name');
    }
    if (!trimmedBio) {
      missing.push('bio');
    }
    if (!trimmedGenre) {
      missing.push('primary genre');
    }

    if (missing.length > 0) {
      const readable =
        missing.length === 1
          ? missing[0]
          : missing.length === 2
            ? `${missing[0]} and ${missing[1]}`
            : `${missing.slice(0, -1).join(', ')}, and ${missing[missing.length - 1]}`;
      setErrorMessage(`Please add your ${readable} before continuing.`);
      return false;
    }

    setIsSubmitting(true);
    try {
      await submitProfile({
        ...formData,
        artistName: trimmedName,
        bio: trimmedBio,
        genre: trimmedGenre,
        style: formData.style.trim(),
        location: formData.location.trim(),
        website: formData.website.trim(),
        instagram: formData.instagram.trim(),
        twitter: formData.twitter.trim(),
        facebook: formData.facebook.trim(),
        youtube: formData.youtube.trim(),
        profileImage: profileImageFile,
      });
      return true;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to save your profile right now. Please try again.';
      setErrorMessage(message);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, profileImageFile, submitProfile]);

  useEffect(() => {
    registerNextHandler?.(() => handleSubmit());
    return () => {
      registerNextHandler?.(null);
    };
  }, [handleSubmit, registerNextHandler]);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-white mb-2">Complete Your Artist Profile</h2>
        <p className="text-slate-300">
          Tell us about yourself and your music to help us personalize your experience.
        </p>
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {errorMessage}
        </div>
      )}

      <div className="space-y-8">
        {/* Profile Picture Upload */}
        <div className="flex items-center space-x-6">
          <div className="relative">
            <div
              className={`w-24 h-24 rounded-full border-2 border-dashed flex items-center justify-center bg-slate-800/50 ${
                profileImage ? 'border-indigo-400' : 'border-slate-600'
              }`}
            >
              {profileImage ? (
                <img src={profileImage} alt="Profile" className="w-full h-full rounded-full object-cover" />
              ) : (
                <Camera className="w-8 h-8 text-slate-400" />
              )}
            </div>
            <label className="absolute -bottom-2 -right-2 w-8 h-8 bg-indigo-500 hover:bg-indigo-400 rounded-full flex items-center justify-center cursor-pointer transition-colors">
              <Camera className="w-4 h-4 text-white" />
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
          </div>
          <div>
            <h3 className="text-lg font-medium text-white mb-1">Profile Picture</h3>
            <p className="text-sm text-slate-400">Upload a photo that represents you as an artist</p>
            {isSubmitting && profileImageFile && (
              <p className="mt-2 text-xs text-indigo-200">Uploading…</p>
            )}
          </div>
        </div>

        {/* Basic Information */}
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="artistName" className="block text-sm font-medium text-slate-200 mb-2">
              Artist Name *
            </label>
            <input
              id="artistName"
              name="artistName"
              type="text"
              required
              value={formData.artistName}
              onChange={handleInputChange}
              className="w-full rounded-lg border border-white/20 bg-slate-800/50 px-4 py-3 text-white placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              placeholder="Your artist name"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label htmlFor="location" className="block text-sm font-medium text-slate-200 mb-2">
              Location
            </label>
            <input
              id="location"
              name="location"
              type="text"
              value={formData.location}
              onChange={handleInputChange}
              className="w-full rounded-lg border border-white/20 bg-slate-800/50 px-4 py-3 text-white placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              placeholder="City, Country"
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Bio */}
        <div>
          <label htmlFor="bio" className="block text-sm font-medium text-slate-200 mb-2">
            Artist Bio
          </label>
          <textarea
            id="bio"
            name="bio"
            value={formData.bio}
            onChange={handleInputChange}
            rows={4}
            className="w-full rounded-lg border border-white/20 bg-slate-800/50 px-4 py-3 text-white placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            placeholder="Tell us about your musical journey, influences, and what makes your music unique..."
            disabled={isSubmitting}
          />
        </div>

        {/* Music Information */}
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="genre" className="block text-sm font-medium text-slate-200 mb-2">
              Primary Genre
            </label>
            <select
              id="genre"
              name="genre"
              value={formData.genre}
              onChange={handleInputChange}
              className="w-full rounded-lg border border-white/20 bg-slate-800/50 px-4 py-3 text-white focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              disabled={isSubmitting}
            >
              <option value="">Select your primary genre</option>
              {genres.map((genre) => (
                <option key={genre} value={genre}>
                  {genre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="style" className="block text-sm font-medium text-slate-200 mb-2">
              Musical Style
            </label>
            <select
              id="style"
              name="style"
              value={formData.style}
              onChange={handleInputChange}
              className="w-full rounded-lg border border-white/20 bg-slate-800/50 px-4 py-3 text-white focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              disabled={isSubmitting}
            >
              <option value="">Select your musical style</option>
              {styles.map((style) => (
                <option key={style} value={style}>
                  {style}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Website */}
        <div>
          <label htmlFor="website" className="block text-sm font-medium text-slate-200 mb-2">
            Website (Optional)
          </label>
          <input
            id="website"
            name="website"
            type="url"
            value={formData.website}
            onChange={handleInputChange}
            className="w-full rounded-lg border border-white/20 bg-slate-800/50 px-4 py-3 text-white placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            placeholder="https://yourwebsite.com"
            disabled={isSubmitting}
          />
        </div>

        {/* Social Media Links */}
        <div>
          <h3 className="text-lg font-medium text-white mb-4">Social Media Links</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="relative">
              <Instagram className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-pink-400" />
              <input
                type="url"
                name="instagram"
                value={formData.instagram}
                onChange={handleInputChange}
                placeholder="https://instagram.com/username"
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-white/20 bg-slate-800/50 text-white placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                disabled={isSubmitting}
              />
            </div>
            <div className="relative">
              <Twitter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-blue-400" />
              <input
                type="url"
                name="twitter"
                value={formData.twitter}
                onChange={handleInputChange}
                placeholder="https://twitter.com/username"
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-white/20 bg-slate-800/50 text-white placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                disabled={isSubmitting}
              />
            </div>
            <div className="relative">
              <Facebook className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-blue-500" />
              <input
                type="url"
                name="facebook"
                value={formData.facebook}
                onChange={handleInputChange}
                placeholder="https://facebook.com/username"
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-white/20 bg-slate-800/50 text-white placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                disabled={isSubmitting}
              />
            </div>
            <div className="relative">
              <Youtube className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-red-500" />
              <input
                type="url"
                name="youtube"
                value={formData.youtube}
                onChange={handleInputChange}
                placeholder="https://youtube.com/@channel"
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-white/20 bg-slate-800/50 text-white placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                disabled={isSubmitting}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end text-xs text-slate-400">
          {isSubmitting ? 'Saving your profile…' : 'All changes are saved when you continue'}
        </div>
      </div>
    </div>
  );
};

export default ProfileStep;
