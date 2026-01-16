# AI Marketing Content Creation Tool

An AI-powered marketing automation tool that conducts conversational interviews with business owners, analyzes their brand and vision, creates marketing strategies, generates platform-specific content, manages approval workflows, and auto-posts to social media.

## 🚀 Features

- **AI-Powered Brand Interview**: Interactive conversational interview system that captures business context through 30-minute AI-led discussions
- **Marketing Strategy Generation**: AI analyzes interviews and creates comprehensive marketing strategies with channel recommendations
- **Multi-Platform Content Generation**: Automatically generates 20-50 posts tailored for LinkedIn, Twitter, Instagram, Facebook, and TikTok
- **Smart Approval Workflow**: Review, edit, approve, or reject generated content with optional auto-approval settings
- **Scheduling & Auto-Posting**: Schedule posts or post immediately with integrated social media posting via Ayrshare API
- **Analytics Dashboard**: Track performance with overview stats, platform breakdowns, and content calendars

## 📁 Project Structure

```
marketing-tool/
├── frontend/              # Next.js 14 frontend application
│   ├── app/              # App router pages
│   │   ├── interview/    # Page 1: Audio interview
│   │   ├── strategy/     # Page 2: Marketing strategy
│   │   ├── content/      # Page 3: Content library
│   │   ├── approval/     # Page 4: Approval dashboard
│   │   └── analytics/    # Page 5: Analytics & reports
│   ├── components/       # Reusable React components
│   └── lib/             # Utility functions and API client
│
├── backend/              # FastAPI backend application
│   ├── app/
│   │   ├── models/       # SQLAlchemy database models
│   │   ├── routes/       # API endpoints
│   │   ├── services/     # Business logic services
│   │   └── tasks/        # Celery background tasks
│   └── requirements.txt  # Python dependencies
│
└── README.md            # This file
```

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** (App Router)
- **React 18**
- **TypeScript**
- **Tailwind CSS**
- **Shadcn/ui** (Component library)
- **Axios** (API calls)

### Backend
- **FastAPI** (Python API framework)
- **PostgreSQL** (Database)
- **SQLAlchemy** (ORM)
- **Redis** (Queue management)
- **Celery** (Background tasks)

### AI Services
- **OpenAI Whisper API** (Speech-to-text)
- **OpenAI GPT-4o** or **Claude 3.5 Sonnet** (Content generation)
- **Ayrshare API** (Social media posting)

## 📋 Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.10+
- **PostgreSQL** 14+
- **Redis** 6+
- **OpenAI API Key**
- **Ayrshare API Key** (optional, for social posting)

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd marketing-tool
```

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy environment variables
cp .env.local.example .env.local

# Edit .env.local and add your API URL
# NEXT_PUBLIC_API_URL=http://localhost:8000

# Run development server
npm run dev
```

The frontend will be available at [http://localhost:3000](http://localhost:3000)

### 3. Backend Setup

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

# Copy environment variables
cp .env.example .env

# Edit .env and add your API keys:
# - DATABASE_URL
# - OPENAI_API_KEY
# - AYRSHARE_API_KEY (optional)
```

### 4. Database Setup

```bash
# Create PostgreSQL database
createdb marketing_tool

# The application will automatically create tables on first run
```

### 5. Run the Backend

```bash
cd backend

# Start FastAPI server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at [http://localhost:8000](http://localhost:8000)

API documentation: [http://localhost:8000/docs](http://localhost:8000/docs)

### 6. Run Redis (for scheduling)

```bash
# On Windows (using WSL or Redis for Windows)
redis-server

# On macOS (using Homebrew)
brew services start redis

# On Linux
sudo systemctl start redis
```

### 7. Run Celery Worker (for background tasks)

```bash
cd backend
celery -A app.tasks.scheduler worker --loglevel=info
```

## 📖 Usage

### Complete Workflow

1. **Brand Interview** (`/interview`)
   - Click "Start Interview"
   - Speak about your business for ~30 minutes
   - AI asks follow-up questions
   - Transcript is saved automatically

2. **Marketing Strategy** (`/strategy`)
   - View AI-generated marketing strategy
   - Review recommended channels
   - See content pillars and brand voice
   - Edit or regenerate if needed

3. **Content Library** (`/content`)
   - Browse 20-50 generated posts
   - Filter by platform (LinkedIn, Twitter, Instagram, etc.)
   - Edit or regenerate individual posts
   - Approve posts to move to approval queue

4. **Approval & Posting** (`/approval`)
   - Review approved content
   - Choose "Post Now" or "Schedule" for later
   - Enable auto-approval in settings
   - Track scheduled posts

5. **Analytics** (`/analytics`)
   - View overview stats
   - Track posted content
   - See upcoming scheduled posts
   - Monitor engagement metrics

## 🔑 Environment Variables

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_ENVIRONMENT=development
```

### Backend (.env)
```
DATABASE_URL=postgresql://user:password@localhost:5432/marketing_tool
REDIS_URL=redis://localhost:6379
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-... (optional)
AYRSHARE_API_KEY=... (optional, for social posting)
JWT_SECRET=your-secret-key
CORS_ORIGINS=http://localhost:3000
```

## 🧪 Development Status

### ✅ Completed (Phase 1)
- [x] Project structure setup
- [x] Database schema and models
- [x] Dashboard layout with sidebar navigation
- [x] All 5 pages with UI mockups:
  - Brand Interview page
  - Marketing Strategy page
  - Content Library page
  - Approval & Posting page
  - Analytics & Reports page

### 🚧 In Progress (Phase 2)
- [ ] Audio recording implementation (Web Audio API)
- [ ] OpenAI Whisper integration (real-time transcription)
- [ ] AI interviewer logic (GPT-4 conversational questions)
- [ ] Strategy generation service
- [ ] Content generation service

### 📅 Upcoming (Phase 3-7)
- [ ] Ayrshare API integration
- [ ] Scheduled posting with Celery
- [ ] Auto-approval settings
- [ ] Analytics data collection
- [ ] Performance optimization
- [ ] End-to-end testing

## 📊 API Endpoints (To be implemented)

```
POST   /api/interview/start          - Start new interview session
POST   /api/interview/audio-chunk    - Upload audio chunk (streaming)
GET    /api/interview/{id}           - Get interview details
POST   /api/interview/{id}/complete  - Mark interview complete

GET    /api/strategy/{user_id}       - Get user's marketing strategy
POST   /api/strategy/regenerate      - Regenerate strategy
PUT    /api/strategy/{id}            - Update strategy

GET    /api/content                  - List all content (with filters)
POST   /api/content/generate         - Generate content batch
PUT    /api/content/{id}             - Update content
POST   /api/content/{id}/approve     - Approve content
POST   /api/content/{id}/post        - Post content now
POST   /api/content/{id}/schedule    - Schedule content

GET    /api/analytics/overview       - Get overview stats
GET    /api/analytics/calendar       - Get calendar data
```

## 🤝 Contributing

This is a private project. If you have access and want to contribute:

1. Create a feature branch (`git checkout -b feature/amazing-feature`)
2. Commit your changes (`git commit -m 'Add amazing feature'`)
3. Push to the branch (`git push origin feature/amazing-feature`)
4. Open a Pull Request

## 📝 License

Proprietary - All rights reserved

## 👥 Team

- Development Team: NorthBearingAI

## 🔗 Useful Links

- [Next.js Documentation](https://nextjs.org/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Ayrshare API Documentation](https://docs.ayrshare.com/)

---

**Note**: This project is in active development. The MVP is targeted for completion in 10 weeks (Phases 1-7).
