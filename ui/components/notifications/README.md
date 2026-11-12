# Notifications

Juice owns these reusable components. Keystone initializes the service and owns
worker polling/socket subscriptions in `resources/js/admin/notifications.mjs`.
Importing the Juice service does not create an app global or connect a socket.

```js
import Notifications from './notifications.mjs';
const notifications = new Notifications();
const notice = notifications.notify({
    title: 'Uploading', content: 'Uploading your image',
    status: 'processing', progress: 0.4, duration: 0,
});
notice.progress = 0.8;
notice.success(); // full progress and dismissal after 2 seconds
// notice.fail(); notice.close(); notice.close(1000);
```

`notify` uses milliseconds and 0..1 progress. Zero duration keeps a card open.
Titles/messages are plain text. Icons are URLs; custom graphics can use the
notification's named `icon` slot.

The adapted Maldelo API is available through `realTimeMessage(message, id)` and
`notify({ list, realtime })`. Realtime messages accept `caption`, `message`,
`type`, seconds-based `duration`, numeric 0..100 `progress`, and `manual`.
Event IDs suppress duplicates per service instance. `manual` disables dismissal.

Sounds are optional: configure `notifications.audioSrc` or
`notifications.sounds.chime/error` through Juice configuration, or pass an audio
URL / `audio: false` per message.

Optional list support uses `.notification-list`, `.icon.notification`, its
`.count`, and `.tab.notifications`, or explicitly supplied elements:

```js
const notifications = new Notifications({
    list, icon, tab, count,
    markRead: async id => { /* persist; throw on failure */ },
    clearAll: async () => { /* persist; throw on failure */ },
});
```

`insert`, `markRead`, `clearAll`, and `updateCount` manage the list. Without
persistence callbacks they update local UI only. No Maldelo API routes or user
channels are assumed. List actions accept only HTTP(S) destinations.

`ui-notifier` supports top-left, top-right, bottom-left (default), and bottom-right
positions. It emits `itemchange` and bubbling `notifications-resize` events.
Cards inherit theme colors and respect reduced motion. `ui-progress-ring` lives
in graphics; `ui-progress` supports compact and indeterminate modes, height,
colors, and an accessible progress value.

## Browser regression check

With the Keystone Client Vite server running, open
`/tests/Browser/notifications.html` on its origin. This checks timers, progress,
safe text, deduplication, list persistence failure, theme changes, and Keystone
job API compatibility. Failure appears in `#failure`; success in `#result`.
