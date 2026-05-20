# DropBridge
### Cross-Platform Instant File Sharing (P2P + Cloud Fallback)

Create a repo-level context folder or docs file, like context.md, project-brief.md, or a .context/ memory bank.

Put architecture notes, coding standards, commands, and current goals there.
DropBridge is a lightweight cross-platform file transfer application that enables users to send files instantly using QR codes, email links, or temporary sharing sessions.

Keep updating that file whenever the project changes, so both tools stay aligned

The goal is to provide an experience similar to AirDrop while remaining independent of ecosystem restrictions.

Built using:

- Frontend → React + Vite
- Backend → Java Spring Boot
- Database → PostgreSQL
- Transfer → WebRTC (P2P)
- Fallback Storage → Temporary Cloud Storage

---

# Project Goal

Enable users to:

1. Select files
2. Generate a transfer session
3. Share using:
   - QR Code
   - Email Link
4. Transfer instantly through Peer-to-Peer
5. Automatically switch to cloud fallback if direct transfer fails

No login required for MVP.

---

# Core Principles

This project intentionally prioritizes:

✅ Fast implementation  
✅ Good software design  
✅ Clean architecture  
✅ Normalized database structure  
✅ Hybrid transfer model  

This project intentionally avoids:

❌ Premature optimization  
❌ Complex scaling  
❌ Distributed systems  
❌ Microservices  
❌ Unnecessary infrastructure  

---

# Transfer Architecture

## Primary Transfer (P2P)

Fast path for active sender and receiver.

```text
Sender
 ↓
WebRTC
 ↓
Receiver
```

Advantages:

- Instant
- No backend bandwidth
- End-to-end encrypted transport

---

## Fallback Transfer (Temporary Cloud)

Activated if:

- Receiver unavailable
- Connection timeout
- P2P negotiation fails

```text
Sender
 ↓
Cloud Temporary Storage
 ↓
Receiver
```

Files automatically expire.

Retention:

```text
24 hours maximum
```

---

# Product Scope

# Phase 1 — MVP (Build First)

Target completion:
2–3 weeks

---

## Feature 1 — File Upload

Users can upload:

- Images
- Documents
- Videos
- PDFs

Constraints:

- Maximum 500MB
- Single file transfer

---

## Feature 2 — Transfer Sessions

Generate:

```json
{
  "sessionId": "",
  "shareCode": "",
  "expiresAt": ""
}
```

Session Responsibilities:

- Track transfer state
- Generate QR
- Control expiration

---

## Feature 3 — Sharing Options

Supported:

### QR Code

Scan and receive instantly.

### Email Link

Generate:

```text
app.com/receive/{sessionId}
```

---

## Feature 4 — Hybrid Transfer Logic

```text
Attempt P2P

If Success:
Transfer Directly

Else:
Store File Temporarily
Allow Receiver Download
```

---

## Feature 5 — Chunked Transfer

Chunk Size:

```text
256 KB
```

Purpose:

- Retry failed chunks
- Resume support
- Better progress tracking

---

## Feature 6 — Transfer Status

Possible states:

```text
PENDING
CONNECTING
TRANSFERRING
COMPLETED
FAILED
EXPIRED
```

---

## Feature 7 — Automatic Cleanup

Background cleanup:

```text
Every 1 hour
```

Tasks:

- Delete expired sessions
- Remove cloud files
- Clean metadata

---

# Phase 2 — Strong Foundation

Build after deployment.

Features:

- Resume interrupted transfers
- Transfer history
- Better validation
- Multiple files
- Guest identity
- Notifications

---

# Phase 3 — Nice to Have

Future ideas.

Features:

- Authentication
- Nearby discovery
- Clipboard sync
- Folder sharing
- Mobile app
- Compression
- Encryption layer

---

# System Design

## High-Level Architecture

```text
Frontend (React)
        ↓
Spring Boot API
        ↓
Session Management
        ↓
Try WebRTC
        ↓
Cloud Fallback
```

---

# Technology Stack

## Frontend

```text
React
Vite
TailwindCSS
Zustand
Axios
React Router
```

---

## Backend

```text
Spring Boot
Spring WebSocket
Spring Security
Spring Data JPA
```

---

## Database

```text
PostgreSQL
```

---

## Storage

Development:

```text
Local Storage
```

Production:

```text
Object Storage
```

Examples:

- AWS S3
- Cloudflare R2

---

# Database Design

## users

```sql
users
------
id
email
created_at
```

---

## transfer_sessions

```sql
transfer_sessions
-----------------

id

sender_id

share_code

status

mode

expires_at

created_at
```

mode:

```text
P2P
CLOUD
```

---

## transfer_recipients

```sql
transfer_recipients
-------------------

id

session_id

email

accessed
```

---

## files

```sql
files
-----

id

session_id

filename

mime_type

size

storage_type

storage_key
```

storage_type:

```text
P2P
TEMP_CLOUD
```

---

## transfer_chunks

```sql
transfer_chunks
---------------

id

file_id

chunk_index

status

uploaded_at
```

Used only for cloud fallback.

---

# Backend Structure

```text
backend/

src/

├── auth
├── transfer
├── storage
├── qr
├── webrtc
├── email
├── cleanup
├── common

└── config
```

---

# Frontend Structure

```text
frontend/

src/

├── components
├── pages
├── hooks
├── services
├── store
├── utils
├── webrtc
└── assets
```

---

# API Design

## Create Session

```http
POST /api/transfers
```

Response:

```json
{
  "sessionId": "",
  "qrCode": ""
}
```

---

## Join Session

```http
POST /api/transfers/{id}/join
```

---

## Upload Chunk

```http
POST /api/chunks
```

---

## Complete Upload

```http
POST /api/transfers/complete
```

---

## Download File

```http
GET /api/files/{id}
```

---

# Development Roadmap

## Week 1

Backend:

- Project setup
- Database
- Transfer session

Frontend:

- Upload UI
- QR page

Deliverable:

✅ Session creation

---

## Week 2 (in progress)

Backend:

- [x] WebSocket signaling hub (`/ws/signaling`)
- [x] Relay offer / answer / ICE between peers

Frontend:

- [x] Signaling client + WebRTC data channel (256 KB chunks)
- [x] Sender flow on Status page
- [x] Receiver flow on Receive page
- [x] Cloud upload fallback on P2P failure

Deliverable:

- Browser-to-browser transfer (test with two tabs / devices on same network)

Remaining for Week 2 polish:

- [ ] TURN server for NAT traversal (production)
- [ ] Auto cloud fallback timeout (Week 3 hybrid logic)

---

## Week 3

Backend:

- Cloud fallback
- Cleanup jobs

Frontend:

- Progress UI
- Error handling

Deliverable:

✅ Production-ready MVP

---

# Deployment

## Frontend

Deploy:

```text
Vercel
```

---

## Backend

Deploy:

```text
Render
```

---

## Database

Deploy:

```text
Supabase PostgreSQL
```

---

## Storage

Deploy:

```text
Cloudflare R2
```

---

# Success Criteria

MVP is successful if:

- Upload works
- QR sharing works
- P2P transfers work
- Cloud fallback works
- Files expire automatically

Target User Flow:

```text
Open App
↓
Upload File
↓
Generate QR
↓
Scan
↓
Receive
```

Transfer initiation should take:

```text
< 5 seconds
```

---

# Explicitly Out of Scope

Do NOT build now:

- Redis
- Kafka
- Kubernetes
- AI features
- Analytics
- Push notifications
- Mobile apps
- Compression
- Multi-region deployment

---

# Final Goal

Build a simple, reliable, and fast cross-platform transfer tool that solves the actual problem first:

Move files instantly without ecosystem lock-in.
