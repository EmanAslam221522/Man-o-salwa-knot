from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import uvicorn
import logging
from config import settings

load_dotenv()

from routes import chat, matchmaking, quality, email, workspace, research

app = FastAPI(title="ManOSalwaKnot Backend", version="1.0.0")

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def log_requests(request, call_next):
    logger.info(f"Request: {request.method} {request.url}")
    response = await call_next(request)
    logger.info(f"Response status: {response.status_code}")
    return response

# Routes
app.include_router(chat.router, prefix="/api", tags=["chat"])
app.include_router(matchmaking.router, prefix="/api", tags=["matchmaking"])
app.include_router(quality.router, prefix="/api", tags=["quality"])
app.include_router(email.router, prefix="/api", tags=["email"])
app.include_router(workspace.router, prefix="/api", tags=["workspace"])
app.include_router(research.router, prefix="/api", tags=["research"])

@app.get("/")
@app.head("/")
async def root():
    return {"status": "healthy", "service": "ManOSalwaKnot Backend", "version": "1.0.0"}

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "version": "1.0.0"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=settings.PORT, reload=True)
