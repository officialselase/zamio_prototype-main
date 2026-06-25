import urllib.request, json, urllib.error, ssl

BASE = 'https://api.2.24.15.82.sslip.io'
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def post(path, data, token=None):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    req = urllib.request.Request(BASE+path, data=json.dumps(data).encode(), headers=headers, method='POST')
    try:
        with urllib.request.urlopen(req, timeout=15, context=ctx) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read())
        except:
            return e.code, e.reason
    except Exception as ex:
        return 0, str(ex)

def get(path, token=None):
    headers = {}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    req = urllib.request.Request(BASE+path, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=15, context=ctx) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read())
        except:
            return e.code, e.reason
    except Exception as ex:
        return 0, str(ex)

def section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print('='*60)

def report(label, code, resp, expected=None):
    ok = 'PASS' if (expected and code == expected) or (not expected and 200 <= code < 300) else 'FAIL'
    print(f"[{ok}][{code}] {label}")
    if code not in [200, 201]:
        body = json.dumps(resp) if not isinstance(resp, str) else resp
        print(f"      -> {body[:300]}")
    return code, resp

TOKEN = None
STATION_TOKEN = None
PUBLISHER_TOKEN = None

# PHASE 1: REGISTRATION
section("PHASE 1: REGISTRATION")

code, resp = post('/api/accounts/register-artist/', {
    'email': 'demo_artist@zamio.test',
    'password': 'ZamIO_Demo2024!',
    'password2': 'ZamIO_Demo2024!',
    'first_name': 'Kofi',
    'last_name': 'Mensah',
    'stage_name': 'KofiBeats',
    'phone': '+233201234567'
})
report("Register Artist", code, resp, 201)

code, resp = post('/api/accounts/register-station/', {
    'email': 'demo_station@zamio.test',
    'password': 'ZamIO_Demo2024!',
    'password2': 'ZamIO_Demo2024!',
    'name': 'Gold FM Demo',
    'phone': '+233202345678'
})
report("Register Station", code, resp, 201)

code, resp = post('/api/accounts/register-publisher/', {
    'email': 'demo_publisher@zamio.test',
    'password': 'ZamIO_Demo2024!',
    'password2': 'ZamIO_Demo2024!',
    'company_name': 'AfroBeats Publishing Ltd',
    'phone': '+233203456789'
})
report("Register Publisher", code, resp, 201)

code, resp = post('/api/accounts/register-admin/', {
    'email': 'demo_admin@zamio.test',
    'password': 'ZamIO_Demo2024!',
    'password2': 'ZamIO_Demo2024!',
    'first_name': 'Admin',
    'last_name': 'Zamio'
})
report("Register Admin", code, resp, 201)

# PHASE 2: LOGIN
section("PHASE 2: LOGIN")

code, resp = post('/api/accounts/login-artist/', {
    'email': 'demo_artist@zamio.test',
    'password': 'ZamIO_Demo2024!'
})
report("Login Artist", code, resp)
if code == 200:
    TOKEN = resp.get('access') or resp.get('token')
    if not TOKEN and isinstance(resp.get('data'), dict):
        TOKEN = resp['data'].get('access') or resp['data'].get('token')
    print(f"      -> Token: {str(TOKEN)[:40]}..." if TOKEN else f"      -> Response keys: {list(resp.keys())}")
    print(f"      -> Full response: {json.dumps(resp)[:500]}")

code, resp = post('/api/accounts/login-station/', {
    'email': 'demo_station@zamio.test',
    'password': 'ZamIO_Demo2024!'
})
report("Login Station", code, resp)
if code == 200:
    STATION_TOKEN = resp.get('access') or resp.get('token')
    if not STATION_TOKEN and isinstance(resp.get('data'), dict):
        STATION_TOKEN = resp['data'].get('access') or resp['data'].get('token')
    print(f"      -> Station Token: {str(STATION_TOKEN)[:40]}..." if STATION_TOKEN else f"      -> Response: {json.dumps(resp)[:300]}")

code, resp = post('/api/accounts/login-publisher/', {
    'email': 'demo_publisher@zamio.test',
    'password': 'ZamIO_Demo2024!'
})
report("Login Publisher", code, resp)
if code == 200:
    PUBLISHER_TOKEN = resp.get('access') or resp.get('token')
    if not PUBLISHER_TOKEN and isinstance(resp.get('data'), dict):
        PUBLISHER_TOKEN = resp['data'].get('access') or resp['data'].get('token')

# JWT generic
code, resp = post('/api/auth/token/', {
    'email': 'demo_artist@zamio.test',
    'password': 'ZamIO_Demo2024!'
})
report("JWT Generic Token", code, resp)
if code == 200 and not TOKEN:
    TOKEN = resp.get('access')

# PHASE 3: STATIONS
section("PHASE 3: STATIONS")

tok = STATION_TOKEN or TOKEN
code, resp = get('/api/stations/get-all-stations/', tok)
report("Get All Stations", code, resp)
if code == 200:
    data = resp if isinstance(resp, list) else resp.get('results', resp.get('stations', []))
    print(f"      -> {len(data)} stations returned")

code, resp = get('/api/stations/dashboard/', tok)
report("Station Dashboard", code, resp)
if code == 200:
    print(f"      -> Keys: {list(resp.keys())}")

code, resp = get('/api/stations/playlogs/', tok)
report("Station Play Logs", code, resp)
if code == 200:
    data = resp if isinstance(resp, list) else resp.get('results', resp.get('data', []))
    print(f"      -> {len(data)} play logs")

code, resp = get('/api/stations/disputes/', tok)
report("Station Disputes", code, resp)

# PHASE 4: ROYALTIES
section("PHASE 4: ROYALTIES")

code, resp = get('/api/royalties/rates/', TOKEN or tok)
report("Royalty Rates", code, resp)
if code == 200:
    print(f"      -> {json.dumps(resp)[:400]}")

code, resp = get('/api/royalties/cycles/', TOKEN or tok)
report("Royalty Cycles", code, resp)
if code == 200:
    print(f"      -> {json.dumps(resp)[:300]}")

code, resp = get('/api/royalties/withdrawals/', TOKEN or tok)
report("Withdrawal Requests", code, resp)
if code == 200:
    print(f"      -> {json.dumps(resp)[:300]}")

code, resp = get('/api/royalties/platform/balance/', TOKEN or tok)
report("Platform Balance", code, resp)
if code == 200:
    print(f"      -> {json.dumps(resp)[:400]}")

code, resp = get('/api/royalties/exchange-rates/', TOKEN or tok)
report("Exchange Rates", code, resp)
if code == 200:
    print(f"      -> {json.dumps(resp)[:300]}")

# PHASE 5: MUSIC MONITOR
section("PHASE 5: MUSIC MONITOR & FINGERPRINTING")

code, resp = get('/api/music-monitor/playlog/list/', TOKEN or tok)
report("PlayLog List", code, resp)
if code == 200:
    data = resp if isinstance(resp, list) else resp.get('results', resp.get('data', []))
    print(f"      -> {len(data)} play logs in DB")

code, resp = get('/api/music-monitor/matchcache/list/', TOKEN or tok)
report("MatchCache List", code, resp)
if code == 200:
    data = resp if isinstance(resp, list) else resp.get('results', resp.get('data', []))
    print(f"      -> {len(data)} cached detections")

code, resp = get('/api/music-monitor/acrcloud/statistics/', TOKEN or tok)
report("ACRCloud Detection Statistics", code, resp)
if code == 200:
    print(f"      -> {json.dumps(resp)[:500]}")

code, resp = get('/api/music-monitor/stream/sessions/', TOKEN or tok)
report("Active Stream Sessions", code, resp)
if code == 200:
    print(f"      -> {json.dumps(resp)[:300]}")

code, resp = get('/api/music-monitor/acrcloud/pro-mappings/', TOKEN or tok)
report("PRO Mappings", code, resp)
if code == 200:
    print(f"      -> {json.dumps(resp)[:300]}")

# PHASE 6: DISPUTES
section("PHASE 6: DISPUTES")

code, resp = get('/api/disputes/api/disputes/', TOKEN or tok)
report("Disputes List", code, resp)
if code == 200:
    count = resp.get('count', len(resp) if isinstance(resp, list) else '?')
    print(f"      -> {count} disputes | Keys: {list(resp.keys()) if isinstance(resp, dict) else 'list'}")

code, resp = get('/api/disputes/api/disputes/stats/', TOKEN or tok)
report("Dispute Stats", code, resp)
if code == 200:
    print(f"      -> {json.dumps(resp)[:400]}")

# PHASE 7: ANALYTICS
section("PHASE 7: ANALYTICS")

code, resp = get('/api/analytics/artist/', TOKEN)
report("Artist Analytics", code, resp)
if code == 200:
    print(f"      -> Keys: {list(resp.keys())[:12]}")

code, resp = get('/api/analytics/station/', STATION_TOKEN or TOKEN)
report("Station Analytics", code, resp)
if code == 200:
    print(f"      -> Keys: {list(resp.keys())[:12]}")

code, resp = get('/api/analytics/admin/', TOKEN or tok)
report("Admin Analytics", code, resp)
if code == 200:
    print(f"      -> Keys: {list(resp.keys())[:12]}")

code, resp = get('/api/analytics/realtime/', TOKEN or tok)
report("Realtime Metrics", code, resp)
if code == 200:
    print(f"      -> {json.dumps(resp)[:300]}")

# PHASE 8: ROYALTY CALCULATION TEST
section("PHASE 8: ROYALTY CALCULATION")

code, resp = post('/api/royalties/calculate/', {}, TOKEN or tok)
report("Calculate Royalties (empty POST)", code, resp)
if code in [200, 400]:
    print(f"      -> {json.dumps(resp)[:400]}")

section("ALL TESTS COMPLETE")
print(f"Artist Token obtained: {bool(TOKEN)}")
print(f"Station Token obtained: {bool(STATION_TOKEN)}")
print(f"Publisher Token obtained: {bool(PUBLISHER_TOKEN)}")
