# FreightFlow — Interview Cheat Sheet
*10 Q&As with follow-ups. Memorize the implementation details — that's what separates a portfolio project from production experience.*

---

## Q1: Why a separate `Driver` model instead of adding fields to `User`?

**Question:** "Your system has users and drivers. Why did you choose separate collections rather than a single User document with driver-specific fields?"

**Ideal Answer:**
A single User document with optional driver fields would create a null-heavy schema — every shipper document would carry empty `vehicleNumber`, `licenseNumber`, `availability`, and `earnings` fields. More importantly, it violates single-responsibility: the User model shouldn't know about earnings calculations or vehicle types. The separate `Driver` model references `User` via `user: { type: ObjectId, ref: 'User' }`, so I can query drivers independently, populate user details only when needed, and add driver-specific indexes (like geospatial availability queries) without touching the User schema. It also means the `protect` middleware works on the User model alone — simple and fast.

**Follow-up:** "What's the tradeoff?"
→ Two DB lookups in driver routes: one to verify the User, one to fetch the Driver doc. The fix is to populate in a single query using Mongoose's `.populate()`, which issues one extra lookup but stays within a single request. For high-throughput routes I'd denormalize the driver's `userId` onto the Shipment document to avoid the extra join entirely.

---

## Q2: Walk me through the Razorpay HMAC payment verification flow

**Question:** "Describe, step by step, how your payment flow works — from the user clicking 'Pay' to the shipment being marked as paid."

**Ideal Answer:**
The frontend calls `POST /api/payments/order` with a `shipmentId`. The backend uses the Razorpay Node SDK to create an order (`razorpay.orders.create({ amount, currency: 'INR' })`) and stores the `orderId` in a `Payment` document with status `pending`. The frontend gets the `orderId` back and opens the Razorpay checkout UI. Razorpay processes the payment on their servers and calls our frontend success callback with three values: `razorpayOrderId`, `razorpayPaymentId`, and `razorpaySignature`. The frontend posts all three to `POST /api/payments/verify`. On the backend, we reconstruct the expected signature using `crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update('${orderId}|${paymentId}').digest('hex')` and compare it to the submitted signature using `crypto.timingSafeEqual` to prevent timing attacks. If they match, we mark the Payment as `completed` and the Shipment as `paid`. If they don't match, we return 400 with "Invalid signature" — the shipment stays unpaid. This means even if an attacker intercepts the callback and tampers with the IDs, the HMAC check will catch it.

**Follow-up:** "Why `timingSafeEqual` instead of `===`?"
→ String comparison with `===` short-circuits on the first mismatched character — an attacker can brute-force a valid signature by timing how long the comparison takes. `timingSafeEqual` always compares every byte, so timing gives no information about how close the guess was.

---

## Q3: Why Socket.io over Server-Sent Events (SSE) for real-time tracking?

**Question:** "You're pushing location updates to the shipper's tracking page. Why Socket.io instead of SSE or long-polling?"

**Ideal Answer:**
SSE is unidirectional — server to client only. Socket.io is bidirectional, which I needed because the driver also emits location updates from their dashboard (client → server → room broadcast). With SSE I'd need a separate REST endpoint for the driver to POST updates, and then SSE to push to shippers — two mechanisms for one feature. Socket.io also handles room-based broadcasting natively: every shipment gets a room (`shipment:${shipmentId}`), the driver joins it when they accept the shipment, and the shipper joins from the tracking page. When the driver emits `location-update`, Socket.io broadcasts to all room members automatically. It also handles reconnection, fallback to HTTP long-polling in restrictive networks, and works through Railway's proxy.

**Follow-up:** "What's the scalability concern with Socket.io?"
→ Socket.io state is in-memory per process. If I had multiple server instances (horizontal scaling), a shipper connected to instance A wouldn't receive events from a driver connected to instance B. The fix is Redis adapter (`socket.io-redis`) — all instances share a pub/sub bus. For the current single-instance Railway deploy, this isn't a concern, but I know how to solve it.

---

## Q4: What's wrong with storing JWTs in localStorage — and what did you do about it?

**Question:** "Your original codebase stored JWTs in localStorage. What's the risk, and how did you fix it?"

**Ideal Answer:**
Any JavaScript on the page can read `localStorage` — including injected scripts from XSS. If a single dependency has an XSS vulnerability, an attacker can exfiltrate the JWT and make authenticated API calls indefinitely until the token expires. The original 7-day expiry made this catastrophic. My fix has two parts: First, I shortened the access token to 15 minutes. Even if stolen, it's useless in 15 minutes. Second, I introduced a refresh token stored only in an `HttpOnly` cookie with `sameSite: strict` and `secure: true` in production. `HttpOnly` means JavaScript literally cannot read the cookie — `document.cookie` doesn't return it. The `sameSite: strict` prevents the cookie from being sent on cross-site requests, neutralizing CSRF. The 15-minute access token still lives in memory (temporarily in `localStorage` for this implementation), but losing it only gives an attacker a 15-minute window. The refresh token, which grants long-term access, is completely inaccessible to JavaScript.

**Follow-up:** "What's the remaining risk?"
→ The access token is still in localStorage, so XSS can still steal it — the attacker just has a 15-minute window instead of 7 days. The fully secure solution is moving the access token to a `sessionStorage` variable or just keeping it in a JavaScript module closure (never persisted to storage). I've documented this as the next hardening step.

---

## Q5: The `Shipment.driver` ref bug — how did you find it and what was the impact?

**Question:** "Tell me about a data modeling bug you found and fixed in this project."

**Ideal Answer:**
In `models/Shipment.js`, the `driver` field was declared as `{ type: ObjectId, ref: 'User' }`. The app was actually storing `Driver` document IDs in that field (since drivers have a separate model), not User IDs. When a route called `.populate('driver')`, Mongoose looked for the ObjectId in the `users` collection, found nothing, and silently returned `null`. The driver assignment feature appeared to work — the Shipment was saved — but every subsequent query that populated the driver returned null, making the driver field invisible in the shipper dashboard and causing the driver dashboard to show no assigned shipments. The fix was one word: change `ref: 'User'` to `ref: 'Driver'`. I found it by checking what values were actually stored in `driver` fields in MongoDB Compass, comparing them to both collections, and confirming they matched `drivers._id` not `users._id`.

**Follow-up:** "How would a test have caught this before production?"
→ The `test/shipments.test.js` status-update test creates both a Shipment and a Driver, stores `driver._id` on the shipment, then POPs the shipment and asserts `res.body.data.driver` is not null. That test would have failed the moment the wrong ref was set, and the bug would never have reached main.

---

## Q6: How does your role-based authorization middleware work?

**Question:** "Walk me through how a request from a shipper trying to update a shipment status gets rejected."

**Ideal Answer:**
The route is `PATCH /api/shipments/:id/status` with two middleware in the chain: `protect` then `authorize('driver', 'admin')`. The `protect` middleware extracts the Bearer token, verifies it with `jwt.verify`, looks up the user by ID from the DB (checking `isActive`), and attaches the full user document to `req.user`. The `authorize` middleware is a factory function: `authorize('driver', 'admin')` returns a middleware that checks if `req.user.role` is in the `['driver', 'admin']` array. If the role is `'shipper'`, it returns `403 Forbidden` immediately. This design separates authentication (who are you?) from authorization (what are you allowed to do?) as two distinct, composable middleware. Adding a new role restriction is one-line: `router.get('/admin-only', protect, authorize('admin'), handler)`.

**Follow-up:** "Why do you hit the database in `protect` to check `isActive` instead of just trusting the JWT?"
→ JWTs are stateless — once issued, you can't invalidate them without a blocklist. If an admin deactivates a user's account, their existing JWT would still work until expiry. By checking `isActive` in the DB on every request, account deactivation takes effect immediately. The cost is one DB query per request, which is acceptable. For extremely high throughput, you'd cache the user lookup in Redis with a short TTL.

---

## Q7: What would you do differently if building this for real production?

**Question:** "If you were handed this codebase and told FreightFlow is getting 10,000 shipments a day, what would you change first?"

**Ideal Answer:**
Three things immediately. First, move the access token out of localStorage entirely into a module-level variable — it's technically accessible via XSS right now. Second, add MongoDB indexes properly — the `Shipment` model has compound indexes for `shipper + status + createdAt` but I'd audit with `.explain('executionStats')` on the most common queries. Third, extract all the auth logic from `server.js` into `routes/auth.js` — the login handler currently lives in a 450-line monolith. For 10k/day, I'd add connection pooling tuning to Mongoose, move static assets to a CDN (currently served by Express which is a waste), add Redis for Socket.io horizontal scaling, and set up structured JSON logging with correlation IDs so distributed traces are possible.

**Follow-up:** "What's the single most dangerous thing in the current codebase?"
→ The access token in `localStorage`. A single XSS (even in a dependency) gives an attacker a 15-minute authenticated session. The fix is keeping the access token only in a JavaScript closure — never written to `localStorage` or `sessionStorage`.

---

## Q8: How does your Socket.io room architecture work?

**Question:** "How do you ensure a shipper only receives location updates for their own shipment, not all active shipments?"

**Ideal Answer:**
Every shipment gets its own Socket.io room named `shipment:${shipmentId}`. When the shipper opens the tracking page, the frontend emits `join-shipment` with the `trackingId`. The server validates that the requesting user is either the shipment's owner or an admin, then calls `socket.join('shipment:' + shipment._id)`. When the driver emits `location-update` from their dashboard (also in that room), the server re-broadcasts the coordinates to everyone in `shipment:${shipment._id}`. Since shippers from other shipments are in different rooms, they receive nothing. If a driver tries to broadcast to a shipment they're not assigned to, the server checks `shipment.driver.toString() === driverFromDB._id.toString()` before relaying. This is the same pattern namespaces use in Socket.io, but rooms are lighter-weight and require no extra configuration.

**Follow-up:** "What happens if the driver disconnects and reconnects?"
→ When the WebSocket drops, Socket.io's client-side auto-reconnect will re-establish the connection and the driver's frontend re-emits the `join-shipment` event. The server handles this idempotently — `socket.join()` on an already-joined room is a no-op.

---

## Q9: How did you handle password security in the User model?

**Question:** "Walk me through how passwords are stored and verified in your User model."

**Ideal Answer:**
The User schema has a `pre('save')` Mongoose hook: before every save, if the `password` field is modified, it runs `bcrypt.hash(this.password, 12)` and replaces the plain text. The salt rounds of 12 are deliberately above bcrypt's default of 10 — each additional round doubles the computation time. At 12 rounds on modern hardware, hashing takes ~250ms, which is imperceptible to a human but makes brute-forcing a stolen hash infeasible. For login, I call `bcrypt.compare(plainPassword, user.password)` — bcrypt extracts the salt from the stored hash automatically. The User model also has a `comparePassword` instance method that wraps this, keeping the logic DRY. One additional measure: the User schema's `password` field has `select: false`, so it's never included in query results unless explicitly requested with `.select('+password')`. This prevents accidental password exposure in API responses.

**Follow-up:** "What's the difference between `bcrypt` and `bcryptjs` and why do you have both?"
→ `bcrypt` is a native C++ binding — faster but requires compilation at install time, which can fail on some systems. `bcryptjs` is pure JavaScript — slower but universal. During the project I had both in `package.json` which is a mistake; I standardized on `bcryptjs` for Railway's Alpine-based Docker environment where native compilation is unreliable.

---

## Q10: What was the hardest bug you debugged in this project?

**Question:** "Tell me about the most difficult debugging session you had on this project."

**Ideal Answer:**
The duplicate `module.exports` in `routes/shipments.js`. The driver rating feature was completely non-functional in production, but I couldn't reproduce it locally because my local tests were hitting the route file directly. The root cause: there were two `module.exports` calls — one at line 479 that exported everything up to that point, and the real one at the bottom of the file. Node.js doesn't throw an error on duplicate exports — the second assignment silently overwrites the first. But since Express had already called `require('./routes/shipments')` and cached the module, it had the first export, which meant the `/rate` route was never registered. The symptom was a clean 404 — no error, no warning. I found it by adding `console.log(Object.keys(router.stack))` to list all registered routes at startup, noticing `/rate` was missing, and then grepping the file for `module.exports`. One line deleted, feature restored. Now I have a test in `auth.test.js` that verifies 401 on unauthenticated access — any missing route registration shows up as a 404 instead, which a test would catch.

**Follow-up:** "How would you prevent that class of bug in the future?"
→ A route coverage test — assert that `GET /api/shipments/:id/rate` returns something other than 404 when authenticated. If the route is ever accidentally deregistered, the test fails. Alternatively, ESLint's `no-duplicate-exports` rule would catch it statically.

---

## 🎤 Mock Interview Simulation

Below are two questions for you to answer. Paste your responses and get evaluated.

---

### Question 2: Razorpay Payment Flow

> "You've integrated Razorpay for payments. Walk me through the complete flow — from the user clicking 'Pay Now' to the shipment being marked as paid in MongoDB. Be specific about the HMAC verification step."

**[Paste your answer here and ask me to evaluate it]**

---

### Question 4: JWT & localStorage

> "Your original code stored JWTs in localStorage. Walk me through the exact security risk, what an attacker could do with it, and what you changed — including the specific HTTP attributes on the cookie and why each one matters."

**[Paste your answer here and ask me to evaluate it]**

---

*When you paste your answers, I'll tell you what a staff engineer would think — what landed, what was vague, what was missing.*
