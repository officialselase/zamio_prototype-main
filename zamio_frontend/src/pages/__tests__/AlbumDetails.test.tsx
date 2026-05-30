import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import AlbumDetails from '../AlbumDetails';
import { fetchArtistAlbumDetail, type AlbumDetailPayload } from '../../lib/api';

vi.mock('../../lib/api', () => ({
  fetchArtistAlbumDetail: vi.fn(),
}));

const mockedFetchAlbumDetail = vi.mocked(fetchArtistAlbumDetail);

describe('AlbumDetails', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('loads album details from the API and renders content', async () => {
    const samplePayload: AlbumDetailPayload = {
      album: {
        id: 42,
        album_id: 'ALB42',
        title: 'Live Album',
        artist: 'Artist Name',
        artist_id: 'artist-1',
        genre: 'Afrobeats',
        release_date: '2024-01-01',
        track_count: 1,
        total_plays: 100,
        total_revenue: 1234,
        cover_art_url: null,
        status: 'active',
        raw_status: 'Approved',
        is_archived: false,
        active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      stats: {
        total_tracks: 1,
        active_tracks: 1,
        inactive_tracks: 0,
        total_plays: 100,
        total_revenue: 1234,
        average_track_duration_seconds: 240,
      },
      tracks: [
        {
          id: 7,
          title: 'Track One',
          status: 'approved',
          release_date: '2024-01-01',
          duration_seconds: 240,
          plays: 100,
          revenue: 1234,
          cover_art_url: null,
          active: true,
        },
      ],
      revenue: {
        monthly: [{ month: 'Jan 2024', amount: 1234, currency: 'GHS', plays: 100 }],
        territories: [{ territory: 'Ghana', amount: 1234, currency: 'GHS', percentage: 100, plays: 100 }],
      },
      performance: {
        plays_over_time: [{ label: 'Jan 2024', plays: 100 }],
        top_stations: [{ name: 'Joy FM', count: 50, region: 'Greater Accra', country: 'Ghana', revenue: 600 }],
      },
      contributors: [{ id: 1, name: 'Contributor One', role: 'Producer', percentage: 100 }],
    };

    mockedFetchAlbumDetail.mockResolvedValue({ data: samplePayload });

    render(
      <MemoryRouter initialEntries={['/dashboard/album-details?albumId=42']}>
        <Routes>
          <Route path="/dashboard/album-details" element={<AlbumDetails />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByText('Live Album');

    await waitFor(() => {
      expect(mockedFetchAlbumDetail).toHaveBeenCalledWith(42);
    });

    expect(screen.getByText('Track One')).toBeInTheDocument();
    expect(screen.getByText('Album Tracks')).toBeInTheDocument();
  });
});
