#!/usr/bin/env python
"""
Script to onboard a publisher directly into the database.
This bypasses the normal registration/verification/onboarding flow for demo purposes.

Usage:
    python prototype/onboard_publisher.py
"""

import os
import sys
import django
from decimal import Decimal
from datetime import date

# Setup Django environment
script_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(script_dir)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import get_user_model
from publishers.models import PublisherProfile, PublisherAccountSettings
from bank_account.models import BankAccount

User = get_user_model()


def onboard_publisher():
    """Create a fully onboarded publisher"""
    
    import random
    suffix = random.randint(1000, 9999)
    email = f"publisher{suffix}@demo.zamio.com"
    password = "Demo1234"
    company_name = f"Demo Music Publishing {suffix}"
    
    print("=" * 60)
    print("Creating Publisher Account")
    print("=" * 60)
    
    # Step 1: Create User
    print("\n[1/5] Creating user account...")
    user = User.objects.create_user(
        email=email,
        first_name="Publisher",
        last_name="Admin",
        password=password,
        is_active=True
    )
    user.user_type = "Publisher"
    user.phone = "+233255678901"
    user.country = "ghana"
    user.location = "Accra, Ghana"
    user.email_verified = True
    user.verified = True
    user.profile_complete = True
    user.verification_status = 'verified'
    user.kyc_status = 'verified'
    user.save()
    print(f"   ✓ User created: {email}")
    
    # Step 2: Create Publisher Profile
    print("\n[2/5] Creating publisher profile...")
    publisher = PublisherProfile.objects.create(
        user=user,
        company_name=company_name,
        company_type="Music Publishing",
        industry="Entertainment & Media",
        founded_year=2018,
        employee_count=15,
        primary_contact_name=f"{user.first_name} {user.last_name}",
        primary_contact_email=email,
        primary_contact_phone="+233255678901",
        compliance_officer_name="Compliance Officer",
        compliance_officer_email=f"compliance@{company_name.lower().replace(' ', '')}.com",
        compliance_officer_phone="+233255678902",
        compliance_officer_title="Chief Compliance Officer",
        tax_id=f"TIN-PUB-{suffix}",
        business_registration_number=f"BRN-PUB-{suffix}",
        license_number=f"GHAMRO-PUB-{suffix}",
        region="Greater Accra",
        city="Accra",
        country="ghana",
        address="123 Publishing Street, East Legon",
        postal_code="GA-123-4567",
        location_name="Accra, Ghana",
        website_url="https://demo.zamio.com",
        description=f"{company_name} is a leading music publishing company in Ghana, representing talented songwriters and composers across Africa.",
        verified=True,
        onboarding_step='done',
        profile_completed=True,
        revenue_split_completed=True,
        link_artist_completed=True,
        payment_info_added=True,
        active=True
    )
    print(f"   ✓ Publisher profile created: {company_name}")
    
    # Step 3: Configure Revenue Split
    print("\n[3/5] Setting up revenue split configuration...")
    publisher.writer_split = Decimal("50.00")
    publisher.publisher_split = Decimal("50.00")
    publisher.mechanical_share = Decimal("50.00")
    publisher.performance_share = Decimal("50.00")
    publisher.sync_share = Decimal("50.00")
    publisher.administrative_fee_percentage = Decimal("15.00")
    publisher.revenue_split_notes = "Standard 50/50 split with 15% administrative fee"
    publisher.save()
    print("   ✓ Revenue split configured (50/50 split)")
    
    # Step 4: Add Payment Info
    print("\n[4/5] Setting up payment information...")
    publisher.preferred_payment_method = "bank-transfer"
    publisher.payout_currency = "GHS"
    publisher.payout_frequency = "monthly"
    publisher.minimum_payout_amount = Decimal("500.00")
    publisher.withholding_tax_rate = Decimal("5.00")
    publisher.vat_registration_number = f"VAT-{suffix}"
    publisher.bank_name = "Ecobank Ghana"
    publisher.bank_account = f"9876543210{suffix}"
    publisher.bank_account_name = company_name
    publisher.bank_branch_code = "ECO-ACC-002"
    publisher.bank_swift_code = "ECOCGHAC"
    publisher.momo_provider = "Vodafone"
    publisher.momo_account = "+233255678901"
    publisher.momo_account_name = company_name
    publisher.save()
    print("   ✓ Payment preferences configured (Bank Transfer)")
    
    # Step 5: Create Account Settings & Wallet
    print("\n[5/5] Creating account settings and wallet...")
    
    # Create account settings
    PublisherAccountSettings.objects.create(
        publisher=publisher,
        email_notifications=True,
        royalty_alerts=True,
        weekly_reports=True,
        two_factor_auth=False,
        preferred_language='en',
        timezone='Africa/Accra',
        currency='GHS'
    )
    
    # Create wallet
    bank_account, created = BankAccount.objects.get_or_create(
        user=user,
        defaults={
            'balance': Decimal('0.00'),
            'currency': "GHS",
        }
    )
    print(f"   ✓ Account settings and wallet created: {bank_account.balance} {bank_account.currency}")
    
    # Summary
    print("\n" + "=" * 60)
    print("✓ PUBLISHER ONBOARDING COMPLETE")
    print("=" * 60)
    print(f"\nPublisher Details:")
    print(f"  Company Name:  {publisher.company_name}")
    print(f"  Publisher ID:  {publisher.publisher_id}")
    print(f"  Email:         {user.email}")
    print(f"  Password:      {password}")
    print(f"  User Type:     {user.user_type}")
    print(f"  Location:      {publisher.city}, {publisher.region}")
    print(f"  Company Type:  {publisher.company_type}")
    print(f"  Founded:       {publisher.founded_year}")
    print(f"  Employees:     {publisher.employee_count}")
    print(f"  License:       {publisher.license_number}")
    print(f"  Verification:  {'Verified' if publisher.verified else 'Pending'}")
    print(f"  Onboarding:    {publisher.onboarding_step}")
    print(f"\nRevenue Split:")
    print(f"  Writer Split:     {publisher.writer_split}%")
    print(f"  Publisher Split:  {publisher.publisher_split}%")
    print(f"  Admin Fee:        {publisher.administrative_fee_percentage}%")
    print(f"\nPayment Method:  {publisher.preferred_payment_method}")
    print(f"Bank Account:    {publisher.bank_name} - {publisher.bank_account}")
    print(f"Wallet Balance:  {bank_account.balance} {bank_account.currency}")
    print("\n" + "=" * 60)
    print("\nYou can now use these credentials to sign in:")
    print(f"  Email:    {email}")
    print(f"  Password: {password}")
    print("=" * 60 + "\n")
    
    return {
        'email': email,
        'password': password,
        'company_name': company_name,
        'publisher_id': publisher.publisher_id,
        'user_id': str(user.user_id)
    }


if __name__ == '__main__':
    try:
        result = onboard_publisher()
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
