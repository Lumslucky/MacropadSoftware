# Action Engine and Virtual Controls

## Capability

The engine maps a physical, virtual, or scheduled trigger to a validated action graph and executes it through permission-aware platform adapters.

## Core model

```text
Binding = Trigger + ActionGraph + FeedbackPolicy

Trigger
  source: physical | virtual | schedule
  controlId, gesture, page/layer context

ActionGraph
  action | sequence | parallel | delay | condition | toggle |
  repeat | set-variable | try/catch | stop
```

Example:

```json
{
  "type": "sequence",
  "steps": [
    { "type": "action", "actionId": "audio.microphone.toggle", "params": {} },
    { "type": "condition", "expression": "state.microphone.muted", "then": [
      { "type": "action", "actionId": "device.statusColor", "params": { "color": "danger" } }
    ], "else": [
      { "type": "action", "actionId": "device.statusColor", "params": { "color": "success" } }
    ] }
  ]
}
```

## Action contract

Every definition includes:

- Stable namespaced ID and schema version
- Name, description, icon, and category
- Supported platforms and availability probe
- JSON Schema parameters
- Required permissions and secret references
- Supported phases (`press`, `release`, `invoke`, `cancel`)
- State subscriptions and feedback representation
- Timeout, concurrency, and idempotency policy
- Parameter migrations
- Structured success, failure, or cancellation result

## Built-in categories

### Essential v1

- Keyboard key, chord, sequence, hold, and text
- Mouse click, scroll, movement, and hold
- Launch/focus application; open file, folder, or HTTPS URL
- Output volume/mute and audio endpoint selection
- Default microphone mute/unmute/toggle and push-to-talk
- Media play/pause/stop/previous/next
- Profile/page/layer/folder navigation
- Delay, sequence, parallel, condition, toggle, and repeat
- Timer, notification, and clipboard text
- Lighting/status feedback

### Post-v1

- Per-application audio
- Advanced window management
- Optional generic webhook action with strict network controls
- Developer commands and scripts with explicit advanced permissions
- Soundboard and mobile virtual deck

## Microphone semantics

- `toggle`: invert observed default capture-endpoint mute.
- `mute`/`unmute`: idempotent explicit state.
- `push-to-talk`: remember prior state, unmute on press, restore on release/cancel.
- `push-to-mute`: remember prior state, mute on press, restore on release/cancel.
- If observation is unavailable, mark the action degraded and do not present authoritative feedback.
- A safety timeout releases held actions after disconnect or missing release.

Application-specific meeting mute is distinct from system microphone mute. Shortcut profiles must label which one they control.

## Virtual controls

- Profiles contain unlimited pages subject to practical storage/UI limits.
- Folders reference child pages; Back uses navigation history.
- Layers may be latched or active only while held.
- The virtual deck supports configurable grids, resize, always-on-top, keyboard navigation, and touch.
- Physical and virtual controls share bindings but retain their source identity.

## Profile selection precedence

1. Explicit temporary layer
2. User-selected profile lock
3. Highest-priority foreground-application rule
4. Device default profile
5. Global default profile

Foreground rules use debounce to avoid oscillation and expose missing OS permissions.

## Concurrency

- Default to one execution per binding.
- Independent bindings may execute concurrently.
- Exclusive resources use keyed locks.
- Held actions associate with device/control/press sequence.
- Disconnect cancels held input injection and restores temporary state when possible.

## Permissions

Permissions include keyboard injection, accessibility, microphone control, window inspection, process launch, filesystem scope, network domains, secrets, device configuration, and destructive system actions. Imported profiles remain disabled until their permissions and secrets are approved.

Every definition has a risk class (`safe`, `sensitive`, `destructive`, or `code-execution`) and threat-control profile. URL/network/file/command/text controls are specified in `PLATFORM-SECURITY.md`; an action cannot register until its canonicalization, scope, logging, timeout, confirmation, and test policies exist.

## Extensibility boundary

The product does not require a plugin runtime or deep third-party application APIs. Broad compatibility comes from configurable keyboard shortcuts, text, mouse, application launch/focus, URLs, and optional generic webhooks. New built-in actions may be added in later desktop releases, but profiles never bundle executable extensions.

## Auditability

Local history records timestamp, source, binding, action IDs, duration, and redacted result. Text content, secrets, authorization headers, and credential-bearing URLs are never logged. Retention is bounded and user-clearable.
