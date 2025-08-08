Adaline Full-Stack Challenge

Minimal instructions to run the client and server separately during development.

Prerequisites
- Node.js 18+
- npm (or yarn/pnpm)

Setup
- Open two terminals from the project root.

Server (port 5000)
1) cd server
2) npm install
3) npm run dev  (or npm start)

Client (port 3000)
1) cd client
2) npm install
3) npm start

Optional environment
- Create `client/.env` if you need to override defaults:
  - REACT_APP_API_URL=http://localhost:5000
  - REACT_APP_SOCKET_URL=http://localhost:5000

Notes
- Data persists in `server/database.sqlite` (git-ignored).
- Real-time sync via Socket.io.

## Features
- **Folders & Items**: Create, edit, delete, and reorder
- **Drag & Drop**: Move items between folders and the loose “Items” section
- **Real-time sync**: Changes broadcast to all connected clients
- **SQLite persistence**: Simple file-based DB for local development

## Project structure
```
project-root/
  client/            React + TypeScript app (port 3000)
  server/            Node + Express + Socket.io + SQLite (port 5000)
  .gitignore
  README.md
```

Key files:
- `client/src/components/Board.tsx`: Main board (folders + items)
- `client/src/components/ItemCard.tsx`: Item UI + actions
- `client/src/components/FolderBox.tsx`: Folder UI + actions
- `client/src/hooks/useDragDrop.ts`: Drag & drop behavior
- `client/src/hooks/useSocket.ts`: API helpers and socket wiring
- `server/index.js`: HTTP routes and Socket.io events
- `server/db.js`: SQLite schema and queries

## Data model
- **Item**: `{ id, title, icon, folderId (nullable), order }`
- **Folder**: `{ id, name, isOpen, order }`

Ordering is a simple integer per container (folder or loose items). Drag‑and‑drop updates `order` accordingly.

## REST API reference (server)
- `GET /api/data` → returns all folders and items (mixed list)
- `POST /api/items` → create item `{ title, icon, folderId?, order? }`
- `PUT /api/items/:id` → update item
- `DELETE /api/items/:id` → delete item
- `POST /api/folders` → create folder `{ name, order? }`
- `PUT /api/folders/:id` → update folder
- `DELETE /api/folders/:id` → delete folder (moves items to loose items)

## Socket events
Emitted by server:
- `initialData`, `itemCreated`, `itemUpdated`, `itemDeleted`
- `folderCreated`, `folderUpdated`, `folderDeleted`
- `bulkUpdateReceived`, `clientCount`, `error`

From client to server:
- `requestInitialData`, `bulkUpdate`

## Scripts
- **Server**: `npm run dev` (nodemon), `npm start`
- **Client**: `npm start`, `npm run build`

## Troubleshooting
- **Ports**: Client on 3000, Server on 5000. Make sure both are free.
- **CORS**: Server allows origin `http://localhost:3000` by default (see `server/index.js`).
- **DB reset**: Stop the server and delete `server/database.sqlite` for a clean slate.
- **Windows path issues**: Run terminals as regular user (not admin) to avoid SQLite locks.
- **ENV mismatch**: If deploying or changing ports, update `client/.env` values accordingly.
