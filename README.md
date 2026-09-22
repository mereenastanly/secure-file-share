# 🔐 Secure File Share

A full-stack cloud file-sharing portal with security built into its core — strict upload validation and time-expiring share links, not bolted on as an afterthought.

**Live demo:** [secure-file-share-seven.vercel.app](https://secure-file-share-seven.vercel.app)
**Backend API:** [https://secure-file-share-backend.onrender.com](https://secure-file-share-backend.onrender.com/api/health)

> Note: the backend runs on a free-tier instance and may take up to 50 seconds to respond on its first request after inactivity.

---

## What it does

Secure File Share lets users register an account, upload documents and images to the cloud, organize them into folders, and generate shareable download links for others — with two security mechanisms most beginner "Drive clone" projects skip entirely:

- **Strict backend file-type validation** — every upload is checked against an allow-list of permitted file types (MIME type + extension match) before it's accepted, blocking disguised or malicious files.
- **Time-expiring share links** — shared download links automatically expire after 24 hours, checked independently against the database rather than relying solely on the cloud storage provider's own link expiry.

## Features

- 🔑 User authentication with hashed passwords (bcrypt) and JWT sessions
- 📁 Folder creation and nested navigation
- ☁️ Direct-to-S3 uploads via pre-signed URLs (files never pass through the backend server)
- 🛡️ Server-side file-type and size validation before any upload is accepted
- 🔗 Time-expiring, revocable share links for secure external sharing
- 🗑️ File and folder deletion, scoped to the owning user
- 📱 Responsive, custom-designed UI

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite) |
| Backend | Node.js, Express |
| Database | MongoDB (Atlas) |
| File storage | AWS S3 |
| Auth | JWT + bcrypt |
| Deployment | Vercel (frontend), Render (backend) |

## Architecture

```
React (Vercel) → Express API (Render) → MongoDB Atlas (metadata)
                                       → AWS S3 (file storage, via pre-signed URLs)
```

The frontend never talks to S3 through the backend for the actual file bytes — the backend only issues short-lived, pre-signed URLs, and the browser uploads/downloads directly to/from S3. This keeps the backend lightweight and mirrors how production file-storage systems are built.

## Security decisions

- **Allow-list, not block-list, file validation** — only explicitly permitted file types are accepted, rather than trying to enumerate every dangerous type.
- **Extension/MIME-type matching** — catches files disguised with a mismatched extension (e.g., a script renamed to `.jpg`).
- **Dual expiry check on share links** — a link is validated against the app's own database *and* carries a short-lived pre-signed S3 URL underneath, so access can be revoked independently of the cloud provider's expiry.
- **Ownership checks on every file/folder operation** — a user can only download, delete, or share files they actually own, enforced server-side on every request.
- **Secrets kept out of version control** — all credentials (database URI, JWT secret, AWS keys) are loaded from environment variables, never committed to the repo.

## Running locally

**Backend**
```bash
cd server
npm install
# create a .env file with MONGO_URI, JWT_SECRET, AWS_ACCESS_KEY_ID,
# AWS_SECRET_ACCESS_KEY, AWS_BUCKET_NAME, AWS_REGION, PORT
npm run dev
```

**Frontend**
```bash
cd client
npm install
# create a .env file with VITE_API_URL=http://localhost:5000
npm run dev
```

## What I'd improve with more time

- Virus/malware scanning on upload (e.g., ClamAV via a Lambda trigger)
- Scoped IAM permissions instead of full S3 access for the app's AWS user
- File versioning and sharing with specific users rather than public links only
- Automated tests (unit + integration) for the API routes

---

Built as a full-stack portfolio project to demonstrate practical security-conscious development, not just CRUD functionality.
