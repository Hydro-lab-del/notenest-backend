# NotesNest v4

notes app built with Node.js, Express and MongoDB.

## Features
- User authentication (JWT)
- Create, read, update, delete notes
- Email reminders
- Input validation with Zod

## Prerequisites
- Node.js 18+ (or compatible)
- MongoDB (URI)

## Setup
1. Install dependencies

```bash
npm install
```

2. Create a `.env` file in the project root with the following variables:

```
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
EMAIL_HOST=
EMAIL_PORT=
EMAIL_USER=
EMAIL_PASS=
```

3. Run locally

```bash
npm run dev
# or
npm start
```

## Project structure
- `src/` application source
- `src/index.js` app entry

## Git
Initialize a repo and push to GitHub:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

## License
MIT
