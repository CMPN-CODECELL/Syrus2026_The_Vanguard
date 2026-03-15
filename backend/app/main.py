"""
MedVision AI - FastAPI Application Entry Point
"""
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import logging

from app.config import settings
from app.routers import patients, analysis, reports, chat, auth, social, appointments, consultation, library
from app.routers import settings as settings_router

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title=settings.api_title,
    description=settings.api_description,
    version=settings.api_version,
    docs_url="/docs",
    redoc_url="/redoc",
)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.error(f"Validation error for request {request.url}: {exc.errors()}")
    logger.error(f"Body: {await request.body()}")
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors(), "body": str(exc.body)},
    )

# Configure CORS for frontend access
# Note: Cannot use "*" with allow_credentials=True
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "https://medvision-ai.vercel.app",
        "https://medvision-ai-git-main.vercel.app",
        "https://medvision-frontend.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    allow_origin_regex=r"https://.*\.vercel\.app",  # This works for Vercel subdomains
)

# Include routers
app.include_router(auth.router, prefix="/api", tags=["Authentication"])
app.include_router(patients.router, prefix="/api/patients", tags=["Patients"])
app.include_router(analysis.router, prefix="/api/analysis", tags=["AI Analysis"])
app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])
app.include_router(social.router, prefix="/api/social", tags=["Social Network"])
app.include_router(appointments.router, tags=["Appointments"])
app.include_router(consultation.router, tags=["Consultation"])
app.include_router(settings_router.router, tags=["Doctor Settings"])
app.include_router(library.router, prefix="/api/library", tags=["Medical Library"])


@app.get("/", tags=["Health"])
async def root():
    """Root endpoint - API information."""
    return {
        "name": "MedVision AI",
        "tagline": "Clinical Time Machine powered by Gemini 3",
        "version": settings.api_version,
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint for deployment verification."""
    return {
        "status": "healthy",
        "service": "MedVision AI API",
        "environment": settings.environment,
    }
