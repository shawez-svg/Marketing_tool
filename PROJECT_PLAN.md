# AI Marketing Content Creation Tool - Implementation Plan

## Project Overview
An AI-powered marketing automation tool that conducts conversational interviews with business owners, analyzes their brand and vision, creates a marketing strategy, generates platform-specific content, manages approval workflows, and auto-posts to social media.

## User Choices
- **Interview Style**: Interactive AI interviewer (AI asks follow-up questions)
- **STT Service**: OpenAI Whisper API
- **Frontend Stack**: Next.js + React + Tailwind CSS
- **Post Timing**: Both immediate posting and scheduling available

## Architecture Overview

### Tech Stack

#### Frontend:
- Next.js 14 (App Router)
- React 18
- Tailwind CSS
- Shadcn/ui (component library)
- React Hook Form (form management)
- Zustand (state management)
- Axios (API calls)

#### Backend:
- FastAPI (Python)
- PostgreSQL (database)
- Redis (queue management for scheduling)
- Celery (background tasks/cron jobs)
- SQLAlchemy (ORM)

#### AI Services:
- OpenAI Whisper API (speech-to-text)
- OpenAI Realtime API or Web Speech API + GPT-4 (conversational interview)
- OpenAI GPT-4o or Claude 3.5 Sonnet (strategy generation & content creation)

#### Social Media Integration:
- Ayrshare API (unified social posting - Twitter, LinkedIn, Instagram, Facebook)
- Alternative: Direct platform APIs

#### Infrastructure:
- Vercel (Next.js frontend hosting)
- Railway/Render (FastAPI backend)
- Supabase/Railway (PostgreSQL)
- Upstash (Redis)

## Application Flow

### Page 1: Brand Interview (Audio Recording)
**Purpose**: Capture business context through AI-led conversational interview

**Features**:
- Audio recording interface with real-time waveform visualization
- AI interviewer asks structured questions:
  - "Tell me about your business and what you offer"
  - "Who is your target audience?"
  - "What are your main business goals?"
  - "What makes your brand unique?"
  - "What's your current marketing approach?"
  - Follow-up questions based on responses
- Recording duration: ~30 minutes
- Save audio file + real-time transcription
- Progress indicator (questions answered / total)

**Technical Implementation**:
```
User clicks "Start Interview"
  → Web Audio API captures microphone
  → Audio chunks sent to backend every 10 seconds
  → Backend: Whisper API transcribes in real-time
  → GPT-4 analyzes transcript, generates next question
  → Text-to-Speech or audio playback of AI question
  → Continue until interview complete or 30min reached
```

### Page 2: Marketing Strategy
**Purpose**: Display AI-generated marketing strategy based on interview

**Features**:
- **Brand Profile Summary**:
  - Business description
  - Target audience personas
  - Unique value proposition
  - Brand voice/tone
- **Recommended Marketing Channels** (with reasoning):
  - LinkedIn (B2B focus, thought leadership)
  - Instagram (visual products, younger audience)
  - Facebook (community building, ads)
  - Twitter/X (real-time engagement, industry news)
  - TikTok (viral content, Gen Z)
- **Content Strategy**:
  - Content pillars (3-5 themes)
  - Posting frequency per platform
  - Content mix (educational, promotional, engaging)
- Edit/Regenerate strategy option

**Technical Implementation**:
```
After interview completes:
  → Full transcript sent to GPT-4/Claude with strategy prompt
  → LLM analyzes business context, creates strategy
  → Store strategy in database
  → Display in structured format
```

**AI Prompt Structure**:
```
Based on this interview transcript, create a comprehensive marketing strategy:

1. Summarize the business, target audience, and goals
2. Recommend 3-5 social media platforms with reasoning
3. Define 3-5 content pillars aligned with business goals
4. Suggest posting frequency per platform
5. Define brand voice and tone guidelines
```

### Page 3: Channel-Wise Content Generation
**Purpose**: Display generated content organized by social media platform

**Features**:
- Sidebar/tabs for each recommended channel
- Content cards with:
  - Platform icon and name
  - Generated post content
  - Tags/hashtags
  - Suggested posting time
  - Preview of how it looks on that platform
- Filter by:
  - Platform
  - Content pillar/tag
  - Status (draft, approved, posted)
- Bulk actions (approve all, regenerate batch)

**Content Display**:
```
LinkedIn Tab:
  [Post 1] 📊 Thought Leadership
    "After 10 years in the industry..."
    Tags: #ThoughtLeadership #B2B #Leadership
    Suggested: Mon, 9:00 AM
    [Edit] [Regenerate] [Approve]

  [Post 2] 💡 Educational
    "5 ways to improve..."
    Tags: #Education #Tips #HowTo
    Suggested: Wed, 11:00 AM
    [Edit] [Regenerate] [Approve]

Instagram Tab:
  [Post 1] 🎨 Behind-the-Scenes
    "Here's how we create..."
    Image: [AI-generated or stock placeholder]
    Tags: #BTS #SmallBusiness #Hustle
    Suggested: Tue, 7:00 PM
    [Edit] [Add Image] [Approve]
```

**Technical Implementation**:
```
After strategy is created:
  → Generate 20-50 posts (batch generation)
  → LLM creates platform-specific content:
    - LinkedIn: 150-300 words, professional
    - Instagram: Caption + hashtags, visual-focused
    - Twitter: 280 chars, punchy
    - Facebook: Community-focused, conversational
    - TikTok: Video script, trending formats
  → Assign tags based on content pillars
  → Suggest optimal posting times using AI or preset schedule
  → Store all in database with status: 'draft'
```

### Page 4: Approval & Posting Dashboard
**Purpose**: Review, approve, edit, and manage content publishing

**Features**:
- Content queue with filters:
  - Status: Draft, Approved, Scheduled, Posted, Rejected
  - Platform
  - Date range
- For each content item:
  - Full preview
  - Edit modal (WYSIWYG editor)
  - Approve/Reject buttons
  - Posting options:
    - "Post Now" (immediate)
    - "Schedule" (choose date/time)
    - Platform selection (if multi-posting)
- **Settings panel**:
  - **Auto-Approval Toggle**:
    - If ON: Content auto-approves after generation (skip manual review)
    - If OFF: Requires manual approval (default)
  - Auto-approval rules:
    - Only for specific platforms
    - Only for specific content types
    - Sentiment threshold (approve if positive)
- Bulk operations:
  - Approve selected
  - Schedule batch
  - Delete/archive

**Technical Implementation**:
```
User approves content:
  → Update status: 'draft' → 'approved'
  → If "Post Now":
    - Call Ayrshare API immediately
    - Update status: 'approved' → 'posted'
  → If "Schedule":
    - Store scheduled_time in database
    - Celery task checks every 1 minute for due posts
    - When time matches, post via Ayrshare API
    - Update status: 'approved' → 'posted'

Auto-Approval:
  → If enabled in settings
  → After content generation, auto-set status to 'approved'
  → Auto-schedule based on suggested times
```

**Database Schema**:
```sql
posts table:
- id (uuid)
- user_id (fk)
- platform (enum: linkedin, instagram, twitter, facebook, tiktok)
- content_text (text)
- content_media_url (text, nullable)
- tags (json array)
- status (enum: draft, approved, rejected, scheduled, posted, failed)
- scheduled_time (timestamp, nullable)
- posted_at (timestamp, nullable)
- content_pillar (text)
- suggested_time (timestamp)
- created_at (timestamp)
- updated_at (timestamp)
```

### Page 5: Analytics & Reporting Dashboard
**Purpose**: Track posted content and overall campaign performance

**Features**:
- **Overview Stats**:
  - Total posts generated
  - Total posts approved
  - Total posts posted
  - Total posts pending
  - Approval rate (%)
  - Posts by platform (pie chart)
- **Content Calendar**:
  - Month/week view
  - Posted content (green)
  - Scheduled content (yellow)
  - Pending approval (gray)
- **Posted Content List**:
  - Platform
  - Post preview
  - Posted date/time
  - Link to live post
  - Performance metrics (if available):
    - Likes, comments, shares, impressions
- **Pending Content Queue**:
  - Count of drafts
  - Count of scheduled posts
  - Upcoming posts (next 7 days)
- **Platform Breakdown**:
  - Posts per platform
  - Most active platform
  - Engagement by platform (if metrics available)

**Technical Implementation**:
```
Dashboard queries database:
  → Count posts by status
  → Group posts by platform
  → Aggregate metrics
  → Display in charts (Recharts library)

Calendar view:
  → Fetch all posts with posted_at or scheduled_time
  → Render on calendar component
  → Color-code by status

Performance metrics (optional, future enhancement):
  → Integrate with platform APIs (Facebook Graph, LinkedIn API)
  → Fetch engagement metrics
  → Store in analytics table
  → Display trends over time
```

## Database Schema

### Tables

#### users
```sql
- id (uuid, pk)
- email (text, unique)
- name (text)
- created_at (timestamp)
- updated_at (timestamp)
```

#### interviews
```sql
- id (uuid, pk)
- user_id (uuid, fk)
- audio_file_url (text)
- transcript (text)
- duration_seconds (int)
- status (enum: in_progress, completed, failed)
- created_at (timestamp)
- completed_at (timestamp)
```

#### strategies
```sql
- id (uuid, pk)
- user_id (uuid, fk)
- interview_id (uuid, fk)
- brand_summary (text)
- target_audience (json)
- recommended_channels (json array)
- content_pillars (json array)
- brand_voice (text)
- posting_frequency (json)
- created_at (timestamp)
```

#### posts
```sql
- id (uuid, pk)
- user_id (uuid, fk)
- strategy_id (uuid, fk)
- platform (enum)
- content_text (text)
- content_media_url (text, nullable)
- tags (json array)
- status (enum)
- scheduled_time (timestamp, nullable)
- posted_at (timestamp, nullable)
- content_pillar (text)
- suggested_time (timestamp)
- created_at (timestamp)
- updated_at (timestamp)
```

#### social_accounts
```sql
- id (uuid, pk)
- user_id (uuid, fk)
- platform (enum)
- platform_user_id (text)
- access_token (text, encrypted)
- refresh_token (text, encrypted)
- connected_at (timestamp)
```

#### settings
```sql
- id (uuid, pk)
- user_id (uuid, fk)
- auto_approval_enabled (boolean, default: false)
- auto_approval_platforms (json array)
- default_posting_time (time)
- timezone (text)
- created_at (timestamp)
- updated_at (timestamp)
```

## API Endpoints

### Backend (FastAPI)

#### Interview Endpoints:
```
POST   /api/interview/start          - Start new interview session
POST   /api/interview/audio-chunk    - Upload audio chunk (streaming)
GET    /api/interview/{id}           - Get interview details
POST   /api/interview/{id}/complete  - Mark interview complete, trigger processing
```

#### Strategy Endpoints:
```
GET    /api/strategy/{user_id}       - Get user's marketing strategy
POST   /api/strategy/regenerate      - Regenerate strategy from interview
PUT    /api/strategy/{id}            - Update strategy manually
```

#### Content Endpoints:
```
GET    /api/content                  - List all content (with filters)
POST   /api/content/generate         - Generate content batch from strategy
GET    /api/content/{id}             - Get single content item
PUT    /api/content/{id}             - Update content (edit)
POST   /api/content/{id}/approve     - Approve content
POST   /api/content/{id}/reject      - Reject content
POST   /api/content/{id}/post        - Post content now
POST   /api/content/{id}/schedule    - Schedule content for later
DELETE /api/content/{id}             - Delete content
```

#### Analytics Endpoints:
```
GET    /api/analytics/overview       - Get overview stats
GET    /api/analytics/calendar       - Get calendar data
GET    /api/analytics/performance    - Get performance metrics (future)
```

#### Settings Endpoints:
```
GET    /api/settings                 - Get user settings
PUT    /api/settings                 - Update settings
POST   /api/social-accounts/connect  - OAuth flow for social accounts
GET    /api/social-accounts          - List connected accounts
DELETE /api/social-accounts/{id}     - Disconnect account
```

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
**Goal**: Set up project structure, database, basic UI

**Tasks**:
- Initialize Next.js project with TypeScript
- Set up Tailwind CSS + Shadcn/ui components
- Create FastAPI backend with project structure
- Set up PostgreSQL database with SQLAlchemy models
- Implement basic authentication (email/password or OAuth)
- Create dashboard layout with sidebar navigation
- Implement routing for 5 pages

**Deliverables**:
- Project scaffolding complete
- Database schema implemented
- Empty dashboard pages with navigation

### Phase 2: AI Interview System (Week 3-4)
**Goal**: Build conversational interview feature

**Tasks**:
- Implement audio recording in browser (Web Audio API)
- Create backend endpoint for audio chunk streaming
- Integrate OpenAI Whisper API for real-time transcription
- Build AI interviewer logic:
  - Define question flow
  - Implement GPT-4 for dynamic follow-up questions
  - Text-to-speech for AI questions (optional)
- Create Page 1 UI:
  - Audio recording interface
  - Waveform visualization
  - Question display
  - Progress indicator
- Store interview data (audio file, transcript) in database

**Deliverables**:
- Working audio interview system
- 30-minute conversational interview flow
- Transcript saved to database

### Phase 3: Strategy Generation (Week 4-5)
**Goal**: Generate marketing strategy from interview

**Tasks**:
- Create strategy generation prompt for GPT-4/Claude
- Implement strategy analysis:
  - Brand summary extraction
  - Channel recommendation logic
  - Content pillar identification
- Build Page 2 UI:
  - Display brand profile
  - Show recommended channels with reasoning
  - Content strategy breakdown
  - Edit/regenerate functionality
- Store strategy in database

**Deliverables**:
- AI-generated marketing strategy
- Strategy display page
- Edit capabilities

### Phase 4: Content Generation (Week 5-6)
**Goal**: Generate platform-specific content from strategy

**Tasks**:
- Create content generation prompts for each platform:
  - LinkedIn (professional, thought leadership)
  - Instagram (visual, engaging captions)
  - Twitter/X (concise, punchy)
  - Facebook (community-focused)
  - TikTok (video scripts, trends)
- Implement batch content generation (20-50 posts)
- Tag content by pillar/theme
- Suggest optimal posting times
- Build Page 3 UI:
  - Platform tabs/filters
  - Content cards with preview
  - Tag display
  - Edit/regenerate per post
- Store generated content in database

**Deliverables**:
- 20-50 platform-specific posts generated
- Channel-wise content display
- Tagging system

### Phase 5: Approval & Posting System (Week 7-8)
**Goal**: Implement approval workflow and social media posting

**Tasks**:
- Integrate Ayrshare API for social posting
- Implement OAuth flow for connecting social accounts
- Build approval dashboard (Page 4):
  - Content queue with filters
  - Approve/reject actions
  - Edit modal
  - "Post Now" functionality
  - "Schedule" functionality
- Implement auto-approval settings:
  - Toggle in settings page
  - Conditional rules
- Set up Celery + Redis for scheduled posting:
  - Cron job checks every 1 minute
  - Posts scheduled content at correct time
  - Status tracking and error handling

**Deliverables**:
- Working approval workflow
- Immediate posting capability
- Scheduled posting with cron jobs
- Auto-approval feature

### Phase 6: Analytics Dashboard (Week 8-9)
**Goal**: Build reporting and analytics page

**Tasks**:
- Build Page 5 UI:
  - Overview stats cards
  - Content calendar view
  - Posted content list
  - Pending queue display
  - Platform breakdown charts
- Implement analytics queries:
  - Aggregate post counts by status
  - Group by platform
  - Time-series data for calendar
- Add data visualization (Recharts):
  - Pie chart (posts by platform)
  - Bar chart (posting activity over time)
- Optional: Integrate platform APIs for engagement metrics

**Deliverables**:
- Analytics dashboard with key metrics
- Calendar view of content
- Posted content tracking

### Phase 7: Polish & Testing (Week 9-10)
**Goal**: Refine UI/UX, fix bugs, prepare for launch

**Tasks**:
- UI/UX improvements:
  - Loading states
  - Error messages
  - Toast notifications
  - Responsive design (mobile)
- End-to-end testing:
  - Complete interview flow
  - Strategy generation
  - Content generation
  - Approval and posting
- Error handling and edge cases:
  - API failures
  - Audio recording issues
  - Posting errors
- Performance optimization:
  - Lazy loading
  - Caching
  - Database query optimization
- Security audit:
  - Encrypt tokens
  - Rate limiting
  - Input validation
- Documentation:
  - User guide
  - API documentation
  - Deployment guide

**Deliverables**:
- Production-ready application
- Comprehensive testing
- Documentation

## Critical Files & Structure

### Frontend (Next.js)
```
marketing-tool/
├── frontend/
│   ├── app/
│   │   ├── layout.tsx                 # Root layout with sidebar
│   │   ├── page.tsx                   # Redirect to /interview
│   │   ├── interview/
│   │   │   └── page.tsx              # Page 1: Audio interview
│   │   ├── strategy/
│   │   │   └── page.tsx              # Page 2: Marketing strategy
│   │   ├── content/
│   │   │   └── page.tsx              # Page 3: Channel-wise content
│   │   ├── approval/
│   │   │   └── page.tsx              # Page 4: Approval dashboard
│   │   └── analytics/
│   │       └── page.tsx              # Page 5: Reports & analytics
│   ├── components/
│   │   ├── ui/                       # Shadcn components
│   │   ├── AudioRecorder.tsx         # Audio recording component
│   │   ├── ContentCard.tsx           # Social post preview card
│   │   ├── StrategyDisplay.tsx       # Strategy visualization
│   │   ├── ApprovalQueue.tsx         # Approval workflow UI
│   │   ├── Calendar.tsx              # Content calendar
│   │   └── Sidebar.tsx               # Dashboard navigation
│   ├── lib/
│   │   ├── api.ts                    # API client (Axios)
│   │   ├── store.ts                  # Zustand store
│   │   └── utils.ts                  # Utilities
│   └── public/
│       └── assets/                   # Images, icons
```

### Backend (FastAPI)
```
├── backend/
│   ├── app/
│   │   ├── main.py                   # FastAPI app entry point
│   │   ├── models/
│   │   │   ├── user.py              # User model
│   │   │   ├── interview.py         # Interview model
│   │   │   ├── strategy.py          # Strategy model
│   │   │   ├── post.py              # Post model
│   │   │   └── social_account.py    # Social accounts model
│   │   ├── routes/
│   │   │   ├── interview.py         # Interview endpoints
│   │   │   ├── strategy.py          # Strategy endpoints
│   │   │   ├── content.py           # Content endpoints
│   │   │   ├── analytics.py         # Analytics endpoints
│   │   │   └── settings.py          # Settings endpoints
│   │   ├── services/
│   │   │   ├── whisper_service.py   # Whisper API integration
│   │   │   ├── llm_service.py       # GPT-4/Claude integration
│   │   │   ├── strategy_service.py  # Strategy generation logic
│   │   │   ├── content_service.py   # Content generation logic
│   │   │   └── posting_service.py   # Ayrshare integration
│   │   ├── tasks/
│   │   │   └── scheduler.py         # Celery tasks for posting
│   │   ├── database.py              # Database connection
│   │   └── config.py                # Configuration
│   └── requirements.txt
```

## Environment Variables

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_ENVIRONMENT=development
```

### Backend (.env)
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/marketing_tool

# Redis
REDIS_URL=redis://localhost:6379

# OpenAI
OPENAI_API_KEY=sk-...

# Ayrshare (Social Posting)
AYRSHARE_API_KEY=...

# JWT Secret
JWT_SECRET=your-secret-key

# Environment
ENVIRONMENT=development
```

## Testing & Verification

### End-to-End Test Flow

#### Test 1: Complete Workflow
1. Navigate to /interview
2. Click "Start Interview"
3. Speak about a fictional business for 5 minutes
4. Verify audio is recorded and transcribed in real-time
5. Complete interview
6. Navigate to /strategy
7. Verify marketing strategy is generated and displayed
8. Navigate to /content
9. Verify 20+ posts are generated across platforms
10. Verify posts have tags and suggested times
11. Navigate to /approval
12. Approve 3 posts
13. Click "Post Now" on one post
14. Verify post appears on connected social account
15. Schedule 2 posts for future dates
16. Navigate to /analytics
17. Verify stats show 1 posted, 2 scheduled

#### Test 2: Auto-Approval
1. Go to Settings
2. Enable auto-approval
3. Start new interview
4. Complete interview
5. Verify strategy is generated
6. Verify content is auto-approved (status = 'approved')
7. Verify content is auto-scheduled

#### Test 3: Error Handling
1. Disconnect internet during audio recording
2. Verify graceful error message
3. Test with invalid audio input
4. Test API failures (mock Ayrshare error)
5. Verify user sees clear error messages

## Cost Estimates

### Development Costs
- Phase 1-7: 10 weeks with 1-2 developers
- Estimated effort: 400-600 hours

### Monthly Operating Costs (Per User)
- OpenAI Whisper: ~$3 (30 min interview at $0.006/min)
- OpenAI GPT-4: ~$5-10 (strategy + content generation)
- Ayrshare: $16-47/month (social posting, per user)
- Database + Redis: $10-20/month (shared across users)
- Hosting: $20-50/month (Vercel + Railway)
- **Total per user**: ~$54-130/month

### Pricing Suggestions
- **Free Tier**: 1 interview/month, 10 posts, manual posting only
- **Pro Tier**: $99/month - Unlimited interviews, unlimited posts, auto-posting
- **Agency Tier**: $299/month - Multi-brand, team collaboration, white-label

## Key Risks & Mitigations

### Risk 1: OpenAI Whisper Latency
**Mitigation**: Buffer audio chunks, transcribe in parallel, show progress indicator

### Risk 2: Interview Quality
**Mitigation**: Design comprehensive question flow, test with real users, iterate

### Risk 3: Content Quality
**Mitigation**: Fine-tune prompts, allow regeneration, add human editing

### Risk 4: Social Platform API Changes
**Mitigation**: Use Ayrshare (abstracts platform APIs), monitor for changes

### Risk 5: Auto-Posting Failures
**Mitigation**: Retry logic, error notifications, fallback to manual posting

## Success Metrics

### MVP Success Criteria:
- ✓ Users can complete 30-min interview
- ✓ Strategy generated accurately reflects interview
- ✓ 20+ platform-specific posts generated
- ✓ Posts can be approved and posted to social media
- ✓ Scheduling works reliably
- ✓ Analytics show accurate post counts

### User Success Metrics:
- Time saved: 10-20 hours/week (manual content creation eliminated)
- Content volume: 20-50 posts generated from 1 interview
- Approval rate: >80% (high-quality content)
- Posting consistency: 5-10 posts/week across platforms

## Next Steps After Plan Approval

1. Set up project repositories (frontend + backend)
2. Initialize Next.js and FastAPI projects
3. Set up database schema
4. Begin Phase 1 implementation
5. Weekly check-ins to review progress
6. Iterative development with user feedback

**Timeline**: 10 weeks to production-ready MVP
**Estimated Budget**: $10k-30k (development) + $100-500/month (operations)
**Launch Target**: Weeks 9-10 with MVP feature set
