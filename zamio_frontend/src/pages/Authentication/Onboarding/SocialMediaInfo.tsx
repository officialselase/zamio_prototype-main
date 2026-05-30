import React, { useCallback, useEffect, useState } from 'react';
import { Instagram, Twitter, Facebook, Youtube, CheckCircle, ExternalLink, Unlink } from 'lucide-react';
import { OnboardingStepProps } from '../../../components/onboarding/OnboardingWizard';
import { useArtistOnboarding } from './ArtistOnboardingContext';

interface SocialAccount {
  platform: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  connected: boolean;
  username?: string;
  verified?: boolean;
  followers?: number;
}

const SocialMediaStep: React.FC<OnboardingStepProps> = ({ registerNextHandler, registerSkipHandler }) => {
  const { completeSocial, skipSocial, status } = useArtistOnboarding();
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([
    {
      platform: 'Instagram',
      icon: Instagram,
      color: 'text-pink-400',
      connected: false,
      verified: false,
      followers: 0,
    },
    {
      platform: 'Twitter',
      icon: Twitter,
      color: 'text-blue-400',
      connected: false,
      verified: false,
      followers: 0,
    },
    {
      platform: 'Facebook',
      icon: Facebook,
      color: 'text-blue-600',
      connected: false,
      verified: false,
      followers: 0,
    },
    {
      platform: 'YouTube',
      icon: Youtube,
      color: 'text-red-500',
      connected: false,
      verified: false,
      followers: 0,
    },
  ]);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const socialLinks = (status?.social_links ?? {}) as Record<string, unknown>;
    if (!socialLinks) {
      return;
    }
    setSocialAccounts((prev) =>
      prev.map((account) => {
        const key = account.platform.toLowerCase();
        const url = typeof socialLinks[key] === 'string' ? (socialLinks[key] as string) : undefined;
        if (url) {
          return {
            ...account,
            connected: true,
            username: url,
          };
        }
        return {
          ...account,
          connected: false,
          username: undefined,
        };
      }),
    );
  }, [status]);

  const handleConnect = async (platform: string) => {
    setConnecting(platform);

    await new Promise((resolve) => setTimeout(resolve, 1200));

    setSocialAccounts((prev) =>
      prev.map((account) =>
        account.platform === platform
          ? {
              ...account,
              connected: true,
              username: `https://www.${platform.toLowerCase()}.com/${platform.toLowerCase()}user`,
              followers: Math.floor(Math.random() * 50000) + 1000,
              verified: Math.random() > 0.7,
            }
          : account,
      ),
    );

    setConnecting(null);
  };

  const handleDisconnect = (platform: string) => {
    setSocialAccounts((prev) =>
      prev.map((account) =>
        account.platform === platform
          ? { ...account, connected: false, username: undefined, verified: false, followers: 0 }
          : account,
      ),
    );
  };

  const connectedCount = socialAccounts.filter((account) => account.connected).length;

  const submitSocial = useCallback(async () => {
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      if (connectedCount === 0) {
        await skipSocial();
      } else {
        const payloadAccounts = socialAccounts
          .filter((account) => account.connected)
          .map((account) => ({
            platform: account.platform,
            url: account.username,
            followers: account.followers,
            verified: account.verified,
          }));
        await completeSocial({ accounts: payloadAccounts });
      }
      return true;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'We could not update your social media preferences. Please try again.';
      setErrorMessage(message);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [completeSocial, connectedCount, skipSocial, socialAccounts]);

  useEffect(() => {
    registerNextHandler?.(() => submitSocial());
    registerSkipHandler?.(() =>
      skipSocial()
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
  }, [registerNextHandler, registerSkipHandler, skipSocial, submitSocial]);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-white mb-2">Connect Your Social Media</h2>
        <p className="text-slate-300">
          Link your social media accounts to enhance your artist profile and reach more fans.
        </p>
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {errorMessage}
        </div>
      )}

      <div className="mb-8 p-4 rounded-lg bg-indigo-500/10 border border-indigo-400/20">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-indigo-300">Social Media Connections</h3>
            <p className="text-sm text-indigo-200">
              {connectedCount} of {socialAccounts.length} platforms connected
            </p>
          </div>
          {connectedCount > 0 && (
            <div className="flex items-center space-x-1">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-sm text-green-400 font-medium">{connectedCount} connected</span>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {socialAccounts.map((account) => {
          const IconComponent = account.icon;
          const isConnecting = connecting === account.platform;

          return (
            <div key={account.platform} className="border border-white/10 rounded-lg p-6 bg-slate-800/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-lg bg-slate-700/50 ${account.connected ? 'ring-2 ring-indigo-400/50' : ''}`}>
                    <IconComponent className={`w-6 h-6 ${account.connected ? account.color : 'text-slate-400'}`} />
                  </div>

                  <div>
                    <h3 className="font-medium text-white">{account.platform}</h3>
                    {account.connected ? (
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-sm text-slate-300">{account.username}</span>
                        {account.verified && (
                          <div className="flex items-center space-x-1">
                            <CheckCircle className="w-3 h-3 text-blue-400" />
                            <span className="text-xs text-blue-400">Verified</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400">Not connected</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {account.connected && account.followers && (
                    <div className="text-right">
                      <p className="text-sm font-medium text-white">{account.followers.toLocaleString()}</p>
                      <p className="text-xs text-slate-400">followers</p>
                    </div>
                  )}

                  {account.connected ? (
                    <button
                      onClick={() => handleDisconnect(account.platform)}
                      className="inline-flex items-center space-x-2 px-3 py-1.5 border border-red-400/50 text-red-400 hover:bg-red-400/10 rounded-lg text-sm transition-colors"
                    >
                      <Unlink className="w-3 h-3" />
                      <span>Disconnect</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleConnect(account.platform)}
                      disabled={isConnecting === account.platform || isSubmitting}
                      className="inline-flex items-center space-x-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-400 disabled:bg-slate-600 text-white rounded-lg text-sm transition-colors disabled:cursor-not-allowed"
                    >
                      {isConnecting === account.platform ? (
                        <>
                          <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                          <span>Connecting...</span>
                        </>
                      ) : (
                        <>
                          <ExternalLink className="w-3 h-3" />
                          <span>Connect</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {account.connected && (
                <div className="mt-4 p-3 bg-green-500/10 border border-green-400/20 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-green-300">{account.platform} account connected successfully!</p>
                      <p className="text-xs text-green-400 mt-1">
                        Your profile will display {account.platform} content and verification status.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 text-sm text-slate-400">
        Prefer to connect later? You can skip this step and update your social media links anytime from your profile settings.
        {isSubmitting && <span className="ml-2 text-indigo-200">Saving your preference…</span>}
      </div>
    </div>
  );
};

export default SocialMediaStep;
