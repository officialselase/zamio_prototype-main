# How to Find Your Local IP Address for Mobile Testing

The Docker script detected `172.18.0.4` which is a **Docker internal IP** that your mobile device cannot reach.

You need your **computer's actual WiFi/LAN IP address**.

## Windows (Your System)

### Method 1: Command Prompt
```cmd
ipconfig
```

Look for **"IPv4 Address"** under your active network adapter:
- **Wireless LAN adapter Wi-Fi** (if using WiFi)
- **Ethernet adapter** (if using wired connection)

Example output:
```
Wireless LAN adapter Wi-Fi:
   IPv4 Address. . . . . . . . . . . : 192.168.1.100
```

Your IP is: **192.168.1.100** ✅

### Method 2: PowerShell
```powershell
Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -like "192.168.*" -or $_.IPAddress -like "10.0.*"}
```

### Method 3: Settings
1. Open **Settings** → **Network & Internet**
2. Click on your connection (WiFi or Ethernet)
3. Scroll down to **Properties**
4. Look for **IPv4 address**

## What to Look For

✅ **Valid IPs for mobile testing:**
- `192.168.x.x` (most common for home networks)
- `10.0.x.x` (some routers use this)
- `172.16.x.x` to `172.31.x.x` (some corporate networks)

❌ **Invalid IPs (won't work):**
- `127.0.0.1` (localhost - only works on same computer)
- `172.17.x.x` or `172.18.x.x` (Docker internal network)
- `169.254.x.x` (no network connection)

## Example

If your IP is `192.168.1.100`:

### 1. Update `docker-compose.local.yml`:
```yaml
backend:
  environment:
    ALLOWED_HOSTS: localhost,127.0.0.1,backend,192.168.1.100
    CSRF_TRUSTED_ORIGINS: http://localhost:8000,http://127.0.0.1:8000,http://192.168.1.100:8000
    BASE_URL: http://192.168.1.100:8000
```

### 2. Update mobile app `zamio_app/lib/ui/login_page.dart` (line 18):
```dart
final _baseUrlCtrl = TextEditingController(text: 'http://192.168.1.100:8000/');
```

### 3. Restart Docker:
```bash
docker compose -f docker-compose.local.yml down
docker compose -f docker-compose.local.yml up -d
```

### 4. Test from mobile browser:
Open: `http://192.168.1.100:8000/admin/`

If you see the Django admin login page, it's working! ✅

## Troubleshooting

### Can't find your IP?
Make sure you're connected to WiFi or Ethernet. If you see no IP or `169.254.x.x`, you're not connected to a network.

### Mobile device can't connect?
1. **Same network**: Ensure your computer and mobile device are on the same WiFi network
2. **Firewall**: Windows Firewall might be blocking port 8000
   - Open Windows Defender Firewall
   - Allow port 8000 for private networks
3. **Test connectivity**: Ping your computer from another device on the network

### Still using Docker IP (172.x.x.x)?
That won't work! You must use your computer's actual network IP (192.168.x.x or 10.0.x.x).

## Quick Test

Once you have your IP, test it:

1. **From your computer's browser:**
   ```
   http://YOUR_IP:8000/admin/
   ```

2. **From your mobile device's browser:**
   ```
   http://YOUR_IP:8000/admin/
   ```

Both should show the Django admin login page.
