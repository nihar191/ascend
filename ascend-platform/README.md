# Ascend - Real-Time Competitive Programming Platform

A gamified competitive programming platform with real-time matchmaking, live coding contests, and AI-generated problems.

## Tech Stack

- **Backend**: Node.js, Express, PostgreSQL, Socket.IO
- **Frontend**: React (Vite), Tailwind CSS
- **AI**: Google Gemini API
- **Auth**: JWT

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Google Gemini API key

## Step 1: Setup Instructions

### 1. Clone and Install Backend

\`\`\`bash
mkdir ascend-platform
cd ascend-platform
mkdir backend
cd backend

# Copy package.json and install
npm install
\`\`\`

### 2. Configure Environment

\`\`\`bash
cp .env.example .env
# Edit .env with your database credentials and API keys
\`\`\`

### 3. Create Database

\`\`\`bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE ascend_db;

# Exit psql
\q
\`\`\`

### 4. Run Migrations

\`\`\`bash
npm run migrate
\`\`\`

### 5. Seed Database

\`\`\`bash
# Update seed.sql with a real bcrypt hash for admin password
# Generate hash: node -e "import('bcryptjs').then(b => b.hash('Admin@123', 10).then(console.log))"

npm run seed
\`\`\`

### 6. Start Development Server

\`\`\`bash
npm run dev
\`\`\`

Server should now be running on `http://localhost:5000`

## Testing

\`\`\`bash
# Health check
curl http://localhost:5000/api/health
\`\`\`

Expected response:
\`\`\`json
{
  "status": "ok",
  "database": "connected"
}
\`\`\`

## Next Steps

- Step 2: Authentication system (registration, login, JWT)
- Step 3: Problems CRUD + Gemini integration
- Step 4: Leagues & seasons
- Step 5: Matchmaking
- Step 6: Real-time match flow
- Step 7: Scoring & ranking
- Step 8: Admin interface
- Step 9: Frontend UI
- Step 10: Testing

## Project Structure

See `docs/SUMMARY.md` for complete file listing.

## Security Notes

- Never commit `.env` file
- Use strong JWT secrets in production
- Rate limit all public endpoints
- Sanitize all user inputs
- Use HTTPS in production

## Mock Judge

The initial implementation uses a **mock judge** for code execution safety. See `docs/JUDGE_REPLACEMENT.md` for instructions on integrating a real judge (Docker sandbox, AWS Lambda, etc.).
