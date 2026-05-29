# Document Management Dashboard

Full-stack prototype for uploading company PDFs, tracking upload progress in real time, and receiving notifications when background processing completes.

## Stack

- **Frontend:** React + Vite, Socket.io client, Livvic font
- **Backend:** Node.js + Express, Multer, Socket.io
- **Database:** SQLite (better-sqlite3)

## Features

- PDF-only drag-and-drop upload with XMLHttpRequest upload progress
- Real-time processing progress via WebSockets
- Toast notifications when documents are ready
- Document library with status badges (Uploading / Processing / Ready)

## Setup

```bash
npm run install:all
npm run dev
```

- App: http://localhost:5173
- API: http://localhost:3001

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Run API + frontend together |
| `npm run dev:server` | API only |
| `npm run dev:client` | Frontend only |
| `npm run build` | Build frontend for production |
