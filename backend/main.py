"""
Secure Cloud-Based Customer Analytics System
CS701 Group 3 — Backend API (FastAPI)
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import auth, customers, kpi, segments, audit
from app.database import engine, Base

# Create all tables on startup (development mode)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Secure Customer Analytics API",
    description="CS701 Group 3 — Secure Cloud-Based Customer Analytics System",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# CORS — restrict to known front-end origin in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router,      prefix="/api/auth",      tags=["Authentication"])
app.include_router(customers.router, prefix="/api/customers", tags=["Customers"])
app.include_router(kpi.router,       prefix="/api/kpi",       tags=["KPI Analytics"])
app.include_router(segments.router,  prefix="/api/segments",  tags=["Segmentation"])
app.include_router(audit.router,     prefix="/api/audit",     tags=["Audit Logs"])


@app.get("/api/health", tags=["Health"])
def health_check():
    return {"status": "ok", "service": "Customer Analytics API", "version": "1.0.0"}
