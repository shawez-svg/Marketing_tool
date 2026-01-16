# Backend - Marketing Content Creation Tool

FastAPI backend for the AI-powered marketing automation platform.

## Setup

### 1. Create Virtual Environment

```bash
python -m venv venv

# Activate
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your configuration:
- `DATABASE_URL`: PostgreSQL connection string
- `OPENAI_API_KEY`: Your OpenAI API key
- `AYRSHARE_API_KEY`: Your Ayrshare API key (for social posting)
- `JWT_SECRET`: Secret key for JWT tokens

### 4. Run the Server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API docs will be available at: http://localhost:8000/docs

## Project Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI application
│   ├── config.py            # Configuration settings
│   ├── database.py          # Database connection
│   ├── models/              # SQLAlchemy models
│   │   ├── user.py
│   │   ├── interview.py
│   │   ├── strategy.py
│   │   ├── post.py
│   │   ├── social_account.py
│   │   └── settings.py
│   ├── routes/              # API endpoints (to be implemented)
│   ├── services/            # Business logic (to be implemented)
│   └── tasks/               # Celery tasks (to be implemented)
├── requirements.txt
├── .env
└── README.md
```

## Database Models

### Users
- User authentication and profile information

### Interviews
- Stores audio files and transcripts from brand interviews
- Status tracking (in_progress, completed, failed)

### Strategies
- AI-generated marketing strategies
- Contains brand summary, target audience, recommended channels, content pillars

### Posts
- Generated social media content
- Platform-specific (LinkedIn, Twitter, Instagram, Facebook, TikTok)
- Status management (draft, approved, scheduled, posted, rejected)

### Social Accounts
- Connected social media accounts
- OAuth tokens (encrypted)

### Settings
- User preferences
- Auto-approval configuration

## API Endpoints (To be implemented)

### Interview
- `POST /api/interview/start` - Start new interview
- `POST /api/interview/audio-chunk` - Upload audio chunk
- `GET /api/interview/{id}` - Get interview details
- `POST /api/interview/{id}/complete` - Complete interview

### Strategy
- `GET /api/strategy/{user_id}` - Get strategy
- `POST /api/strategy/regenerate` - Regenerate strategy
- `PUT /api/strategy/{id}` - Update strategy

### Content
- `GET /api/content` - List content
- `POST /api/content/generate` - Generate content batch
- `PUT /api/content/{id}` - Update content
- `POST /api/content/{id}/approve` - Approve content
- `POST /api/content/{id}/post` - Post immediately
- `POST /api/content/{id}/schedule` - Schedule for later

### Analytics
- `GET /api/analytics/overview` - Overview stats
- `GET /api/analytics/calendar` - Calendar data

### Settings
- `GET /api/settings` - Get user settings
- `PUT /api/settings` - Update settings

## Development

### Running Tests (to be implemented)

```bash
pytest
```

### Running Celery Worker

```bash
celery -A app.tasks.scheduler worker --loglevel=info
```

### Database Migrations

Using Alembic (to be configured):

```bash
alembic init alembic
alembic revision --autogenerate -m "Initial migration"
alembic upgrade head
```

## Technologies

- **FastAPI**: Modern Python web framework
- **SQLAlchemy**: ORM for database operations
- **PostgreSQL**: Primary database
- **Redis**: Task queue and caching
- **Celery**: Background task processing
- **OpenAI API**: AI content generation
- **Ayrshare API**: Social media posting
