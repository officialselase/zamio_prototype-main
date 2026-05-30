import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Building2, CheckCircle, X, FileText, Users, Award } from 'lucide-react';
import { OnboardingStepProps } from '../../../components/onboarding/OnboardingWizard';
import { useArtistOnboarding } from './ArtistOnboardingContext';
import { fetchPublishersList, type PublisherListItem } from '../../../lib/api';

interface Publisher {
  id: string;
  name: string;
  type: string;
  location: string;
  specialties: string[];
  description?: string;
  verified?: boolean;
}

const PublisherStep: React.FC<OnboardingStepProps> = ({ registerNextHandler, registerSkipHandler }) => {
  const { status, submitPublisher } = useArtistOnboarding();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPublisher, setSelectedPublisher] = useState<Publisher | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'none' | 'connecting' | 'connected' | 'failed'>('none');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [relationshipNotes, setRelationshipNotes] = useState('');
  const [selfPublish, setSelfPublish] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [loadingPublishers, setLoadingPublishers] = useState(true);

  // Fetch publishers from API
  useEffect(() => {
    const loadPublishers = async () => {
      try {
        setLoadingPublishers(true);
        const response = await fetchPublishersList();
        if (response?.data && Array.isArray(response.data)) {
          setPublishers(response.data.map((p: PublisherListItem) => ({
            id: p.id,
            name: p.name,
            type: p.type,
            location: p.location,
            specialties: p.specialties || [],
            description: p.description,
            verified: true,
          })));
        }
      } catch (error) {
        console.error('Failed to fetch publishers:', error);
        // Keep empty array on error
      } finally {
        setLoadingPublishers(false);
      }
    };
    loadPublishers();
  }, []);

  // Load saved publisher data
  useEffect(() => {
    const publisherSnapshot = (status?.publisher ?? {}) as Record<string, unknown>;
    if (!publisherSnapshot) {
      return;
    }
    const isSelfPublished = publisherSnapshot['is_self_published'];
    if (typeof isSelfPublished === 'boolean') {
      setSelfPublish(isSelfPublished);
    }
    const preferences = (publisherSnapshot['preferences'] ?? {}) as Record<string, unknown>;
    const storedPublisher = {
      id: readString(publisherSnapshot['publisher_id']) ?? '',
      name: readString(publisherSnapshot['publisher_name']) ?? '',
      type: readString(preferences['publisher_type']),
      location: readString(preferences['publisher_location']) ?? '',
      specialties: Array.isArray(preferences['publisher_specialties'])
        ? (preferences['publisher_specialties'] as string[])
        : [],
      verified: true,
    };

    if (storedPublisher.name) {
      setSelectedPublisher({
        id: storedPublisher.id || storedPublisher.name.toLowerCase().replace(/\s+/g, '-'),
        name: storedPublisher.name,
        type: storedPublisher.type ?? 'Independent',
        location: storedPublisher.location || '—',
        specialties: storedPublisher.specialties.length > 0 ? storedPublisher.specialties : ['Independent'],
        verified: true,
      });
      setConnectionStatus('connected');
    }

    if (typeof preferences['relationship_notes'] === 'string') {
      setRelationshipNotes(preferences['relationship_notes'] as string);
    }
  }, [status]);

  const filteredPublishers = useMemo(
    () =>
      publishers.filter(
        (publisher) =>
          publisher.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          publisher.specialties.some((specialty) => specialty.toLowerCase().includes(searchQuery.toLowerCase())),
      ),
    [publishers, searchQuery],
  );

  const handlePublisherSelect = (publisher: Publisher) => {
    setSelectedPublisher(publisher);
    setSelfPublish(false);
    setConnectionStatus('none');
    setAgreedToTerms(false);
  };

  const handleConnect = async () => {
    if (!selectedPublisher || !agreedToTerms) {
      return;
    }
    setConnectionStatus('connecting');
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setConnectionStatus('connected');
  };

  const handleDisconnect = () => {
    setSelectedPublisher(null);
    setConnectionStatus('none');
    setAgreedToTerms(false);
    setSelfPublish(true);
  };

  const handleSubmit = useCallback(async () => {
    setErrorMessage(null);
    if (!selfPublish && !selectedPublisher) {
      setErrorMessage('Select a publisher or continue as self-published to move forward.');
      return false;
    }

    if (!selfPublish && !agreedToTerms) {
      setErrorMessage('Please agree to the publisher terms before connecting.');
      return false;
    }

    setIsSubmitting(true);
    try {
      const notes = relationshipNotes.trim();
      await submitPublisher({
        selfPublish,
        publisherId: selectedPublisher?.id,
        publisherName: selectedPublisher?.name,
        publisherType: selectedPublisher?.type,
        publisherLocation: selectedPublisher?.location,
        publisherSpecialties: selectedPublisher?.specialties,
        relationshipNotes: notes,
        agreedToTerms,
        selectedPublisher: selectedPublisher
          ? {
              id: selectedPublisher.id,
              name: selectedPublisher.name,
              type: selectedPublisher.type,
              location: selectedPublisher.location,
              specialties: selectedPublisher.specialties,
            }
          : null,
      });
      return true;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'We could not save your publisher preferences. Please try again.';
      setErrorMessage(message);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [agreedToTerms, relationshipNotes, selectedPublisher, selfPublish, submitPublisher]);

  useEffect(() => {
    registerNextHandler?.(() => handleSubmit());
    registerSkipHandler?.(() =>
      submitPublisher({ selfPublish: true })
        .then(() => true)
        .catch((error) => {
          const message =
            error instanceof Error
              ? error.message
              : 'We could not skip this step right now. Please try again.';
          setErrorMessage(message);
          return false;
        }),
    );

    return () => {
      registerNextHandler?.(null);
      registerSkipHandler?.(null);
    };
  }, [handleSubmit, registerNextHandler, registerSkipHandler, submitPublisher]);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-white mb-2">Publisher (Optional)</h2>
        <p className="text-slate-300">
          Connect with a publisher if you have one, or continue as a self-published artist.
        </p>
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {errorMessage}
        </div>
      )}

      <div className="mb-8 p-6 rounded-lg border-l-4 bg-green-500/10 border-l-green-400">
        <div className="flex items-start space-x-3">
          <CheckCircle className="w-6 h-6 mt-0.5 text-green-400" />
          <div>
            <h3 className="text-lg font-semibold mb-2 text-white">Self-Published Recommended</h3>
            <p className="text-sm text-slate-300">
              As a new artist joining Zamio directly, you're automatically set up as self-published. You have full control over
              your music and receive royalty payments directly. You can connect with a publisher later if needed.
            </p>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <h3 className="text-lg font-medium text-white mb-4">Search Publishers</h3>
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by publisher name or specialty..."
            className="w-full pl-10 pr-4 py-3 rounded-lg border border-white/20 bg-slate-800/50 text-white placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {filteredPublishers.map((publisher) => (
            <div
              key={publisher.id}
              onClick={() => handlePublisherSelect(publisher)}
              className={`p-4 rounded-lg border cursor-pointer transition-all ${
                selectedPublisher?.id === publisher.id
                  ? 'border-indigo-400 bg-indigo-500/20'
                  : 'border-white/10 bg-slate-800/50 hover:border-indigo-400/50 hover:bg-slate-800/70'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-medium text-white">{publisher.name}</h4>
                  <p className="text-sm text-slate-400">{publisher.location}</p>
                </div>
                {publisher.verified && <CheckCircle className="w-5 h-5 text-green-400" />}
              </div>

              <div className="flex items-center space-x-2 mb-2">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    publisher.type === 'Major'
                      ? 'bg-purple-500/20 text-purple-300'
                      : publisher.type === 'Independent'
                        ? 'bg-blue-500/20 text-blue-300'
                        : 'bg-green-500/20 text-green-300'
                  }`}
                >
                  {publisher.type}
                </span>
              </div>

              <div className="flex flex-wrap gap-1">
                {publisher.specialties.slice(0, 3).map((specialty) => (
                  <span key={specialty} className="px-2 py-1 bg-slate-700/50 text-slate-300 text-xs rounded-full">
                    {specialty}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {filteredPublishers.length === 0 && searchQuery && (
          <div className="text-center py-8 text-slate-400">
            <Building2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No publishers found matching your search.</p>
          </div>
        )}
      </div>

      {selectedPublisher && (
        <div className="mb-8 p-6 rounded-lg bg-slate-800/50 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-white">Connect with {selectedPublisher.name}</h3>
            <button onClick={handleDisconnect} className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          <div className="mb-6 p-4 bg-slate-700/50 rounded-lg">
            <div className="flex items-start space-x-3">
              <Building2 className="w-6 h-6 text-indigo-300" />
              <div>
                <p className="text-sm text-slate-300">
                  {selectedPublisher.name} specialises in {selectedPublisher.specialties.slice(0, 2).join(', ')} and operates from
                  {` ${selectedPublisher.location}.`}
                </p>
                <p className="mt-2 text-xs text-slate-400">
                  Connecting allows your publisher to view performance analytics and receive royalty statements on your behalf.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <label className="flex items-center space-x-3 text-slate-200">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(event) => setAgreedToTerms(event.target.checked)}
                className="h-4 w-4 rounded border-slate-600 bg-slate-800"
              />
              <span className="text-sm">
                I authorise {selectedPublisher.name} to view performance analytics and receive shared royalty statements.
              </span>
            </label>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">Relationship notes</label>
              <textarea
                value={relationshipNotes}
                onChange={(event) => setRelationshipNotes(event.target.value)}
                rows={3}
                placeholder="Share any details about your agreement or partnership."
                className="w-full rounded-lg border border-white/20 bg-slate-800/50 px-4 py-3 text-white placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              />
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={handleConnect}
                disabled={!agreedToTerms || isSubmitting || connectionStatus === 'connecting'}
                className="inline-flex items-center space-x-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-400 disabled:cursor-not-allowed disabled:bg-slate-600"
              >
                <Users className="h-4 w-4" />
                <span>{connectionStatus === 'connected' ? 'Connected' : 'Connect Publisher'}</span>
              </button>

              {connectionStatus === 'connected' && (
                <span className="text-xs text-emerald-300">Publisher connection saved.</span>
              )}
              {connectionStatus === 'failed' && (
                <span className="text-xs text-red-300">Connection attempt failed. Try again.</span>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-white/10 bg-slate-800/50 p-4">
          <div className="flex items-center space-x-3">
            <FileText className="h-5 w-5 text-indigo-300" />
            <div>
              <p className="text-sm font-medium text-white">Contracts & Royalties</p>
              <p className="text-xs text-slate-400">
                Keep your publishing agreements centralised and ensure the correct splits are applied to your royalties.
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-white/10 bg-slate-800/50 p-4">
          <div className="flex items-center space-x-3">
            <Award className="h-5 w-5 text-indigo-300" />
            <div>
              <p className="text-sm font-medium text-white">Collaborate Easily</p>
              <p className="text-xs text-slate-400">
                Publishers can view analytics, help with radio promo, and negotiate deals on your behalf once connected.
              </p>
            </div>
          </div>
        </div>
      </div>

      {isSubmitting && (
        <div className="mt-4 text-sm text-indigo-200">Saving your publisher preferences…</div>
      )}
    </div>
  );
};

const readString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

export default PublisherStep;
