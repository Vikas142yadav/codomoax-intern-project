# Codomax Blog Application

A small full-stack blog demo using Express, MongoDB (fallback in-memory), and static frontend (HTML/CSS/JS).

## Features
- User registration and login (JWT)
- Create, edit, delete blogs
- Browse latest posts with search and category filters
- Simple responsive UI with accessible navigation

## Quick start (development)
1. Install dependencies:

```bash
npm install
```

2. Start the server (serves static frontend and API):

```bash
npm start
```

3. Open the app in your browser:

- http://localhost:3000/

## Environment variables
- `PORT` — server port (default 3000)
- `MONGODB_URI` — MongoDB connection string (optional)
- `MONGODB_DB` — database name (default `codomax`)
- `JWT_SECRET` — secret for signing tokens (set in production)

If MongoDB is not available, the server falls back to an in-memory store (data is not persisted).

## Notes for development
- Server static files are served from the project root. Run `npm start` from the project directory.
- API routes are under `/api/*` and include `/api/register`, `/api/login`, `/api/blogs` and related endpoints.

## Quick verification checklist
- Register a new user via `/register.html` and log in via `/login.html`.
- Create a blog via `/create-blog.html` and verify it appears on the homepage and `/dashboard.html`.
- Edit and delete blogs from the dashboard.

## Known issues / next steps
- Improve backend validation and stronger password policies.
- Add unit tests and CI configuration.
- Consider rich-text editor for better blog content authoring.

---

If you'd like, I can now run the server (npm install && npm start) or polish backend error messages next.