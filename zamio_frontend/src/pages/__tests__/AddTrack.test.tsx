import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import AddTrack from '../AddTrack';
import {
  initiateUpload,
  fetchTrackUploadSupportData,
} from '../../lib/api';

vi.mock('../../lib/api', () => ({
  initiateUpload: vi.fn(),
  fetchTrackUploadSupportData: vi.fn(),
  createAlbumForUploads: vi.fn(),
}));

vi.mock('../../lib/auth', () => ({
  useAuth: () => ({
    user: {
      artist_id: 'artist-123',
      stage_name: 'Test Artist',
      email: 'artist@example.com',
    },
  }),
}));

const mockedInitiateUpload = vi.mocked(initiateUpload);
const mockedFetchSupport = vi.mocked(fetchTrackUploadSupportData);

describe('AddTrack', () => {
  beforeEach(() => {
    mockedFetchSupport.mockResolvedValue({
      data: {
        genres: [{ id: 1, name: 'Afrobeats' }],
        albums: [{ id: 10, title: 'Morning Rise' }],
      },
    });
    mockedInitiateUpload.mockResolvedValue({
      data: {
        upload_id: 'track_audio_1',
        track_id: 42,
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('submits a new track upload with audio file and metadata', async () => {
    render(
      <MemoryRouter>
        <AddTrack />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mockedFetchSupport).toHaveBeenCalledWith('artist-123');
    });

    fireEvent.change(screen.getByLabelText(/track title/i), {
      target: { value: 'My First Song' },
    });

    fireEvent.change(screen.getByLabelText(/genre/i), {
      target: { value: '1' },
    });

    const audioFile = new File(['ID3'], 'song.mp3', { type: 'audio/mpeg' });
    const fileInput = screen.getByLabelText(/audio file/i);
    fireEvent.change(fileInput, { target: { files: [audioFile] } });

    fireEvent.click(screen.getByText(/next step/i));
    fireEvent.click(screen.getByText(/next step/i));
    fireEvent.click(screen.getByText(/next step/i));

    await screen.findByText(/complete upload/i);

    fireEvent.click(screen.getByText(/complete upload/i));

    await waitFor(() => {
      expect(mockedInitiateUpload).toHaveBeenCalled();
    });

    const firstCall = mockedInitiateUpload.mock.calls[0][0] as FormData;
    const entries = Array.from(firstCall.entries());
    const asObject = Object.fromEntries(entries.map(([key, value]) => [key, value]));

    expect(asObject['upload_type']).toBe('track_audio');
    expect(asObject['title']).toBe('My First Song');
    expect(asObject['genre_id']).toBe('1');
    expect(asObject['artist_name']).toBe('Test Artist');
    expect(asObject['file']).toBe(audioFile);

    const contributors = JSON.parse(asObject['contributors'] as string);
    expect(contributors[0].name).toBe('Test Artist');
    expect(contributors[0].email).toBe('artist@example.com');

    await screen.findByText(/is being processed/i);
  });
});
