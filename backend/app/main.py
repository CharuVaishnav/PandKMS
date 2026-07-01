from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from app.api.v1 import auth, projects, crypto, secrets, otp, hosting, repos, keyvalues

app = FastAPI(title="PKMS API", version="1.0.0")

from app.config import settings as _settings

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        _settings.FRONTEND_URL,
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1")
app.include_router(projects.router, prefix="/api/v1")
app.include_router(crypto.router, prefix="/api/v1")
app.include_router(secrets.router, prefix="/api/v1")
app.include_router(otp.router, prefix="/api/v1")
app.include_router(hosting.router, prefix="/api/v1")
app.include_router(repos.router, prefix="/api/v1")
app.include_router(keyvalues.router, prefix="/api/v1")


@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/docs")


@app.get("/health")
def health():
    return {"status": "ok"}
