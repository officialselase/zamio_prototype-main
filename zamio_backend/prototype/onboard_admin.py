#!/usr/bin/env python
"""
Script to create an admin/superuser account directly in the database.
This creates a Django superuser with full platform access.

Usage:
    python prototype/onboard_admin.py
"""

import os
import sys
import django

# Setup Django environment
script_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(script_dir)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import get_user_model
from mr_admin.models import MrAdmin

User = get_user_model()


def onboard_admin():
    """Create an admin/superuser account"""
    
    import random
    suffix = random.randint(1000, 9999)
    email = f"admin{suffix}@demo.zamio.com"
    password = "Demo1234"
    
    print("=" * 60)
    print("Creating Admin/Superuser Account")
    print("=" * 60)
    
    # Step 1: Create Superuser
    print("\n[1/2] Creating superuser account...")
    user = User.objects.create_superuser(
        email=email,
        first_name="Admin",
        last_name="User",
        password=password
    )
    user.user_type = "Admin"
    user.phone = "+233266789012"
    user.country = "ghana"
    user.location = "Accra, Ghana"
    user.email_verified = True
    user.verified = True
    user.profile_complete = True
    user.verification_status = 'verified'
    user.kyc_status = 'verified'
    user.is_active = True
    user.save()
    print(f"   ✓ Superuser created: {email}")
    
    # Step 2: Create MrAdmin Profile
    print("\n[2/2] Creating admin profile...")
    admin_profile = MrAdmin.objects.create(
        user=user,
        city="Accra",
        postal_code="GA-123-4567",
        address="ZamIO Headquarters, East Legon, Accra",
        organization_name="ZamIO Platform",
        role="System Administrator",
        active=True
    )
    print(f"   ✓ Admin profile created: {admin_profile.admin_id}")
    
    # Summary
    print("\n" + "=" * 60)
    print("✓ ADMIN ACCOUNT CREATED")
    print("=" * 60)
    print(f"\nAdmin Details:")
    print(f"  Email:         {user.email}")
    print(f"  Password:      {password}")
    print(f"  User Type:     {user.user_type}")
    print(f"  User ID:       {user.user_id}")
    print(f"  Admin ID:      {admin_profile.admin_id}")
    print(f"  Is Staff:      {user.is_staff}")
    print(f"  Is Admin:      {user.is_admin}")
    print(f"  Is Superuser:  {user.admin}")
    print(f"  Organization:  {admin_profile.organization_name}")
    print(f"  Role:          {admin_profile.role}")
    print(f"  Location:      {user.location}")
    print(f"  Verification:  {user.verification_status}")
    print("\n" + "=" * 60)
    print("\n💡 ADMIN ACCESS:")
    print("   • Full Django admin panel access")
    print("   • User management capabilities")
    print("   • System configuration access")
    print("   • All platform features unlocked")
    print("\n" + "=" * 60)
    print("\nYou can now use these credentials to sign in:")
    print(f"  Email:    {email}")
    print(f"  Password: {password}")
    print("\nDjango Admin Panel:")
    print("  URL: http://localhost:8000/admin/")
    print("=" * 60 + "\n")
    
    return {
        'email': email,
        'password': password,
        'user_id': str(user.user_id),
        'admin_id': admin_profile.admin_id,
        'is_superuser': True
    }


if __name__ == '__main__':
    try:
        result = onboard_admin()
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
