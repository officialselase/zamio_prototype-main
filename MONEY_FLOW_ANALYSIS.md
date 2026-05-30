# 💰 Money Flow System - Current vs Proposed

## 📊 Current System Analysis

### What Exists Now

#### 1. **BankAccount Model** ✅
**Location**: `zamio_backend/bank_account/models.py`

```python
class BankAccount(models.Model):
    user = ForeignKey(User)
    account_id = CharField(unique=True)
    balance = DecimalField(default=0.00)
    currency = CharField(default="Ghc")
    
    def deposit(amount, description)
    def withdraw(amount, description)
```

**Features**:
- Each user has a bank account
- Has balance tracking
- Has deposit/withdraw methods
- Creates Transaction records

#### 2. **Transaction Model** ✅
```python
class Transaction(models.Model):
    bank_account = ForeignKey(BankAccount)
    transaction_type = 'Deposit' | 'Withdrawal' | 'Transfer'
    amount = DecimalField
    status = 'Requested' | 'Paid' | 'Declined'
    payment_method = 'MTN MoMo' | 'Bank Transfer'
```

#### 3. **RoyaltyWithdrawal Model** ✅
```python
class RoyaltyWithdrawal(models.Model):
    requester = ForeignKey(User)
    requester_type = 'artist' | 'publisher' | 'admin'
    amount = DecimalField
    status = 'pending' | 'approved' | 'rejected' | 'processed'
    artist = ForeignKey(Artist)
    publisher = ForeignKey(Publisher)
```

**Validation Logic**:
- Self-published artists can request withdrawals
- Publishers can request for their signed artists
- Admins can process any withdrawal

---

## 🚨 Current System Issues

### ❌ **No Central Pool**
- No ZamIO platform account
- No central money management
- No way to track platform balance

### ❌ **No Money Deduction from Stations**
- Stations submit play logs
- No payment/charge happens
- No money enters the system

### ❌ **No Money Flow**
- Withdrawal requests are created
- But no actual money movement
- No connection between:
  - Station plays → Platform pool
  - Platform pool → Artist/Publisher accounts

### ❌ **Disconnected Systems**
- `BankAccount` exists but unused
- `RoyaltyWithdrawal` exists but doesn't move money
- No integration between them

---

## 🎯 Your Proposed System (CORRECT APPROACH)

### Money Flow Architecture

```
┌─────────────┐
│   STATION   │
│  (Plays)    │
└──────┬──────┘
       │ 1. Play detected
       │ 2. Cost deducted
       ↓
┌─────────────────────┐
│  ZAMIO CENTRAL POOL │  ← Platform Account
│   (Main Balance)    │
└──────┬──────────────┘
       │ 3. Withdrawal approved
       │ 4. Money transferred
       ↓
┌──────────────────────┐
│  ARTIST/PUBLISHER    │
│    (User Account)    │
└──────────────────────┘
```

### Proposed Flow Details

#### **Phase 1: Money IN (Station → Platform)**
1. Station plays a track
2. Match found (fingerprint/ACRCloud)
3. **Cost calculated** (based on royalty rate)
4. **Station account debited**
5. **ZamIO central pool credited**

#### **Phase 2: Money OUT (Platform → Artist/Publisher)**
1. Self-published artist requests withdrawal
   - OR Publisher requests on behalf of artist
2. Admin approves request
3. **ZamIO central pool debited**
4. **Artist/Publisher account credited**
5. Transaction recorded

---

## 🏗️ Required Implementation

### 1. **Create Platform Central Account**

```python
# New model or special BankAccount
class PlatformAccount(models.Model):
    account_id = CharField(unique=True, default='ZAMIO-CENTRAL')
    balance = DecimalField(default=0.00)
    currency = CharField(default='GHS')
    
    @classmethod
    def get_central_pool(cls):
        """Get or create the central platform account"""
        account, _ = cls.objects.get_or_create(
            account_id='ZAMIO-CENTRAL',
            defaults={'balance': 0.00}
        )
        return account
    
    def receive_from_station(self, amount, play_log, description):
        """Receive payment from station for play"""
        self.balance += amount
        self.save()
        # Create transaction record
    
    def pay_to_user(self, amount, user, withdrawal_request, description):
        """Pay out to artist/publisher"""
        if amount > self.balance:
            raise InsufficientFundsError()
        self.balance -= amount
        self.save()
        # Credit user's BankAccount
```

### 2. **Station Account System**

```python
# Extend BankAccount or create StationAccount
class StationAccount(models.Model):
    station = ForeignKey(Station)
    balance = DecimalField(default=0.00)
    
    def charge_for_play(self, play_log, royalty_amount):
        """Deduct cost when track is played"""
        if self.balance < royalty_amount:
            # Handle insufficient funds
            # Maybe allow negative balance or reject
            pass
        
        self.balance -= royalty_amount
        self.save()
        
        # Transfer to central pool
        central = PlatformAccount.get_central_pool()
        central.receive_from_station(
            amount=royalty_amount,
            play_log=play_log,
            description=f"Play: {play_log.track.title}"
        )
```

### 3. **Integrate with Play Log Processing**

```python
# In music_monitor/services.py or royalties/services.py
def process_play_log_payment(play_log):
    """Process payment when play log is matched"""
    
    # Calculate royalty amount
    royalty_rate = get_royalty_rate(play_log)
    amount = calculate_royalty_amount(play_log, royalty_rate)
    
    # Charge station
    station_account = play_log.station.get_account()
    station_account.charge_for_play(play_log, amount)
    
    # Money now in central pool
    # Will be distributed when withdrawal approved
```

### 4. **Update Withdrawal Processing**

```python
# In royalties/views.py or services.py
def approve_withdrawal_request(withdrawal_id, admin_user):
    """Approve and process withdrawal"""
    withdrawal = RoyaltyWithdrawal.objects.get(withdrawal_id=withdrawal_id)
    
    # Validate
    is_valid, message = withdrawal.validate_publishing_authority()
    if not is_valid:
        raise ValidationError(message)
    
    # Get accounts
    central_pool = PlatformAccount.get_central_pool()
    
    if withdrawal.requester_type == 'artist':
        # Self-published artist
        user_account = withdrawal.artist.user.bank_accounts.first()
    elif withdrawal.requester_type == 'publisher':
        # Publisher requesting for artist
        user_account = withdrawal.publisher.user.bank_accounts.first()
    
    # Transfer money
    central_pool.pay_to_user(
        amount=withdrawal.amount,
        user=user_account.user,
        withdrawal_request=withdrawal,
        description=f"Royalty payout: {withdrawal.withdrawal_id}"
    )
    
    # Credit user account
    user_account.deposit(
        amount=withdrawal.amount,
        description=f"Royalty payout: {withdrawal.withdrawal_id}"
    )
    
    # Update withdrawal status
    withdrawal.status = 'processed'
    withdrawal.processed_by = admin_user
    withdrawal.processed_at = timezone.now()
    withdrawal.save()
```

---

## 🔐 Access Control Rules (Your Requirements)

### ✅ **Self-Published Artists**
- Can request withdrawals directly
- Money goes to their BankAccount
- No publisher involved

### ✅ **Publisher-Signed Artists**
- **CANNOT** request withdrawals directly
- Publisher must request on their behalf
- Money goes to Publisher's account
- Publisher distributes to artists (outside system or manually)

### ✅ **Publishers**
- Can request withdrawals for their signed artists
- Receive money in their BankAccount
- Responsible for distributing to artists

### ✅ **Platform Admin**
- Manages central pool
- Approves/rejects withdrawal requests
- Can see all balances
- Processes payments

---

## 📊 Account Types Summary

| Account Type | Owner | Purpose | Can Withdraw? |
|--------------|-------|---------|---------------|
| **Platform Central Pool** | ZamIO | Holds all station payments | No (only admin transfers out) |
| **Station Account** | Radio Station | Pre-funded, pays for plays | No (only debited) |
| **Self-Published Artist** | Artist | Receives royalties | ✅ Yes (directly) |
| **Publisher Account** | Publisher | Receives royalties for artists | ✅ Yes (for their artists) |
| **Signed Artist** | Artist | No direct access | ❌ No (publisher handles) |

---

## 🔄 Complete Money Flow Example

### Scenario: Station plays a self-published artist's track

1. **Play Detected**
   - Station XYZ plays "Song A" by Artist John
   - Fingerprint match confirmed

2. **Cost Calculated**
   - Royalty rate: GHS 2.00 per play
   - Station account: GHS 1000.00

3. **Station Charged**
   - Station account: GHS 1000.00 → GHS 998.00
   - Transaction created: "Debit for play"

4. **Platform Receives**
   - Central pool: GHS 5000.00 → GHS 5002.00
   - Transaction created: "Play revenue from Station XYZ"

5. **Artist Requests Withdrawal**
   - John (self-published) requests GHS 50.00
   - Withdrawal status: pending

6. **Admin Approves**
   - Admin reviews request
   - Validates: John is self-published ✅
   - Approves withdrawal

7. **Money Transferred**
   - Central pool: GHS 5002.00 → GHS 4952.00
   - John's account: GHS 0.00 → GHS 50.00
   - Withdrawal status: processed

8. **John Withdraws to Bank**
   - John requests external withdrawal
   - Money sent to his MTN MoMo or Bank
   - Transaction status: Paid

---

## 🚀 Implementation Priority

### Phase 1: Core Money Flow (HIGH)
1. Create PlatformAccount model
2. Create/extend StationAccount model
3. Integrate with play log processing
4. Implement station charging logic

### Phase 2: Withdrawal Processing (HIGH)
1. Connect RoyaltyWithdrawal to BankAccount
2. Implement money transfer logic
3. Update approval workflow
4. Add balance checks

### Phase 3: Access Control (MEDIUM)
1. Enforce self-published vs signed rules
2. Block signed artists from direct withdrawal
3. Enable publisher withdrawal for artists
4. Add validation checks

### Phase 4: Admin Interface (MEDIUM)
1. Central pool dashboard
2. Withdrawal approval UI
3. Balance monitoring
4. Transaction history

### Phase 5: External Payouts (LOW)
1. MTN MoMo integration
2. Bank transfer integration
3. Payment gateway setup
4. Payout scheduling

---

## ⚠️ Current System Status

| Component | Status | Notes |
|-----------|--------|-------|
| BankAccount model | ✅ Exists | Not integrated with royalties |
| Transaction model | ✅ Exists | Not used for royalties |
| RoyaltyWithdrawal | ✅ Exists | No money movement |
| Central pool | ❌ Missing | Critical gap |
| Station charging | ❌ Missing | No money enters system |
| Money transfer | ❌ Missing | No actual payments |
| Access control | ⚠️ Partial | Validation exists, not enforced |

---

## ✅ Your Vision is Correct!

Your proposed system is the **right architecture** for a music royalty platform:

1. ✅ Central pool for platform money management
2. ✅ Station accounts that get charged per play
3. ✅ Money flows: Station → Platform → Artist/Publisher
4. ✅ Self-published artists withdraw directly
5. ✅ Publishers withdraw for their signed artists
6. ✅ Admin controls and approves all transfers

This is how real PROs (ASCAP, BMI, GHAMRO) work!

---

**Next Step**: Should I create a detailed implementation spec for this money flow system?
