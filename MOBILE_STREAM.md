# Mobile Stream Fallback Backlog

## Context
The studio capture experience must deliver the same fidelity, auditability, and operator feedback as the primary stream-based ingestion—whether the station lacks an online stream entirely or is temporarily offline. The following tasks translate the current recommendations into actionable user stories with acceptance criteria and testing guidance.

---

### 1. Persist Studio Capture Telemetry End-to-End
**User Story**
> As a royalties operations analyst, I want every studio-recorded audio chunk that reaches the backend to produce the same telemetry artifacts as streamed detections so that compliance audits and revenue reconciliation stay complete.

**Acceptance Criteria**
- [x] Each successful upload via `/api/music-monitor/stream/upload/` creates (or augments) a persistent record that links the `SnippetIngest`, resulting `MatchCache`, and a new or updated `AudioDetection` row.
- [x] Studio ingests retain the original clip metadata (sample rate, bit rate, retries, capture timestamp, capture context) in the database for later diagnostics.
- [x] Reprocessed clips (manual or automated) reuse the stored metadata without duplicating detections.
- [x] Documentation references to telemetry flows are updated in `implementation.md` and `AGENTS.md` when the schema or process changes.

**Testing**
1. Trigger an upload from the mobile app (or `curl`) containing metadata fields and confirm the API returns `201/200`.
2. Inspect the database to verify linked rows in `SnippetIngest`, `MatchCache`, and `AudioDetection`, including stored metadata that identifies the capture as studio-originated.
3. Retry the same `chunk_id` upload and confirm no duplicate detection rows are created.

---

### 2. Productionize the Studio Sync Channel
**User Story**
> As a station operator running the in-studio capture app, I need reliable authentication and push messaging so the device can stay authorized and receive operational updates without manual intervention.

**Acceptance Criteria**
- [ ] The Flutter app integrates Firebase Cloud Messaging (or an approved equivalent) and sends a real device token during `/api/accounts/login-station/`.
- [ ] The backend validates and stores the provided push token, rejecting obvious placeholders while allowing feature-flag overrides for staging.
- [ ] Base URL handling enforces HTTPS by default and presents a clear warning if the operator enters a non-secure endpoint, while still allowing controlled fallbacks for air-gapped studios.
- [ ] Login/session persistence covers FCM token refreshes without forcing a full re-login.

**Testing**
1. Log in from a device/emulator and verify a real FCM token is transmitted and stored server-side.
2. Rotate the FCM token (e.g., uninstall/reinstall) and confirm the backend updates the stored value without breaking the session.
3. Attempt login against an `http://` URL and verify the app surfaces the warning or blocker defined in the acceptance criteria.

---

### 3. Consolidate Studio Capture Pipelines Inside the App
**User Story**
> As a mobile engineer, I want a single capture service controlling studio audio recording so that we avoid duplicated work, race conditions, and inconsistent retention policies.

**Acceptance Criteria**
- [ ] `StatusPage` no longer starts the legacy recorder loop; it delegates entirely to `OfflineCaptureService` state.
- [ ] A unified state notifier exposes capture status (recording, syncing, errors) for the UI.
- [ ] Storage quotas and retention rules are enforced by one code path, with regression tests preventing parallel capture loops from returning.

**Testing**
1. Launch the app and confirm only `OfflineCaptureService` acquires microphone access (use Android Studio profiler/logcat).
2. Observe the status screen and verify it reflects the unified notifier state without duplicate recordings in local storage.
3. Run automated/unit tests covering the capture service lifecycle to ensure only one recorder can be scheduled at a time.

---

### 4. Enrich Upload Responses for Studio Operator Feedback
**User Story**
> As a station operator, I want immediate feedback about each uploaded clip so I know whether Zamio detected a match and can adjust station operations if necessary.

**Acceptance Criteria**
- [ ] The upload endpoint returns structured JSON containing `match_cache_id`, matched `track_id` (or `null`), `confidence`, and the recommended next capture interval.
- [ ] The mobile app surfaces this response in the UI/logs and adapts scheduling when the backend suggests a new interval.
- [ ] Error responses include actionable messages that the UI can display (e.g., auth expired, clip too noisy).

**Testing**
1. Upload a clip that produces a match and confirm the response payload includes the required fields; verify the UI displays the result.
2. Upload a clip with no match and confirm the backend returns `track_id: null` with appropriate messaging, and the UI handles it gracefully.
3. Force an error condition (e.g., revoke auth token) and confirm the returned error message appears in the UI and that capture pauses or retries per design.

---

### 5. Store Studio Capture Metadata for Diagnostics
**User Story**
> As a support engineer, I need preserved capture metadata so I can diagnose poor audio quality or repeated failures when stations report issues—regardless of whether the device was online at the moment of capture.

**Acceptance Criteria**
- [ ] Metadata sent alongside uploads (quality score, sample rate, bit rate, failure count, capture location if provided) is persisted in `SnippetIngest` or a related table with clear attribution that the source is the studio device.
- [ ] Admin or internal dashboards can query this metadata for individual stations and time ranges.
- [ ] API serializers expose the metadata for internal tooling without leaking sensitive data to unauthorized clients.

**Testing**
1. Submit uploads with varying metadata values and confirm they are stored and retrievable via admin tooling or direct database queries.
2. Use the internal API/dashboard to filter detections by metadata (e.g., low sample rate) and verify results match expectations.
3. Confirm unauthorized clients cannot access the metadata endpoints by running requests with insufficient permissions and observing the expected `403`/`401` responses.

---

*Keep this backlog synchronized with implementation progress by checking off acceptance criteria and documenting any deviations or follow-up tasks.*
