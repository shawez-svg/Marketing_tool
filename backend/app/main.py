from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base

# Import models to create tables
from app.models import (
    User,
    Interview,
    Strategy,
    Post,
    SocialAccount,
    UserSettings,
)

# Create FastAPI app
app = FastAPI(
    title="Marketing Content Creation Tool API",
    description="AI-powered marketing automation tool with conversational interview system",
    version="1.0.0",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Create database tables
@app.on_event("startup")
async def startup_event():
    """Create database tables on startup and create default user"""
    from uuid import UUID
    from app.database import SessionLocal
    from sqlalchemy import text

    try:
        Base.metadata.create_all(bind=engine)
        print("Database tables created successfully")
    except Exception as e:
        print(f"Warning: Could not create database tables: {e}")
        return  # Don't fail startup, allow health checks to work

    # Create default user for development
    try:
        db = SessionLocal()
        try:
            # Add missing columns if they don't exist
            # Check and add platform_post_id to posts table
            try:
                db.execute(text("ALTER TABLE posts ADD COLUMN IF NOT EXISTS platform_post_id VARCHAR"))
                db.commit()
                print("Ensured platform_post_id column exists in posts table")
            except Exception as e:
                db.rollback()
                print(f"Note: Could not add platform_post_id column: {e}")

            # Check and add content_calendar to strategies table
            try:
                db.execute(text("ALTER TABLE strategies ADD COLUMN IF NOT EXISTS content_calendar JSON"))
                db.commit()
                print("Ensured content_calendar column exists in strategies table")
            except Exception as e:
                db.rollback()
                print(f"Note: Could not add content_calendar column: {e}")

            default_user_id = UUID("00000000-0000-0000-0000-000000000001")
            existing_user = db.query(User).filter(User.id == default_user_id).first()

            if not existing_user:
                default_user = User(
                    id=default_user_id,
                    email="dev@example.com",
                    name="Development User",
                    hashed_password="not_a_real_password",
                )
                db.add(default_user)
                db.commit()
                print("Created default development user")
        finally:
            db.close()
    except Exception as e:
        print(f"Warning: Database initialization error: {e}")


# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "Marketing Content Creation Tool API",
        "version": "1.0.0",
        "status": "running",
    }


# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy"}


# Import and include routers
from app.routes import interview, strategy, content, profile

app.include_router(interview.router, prefix="/api/interview", tags=["interview"])
app.include_router(strategy.router, prefix="/api/strategy", tags=["strategy"])
app.include_router(content.router, prefix="/api/content", tags=["content"])
app.include_router(profile.router, prefix="/api/profile", tags=["profile"])
