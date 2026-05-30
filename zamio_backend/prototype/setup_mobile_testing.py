#!/usr/bin/env python
"""
Script to help setup local environment for mobile app testing.
Displays your local IP and provides configuration instructions.

Usage:
    python prototype/setup_mobile_testing.py
"""

import socket
import sys
import platform


def get_local_ip():
    """Get the local IP address of this machine (host, not Docker)"""
    try:
        # Try to get host IP from environment variable (set by Docker)
        import os
        host_ip = os.environ.get('HOST_IP')
        if host_ip and not host_ip.startswith('172.'):
            return host_ip
        
        # Create a socket to determine the local IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        # Connect to an external address (doesn't actually send data)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
        
        # Filter out Docker internal IPs (172.x.x.x)
        if local_ip.startswith('172.'):
            return None
        
        return local_ip
    except Exception:
        return None


def get_all_ips():
    """Get all network interfaces and their IPs (excluding Docker internal)"""
    import socket
    hostname = socket.gethostname()
    try:
        # Get all IP addresses for this host
        ips = socket.getaddrinfo(hostname, None)
        ipv4_addresses = []
        for ip in ips:
            if ip[0] == socket.AF_INET:  # IPv4 only
                addr = ip[4][0]
                # Exclude localhost and Docker internal IPs
                if not addr.startswith('127.') and not addr.startswith('172.'):
                    ipv4_addresses.append(addr)
        return list(set(ipv4_addresses))  # Remove duplicates
    except Exception:
        return []


def display_setup_instructions():
    """Display setup instructions for mobile testing"""
    
    print("\n" + "=" * 70)
    print("ZAMIO MOBILE APP TESTING SETUP")
    print("=" * 70)
    
    # Get local IP
    local_ip = get_local_ip()
    all_ips = get_all_ips()
    
    if not local_ip and not all_ips:
        print("\n⚠️  RUNNING INSIDE DOCKER CONTAINER")
        print("=" * 70)
        print("\nCould not detect your computer's local IP from inside Docker.")
        print("You need to find your computer's WiFi/LAN IP address manually.\n")
        print("On your HOST computer (not in Docker), run:\n")
        if platform.system() == "Windows":
            print("   Windows: ipconfig")
            print("   Look for 'IPv4 Address' under your WiFi/Ethernet adapter")
        else:
            print("   macOS/Linux: ifconfig or ip addr show")
            print("   Look for IP starting with 192.168.x.x or 10.0.x.x")
        print("\n❌ Docker internal IPs (172.x.x.x) won't work for mobile devices!")
        print("\n" + "=" * 70 + "\n")
        return
    
    # Display detected IPs
    print("\n📡 DETECTED NETWORK CONFIGURATION:\n")
    
    if local_ip:
        print(f"   Primary IP: {local_ip}")
    
    if all_ips:
        print(f"\n   All Network IPs:")
        for ip in all_ips:
            marker = " ← (Recommended)" if ip == local_ip else ""
            print(f"   • {ip}{marker}")
    
    # Use primary IP or first available
    selected_ip = local_ip or (all_ips[0] if all_ips else "YOUR_IP_HERE")
    
    # Docker Compose Configuration
    print("\n" + "=" * 70)
    print("STEP 1: UPDATE DOCKER COMPOSE CONFIGURATION")
    print("=" * 70)
    print(f"\nEdit docker-compose.local.yml and update the backend service:\n")
    print("backend:")
    print("  environment:")
    print(f"    ALLOWED_HOSTS: localhost,127.0.0.1,backend,{selected_ip}")
    print(f"    CSRF_TRUSTED_ORIGINS: http://localhost:8000,http://127.0.0.1:8000,http://{selected_ip}:8000")
    print(f"    BASE_URL: http://{selected_ip}:8000")
    
    # Restart Instructions
    print("\n" + "=" * 70)
    print("STEP 2: RESTART DOCKER SERVICES")
    print("=" * 70)
    print("\nRun these commands:\n")
    print("docker compose -f docker-compose.local.yml down")
    print("docker compose -f docker-compose.local.yml up -d")
    
    # Mobile App Configuration
    print("\n" + "=" * 70)
    print("STEP 3: CONFIGURE MOBILE APP")
    print("=" * 70)
    print(f"\nUpdate your Flutter app's API configuration:\n")
    print("File: zamio_app/lib/config/api_config.dart\n")
    print("class ApiConfig {")
    print(f"  static const String baseUrl = 'http://{selected_ip}:8000';")
    print("  static const String apiUrl = '$baseUrl/api';")
    print("}")
    
    # Test URLs
    print("\n" + "=" * 70)
    print("STEP 4: TEST CONNECTIVITY")
    print("=" * 70)
    print(f"\nFrom your mobile device's browser, visit:\n")
    print(f"   Django Admin: http://{selected_ip}:8000/admin/")
    print(f"   Artist Portal: http://{selected_ip}:5173/")
    print(f"   Station Portal: http://{selected_ip}:5174/")
    
    # Firewall Instructions
    print("\n" + "=" * 70)
    print("STEP 5: CONFIGURE FIREWALL (IF NEEDED)")
    print("=" * 70)
    print("\nIf you can't connect from mobile device:\n")
    
    if platform.system() == "Windows":
        print("Windows Firewall:")
        print("  1. Open Windows Defender Firewall")
        print("  2. Click 'Advanced settings'")
        print("  3. Click 'Inbound Rules' → 'New Rule'")
        print("  4. Select 'Port' → Next")
        print("  5. Enter port 8000 → Next")
        print("  6. Allow the connection → Finish")
    elif platform.system() == "Darwin":
        print("macOS Firewall:")
        print("  1. System Preferences → Security & Privacy")
        print("  2. Firewall tab → Firewall Options")
        print("  3. Add Python or Docker to allowed apps")
    else:
        print("Linux Firewall (ufw):")
        print("  sudo ufw allow 8000")
        print("  sudo ufw reload")
    
    # Setup Test Data
    print("\n" + "=" * 70)
    print("STEP 6: CREATE TEST DATA")
    print("=" * 70)
    print("\nRun the onboarding script to create test accounts:\n")
    print("docker compose -f docker-compose.local.yml exec backend python prototype/onboard_complete.py")
    
    # Quick Reference
    print("\n" + "=" * 70)
    print("QUICK REFERENCE")
    print("=" * 70)
    print(f"\nYour Backend API: http://{selected_ip}:8000")
    print(f"Mobile App Config: baseUrl = 'http://{selected_ip}:8000'")
    print(f"\nTest from mobile browser: http://{selected_ip}:8000/admin/")
    
    print("\n" + "=" * 70)
    print("📱 READY TO TEST!")
    print("=" * 70)
    print("\n1. Update docker-compose.local.yml with the IP above")
    print("2. Restart Docker services")
    print("3. Update mobile app API configuration")
    print("4. Rebuild and install mobile app")
    print("5. Test connectivity from mobile browser")
    print("6. Start testing audio detection!")
    
    print("\n" + "=" * 70)
    print("\n⚠️  SECURITY NOTE: This is for LOCAL TESTING ONLY")
    print("   Do NOT expose to the internet or use in production")
    print("\n" + "=" * 70 + "\n")


if __name__ == '__main__':
    try:
        display_setup_instructions()
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
