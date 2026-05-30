# Royalty System - Quick Reference Guide

## 🎯 Key Concepts

### Payment Chain
```
Radio Play → Royalty Calculation → Distribution → Sub-Distribution (if publisher) → Final Payment
```

### Recipient Types
- **artist**: Self-published artist (direct payment)
- **publisher**: Publisher receives payment (creates sub-distribution)
- **contributor**: Other contributors (producers, writers)
- **pro**: Performing Rights Organization
- **external_pro**: International PRO (reciprocal agreements)

## 📊 Calculation Formula

```
gross_royalty = base_rate × duration_seconds × time_multiplier

For each contributor:
    contributor_amount = gross_royalty × (contributor_split_percentage / 100)
    
If contributor has publisher:
    publisher_receives = contributor_amount
    publisher_keeps = contributor_amount × (publisher_fee_percentage / 100)
    artist_receives = contributor_amount - publisher_keeps
```

## 🔧 Common Operations

### Calculate Royalties for a Play Log

```python
from royalties.calculator import RoyaltyCalculator

calculator = RoyaltyCalculator()
result = calculator.calculate_royalties(play_log)

if not result.errors:
    distributions = calculator.create_royalty_distributions(result)
else:
    print(f"Errors: {result.errors}")
```

### Query User's Total Earnings

```python
from music_monitor.models import RoyaltyDistribution, PublisherArtistSubDistribution
from django.db.models import Sum

# Direct distributions
direct = RoyaltyDistribution.objects.filter(recipient=user)
direct_total = direct.aggregate(Sum('net_amount'))['total'] or 0

# Publisher sub-distributions
sub_dists = PublisherArtistSubDistribution.objects.filter(artist=user)
sub_total = sub_dists.aggregate(Sum('artist_net_amount'))['total'] or 0

total = direct_total + sub_total
```

### Approve and Pay Sub-Distribution

```python
sub_dist = PublisherArtistSubDistribution.objects.get(sub_distribution_id=uuid)

# Approve
sub_dist.approve_for_payment()

# Mark as paid
sub_dist.mark_as_paid(
    payment_reference='TXN123456',
    payment_method='Bank Transfer'
)
```

## 🌐 API Endpoints

### Admin - Get User Royalties
```http
GET /api/accounts/admin/user-royalties/?user_id={uuid}
Authorization: Bearer {token}
```

### Publisher - Get Sub-Distributions
```http
GET /api/publishers/sub-distributions/
Authorization: Bearer {token}

Query params:
- status: pending|calculated|approved|paid
- artist_id: {uuid}
- start_date: YYYY-MM-DD
- end_date: YYYY-MM-DD
```

### Publisher - Approve Sub-Distribution
```http
POST /api/publishers/sub-distributions/approve/
Authorization: Bearer {token}
Content-Type: application/json

{
  "sub_distribution_id": "uuid"
}
```

### Publisher - Mark as Paid
```http
POST /api/publishers/sub-distributions/mark-paid/
Authorization: Bearer {token}
Content-Type: application/json

{
  "sub_distribution_id": "uuid",
  "payment_reference": "TXN123456",
  "payment_method": "Bank Transfer"
}
```

## ⚠️ Validation Rules

### Track Contributors
- ✅ Must have at least one active contributor
- ✅ Splits must total exactly 100%
- ✅ Each split must be > 0% and ≤ 100%

### Calculation
- ✅ Track must exist
- ✅ Play log must have valid timestamp
- ✅ Duration must be available (from play log or track)

### Publisher Routing
- ✅ Publisher profile must exist
- ✅ Publisher must have user account
- ✅ Publisher fee percentage must be set (default 15%)

## 📈 Status Flow

### RoyaltyDistribution
```
pending → calculated → approved → paid
                              ↓
                        partially_paid (if some sub-distributions paid)
```

### PublisherArtistSubDistribution
```
pending → calculated → approved → paid
```

## 🔍 Troubleshooting

### "Track has no active contributors"
- Check: `Track.contributors.filter(active=True).exists()`
- Fix: Add contributors or activate existing ones

### "Invalid contributor splits: total X%"
- Check: `Track.validate_contributor_splits()`
- Fix: Adjust splits to total exactly 100%

### "Publisher not found for distribution"
- Check: Publisher profile exists and has user account
- Fix: Create/link publisher profile

### Royalties not showing for artist
- Check both:
  - `RoyaltyDistribution.objects.filter(recipient=user)`
  - `PublisherArtistSubDistribution.objects.filter(artist=user)`

## 📝 Database Queries

### Get all pending payments for a publisher
```python
PublisherArtistSubDistribution.objects.filter(
    publisher=publisher,
    status__in=['pending', 'calculated', 'approved']
).aggregate(total=Sum('artist_net_amount'))
```

### Get artist's earnings by publisher
```python
PublisherArtistSubDistribution.objects.filter(
    artist=user
).values('publisher__company_name').annotate(
    total=Sum('artist_net_amount'),
    paid=Sum('artist_net_amount', filter=Q(status='paid'))
)
```

### Get top earning tracks
```python
RoyaltyDistribution.objects.values(
    'play_log__track__title'
).annotate(
    total=Sum('net_amount')
).order_by('-total')[:10]
```

## 🎨 Station Classes & Rates

| Class | Type | Rate/Second | Prime Multiplier |
|-------|------|-------------|------------------|
| A | Major Metro | 0.015 GHS | 1.5x |
| B | Regional | 0.012 GHS | 1.3x |
| C | Local | 0.008 GHS | 1.2x |
| Online | Internet | 0.010 GHS | 1.1x |
| Community | Non-profit | 0.005 GHS | 1.0x |

## ⏰ Time Periods

- **Prime**: 6-10 AM, 4-8 PM (higher rates)
- **Regular**: 10 AM-4 PM, 8 PM-12 AM (standard)
- **Off-Peak**: 12-6 AM (lower rates)

## 💡 Best Practices

1. **Always validate** contributor splits before calculation
2. **Use batch processing** for multiple play logs
3. **Check errors** in calculation results before creating distributions
4. **Track payment references** for audit trail
5. **Update status** as payments progress through workflow
6. **Monitor sub-distributions** for publisher-represented artists
7. **Use transactions** when creating multiple related records

## 🚀 Quick Start

```python
# 1. Calculate royalties
from royalties.calculator import RoyaltyCalculator
calculator = RoyaltyCalculator()

# 2. Process play logs
play_logs = PlayLog.objects.filter(track__isnull=False)[:100]
results = calculator.batch_calculate_royalties(list(play_logs))

# 3. Create distributions
for result in results:
    if not result.errors:
        calculator.create_royalty_distributions(result)

# 4. Check results
print(f"Processed {len(results)} play logs")
print(f"Errors: {sum(1 for r in results if r.errors)}")
```

## 📚 Related Documentation

- **ROYALTY_SYSTEM.md** - Complete system documentation
- **ROYALTY_SYSTEM_FIXES.md** - Summary of fixes and changes
- **Django Admin** - `/admin/music_monitor/` for viewing distributions
