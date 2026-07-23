# GitMatch

A social/matchmaking platform for developers ("DevTinder" style). Users sign up, build a
developer profile (skills, bio, photo), browse a feed of other developers they haven't
interacted with yet, and send / review connection requests.

This repository contains the **backend REST API** — Node.js + Express 5 + TypeScript +
MongoDB (Mongoose), with cookie-based JWT authentication.

---

## Tech Stack

| Concern         | Choice                                        |
| --------------- | --------------------------------------------- |
| Runtime         | Node.js (ESM, `"type": "module"`)             |
| Language        | TypeScript (strict, `module: nodenext`)       |
| Framework       | Express 5                                     |
| Database        | MongoDB via Mongoose                          |
| Auth            | JWT stored in an `httpOnly` cookie            |
| Password hashing| bcrypt (10 rounds)                            |
| Validation      | `validator` + custom helpers                  |
| CORS            | `cors`, locked to `http://localhost:5173`     |

---

## Project Structure

```
src/
├── server.ts                        # Entry point — connects to DB, starts HTTP server
├── app.ts                           # Express app — CORS, JSON, cookies, router mounting
├── config/
│   └── db.ts                        # Mongoose connection (exits process on failure)
├── models/
│   ├── userModel.ts                 # User schema + getJWTToken() / isPasswordValid()
│   └── connectionRequest.ts         # ConnectionRequest schema + Status enum
├── middlewares/
│   └── authMiddleware.ts            # Reads token cookie, verifies JWT, attaches req.user
├── routes/
│   ├── authRoutes.ts                # /signup, /login, /logout
│   ├── profileRoutes.ts             # /profile/view, /profile/edit, /profile/update
│   ├── connectionRequestRoutes.ts   # /request/send/..., /request/review/...
│   └── userRoutes.ts                # /feed, /user/connections, /user/requests/received, /allusers
├── utils/
│   └── validation.ts                # Signup / edit / password validation helpers
└── types/express/index.d.ts         # Augments Express.Request with `user`
```

All routers are mounted at the root path (`app.use("/", ...)`), so there is no `/api`
prefix — routes are exactly as written below.

---

## Getting Started

### Prerequisites

- Node.js 20+
- A MongoDB instance (local or Atlas)

### Install

```bash
npm install
```

### Environment

Create a `.env` file in the project root:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/gitmatch
JWT_SECRET=your-long-random-secret
NODE_ENV=development
```

`PORT` defaults to `5000` if omitted. `NODE_ENV=production` makes the auth cookie `secure`.

### Run

```bash
npm run dev        # nodemon + ts-node, watches src/
npm run build      # tsc -> dist/
npm start          # node dist/server.js
npm run typecheck  # tsc --noEmit
```

---

## Data Models

### User

| Field       | Type       | Notes                                                        |
| ----------- | ---------- | ------------------------------------------------------------ |
| `firstName` | string     | required, max 25 chars                                        |
| `lastName`  | string     | required at signup (validation layer)                         |
| `email`     | string     | required, unique, lowercased, trimmed, must be a valid email  |
| `password`  | string     | required, must pass `validator.isStrongPassword`, stored hashed |
| `age`       | number     | minimum 18                                                    |
| `gender`    | string     | one of `male`, `female`, `others`                             |
| `photoURL`  | string     | must be a valid URL                                           |
| `about`     | string     | max 200 chars (enforced on edit)                              |
| `skills`    | string[]   | at most 10 entries                                            |

Timestamps (`createdAt`, `updatedAt`) are enabled.

Instance methods:
- `getJWTToken()` — signs `{ _id }` with `JWT_SECRET`.
- `isPasswordValid(plaintext)` — bcrypt compare against the stored hash.

### ConnectionRequest

| Field        | Type              | Notes                                        |
| ------------ | ----------------- | -------------------------------------------- |
| `fromUserId` | ObjectId → `User` | required                                      |
| `toUserId`   | ObjectId → `User` | required                                      |
| `status`     | enum              | `interested` \| `ignore` \| `accepted` \| `rejected`, defaults to `interested` |

Indexed on `{ fromUserId, toUserId }`. Timestamps enabled.

**Status semantics**

- `interested` / `ignore` — set by the **sender** when creating a request.
- `accepted` / `rejected` — set by the **receiver** when reviewing a request.

---

## Authentication

`POST /login` sets an `httpOnly` cookie named `token` containing a JWT. Every protected
route runs `authMiddleware`, which:

1. Reads `req.cookies.token`
2. Verifies it with `JWT_SECRET`
3. Loads the user document and assigns it to `req.user`
4. Responds `401 { "message": "Unauthorized" }` on any failure

Clients must send requests with credentials included (e.g. `fetch(..., { credentials: "include" })`),
and must originate from `http://localhost:5173` to satisfy the CORS config.

---

## API Reference

Legend: 🔓 public · 🔒 requires auth cookie

### Auth

#### 🔓 `POST /signup`

Create a new account. The password is hashed before being stored.

Body:
```json
{
  "firstName": "Ada",
  "lastName": "Lovelace",
  "email": "ada@example.com",
  "password": "Str0ng!Pass1"
}
```

Validation: first and last name required and alphabetic only; email must be valid;
password must be "strong" per `validator.isStrongPassword`.

- `200` — `user saved successfully.` (plain text)
- `500` — `Error : <message>` (plain text)

---

#### 🔓 `POST /login`

Body:
```json
{ "email": "ada@example.com", "password": "Str0ng!Pass1" }
```

On success sets the `token` cookie and returns:
```json
{ "message": "user logged in successfully", "user": { "...": "full user document" } }
```

- `200` — logged in, cookie set
- `500` — `Error : Invalid Credentials.` / `Error : Email address not valid.`

---

#### 🔓 `POST /logout`

Clears the `token` cookie by setting it to an already-expired value.

- `200` — `Logged out successfully` (plain text)

---

### Profile

#### 🔒 `GET /profile/view`

Returns the authenticated user's document.

```json
{ "user": { "_id": "...", "firstName": "Ada", "email": "ada@example.com", "...": "..." } }
```

- `200` — user object
- `401` — not authenticated

---

#### 🔒 `PATCH /profile/edit`

Updates editable profile fields. Only these keys are accepted — any other key in the body
rejects the entire request:

`firstName`, `lastName`, `age`, `gender`, `photoURL`, `about`, `skills`

Additional rules: `about` ≤ 200 characters, `photoURL` must be a valid URL.

Body (all fields optional):
```json
{
  "firstName": "Ada",
  "age": 28,
  "gender": "female",
  "photoURL": "https://example.com/ada.png",
  "about": "Systems programmer who likes long compiles.",
  "skills": ["typescript", "rust", "mongodb"]
}
```

- `200` — `{ "message": "Profile updated successfully", "user": { ... } }`
- `400` — `Error : Edit request not valid.` (plain text)
- `401` — not authenticated

---

#### 🔒 `PATCH /profile/update`

Changes the account password.

Body:
```json
{
  "currentPassword": "Str0ng!Pass1",
  "oldPassword": "Str0ng!Pass1",
  "newPassword": "Even$tr0nger2"
}
```

`currentPassword` is bcrypt-compared against the stored hash. `newPassword` is required
and must differ from `oldPassword`. On success the hash is replaced.

- `200` — `Password updated successfully.` (plain text)
- `400` — `Error : Current password is not valid.` / `Error : New password req` / `Error : New Password Invalid.`
- `401` — not authenticated

---

### Connection Requests

#### 🔒 `POST /request/send/:status/:toUserId`

Send a connection request to another user.

| Param       | Value                          |
| ----------- | ------------------------------ |
| `:status`   | `interested` or `ignore`        |
| `:toUserId` | a valid MongoDB ObjectId        |

Rejected when: the status isn't one of the two allowed values, `toUserId` isn't a valid
ObjectId, the target user doesn't exist, you send to yourself, or a request already exists
in **either** direction between the two users.

Example: `POST /request/send/interested/6721b0f4c1a2d3e4f5a6b7c8`

- `200` — `{ "message": "Connection request sent successfully", "data": { ... } }`
- `400` — `Error : Connection req already sent.` / `Error : Invalid status for connection request.` (plain text)
- `404` — `{ "message": "Invalid userid." }` / `{ "message": "User not found." }`
- `401` — not authenticated

---

#### 🔒 `POST /request/review/:status/:requestId`

Accept or reject a pending request **addressed to you**. Only matches requests where
`toUserId` is the logged-in user and the current status is `interested`.

| Param        | Value                     |
| ------------ | ------------------------- |
| `:status`    | `accepted` or `rejected`   |
| `:requestId` | the ConnectionRequest `_id`|

Example: `POST /request/review/accepted/6721b1a9c1a2d3e4f5a6b7d0`

- `200` — `{ "message": "Connection request accepted", "data": { ... } }`
- `401` — `{ "error": "Invalid request status type." }` / `{ "error": "Connection request not found." }` / unauthenticated

---

### Users & Feed

#### 🔒 `GET /user/requests/received`

Pending requests sent **to** you (status `interested`), with the sender populated using
the safe field set (`firstName lastName photoURL age gender about skills`).

```json
{
  "message": "You've got 2 connection request(s).",
  "connectionRequests": [
    {
      "_id": "...",
      "fromUserId": { "_id": "...", "firstName": "Grace", "skills": ["go"] },
      "toUserId": "...",
      "status": "interested"
    }
  ]
}
```

- `200` — as above
- `401` — not authenticated
- `501` — `{ "error": "<message>" }`

---

#### 🔒 `GET /user/connections`

All users you are connected with — i.e. requests in either direction with status
`accepted`. Returns a flat array of the *other* party's safe fields.

```json
[
  { "_id": "...", "firstName": "Grace", "lastName": "Hopper", "skills": ["cobol"] }
]
```

- `200` — array of users
- `400` — `{ "error": "<message>" }`
- `401` — not authenticated

---

#### 🔒 `GET /feed`

Paginated list of candidate users to swipe on. Excludes yourself and everyone you already
have a connection request with (in either direction). If your profile has a `gender` set,
users of the same gender are filtered out.

Query parameters:

| Param   | Default | Notes                        |
| ------- | ------- | ---------------------------- |
| `page`  | `1`     | 1-indexed                    |
| `limit` | `10`    | capped at `50`               |

Example: `GET /feed?page=2&limit=20`

Returns an array of users with the safe field set, sorted by `_id` ascending.

- `200` — array of users
- `400` — `{ "message": "<message>" }`
- `401` — not authenticated

---

#### 🔓 `GET /allusers`

Returns **every** user document in the collection. Intended as a development/debugging
helper — see the note below.

- `200` — array of full user documents
- `400` — `{ "message": "<message>" }`

---

## Error Response Conventions

Responses are not fully uniform yet — some handlers send plain text, others JSON:

- Plain text `Error : <message>` — signup, login, logout, profile routes, `POST /request/send`
- JSON `{ "error": "<message>" }` — `POST /request/review`, `/user/*`
- JSON `{ "message": "<message>" }` — `/feed`, `/allusers`, auth failures

Standardizing on a single JSON error shape is a good next step.

---

## Notes & Known Rough Edges

These are accurate descriptions of the current code, not aspirational docs:

- **`GET /allusers` is unauthenticated and returns password hashes** along with every other
  field. It should be removed or put behind auth + the safe projection before deploying.
- **`PATCH /profile/update` reads three password fields.** `currentPassword` is verified
  against the hash, while `oldPassword` is only used for the "must be different" check —
  so a client that omits `oldPassword` passes that check trivially.
- **`validateNewPassword` overwrites its own result**: the strong-password check is
  computed and then discarded by the following assignment, so only the
  "different from `oldPassword`" condition actually applies.
- **`POST /logout` sets the cookie to the string `null`** rather than clearing it; the
  immediate expiry is what ends the session.
- **The `{ fromUserId, toUserId }` index is not unique**, so duplicate-request prevention
  relies solely on the application-level lookup and can race under concurrency.
- **The self-request guard in the ConnectionRequest schema is commented out**; the route
  handler performs that check instead.
- **`startServer` swallows errors** — its `catch` block is empty, so a failure after the DB
  connect step exits silently.
- **CORS origin is hardcoded** to `http://localhost:5173`; make it configurable per
  environment before deploying.

---

## License

ISC — author: Sachin
