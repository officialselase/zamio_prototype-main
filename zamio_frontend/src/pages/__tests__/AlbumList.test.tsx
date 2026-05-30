import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import AlbumList from '../AlbumList';
import { fetchArtistAlbums, createArtistAlbum } from '../../lib/api';

vi.mock('../../lib/api', () => ({
  fetchArtistAlbums: vi.fn(),
  createArtistAlbum: vi.fn(),
  updateArtistAlbum: vi.fn(),
  deleteArtistAlbum: vi.fn(),
}));

const mockedFetchArtistAlbums = vi.mocked(fetchArtistAlbums);
const mockedCreateArtistAlbum = vi.mocked(createArtistAlbum);

describe('AlbumList', () => {
  beforeEach(() => {
    mockedFetchArtistAlbums.mockResolvedValue({
      data: {
        albums: [
          {
            id: 1,
            album_id: 'ALB_001',
            title: 'Approved Album',
            artist: 'Album Manager',
            artist_id: 'artist-123',
            genre: 'Afrobeats',
            release_date: '2024-01-01',
            track_count: 3,
            total_plays: 1200,
            total_revenue: 2500,
            cover_art_url: null,
            status: 'active',
            raw_status: 'Approved',
            is_archived: false,
            active: true,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        ],
        pagination: {
          page: 1,
          page_size: 9,
          total_pages: 1,
          total_count: 1,
          has_next: false,
          has_previous: false,
        },
        stats: {
          total: 1,
          active: 1,
          inactive: 0,
          draft: 0,
        },
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders albums from the artist album API', async () => {
    render(
      <MemoryRouter>
        <AlbumList />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Loading albums/i)).toBeInTheDocument();

    const albumTitle = await screen.findByText('Approved Album');
    expect(albumTitle).toBeInTheDocument();
    expect(screen.getByText(/by Album Manager/i)).toBeInTheDocument();
    expect(screen.getByText(/3 tracks/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(mockedFetchArtistAlbums).toHaveBeenCalled();
    });

    const firstCallParams = mockedFetchArtistAlbums.mock.calls[0][0];
    expect(firstCallParams).toMatchObject({
      page: 1,
      page_size: 9,
      sort_by: 'createdAt',
      sort_order: 'desc',
    });
  });

  it('submits a new album through the modal form', async () => {
    render(
      <MemoryRouter>
        <AlbumList />
      </MemoryRouter>,
    );

    await screen.findByText('Approved Album');

    mockedCreateArtistAlbum.mockResolvedValue({
      data: {
        album: {
          id: 2,
          title: 'New Album',
          artist: 'Album Manager',
          genre: 'Afrobeats',
          release_date: '2024-02-01',
          track_count: 0,
          total_plays: 0,
          total_revenue: 0,
          cover_art_url: null,
          status: 'draft',
          raw_status: 'Pending',
          is_archived: false,
          active: true,
          created_at: '2024-02-01T00:00:00Z',
          updated_at: '2024-02-01T00:00:00Z',
        },
      },
    });

    const addButton = screen.getByRole('button', { name: /add album/i });
    fireEvent.click(addButton);

    const titleInput = screen.getByPlaceholderText('Enter album title');
    fireEvent.change(titleInput, { target: { value: 'New Album' } });

    const releaseInput = screen.getByLabelText('Release Date');
    fireEvent.change(releaseInput, { target: { value: '2024-02-01' } });

    const saveButton = screen.getByRole('button', { name: /create album/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockedCreateArtistAlbum).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'New Album',
          release_date: '2024-02-01',
          genre: undefined,
        }),
      );
    });
  });
});

