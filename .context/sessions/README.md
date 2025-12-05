# Session Tracking

This folder contains session-specific tracking files.

## Structure

```
sessions/
├── .current_session      # Active session info (JSON)
├── SESSION-001.md        # Individual session logs
├── SESSION-002.md
└── ...
```

## Current Session File Format

```json
{
  "sessionId": "SESSION-001",
  "sessionNumber": 1,
  "startTime": "2025-12-06T10:00:00Z",
  "developer": "Developer Name",
  "aiAssistant": "Claude",
  "focusArea": "Feature/Task",
  "claimedTasks": ["A001", "A002"],
  "filesModified": [],
  "decisionsLogged": []
}
```

## Guidelines

1. Session files are auto-created by `ctx-start.ps1`
2. Session files are auto-updated by `ctx-end.ps1`
3. Never manually edit `.current_session`
4. Keep individual session logs for audit trail
