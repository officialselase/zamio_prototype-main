# ZamIO Royalty System Documentation

## Overview

The ZamIO royalty system is a comprehensive, multi-tiered payment distribution system that handles royalty calculations from radio play logs and streaming data, distributes payments to artists, publishers, and PROs, and tracks the complete payment chain from source to final recipient.

## System Architecture

### Core Components

1. **RoyaltyCalculator** - Calculates base royalty amounts and splits
2. **RoyaltyDistribution** - Primary distribution records (platform → recipient)
3. **PublisherArtistSubDistribution** - Secondary distribution records (publisher → artist)
4. **Contributor** - Track contributor splits (must total 100%)

## Payment Flow

```
PlayLog (Radio/Stream)
    ↓
RoyaltyCalculator.calculate_royalties()
    ↓
Validates: Track has contributors, splits = 100%
    ↓
Calculates: base_rate × duration × time_multiplier
    ↓
For each Contributor:
    ├─ If has Publisher:
    │   ├─ RoyaltyDistribution (recipient = publisher.user, type = 'publisher')
    │   └─ PublisherArtistSubDistribution (publisher → artist split)
    │       ├─ Publisher keeps: fee_percentage (default 15%)
    │       └─ Artist receives: (100 - fee_percentage)%
    │
    └─ If self-published:
        └─ RoyaltyDistribution (recipient = artist.user, type = 'artist')
```

## Royalty Calculation Formula

### Base Calculation

```python
base_rate_per_second = station_class_rate  # e.g., 0.015 GHS for Class A
time_multiplier = time_of_day_multiplier   # 1.5 for prime time, 1.0 regular, 0.7 off-peak
duration_seconds = track_duration

gross_amount = base_rate_per_second × duration_seconds × time_multiplier
```

### Station Classes

| Class | Description | Base Rate/Second | Prime Multiplier |
|-------|-------------|------------------|------------------|
| Class A | Major metropolitan | 0.015 GHS | 1.5x |
| Class B | Regional stations | 0.012 GHS | 1.3x |
| Class C | Local/community | 0.008 GHS | 1.2x |
| Online | Internet-only | 0.010 GHS | 1.1x |
| Community | Non-profit | 0.005 GHS | 1.0x |

### Time Periods

- **Prime Time** (6 AM - 10 AM, 4 PM - 8 PM): Higher multiplier
- **Regular Time** (10 AM - 4 PM, 8 PM - 12 AM): Standard rate
- **Off-Peak** (12 AM - 6 AM): Lower multiplier

## Contributor Splits

### Rules

1. **Must Total 100%**: All active contributors on a track must have splits that sum to exactly 100%
2. **Minimum 0.01%**: Each contributor must have at least 0.01% split
3. **Maximum 100%**: No single contributor can exceed 100%
4. **Validation**: Enforced at model level and during calculation

### Example

```python
Track: "Adonai" by Sarkodie
├─ Sarkodie (Artist/Composer) - 60%
├─ Producer X (Producer) - 25%
└─ Writer Y (Writer) - 15%
Total: 100% ✓

Gross Royalty: 10.00 GHS
├─ Sarkodie receives: 6.00 GHS
├─ Producer X receives: 2.50 GHS
└─ Writer Y receives: 1.50 GHS
```

## Publisher Routing

### When Contributor Has Publisher

```python
Contributor: Sarkodie (60% split)
Publisher: Universal Music Publishing Ghana
Publisher Fee: 15%

Gross Amount: 6.00 GHS (60% of 10.00 GHS)

RoyaltyDistribution:
├─ recipient: publisher.user (Universal's account)
├─ recipient_type: 'publisher'
├─ net_amount: 6.00 GHS

PublisherArtistSubDistribution:
├─ publisher: Universal Music Publishing Ghana
├─ artist: Sarkodie
├─ total_amount: 6.00 GHS
├─ publisher_fee_percentage: 15%
├─ publisher_fee_amount: 0.90 GHS (15% of 6.00)
├─ artist_net_amount: 5.10 GHS (85% of 6.00)
```

### Payment Status Flow

```
RoyaltyDistribution Status:
pending → calculated → approved → paid

PublisherArtistSubDistribution Status:
pending → calculated → approved → paid

When all sub-distributions are paid:
    parent RoyaltyDistribution.status = 'paid'
When some sub-distributions are paid:
    parent RoyaltyDistribution.status = 'partially_paid'
```

## Database Models

### RoyaltyDistribution

Primary distribution from platform to recipient (artist or publisher).

**Key Fields:**
- `distribution_id` (UUID): Unique identifier
- `play_log` (FK): Source play log
- `recipient` (FK User): Who receives the payment
- `recipient_type`: 'artist', 'publisher', 'contributor', 'pro', 'external_pro'
- `gross_amount`: Total before fees
- `net_amount`: Amount after fees
- `percentage_split`: Contributor's split percentage
- `status`: 'pending', 'calculated', 'approved', 'paid', 'partially_paid', 'failed', 'disputed', 'withheld'
- `calculation_metadata`: JSON with routing info

### PublisherArtistSubDistribution

Secondary distribution from publisher to artist.

**Key Fields:**
- `sub_distribution_id` (UUID): Unique identifier
- `parent_distribution` (FK): Link to parent RoyaltyDistribution
- `publisher` (FK): Publisher profile
- `artist` (FK User): Artist receiving payment
- `total_amount`: Total from parent distribution
- `publisher_fee_percentage`: Publisher's commission %
- `publisher_fee_amount`: Publisher's commission amount
- `artist_net_amount`: Amount due to artist
- `status`: 'pending', 'calculated', 'approved', 'paid', 'failed', 'disputed'

## API Endpoints

### Admin Endpoints

**Get User Royalties**
```
GET /api/accounts/admin/user-royalties/?user_id={user_id}

Response:
{
  "summary": {
    "total_net": 1234.56,
    "paid_amount": 800.00,
    "pending_amount": 434.56,
    "direct_distributions": 45,
    "publisher_distributions": 12
  },
  "recent_royalties": [...]
}
```

### Publisher Endpoints

**Get Sub-Distributions**
```
GET /api/publishers/sub-distributions/

Response:
{
  "summary": {
    "total_amount": 5000.00,
    "publisher_fees": 750.00,
    "artist_payments": 4250.00
  },
  "artist_breakdown": [...],
  "recent_distributions": [...]
}
```

**Approve Sub-Distribution**
```
POST /api/publishers/sub-distributions/approve/
{
  "sub_distribution_id": "uuid"
}
```

**Mark Sub-Distribution as Paid**
```
POST /api/publishers/sub-distributions/mark-paid/
{
  "sub_distribution_id": "uuid",
  "payment_reference": "TXN123456",
  "payment_method": "Bank Transfer"
}
```

## Validation & Error Handling

### Pre-Calculation Validation

1. **Track Validation**
   - Track must exist
   - Track must have at least one active contributor
   - Contributor splits must total exactly 100%

2. **Play Log Validation**
   - Must have valid played_at timestamp
   - Must have duration (or fallback to track duration)
   - Must have valid station

### Calculation Errors

Errors are captured in `RoyaltyCalculationResult.errors`:
- "No track associated with play log"
- "Track has no active contributors"
- "Invalid contributor splits: total X%"
- "Publisher not found for distribution"

## Usage Examples

### Calculate Royalties for Play Logs

```python
from royalties.calculator import RoyaltyCalculator
from music_monitor.models import PlayLog

calculator = RoyaltyCalculator()

# Single play log
play_log = PlayLog.objects.get(id=123)
result = calculator.calculate_royalties(play_log)

if not result.errors:
    distributions = calculator.create_royalty_distributions(result)
    print(f"Created {len(distributions)} distributions")
else:
    print(f"Errors: {result.errors}")

# Batch calculation
play_logs = PlayLog.objects.filter(track__isnull=False)[:100]
results = calculator.batch_calculate_royalties(list(play_logs))

for result in results:
    if not result.errors:
        calculator.create_royalty_distributions(result)
```

### Process Royalty Cycle

```python
from royalties.calculator import RoyaltyCycleManager
from royalties.models import RoyaltyCycle

manager = RoyaltyCycleManager()
cycle = RoyaltyCycle.objects.get(name="Q1 2025")

result = manager.process_royalty_cycle(cycle)
print(f"Processed {result['play_logs_processed']} play logs")
print(f"Created {result['distributions_created']} distributions")
print(f"Total amount: {result['total_amount']} {result['currency']}")
```

### Query User Royalties

```python
from music_monitor.models import RoyaltyDistribution, PublisherArtistSubDistribution
from django.db.models import Sum

user = User.objects.get(email='artist@example.com')

# Direct distributions
direct = RoyaltyDistribution.objects.filter(recipient=user)
direct_total = direct.aggregate(total=Sum('net_amount'))['total']

# Publisher sub-distributions
sub_dists = PublisherArtistSubDistribution.objects.filter(artist=user)
sub_total = sub_dists.aggregate(total=Sum('artist_net_amount'))['total']

total_earnings = (direct_total or 0) + (sub_total or 0)
print(f"Total earnings: {total_earnings} GHS")
```

## Key Fixes Implemented

### 1. Publisher Recipient Routing (CRITICAL FIX)
**Problem**: Royalties marked as `recipient_type='publisher'` were still going to the contributor's user account.

**Solution**: Modified `create_royalty_distributions()` to check recipient type and route to `publisher.user` instead of `contributor.user` for publisher-type distributions.

### 2. Sub-Distribution Tracking
**Problem**: No mechanism to track how publishers split payments with artists.

**Solution**: Created `PublisherArtistSubDistribution` model to track:
- Publisher fee percentage and amount
- Artist net amount
- Payment status from publisher to artist
- Link to parent distribution

### 3. Validation Before Calculation
**Problem**: Calculations could proceed with invalid data (no contributors, invalid splits).

**Solution**: Added pre-calculation validation:
- Check track has active contributors
- Validate splits total 100%
- Return error result instead of proceeding

### 4. Status Tracking
**Problem**: No way to track partial payments when some artists are paid but others aren't.

**Solution**: Added `partially_paid` status and automatic parent status updates when sub-distributions are marked as paid.

## Admin Interface

All models are registered in Django admin with comprehensive fieldsets:

- **RoyaltyDistribution**: View/edit distributions with financial details, PRO routing, payment status
- **PublisherArtistSubDistribution**: View/edit sub-distributions with publisher fees and artist payments

## Testing Recommendations

1. **Unit Tests**
   - Test calculation with various station classes and time periods
   - Test contributor split validation
   - Test publisher routing logic
   - Test sub-distribution creation

2. **Integration Tests**
   - Test complete flow from play log to distribution
   - Test batch processing
   - Test status transitions
   - Test parent-child distribution relationships

3. **Edge Cases**
   - Track with no contributors
   - Splits not totaling 100%
   - Missing publisher profile
   - Multiple contributors with same publisher
   - International payments with currency conversion

## Future Enhancements

1. **Payment Gateway Integration**: Connect to actual payment processors
2. **Automated Payouts**: Schedule automatic payments when thresholds are met
3. **Currency Conversion**: Real-time exchange rates for international payments
4. **PRO Integration**: Automated reporting to performing rights organizations
5. **Dispute Resolution**: Workflow for handling royalty disputes
6. **Analytics Dashboard**: Real-time royalty tracking and forecasting
7. **Tax Handling**: Automatic tax withholding and reporting
8. **Batch Payments**: Group multiple distributions into single payment batches

## Support & Maintenance

For issues or questions:
1. Check validation errors in calculation results
2. Review Django admin for distribution status
3. Check logs for routing and calculation errors
4. Verify contributor splits total 100%
5. Ensure publisher profiles are properly configured

## Version History

- **v2.0** (2025-11-21): Major fixes - Publisher routing, sub-distributions, validation
- **v1.0** (2025-01-01): Initial implementation with basic calculation and distribution
