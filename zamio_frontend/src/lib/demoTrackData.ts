import type { TrackDetailPayload } from './api';

/**
 * Static demo data for track details page
 * This data is used when viewing track details without making backend requests
 */
export const demoTrackDetail: TrackDetailPayload = {
  track: {
    id: 'demo-track-001',
    track_id: 'TRK-2024-001',
    title: 'Sunset Dreams',
    artist: 'Kwame Asante',
    album: 'Golden Horizons',
    genre: 'Afrobeats',
    duration_seconds: 245,
    release_date: '2024-03-15',
    plays: 45678,
    total_revenue: 12450.75,
    cover_art_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&h=800&fit=crop',
    audio_file_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    lyrics: `Verse 1:
Walking through the golden streets
Where the rhythm and the heartbeat meets
Colors dancing in the evening light
Everything just feels so right

Chorus:
Sunset dreams, painting the sky
With you here, we can fly so high
Feel the music, let it take control
Sunset dreams, touching our soul

Verse 2:
Drums are calling from afar
Underneath the evening star
Moving to the ancient sound
Where love and freedom can be found`,
  },
  stats: {
    total_plays: 45678,
    total_revenue: 12450.75,
    average_confidence: 94.5,
    first_played_at: '2024-03-20T08:30:00Z',
    last_played_at: '2024-10-29T18:45:00Z',
  },
  revenue: {
    monthly: [
      { month: 'Mar 2024', amount: 1250.50, currency: 'GHS' },
      { month: 'Apr 2024', amount: 1890.25, currency: 'GHS' },
      { month: 'May 2024', amount: 2340.80, currency: 'GHS' },
      { month: 'Jun 2024', amount: 1675.30, currency: 'GHS' },
      { month: 'Jul 2024', amount: 1450.90, currency: 'GHS' },
      { month: 'Aug 2024', amount: 1820.60, currency: 'GHS' },
      { month: 'Sep 2024', amount: 1023.40, currency: 'GHS' },
      { month: 'Oct 2024', amount: 999.00, currency: 'GHS' },
    ],
    territories: [
      { territory: 'Greater Accra', amount: 5680.45, currency: 'GHS', percentage: 45.6 },
      { territory: 'Ashanti Region', amount: 3245.20, currency: 'GHS', percentage: 26.1 },
      { territory: 'Western Region', amount: 1890.30, currency: 'GHS', percentage: 15.2 },
      { territory: 'Eastern Region', amount: 980.50, currency: 'GHS', percentage: 7.9 },
      { territory: 'Central Region', amount: 654.30, currency: 'GHS', percentage: 5.2 },
    ],
    payout_history: [
      { date: '2024-04-01', amount: 1250.50, status: 'Paid', period: 'March 2024' },
      { date: '2024-05-01', amount: 1890.25, status: 'Paid', period: 'April 2024' },
      { date: '2024-06-01', amount: 2340.80, status: 'Paid', period: 'May 2024' },
      { date: '2024-07-01', amount: 1675.30, status: 'Paid', period: 'June 2024' },
      { date: '2024-08-01', amount: 1450.90, status: 'Paid', period: 'July 2024' },
      { date: '2024-09-01', amount: 1820.60, status: 'Paid', period: 'August 2024' },
      { date: '2024-10-01', amount: 1023.40, status: 'Paid', period: 'September 2024' },
      { date: '2024-11-01', amount: 999.00, status: 'Pending', period: 'October 2024' },
    ],
  },
  performance: {
    plays_over_time: [
      { label: 'Mar 2024', plays: 3450, revenue: 1250.50, stations: 12 },
      { label: 'Apr 2024', plays: 5230, revenue: 1890.25, stations: 15 },
      { label: 'May 2024', plays: 6890, revenue: 2340.80, stations: 18 },
      { label: 'Jun 2024', plays: 5120, revenue: 1675.30, stations: 16 },
      { label: 'Jul 2024', plays: 4780, revenue: 1450.90, stations: 14 },
      { label: 'Aug 2024', plays: 6340, revenue: 1820.60, stations: 17 },
      { label: 'Sep 2024', plays: 4230, revenue: 1023.40, stations: 13 },
      { label: 'Oct 2024', plays: 3638, revenue: 999.00, stations: 11 },
    ],
    top_stations: [
      { name: 'Joy FM', count: 8945, region: 'Greater Accra', country: 'Ghana' },
      { name: 'Peace FM', count: 7234, region: 'Greater Accra', country: 'Ghana' },
      { name: 'Okay FM', count: 6123, region: 'Ashanti Region', country: 'Ghana' },
      { name: 'Adom FM', count: 5678, region: 'Greater Accra', country: 'Ghana' },
      { name: 'Hitz FM', count: 4890, region: 'Greater Accra', country: 'Ghana' },
      { name: 'Luv FM', count: 3456, region: 'Ashanti Region', country: 'Ghana' },
      { name: 'Angel FM', count: 2890, region: 'Western Region', country: 'Ghana' },
      { name: 'Starr FM', count: 2345, region: 'Greater Accra', country: 'Ghana' },
      { name: 'Citi FM', count: 2117, region: 'Greater Accra', country: 'Ghana' },
    ],
  },
  play_logs: [
    { played_at: '2024-10-29T18:45:00Z', station: 'Joy FM', region: 'Greater Accra', country: 'Ghana' },
    { played_at: '2024-10-29T16:30:00Z', station: 'Peace FM', region: 'Greater Accra', country: 'Ghana' },
    { played_at: '2024-10-29T14:15:00Z', station: 'Okay FM', region: 'Ashanti Region', country: 'Ghana' },
    { played_at: '2024-10-29T12:00:00Z', station: 'Adom FM', region: 'Greater Accra', country: 'Ghana' },
    { played_at: '2024-10-29T10:45:00Z', station: 'Hitz FM', region: 'Greater Accra', country: 'Ghana' },
    { played_at: '2024-10-29T08:30:00Z', station: 'Luv FM', region: 'Ashanti Region', country: 'Ghana' },
    { played_at: '2024-10-28T20:15:00Z', station: 'Angel FM', region: 'Western Region', country: 'Ghana' },
    { played_at: '2024-10-28T18:00:00Z', station: 'Starr FM', region: 'Greater Accra', country: 'Ghana' },
    { played_at: '2024-10-28T15:45:00Z', station: 'Citi FM', region: 'Greater Accra', country: 'Ghana' },
    { played_at: '2024-10-28T13:30:00Z', station: 'Joy FM', region: 'Greater Accra', country: 'Ghana' },
    { played_at: '2024-10-28T11:15:00Z', station: 'Peace FM', region: 'Greater Accra', country: 'Ghana' },
    { played_at: '2024-10-28T09:00:00Z', station: 'Okay FM', region: 'Ashanti Region', country: 'Ghana' },
    { played_at: '2024-10-27T19:45:00Z', station: 'Adom FM', region: 'Greater Accra', country: 'Ghana' },
    { played_at: '2024-10-27T17:30:00Z', station: 'Hitz FM', region: 'Greater Accra', country: 'Ghana' },
    { played_at: '2024-10-27T15:15:00Z', station: 'Luv FM', region: 'Ashanti Region', country: 'Ghana' },
  ],
  contributors: [
    { role: 'Primary Artist', name: 'Kwame Asante', percentage: 60 },
    { role: 'Producer', name: 'Kofi Beats', percentage: 20 },
    { role: 'Featured Artist', name: 'Ama Serwaa', percentage: 10 },
    { role: 'Songwriter', name: 'Yaw Mensah', percentage: 5 },
    { role: 'Mixing Engineer', name: 'Nana Osei', percentage: 3 },
    { role: 'Mastering Engineer', name: 'Kwesi Appiah', percentage: 2 },
  ],
};

/**
 * Additional demo tracks for variety
 */
export const demoTracks: Record<string, TrackDetailPayload> = {
  'demo-track-001': demoTrackDetail,
  'demo-track-002': {
    track: {
      id: 'demo-track-002',
      track_id: 'TRK-2024-002',
      title: 'Accra Nights',
      artist: 'Ama Serwaa',
      album: 'City Lights',
      genre: 'Afro Pop',
      duration_seconds: 198,
      release_date: '2024-05-20',
      plays: 32145,
      total_revenue: 8934.20,
      cover_art_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=800&fit=crop',
      audio_file_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
      lyrics: null,
    },
    stats: {
      total_plays: 32145,
      total_revenue: 8934.20,
      average_confidence: 91.2,
      first_played_at: '2024-05-25T10:00:00Z',
      last_played_at: '2024-10-29T19:30:00Z',
    },
    revenue: {
      monthly: [
        { month: 'May 2024', amount: 890.30, currency: 'GHS' },
        { month: 'Jun 2024', amount: 1234.50, currency: 'GHS' },
        { month: 'Jul 2024', amount: 1567.80, currency: 'GHS' },
        { month: 'Aug 2024', amount: 1890.40, currency: 'GHS' },
        { month: 'Sep 2024', amount: 1456.70, currency: 'GHS' },
        { month: 'Oct 2024', amount: 1894.50, currency: 'GHS' },
      ],
      territories: [
        { territory: 'Greater Accra', amount: 4234.50, currency: 'GHS', percentage: 47.4 },
        { territory: 'Ashanti Region', amount: 2567.30, currency: 'GHS', percentage: 28.7 },
        { territory: 'Western Region', amount: 1234.60, currency: 'GHS', percentage: 13.8 },
        { territory: 'Eastern Region', amount: 897.80, currency: 'GHS', percentage: 10.1 },
      ],
      payout_history: [
        { date: '2024-06-01', amount: 890.30, status: 'Paid', period: 'May 2024' },
        { date: '2024-07-01', amount: 1234.50, status: 'Paid', period: 'June 2024' },
        { date: '2024-08-01', amount: 1567.80, status: 'Paid', period: 'July 2024' },
        { date: '2024-09-01', amount: 1890.40, status: 'Paid', period: 'August 2024' },
        { date: '2024-10-01', amount: 1456.70, status: 'Paid', period: 'September 2024' },
        { date: '2024-11-01', amount: 1894.50, status: 'Pending', period: 'October 2024' },
      ],
    },
    performance: {
      plays_over_time: [
        { label: 'May 2024', plays: 2890, revenue: 890.30, stations: 10 },
        { label: 'Jun 2024', plays: 4234, revenue: 1234.50, stations: 13 },
        { label: 'Jul 2024', plays: 5678, revenue: 1567.80, stations: 15 },
        { label: 'Aug 2024', plays: 6890, revenue: 1890.40, stations: 17 },
        { label: 'Sep 2024', plays: 5234, revenue: 1456.70, stations: 14 },
        { label: 'Oct 2024', plays: 7219, revenue: 1894.50, stations: 18 },
      ],
      top_stations: [
        { name: 'Hitz FM', count: 6234, region: 'Greater Accra', country: 'Ghana' },
        { name: 'Joy FM', count: 5678, region: 'Greater Accra', country: 'Ghana' },
        { name: 'Okay FM', count: 4890, region: 'Ashanti Region', country: 'Ghana' },
        { name: 'Peace FM', count: 4123, region: 'Greater Accra', country: 'Ghana' },
        { name: 'Adom FM', count: 3456, region: 'Greater Accra', country: 'Ghana' },
      ],
    },
    play_logs: [
      { played_at: '2024-10-29T19:30:00Z', station: 'Hitz FM', region: 'Greater Accra', country: 'Ghana' },
      { played_at: '2024-10-29T17:15:00Z', station: 'Joy FM', region: 'Greater Accra', country: 'Ghana' },
      { played_at: '2024-10-29T15:00:00Z', station: 'Okay FM', region: 'Ashanti Region', country: 'Ghana' },
      { played_at: '2024-10-29T12:45:00Z', station: 'Peace FM', region: 'Greater Accra', country: 'Ghana' },
      { played_at: '2024-10-29T10:30:00Z', station: 'Adom FM', region: 'Greater Accra', country: 'Ghana' },
    ],
    contributors: [
      { role: 'Primary Artist', name: 'Ama Serwaa', percentage: 70 },
      { role: 'Producer', name: 'Kofi Beats', percentage: 15 },
      { role: 'Songwriter', name: 'Ama Serwaa', percentage: 10 },
      { role: 'Mixing Engineer', name: 'Nana Osei', percentage: 5 },
    ],
  },
};

/**
 * Get demo track data by ID
 * Falls back to the default demo track if ID not found
 */
export const getDemoTrackById = (trackId?: string | number): TrackDetailPayload => {
  if (!trackId) {
    return demoTrackDetail;
  }

  const key = String(trackId);
  return demoTracks[key] || demoTrackDetail;
};
