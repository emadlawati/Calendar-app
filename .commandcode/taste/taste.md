# Taste (Continuously Learned by [CommandCode][cmd])

[cmd]: https://commandcode.ai/

# nextjs
- Keep public/sw.js as pure JavaScript — no TypeScript syntax (triple-slash directives, type annotations, or type casts). Browsers parse service worker files directly and will fail on TS-specific syntax. Confidence: 0.75
- Web push notifications that arrive when the app is closed require VAPID keys + server-side push (via web-push library). showNotification() only works while the page is open. For background delivery, store PushSubscriptions in the DB and use webpush.sendNotification() from the server. Confidence: 0.80
- Avoid Node.js-only APIs (like Buffer.from) in client-side/browser code. Use browser-native alternatives like atob() for base64 decoding. Node APIs silently fail with ReferenceError in the browser. Confidence: 0.70

