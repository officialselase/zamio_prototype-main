# 💰 Money Flow System - Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### Step 1: Run Migrations (2 minutes)

```bash
cd zamio_backend

# Create migrations for new models
python manage.py makemigrations bank_account

# Apply migrations
python manage.py migrate bank_account
```

**Expected Output**:
```
Migrations for 'bank_account':
  bank_account/migrations/0XXX_platformaccount_stationaccount.py
    - Create model PlatformAccount
    - Create model StationAccount
    - Create model PlatformTransaction
    - Create model StationTransaction
```

---

### Step 2: Setup Accounts (1 minute)

```bash
# Create all accounts and fund stations with 10,000 GHS each
python manage.py setup_money_flow --all --fund-stations 10000
```

**Expected Output**:
```
Creating central platform account...
✓ Central pool created: ZAMIO-CENTRAL-POOL - Balance: 0.00 GHS

Creating station accounts...
  ✓ Created account for: Radio Station 1
  ✓ Created account for: Radio Station 2
✓ Station accounts: 5 created, 0 already existed

Adding 10000.00 GHS to all station accounts...
  ✓ Funded Radio Station 1: 10000.00 GHS
  ✓ Funded Radio Station 2: 10000.00 GHS
✓ Funded 5 station accounts

Creating user bank accounts...
✓ Artist accounts: 15 created, 0 already existed
✓ Publisher accounts: 3 created, 0 already existed

✓ Money flow system setup complete!
```

---

### Step 3: Test the Flow (2 minutes)

#### Option A: Django Shell

```bash
python manage.py shell
```

```python
from decimal import Decimal
from bank_account.models import PlatformAccount, StationAccount
from royalties.services import RoyaltyPaymentService
from music_monitor.models import PlayLog
from stations.models import Station

# Check central pool
pool = PlatformAccount.get_central_pool()
print(f"Central Pool Balance: {pool.balance} {pool.currency}")

# Check a station account
station = Station.objects.first()
station_account = station.account
print(f"Station Balance: {station_account.balance} {station_account.currency}")

# Simulate processing a play (if you have play logs)
play_log = PlayLog.objects.filter(track__isnull=False).first()
if play_log:
    success, message = RoyaltyPaymentService.process_play_payment(play_log)
    print(f"Payment processed: {success} - {message}")
    
    # Check balances again
    pool.refresh_from_db()
    station_account.refresh_from_db()
    print(f"New Central Pool: {pool.balance}")
    print(f"New Station Balance: {station_account.balance}")
```

#### Option B: Admin Interface

1. Go to: `http://localhost:8000/admin/`
2. Navigate to: **Bank Account** section
3. View:
   - **Platform Accounts** - See central pool
   - **Station Accounts** - See all station balances
   - **Platform Transactions** - See money flow
   - **Station Transactions** - See charges

---

## 🎯 Common Operations

### Add Funds to a Station

**Via API** (Admin only):
```bash
curl -X POST http://localhost:8000/api/royalties/stations/1/add-funds/ \
  -H "Authorization: Token YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 5000,
    "description": "Monthly top-up"
  }'
```

**Via Django Shell**:
```python
from stations.models import Station
from decimal import Decimal

station = Station.objects.get(id=1)
station.account.add_funds(
    amount=Decimal('5000.00'),
    description='Monthly top-up'
)
```

---

### Process a Play Payment

**Automatic** (when integrated with play log processing):
```python
# In your play log processing code
from royalties.services import RoyaltyPaymentService

success, message = RoyaltyPaymentService.process_play_payment(play_log)
```

**Manual** (for testing):
```python
from music_monitor.models import PlayLog
from royalties.services import RoyaltyPaymentService

play_log = PlayLog.objects.get(id=123)
success, message = RoyaltyPaymentService.process_play_payment(play_log)
print(message)
```

---

### Approve a Withdrawal Request

**Via API** (Admin only):
```bash
curl -X POST http://localhost:8000/api/royalties/withdrawals/WITHDRAWAL-UUID/approve-payment/ \
  -H "Authorization: Token YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

**Via Django Shell**:
```python
from royalties.services import RoyaltyPaymentService
from accounts.models import User

admin_user = User.objects.get(email='admin@zamio.com')
withdrawal = RoyaltyPaymentService.approve_and_process_withdrawal(
    withdrawal_id='WITHDRAWAL-UUID',
    admin_user=admin_user
)
print(f"Withdrawal processed: {withdrawal.status}")
```

---

### Check Balances

**Central Pool**:
```python
from bank_account.models import PlatformAccount

pool = PlatformAccount.get_central_pool()
print(f"Balance: {pool.balance}")
print(f"Total Received: {pool.total_received}")
print(f"Total Paid Out: {pool.total_paid_out}")
```

**Station**:
```python
from stations.models import Station

station = Station.objects.get(id=1)
print(f"Balance: {station.account.balance}")
print(f"Total Spent: {station.account.total_spent}")
print(f"Total Plays: {station.account.total_plays}")
```

**User (Artist/Publisher)**:
```python
from accounts.models import User

user = User.objects.get(email='artist@example.com')
account = user.bank_accounts.first()
print(f"Balance: {account.balance}")
```

---

## 🔍 Monitoring & Debugging

### View All Transactions

**Platform Transactions** (money in/out of central pool):
```python
from bank_account.models import PlatformTransaction

# Recent transactions
transactions = PlatformTransaction.objects.all()[:10]
for tx in transactions:
    print(f"{tx.transaction_type}: {tx.amount} - {tx.description}")
```

**Station Transactions** (station charges):
```python
from bank_account.models import StationTransaction

station_id = 1
transactions = StationTransaction.objects.filter(
    station_account__station_id=station_id
)[:10]
for tx in transactions:
    print(f"{tx.transaction_type}: {tx.amount} - {tx.description}")
```

---

### Check Withdrawal Requests

**Pending Withdrawals**:
```python
from royalties.models import RoyaltyWithdrawal

pending = RoyaltyWithdrawal.objects.filter(status='pending')
for w in pending:
    print(f"{w.withdrawal_id}: {w.amount} {w.currency} - {w.requester.email}")
```

**All Withdrawals for an Artist**:
```python
from artists.models import Artist

artist = Artist.objects.get(id=1)
withdrawals = RoyaltyWithdrawal.objects.filter(artist=artist)
for w in withdrawals:
    print(f"{w.status}: {w.amount} - {w.requested_at}")
```

---

## 🐛 Troubleshooting

### Issue: "Station has insufficient funds"

**Solution**: Add funds to station account
```python
station.account.add_funds(Decimal('10000.00'), 'Top-up')
```

Or enable negative balance:
```python
station.account.allow_negative_balance = True
station.account.credit_limit = Decimal('5000.00')
station.account.save()
```

---

### Issue: "Central pool has insufficient funds"

**Check balance**:
```python
pool = PlatformAccount.get_central_pool()
print(f"Balance: {pool.balance}")
print(f"Received: {pool.total_received}")
print(f"Paid Out: {pool.total_paid_out}")
```

**Solution**: Process more plays to add money to pool, or manually adjust (admin only):
```python
# Manual adjustment (for testing only)
pool.balance += Decimal('10000.00')
pool.save()
```

---

### Issue: "Artist cannot request withdrawal"

**Check publishing status**:
```python
artist = Artist.objects.get(id=1)
print(f"Self-published: {artist.self_published}")
print(f"Publisher: {artist.publisher}")
```

**Solution**: 
- If artist has publisher, publisher must request on their behalf
- If artist should be self-published, update:
```python
artist.self_published = True
artist.publisher = None
artist.save()
```

---

## 📊 Quick Stats

### System Overview

```python
from bank_account.models import PlatformAccount, StationAccount, BankAccount
from royalties.models import RoyaltyWithdrawal

# Central pool
pool = PlatformAccount.get_central_pool()
print(f"Central Pool: {pool.balance} GHS")

# All stations
stations_total = sum(
    sa.balance for sa in StationAccount.objects.all()
)
print(f"All Stations: {stations_total} GHS")

# All users
users_total = sum(
    ba.balance for ba in BankAccount.objects.all()
)
print(f"All Users: {users_total} GHS")

# Pending withdrawals
pending_amount = sum(
    w.amount for w in RoyaltyWithdrawal.objects.filter(status='pending')
)
print(f"Pending Withdrawals: {pending_amount} GHS")
```

---

## 🎉 You're Ready!

The money flow system is now operational. Next steps:

1. ✅ **Integrate with play log processing** - Auto-charge stations
2. ✅ **Build frontend UIs** - Artist/Publisher/Admin interfaces
3. ✅ **Add external payouts** - MTN MoMo, Bank transfers
4. ✅ **Set up notifications** - Email alerts for withdrawals

---

**Need Help?** Check `MONEY_FLOW_IMPLEMENTATION_COMPLETE.md` for detailed documentation.
