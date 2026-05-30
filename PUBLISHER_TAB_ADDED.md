# Publisher Tab - Profile Page Enhancement

## Overview
Added a new "Publisher" tab to the zamio_frontend Profile page that displays artist publishing information, showing whether the artist is self-published or signed to a publisher.

## Features

### 1. Self-Published Artists
When `is_self_published = true`:
- **Status Badge**: Clear "Self-Published Artist" heading with shield icon
- **Benefits Cards**: Three highlighted benefits
  - Full Ownership (100% music rights)
  - Direct Earnings (100% royalties)
  - Full Control (manage own catalog)
- **Info Section**: Information about exploring publisher partnerships

### 2. Artists Signed to Publishers
When `is_self_published = false` and publisher exists:
- **Publisher Header Card**: 
  - Company name and type
  - Description
  - Location (city, region, country)
- **Contact Information Card**:
  - Primary contact name
  - Email address
  - Phone number
  - Website link (opens in new tab)
- **Partnership Benefits Card**:
  - Professional Management
  - Rights Protection
  - Distribution Network
  - Royalty Collection
- **Agreement Notice**: Information about the publishing agreement

### 3. Fallback State
When publisher data is unavailable:
- Empty state with appropriate messaging

## Technical Implementation

### Backend Changes
**File**: `zamio_backend/artists/views/artist_profile_view.py`

Added publisher information to the profile API response:

```python
# Publisher information
publisher_info = {
    'is_self_published': artist.is_self_published,
    'publisher': None
}

if not artist.is_self_published and artist.publisher:
    publisher_info['publisher'] = {
        'publisher_id': artist.publisher.publisher_id,
        'company_name': artist.publisher.company_name or '',
        'company_type': artist.publisher.company_type or '',
        'description': artist.publisher.description or '',
        'website_url': artist.publisher.website_url or '',
        'primary_contact_name': artist.publisher.primary_contact_name or '',
        'primary_contact_email': artist.publisher.primary_contact_email or '',
        'primary_contact_phone': artist.publisher.primary_contact_phone or '',
        'region': artist.publisher.region or '',
        'city': artist.publisher.city or '',
        'country': artist.publisher.country or '',
    }

data['publisher'] = publisher_info
```

### Frontend Changes

#### 1. Type Definitions (`zamio_frontend/src/lib/profileApi.ts`)
```typescript
export interface PublisherInfo {
  publisher_id: string;
  company_name: string;
  company_type: string;
  description: string;
  website_url: string;
  primary_contact_name: string;
  primary_contact_email: string;
  primary_contact_phone: string;
  region: string;
  city: string;
  country: string;
}

export interface PublisherData {
  is_self_published: boolean;
  publisher: PublisherInfo | null;
}

// Added to ProfileData interface
publisher: PublisherData;
```

#### 2. Profile Component (`zamio_frontend/src/pages/Profile.tsx`)
- Added Publisher tab button in navigation (between Royalties and Analytics)
- Added comprehensive Publisher tab content with conditional rendering
- Uses existing Lucide React icons (Users, Shield, Crown, etc.)

## UI/UX Design

### Color Scheme
- **Self-Published**: Indigo/Purple gradient (independence theme)
- **Publisher Info**: Professional blue/indigo tones
- **Benefits**: Green (ownership), Blue (earnings), Purple (control)
- **Notices**: Amber (informational)

### Icons Used
- `Users`: Publisher/partnership
- `Shield`: Self-published/protection
- `Crown`: Ownership
- `DollarSign`: Earnings
- `Zap`: Control
- `MapPin`: Location
- `Phone`, `Mail`, `Globe`: Contact info
- `Award`: Benefits
- `ExternalLink`: Website links

## Data Flow

1. Backend fetches artist record with publisher relationship
2. Checks `is_self_published` flag
3. If false and publisher exists, includes publisher details
4. Frontend receives data via `/api/artists/profile/` endpoint
5. Profile component conditionally renders based on publisher status
6. Tab displays appropriate view (self-published vs signed)

## Testing Scenarios

### Test Case 1: Self-Published Artist
- Artist with `is_self_published = true`
- Should show self-published benefits and info

### Test Case 2: Artist Signed to Publisher
- Artist with `is_self_published = false`
- Artist has valid `publisher` foreign key
- Should show full publisher details and contact info

### Test Case 3: Edge Cases
- Artist with `is_self_published = false` but no publisher (orphaned)
- Should show fallback "No Publisher Information" state

## Benefits

1. **Transparency**: Artists can clearly see their publishing status
2. **Contact Access**: Easy access to publisher contact information
3. **Education**: Self-published artists learn about their benefits
4. **Professional**: Clean, organized presentation of business relationships
5. **Scalable**: Easy to extend with additional publisher features

## Future Enhancements

Potential additions:
- Revenue split percentages
- Contract start/end dates
- Publisher performance metrics
- Direct messaging to publisher
- Agreement document downloads
- Publisher catalog statistics
