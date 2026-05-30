import React, { useState } from 'react';
import { Users, Search, Plus, Mail, CheckCircle, AlertCircle } from 'lucide-react';
import { isAxiosError } from 'axios';

import {
  usePublisherOnboarding,
  type InviteArtistPayload,
} from '../PublisherOnboardingContext';
import type { PublisherArtistSearchResult } from '../../../lib/api';

interface ArtistManagementStepProps {
  onNext: () => void;
  onPrevious: () => void;
}

const ArtistManagementStep: React.FC<ArtistManagementStepProps> = ({ onNext, onPrevious }) => {
  const { linkedArtists, searchArtists, linkArtist, inviteArtist } = usePublisherOnboarding();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PublisherArtistSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedArtistId, setSelectedArtistId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isLinking, setIsLinking] = useState(false);
  const [inviteForm, setInviteForm] = useState<InviteArtistPayload>({ email: '', message: '' });
  const [isInviting, setIsInviting] = useState(false);

  const handleSearch = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatusMessage(null);

    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchArtists(searchQuery);
      setSearchResults(results ?? []);
    } catch (error) {
      setStatusMessage({ type: 'error', message: 'Unable to search for artists. Please try again later.' });
      // eslint-disable-next-line no-console
      console.error('Artist search failed', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleLinkArtist = async () => {
    if (!selectedArtistId) {
      setStatusMessage({ type: 'error', message: 'Select an artist to link before continuing.' });
      return;
    }

    setIsLinking(true);
    setStatusMessage(null);
    try {
      await linkArtist({ artistId: selectedArtistId });
      setStatusMessage({ type: 'success', message: 'Artist linked successfully.' });
      setSelectedArtistId(null);
      onNext();
    } catch (error) {
      if (isAxiosError(error) && error.response) {
        const data = error.response.data as { message?: string };
        setStatusMessage({ type: 'error', message: data?.message || 'Unable to link artist. Please try again.' });
      } else {
        setStatusMessage({ type: 'error', message: 'Unable to link artist. Please try again.' });
      }
    } finally {
      setIsLinking(false);
    }
  };

  const handleSkip = async () => {
    setIsLinking(true);
    setStatusMessage(null);
    try {
      await linkArtist();
      setStatusMessage({ type: 'success', message: 'You can link artists at any time from the dashboard.' });
      onNext();
    } catch (error) {
      setStatusMessage({ type: 'error', message: 'Unable to update artist relationships. Please try again.' });
    } finally {
      setIsLinking(false);
    }
  };

  const handleInviteChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setInviteForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleInviteArtist = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatusMessage(null);

    if (!inviteForm.email.trim()) {
      setStatusMessage({ type: 'error', message: 'Enter an email address to send an invitation.' });
      return;
    }

    setIsInviting(true);
    try {
      await inviteArtist({
        email: inviteForm.email.trim().toLowerCase(),
        message: inviteForm.message.trim() || undefined,
      });
      setStatusMessage({ type: 'success', message: 'Invitation sent successfully.' });
      setInviteForm({ email: '', message: '' });
    } catch (error) {
      if (isAxiosError(error) && error.response) {
        const data = error.response.data as { message?: string; errors?: Record<string, unknown> };
        const message =
          data?.message ||
          (Array.isArray(data?.errors?.email) ? String(data?.errors?.email[0]) : undefined) ||
          'Unable to send invitation. Please try again.';
        setStatusMessage({ type: 'error', message });
      } else {
        setStatusMessage({ type: 'error', message: 'Unable to send invitation. Please try again.' });
      }
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <div className="py-8">
      <div className="text-center mb-8">
        <h3 className="text-3xl font-semibold text-white mb-4">Artist Management</h3>
        <p className="text-slate-300 text-lg max-w-2xl mx-auto">
          Link artists and songwriters to your publishing catalog to manage splits, contracts, and royalty distributions.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900/60 rounded-2xl border border-white/10 p-6">
            <h4 className="text-xl font-semibold text-white mb-4 flex items-center space-x-3">
              <Users className="w-5 h-5 text-indigo-300" />
              <span>Linked Artists</span>
            </h4>
            {linkedArtists.length === 0 ? (
              <p className="text-sm text-slate-400">No artists linked yet. Search for an artist or send an invitation.</p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-white/10">
                <table className="min-w-full divide-y divide-white/10">
                  <thead className="bg-slate-900/60">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">Artist</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">Relationship</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">Linked</th>
                    </tr>
                  </thead>
                  <tbody className="bg-slate-900/30 divide-y divide-white/5">
                    {linkedArtists.map((artist) => (
                      <tr key={artist.artist_id ?? artist.stage_name}>
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-white">{artist.stage_name ?? 'Unnamed Artist'}</span>
                            <span className="text-xs text-slate-400">{artist.email ?? 'Email not provided'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-300">{artist.relationship_type ?? 'Linked'}</td>
                        <td className="px-4 py-3 text-sm text-slate-300">
                          {artist.linked_date ? new Date(artist.linked_date).toLocaleDateString() : 'Recently linked'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-slate-900/60 rounded-2xl border border-white/10 p-6">
            <h4 className="text-xl font-semibold text-white mb-4 flex items-center space-x-3">
              <Search className="w-5 h-5 text-indigo-300" />
              <span>Search for Artists</span>
            </h4>
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-center md:space-x-3 space-y-3 md:space-y-0">
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="flex-1 rounded-lg border border-white/20 bg-slate-800/50 px-4 py-3 text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:border-indigo-400 focus:ring-indigo-400"
                  placeholder="Search by artist name or email"
                />
                <button
                  type="submit"
                  className="inline-flex items-center space-x-2 rounded-lg bg-indigo-500 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-60"
                  disabled={isSearching}
                >
                  <Search className="w-4 h-4" />
                  <span>{isSearching ? 'Searching…' : 'Search'}</span>
                </button>
              </div>
            </form>

            {searchResults.length > 0 && (
              <div className="mt-6 space-y-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">Search Results</p>
                <div className="space-y-2">
                  {searchResults.map((artist) => (
                    <button
                      key={artist.artist_id}
                      type="button"
                      onClick={() => setSelectedArtistId(artist.artist_id)}
                      className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
                        selectedArtistId === artist.artist_id
                          ? 'border-indigo-400 bg-indigo-500/20 text-white'
                          : 'border-white/10 bg-slate-900/40 text-slate-200 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold">{artist.stage_name ?? 'Unnamed Artist'}</p>
                          <p className="text-xs text-slate-400">{artist.email ?? 'Email not provided'}</p>
                        </div>
                        <span className="text-xs text-slate-400">{artist.status ?? 'unlinked'}</span>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={handleLinkArtist}
                    className="inline-flex items-center space-x-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-400 disabled:opacity-60"
                    disabled={isLinking}
                  >
                    <Plus className="w-4 h-4" />
                    <span>{isLinking ? 'Linking…' : 'Link Selected Artist'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSkip}
                    className="text-sm text-slate-300 hover:text-white"
                    disabled={isLinking}
                  >
                    Skip for now
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900/60 rounded-2xl border border-white/10 p-6">
            <h4 className="text-lg font-semibold text-white mb-4 flex items-center space-x-3">
              <Mail className="w-5 h-5 text-indigo-300" />
              <span>Invite an Artist</span>
            </h4>
            <form onSubmit={handleInviteArtist} className="space-y-4">
              <div>
                <label htmlFor="invite-email" className="block text-sm font-medium text-slate-200 mb-2">
                  Artist Email
                </label>
                <input
                  id="invite-email"
                  name="email"
                  type="email"
                  value={inviteForm.email}
                  onChange={handleInviteChange}
                  className="w-full rounded-lg border border-white/20 bg-slate-800/50 px-4 py-3 text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:border-indigo-400 focus:ring-indigo-400"
                  placeholder="artist@example.com"
                  required
                />
              </div>
              <div>
                <label htmlFor="invite-message" className="block text-sm font-medium text-slate-200 mb-2">
                  Message (optional)
                </label>
                <textarea
                  id="invite-message"
                  name="message"
                  value={inviteForm.message}
                  onChange={handleInviteChange}
                  rows={4}
                  className="w-full rounded-lg border border-white/20 bg-slate-800/50 px-4 py-3 text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:border-indigo-400 focus:ring-indigo-400"
                  placeholder="Share details about your publishing offer."
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center space-x-2 rounded-lg bg-indigo-500 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-60"
                disabled={isInviting}
              >
                <Mail className="w-4 h-4" />
                <span>{isInviting ? 'Sending…' : 'Send Invitation'}</span>
              </button>
            </form>
            <p className="mt-4 text-xs text-slate-400">
              Invited artists will receive instructions to create an account and link to your publishing company.
            </p>
          </div>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`mt-6 flex items-center space-x-2 rounded-xl border px-4 py-3 text-sm ${
            statusMessage.type === 'success'
              ? 'border-green-500/40 bg-green-500/10 text-green-200'
              : 'border-red-500/40 bg-red-500/10 text-red-200'
          }`}
        >
          {statusMessage.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{statusMessage.message}</span>
        </div>
      )}

      <div className="flex items-center justify-between pt-6 border-t border-white/10 mt-8">
        <button
          type="button"
          onClick={onPrevious}
          className="inline-flex items-center space-x-2 rounded-lg border border-white/10 px-6 py-3 text-sm text-slate-300 hover:text-white hover:border-white/30"
        >
          <span>Back</span>
        </button>
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={handleSkip}
            className="text-sm text-slate-300 hover:text-white"
            disabled={isLinking}
          >
            Skip for now
          </button>
          <button
            type="button"
            onClick={handleLinkArtist}
            className="inline-flex items-center space-x-2 rounded-lg bg-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLinking}
          >
            <Plus className="w-4 h-4" />
            <span>{isLinking ? 'Processing…' : 'Continue'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ArtistManagementStep;
