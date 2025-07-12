from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, File, UploadFile
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
import hashlib
import jwt
from passlib.context import CryptContext
import re
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# JWT Configuration
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-super-secret-key')
JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')
JWT_ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get('JWT_ACCESS_TOKEN_EXPIRE_MINUTES', 30))

# Create the main app
app = FastAPI(title="LINKDEV API", description="Professional Networking Platform", version="1.0.0")
api_router = APIRouter(prefix="/api")

# ============= MODELS =============

class UserRole(str, Enum):
    JOB_SEEKER = "job_seeker"
    RECRUITER = "recruiter" 
    ADMIN = "admin"

class ConnectionStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"

class JobStatus(str, Enum):
    ACTIVE = "active"
    CLOSED = "closed"
    DRAFT = "draft"

class ApplicationStatus(str, Enum):
    PENDING = "pending"
    REVIEWED = "reviewed"
    ACCEPTED = "accepted"
    REJECTED = "rejected"

# User Models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    role: UserRole = UserRole.JOB_SEEKER

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserProfile(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    first_name: str
    last_name: str
    role: UserRole
    headline: Optional[str] = None
    summary: Optional[str] = None
    location: Optional[str] = None
    industry: Optional[str] = None
    experience_years: Optional[int] = None
    skills: List[str] = []
    education: List[Dict[str, Any]] = []
    experience: List[Dict[str, Any]] = []
    profile_picture: Optional[str] = None
    connections_count: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    headline: Optional[str] = None
    summary: Optional[str] = None
    location: Optional[str] = None
    industry: Optional[str] = None
    experience_years: Optional[int] = None
    skills: Optional[List[str]] = None
    education: Optional[List[Dict[str, Any]]] = None
    experience: Optional[List[Dict[str, Any]]] = None

# Job Models
class JobCreate(BaseModel):
    title: str
    company: str
    description: str
    requirements: List[str]
    location: str
    job_type: str = "Full-time"
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    remote_allowed: bool = False
    experience_level: str = "Mid-level"

class Job(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    company: str
    description: str
    requirements: List[str]
    location: str
    job_type: str
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    remote_allowed: bool
    experience_level: str
    status: JobStatus = JobStatus.ACTIVE
    posted_by: str  # user_id
    posted_at: datetime = Field(default_factory=datetime.utcnow)
    applications_count: int = 0
    views_count: int = 0

class JobApplication(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    job_id: str
    applicant_id: str
    cover_letter: Optional[str] = None
    status: ApplicationStatus = ApplicationStatus.PENDING
    applied_at: datetime = Field(default_factory=datetime.utcnow)
    reviewed_at: Optional[datetime] = None

# Connection Models
class ConnectionRequest(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sender_id: str
    receiver_id: str
    message: Optional[str] = None
    status: ConnectionStatus = ConnectionStatus.PENDING
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# Post Models
class PostCreate(BaseModel):
    content: str
    image_url: Optional[str] = None

class Post(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    author_id: str
    content: str
    image_url: Optional[str] = None
    likes_count: int = 0
    comments_count: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Comment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    post_id: str
    author_id: str
    content: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Response Models
class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserProfile

class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

# ============= UTILITY FUNCTIONS =============

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
    
    user = await db.users.find_one({"id": user_id})
    if user is None:
        raise credentials_exception
    return UserProfile(**user)

# ============= AUTH ENDPOINTS =============

@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash password
    hashed_password = get_password_hash(user_data.password)
    
    # Create user profile
    user_profile = UserProfile(
        email=user_data.email,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        role=user_data.role
    )
    
    # Save to database
    user_dict = user_profile.dict()
    user_dict["password"] = hashed_password
    await db.users.insert_one(user_dict)
    
    # Create access token
    access_token_expires = timedelta(minutes=JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user_profile.id}, expires_delta=access_token_expires
    )
    
    return Token(access_token=access_token, token_type="bearer", user=user_profile)

@api_router.post("/auth/login", response_model=Token)
async def login(user_credentials: UserLogin):
    user = await db.users.find_one({"email": user_credentials.email})
    if not user or not verify_password(user_credentials.password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_profile = UserProfile(**{k: v for k, v in user.items() if k != "password"})
    
    access_token_expires = timedelta(minutes=JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user_profile.id}, expires_delta=access_token_expires
    )
    
    return Token(access_token=access_token, token_type="bearer", user=user_profile)

# ============= USER ENDPOINTS =============

@api_router.get("/users/me", response_model=UserProfile)
async def get_current_user_profile(current_user: UserProfile = Depends(get_current_user)):
    return current_user

@api_router.put("/users/me", response_model=UserProfile)
async def update_user_profile(
    user_update: UserUpdate,
    current_user: UserProfile = Depends(get_current_user)
):
    update_data = {k: v for k, v in user_update.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    await db.users.update_one(
        {"id": current_user.id},
        {"$set": update_data}
    )
    
    updated_user = await db.users.find_one({"id": current_user.id})
    return UserProfile(**{k: v for k, v in updated_user.items() if k != "password"})

@api_router.get("/users/{user_id}", response_model=UserProfile)
async def get_user_profile(user_id: str, current_user: UserProfile = Depends(get_current_user)):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserProfile(**{k: v for k, v in user.items() if k != "password"})

@api_router.get("/users", response_model=List[UserProfile])
async def search_users(
    query: Optional[str] = None,
    role: Optional[UserRole] = None,
    skip: int = 0,
    limit: int = 20,
    current_user: UserProfile = Depends(get_current_user)
):
    filter_dict = {}
    if query:
        filter_dict["$or"] = [
            {"first_name": {"$regex": query, "$options": "i"}},
            {"last_name": {"$regex": query, "$options": "i"}},
            {"headline": {"$regex": query, "$options": "i"}},
            {"skills": {"$in": [query]}}
        ]
    if role:
        filter_dict["role"] = role
    
    users = await db.users.find(filter_dict).skip(skip).limit(limit).to_list(limit)
    return [UserProfile(**{k: v for k, v in user.items() if k != "password"}) for user in users]

# ============= JOB ENDPOINTS =============

@api_router.post("/jobs", response_model=Job)
async def create_job(job_data: JobCreate, current_user: UserProfile = Depends(get_current_user)):
    if current_user.role not in [UserRole.RECRUITER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Only recruiters can post jobs")
    
    job = Job(**job_data.dict(), posted_by=current_user.id)
    await db.jobs.insert_one(job.dict())
    return job

@api_router.get("/jobs", response_model=List[Job])
async def get_jobs(
    query: Optional[str] = None,
    location: Optional[str] = None,
    job_type: Optional[str] = None,
    remote_allowed: Optional[bool] = None,
    skip: int = 0,
    limit: int = 20
):
    filter_dict = {"status": JobStatus.ACTIVE}
    if query:
        filter_dict["$or"] = [
            {"title": {"$regex": query, "$options": "i"}},
            {"company": {"$regex": query, "$options": "i"}},
            {"description": {"$regex": query, "$options": "i"}}
        ]
    if location:
        filter_dict["location"] = {"$regex": location, "$options": "i"}
    if job_type:
        filter_dict["job_type"] = job_type
    if remote_allowed is not None:
        filter_dict["remote_allowed"] = remote_allowed
    
    jobs = await db.jobs.find(filter_dict).skip(skip).limit(limit).to_list(limit)
    return [Job(**job) for job in jobs]

@api_router.get("/jobs/{job_id}", response_model=Job)
async def get_job(job_id: str):
    # Increment view count
    await db.jobs.update_one({"id": job_id}, {"$inc": {"views_count": 1}})
    
    job = await db.jobs.find_one({"id": job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return Job(**job)

@api_router.post("/jobs/{job_id}/apply")
async def apply_to_job(
    job_id: str,
    cover_letter: Optional[str] = None,
    current_user: UserProfile = Depends(get_current_user)
):
    # Check if job exists
    job = await db.jobs.find_one({"id": job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Check if already applied
    existing_application = await db.applications.find_one({
        "job_id": job_id,
        "applicant_id": current_user.id
    })
    if existing_application:
        raise HTTPException(status_code=400, detail="Already applied to this job")
    
    # Create application
    application = JobApplication(
        job_id=job_id,
        applicant_id=current_user.id,
        cover_letter=cover_letter
    )
    await db.applications.insert_one(application.dict())
    
    # Increment applications count
    await db.jobs.update_one({"id": job_id}, {"$inc": {"applications_count": 1}})
    
    return {"message": "Application submitted successfully"}

@api_router.get("/jobs/{job_id}/applications", response_model=List[JobApplication])
async def get_job_applications(job_id: str, current_user: UserProfile = Depends(get_current_user)):
    # Check if user owns this job
    job = await db.jobs.find_one({"id": job_id, "posted_by": current_user.id})
    if not job:
        raise HTTPException(status_code=403, detail="Not authorized to view applications")
    
    applications = await db.applications.find({"job_id": job_id}).to_list(1000)
    return [JobApplication(**app) for app in applications]

# ============= CONNECTION ENDPOINTS =============

@api_router.post("/connections/request")
async def send_connection_request(
    receiver_id: str,
    message: Optional[str] = None,
    current_user: UserProfile = Depends(get_current_user)
):
    if receiver_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot connect to yourself")
    
    # Check if connection already exists
    existing_connection = await db.connections.find_one({
        "$or": [
            {"sender_id": current_user.id, "receiver_id": receiver_id},
            {"sender_id": receiver_id, "receiver_id": current_user.id}
        ]
    })
    if existing_connection:
        raise HTTPException(status_code=400, detail="Connection already exists")
    
    connection_request = ConnectionRequest(
        sender_id=current_user.id,
        receiver_id=receiver_id,
        message=message
    )
    await db.connections.insert_one(connection_request.dict())
    
    return {"message": "Connection request sent"}

@api_router.get("/connections/requests", response_model=List[ConnectionRequest])
async def get_connection_requests(current_user: UserProfile = Depends(get_current_user)):
    requests = await db.connections.find({
        "receiver_id": current_user.id,
        "status": ConnectionStatus.PENDING
    }).to_list(1000)
    return [ConnectionRequest(**req) for req in requests]

@api_router.put("/connections/{connection_id}/respond")
async def respond_to_connection(
    connection_id: str,
    accept: bool,
    current_user: UserProfile = Depends(get_current_user)
):
    connection = await db.connections.find_one({
        "id": connection_id,
        "receiver_id": current_user.id,
        "status": ConnectionStatus.PENDING
    })
    if not connection:
        raise HTTPException(status_code=404, detail="Connection request not found")
    
    new_status = ConnectionStatus.ACCEPTED if accept else ConnectionStatus.DECLINED
    await db.connections.update_one(
        {"id": connection_id},
        {"$set": {"status": new_status, "updated_at": datetime.utcnow()}}
    )
    
    # If accepted, update connection counts
    if accept:
        await db.users.update_one(
            {"id": connection["sender_id"]},
            {"$inc": {"connections_count": 1}}
        )
        await db.users.update_one(
            {"id": current_user.id},
            {"$inc": {"connections_count": 1}}
        )
    
    return {"message": f"Connection request {'accepted' if accept else 'declined'}"}

@api_router.get("/connections", response_model=List[UserProfile])
async def get_connections(current_user: UserProfile = Depends(get_current_user)):
    connections = await db.connections.find({
        "$or": [
            {"sender_id": current_user.id, "status": ConnectionStatus.ACCEPTED},
            {"receiver_id": current_user.id, "status": ConnectionStatus.ACCEPTED}
        ]
    }).to_list(1000)
    
    connection_user_ids = []
    for conn in connections:
        if conn["sender_id"] == current_user.id:
            connection_user_ids.append(conn["receiver_id"])
        else:
            connection_user_ids.append(conn["sender_id"])
    
    users = await db.users.find({"id": {"$in": connection_user_ids}}).to_list(1000)
    return [UserProfile(**{k: v for k, v in user.items() if k != "password"}) for user in users]

# ============= POST ENDPOINTS =============

@api_router.post("/posts", response_model=Post)
async def create_post(post_data: PostCreate, current_user: UserProfile = Depends(get_current_user)):
    post = Post(**post_data.dict(), author_id=current_user.id)
    await db.posts.insert_one(post.dict())
    return post

@api_router.get("/posts", response_model=List[Post])
async def get_posts(skip: int = 0, limit: int = 20, current_user: UserProfile = Depends(get_current_user)):
    posts = await db.posts.find().sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return [Post(**post) for post in posts]

@api_router.post("/posts/{post_id}/like")
async def like_post(post_id: str, current_user: UserProfile = Depends(get_current_user)):
    # Check if already liked
    existing_like = await db.post_likes.find_one({
        "post_id": post_id,
        "user_id": current_user.id
    })
    
    if existing_like:
        # Unlike
        await db.post_likes.delete_one({"post_id": post_id, "user_id": current_user.id})
        await db.posts.update_one({"id": post_id}, {"$inc": {"likes_count": -1}})
        return {"message": "Post unliked"}
    else:
        # Like
        await db.post_likes.insert_one({
            "id": str(uuid.uuid4()),
            "post_id": post_id,
            "user_id": current_user.id,
            "created_at": datetime.utcnow()
        })
        await db.posts.update_one({"id": post_id}, {"$inc": {"likes_count": 1}})
        return {"message": "Post liked"}

# ============= DASHBOARD ENDPOINTS =============

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: UserProfile = Depends(get_current_user)):
    # Get user's stats
    connections_count = await db.connections.count_documents({
        "$or": [
            {"sender_id": current_user.id, "status": ConnectionStatus.ACCEPTED},
            {"receiver_id": current_user.id, "status": ConnectionStatus.ACCEPTED}
        ]
    })
    
    posts_count = await db.posts.count_documents({"author_id": current_user.id})
    
    if current_user.role == UserRole.RECRUITER:
        jobs_count = await db.jobs.count_documents({"posted_by": current_user.id})
        applications_count = await db.applications.count_documents({
            "job_id": {"$in": [job["id"] for job in await db.jobs.find({"posted_by": current_user.id}).to_list(1000)]}
        })
        return {
            "connections": connections_count,
            "posts": posts_count,
            "jobs_posted": jobs_count,
            "applications_received": applications_count
        }
    else:
        applications_count = await db.applications.count_documents({"applicant_id": current_user.id})
        return {
            "connections": connections_count,
            "posts": posts_count,
            "applications_sent": applications_count
        }

# ============= ADMIN ENDPOINTS =============

@api_router.get("/admin/stats")
async def get_admin_stats(current_user: UserProfile = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    total_users = await db.users.count_documents({})
    total_jobs = await db.jobs.count_documents({})
    total_applications = await db.applications.count_documents({})
    total_connections = await db.connections.count_documents({"status": ConnectionStatus.ACCEPTED})
    total_posts = await db.posts.count_documents({})
    
    return {
        "total_users": total_users,
        "total_jobs": total_jobs,
        "total_applications": total_applications,
        "total_connections": total_connections,
        "total_posts": total_posts
    }

# ============= LEGACY ENDPOINTS =============

@api_router.get("/")
async def root():
    return {"message": "LINKDEV API - Professional Networking Platform"}

@api_router.post("/status")
async def create_status_check(client_name: str):
    status_obj = StatusCheck(client_name=client_name)
    await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

# Include the router in the main app
app.include_router(api_router)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()