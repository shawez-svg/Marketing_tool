# 🚀 Quick Start Guide

Get your AI Marketing Content Creation Tool up and running in minutes!

## Prerequisites Check

Before you begin, ensure you have:

- [ ] Node.js 18+ installed (`node --version`)
- [ ] Python 3.10+ installed (`python --version`)
- [ ] PostgreSQL 14+ installed and running
- [ ] Redis installed and running (optional for Phase 1)
- [ ] OpenAI API key (get one at [platform.openai.com](https://platform.openai.com))

## Step-by-Step Setup

### 1. Install Frontend Dependencies (5 minutes)

```bash
cd frontend
npm install
```

### 2. Configure Frontend Environment

```bash
# Create environment file
cp .env.local.example .env.local

# The default values should work for local development
# NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 3. Start Frontend Development Server

```bash
npm run dev
```

✅ Frontend is now running at: **http://localhost:3000**

---

### 4. Install Backend Dependencies (5 minutes)

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 5. Create Database

```bash
# Using PostgreSQL command line
createdb marketing_tool

# Or using psql
psql -U postgres
CREATE DATABASE marketing_tool;
\q
```

### 6. Configure Backend Environment

```bash
# Copy environment file
cp .env.example .env
```

Edit `.env` and add your configuration:

```env
# Minimal configuration for Phase 1
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/marketing_tool
OPENAI_API_KEY=sk-your-key-here
JWT_SECRET=your-secret-key-change-me
```

### 7. Start Backend Server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

✅ Backend API is now running at: **http://localhost:8000**

✅ API Documentation: **http://localhost:8000/docs**

---

## 🎉 You're Ready!

Open your browser and navigate to:

**http://localhost:3000**

You should see the dashboard with navigation for all 5 pages:

1. **Brand Interview** - Start AI conversation (mockup ready)
2. **Marketing Strategy** - View generated strategy (mockup ready)
3. **Content Library** - Browse generated content (mockup ready)
4. **Approval & Posting** - Review and publish (mockup ready)
5. **Analytics** - Performance reports (mockup ready)

## 🧪 Testing the Setup

### Test Backend API

```bash
# Health check
curl http://localhost:8000/health

# Expected response:
# {"status":"healthy"}
```

### Test Frontend

Navigate to:
- http://localhost:3000 → Should redirect to `/interview`
- http://localhost:3000/interview → Brand Interview page
- http://localhost:3000/strategy → Marketing Strategy page
- http://localhost:3000/content → Content Library page
- http://localhost:3000/approval → Approval & Posting page
- http://localhost:3000/analytics → Analytics & Reports page

---

## 📝 Next Steps

### Phase 1 is Complete! ✅

You now have:
- ✅ Full project structure
- ✅ Database schema
- ✅ Dashboard with 5 pages
- ✅ Beautiful UI mockups

### Phase 2 - Implement Core Features

The next phase involves implementing:

1. **Audio Recording System**
   - Web Audio API integration
   - Real-time transcription with Whisper API
   - AI interviewer logic with GPT-4

2. **Strategy Generation**
   - LLM-powered analysis of interview transcripts
   - Marketing strategy creation

3. **Content Generation**
   - Platform-specific content creation
   - Batch generation of 20-50 posts

### Want to Continue Building?

Check the implementation plan at:
```
C:\Users\Dell\.claude\plans\lively-baking-tiger.md
```

Or refer to the main [README.md](README.md) for full project documentation.

---

## 🐛 Troubleshooting

### Frontend Issues

**Port 3000 already in use:**
```bash
# Kill the process using port 3000
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux:
lsof -ti:3000 | xargs kill -9
```

**Dependencies installation fails:**
```bash
# Clear npm cache
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Backend Issues

**Database connection fails:**
```bash
# Check PostgreSQL is running
# Windows:
pg_ctl status

# macOS/Linux:
sudo systemctl status postgresql
```

**Port 8000 already in use:**
```bash
# Windows:
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# macOS/Linux:
lsof -ti:8000 | xargs kill -9
```

**Python dependencies fail:**
```bash
# Upgrade pip
python -m pip install --upgrade pip

# Try installing again
pip install -r requirements.txt
```

---

## 💡 Tips

1. **Keep both terminals open** - One for frontend (`npm run dev`), one for backend (`uvicorn ...`)

2. **Use the API docs** - Visit http://localhost:8000/docs to explore available endpoints

3. **Hot reload enabled** - Both frontend and backend will automatically reload when you make code changes

4. **Database GUI** - Use tools like pgAdmin, DBeaver, or TablePlus to visualize your database

---

## 📞 Need Help?

Refer to the comprehensive [README.md](README.md) for:
- Detailed architecture overview
- API endpoint documentation
- Development roadmap
- Technology stack details

---

**Happy Building! 🚀**
