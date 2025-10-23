from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
import jwt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
SECRET_KEY = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30 * 24 * 60  # 30 days

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Models
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    username: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    username: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserProgress(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    xp: int = 0
    level: int = 1
    coins: int = 0
    study_time: int = 0  # in minutes
    current_streak: int = 0
    last_activity: Optional[datetime] = None
    badges: List[str] = []
    total_quizzes: int = 0
    average_score: float = 0.0

class Question(BaseModel):
    question: str
    options: List[str]
    correct_answer: int  # index of correct option

class Quiz(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    quiz_type: str
    time_limit: int  # in seconds
    questions: List[Question]
    xp_reward: int
    difficulty: str

class QuizAttempt(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    quiz_id: str
    score: int
    total_questions: int
    time_taken: int  # in seconds
    answers: List[int]
    xp_earned: int
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class QuizSubmission(BaseModel):
    quiz_id: str
    answers: List[int]
    time_taken: int

class LeaderboardEntry(BaseModel):
    username: str
    email: str
    xp: int
    level: int
    rank: int

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: User

# Utility functions
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        return user_id
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

# Auth Routes
@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserRegister):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Check if username exists
    existing_username = await db.users.find_one({"username": user_data.username})
    if existing_username:
        raise HTTPException(status_code=400, detail="Username already taken")
    
    # Create user
    user = User(
        email=user_data.email,
        username=user_data.username
    )
    
    user_doc = user.model_dump()
    user_doc['password'] = hash_password(user_data.password)
    user_doc['created_at'] = user_doc['created_at'].isoformat()
    
    await db.users.insert_one(user_doc)
    
    # Create user progress
    progress = UserProgress(user_id=user.id)
    progress_doc = progress.model_dump()
    await db.user_progress.insert_one(progress_doc)
    
    # Create token
    access_token = create_access_token(data={"sub": user.id})
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=user
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user_doc = await db.users.find_one({"email": credentials.email})
    if not user_doc or not verify_password(credentials.password, user_doc.get('password', '')):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    user = User(
        id=user_doc['id'],
        email=user_doc['email'],
        username=user_doc['username'],
        created_at=datetime.fromisoformat(user_doc['created_at'])
    )
    
    access_token = create_access_token(data={"sub": user.id})
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=user
    )

@api_router.get("/auth/me", response_model=User)
async def get_me(user_id: str = Depends(get_current_user)):
    user_doc = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    if isinstance(user_doc.get('created_at'), str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    
    return User(**user_doc)

# User Stats Routes
@api_router.get("/user/stats", response_model=UserProgress)
async def get_user_stats(user_id: str = Depends(get_current_user)):
    progress_doc = await db.user_progress.find_one({"user_id": user_id}, {"_id": 0})
    if not progress_doc:
        # Create default progress if doesn't exist
        progress = UserProgress(user_id=user_id)
        await db.user_progress.insert_one(progress.model_dump())
        return progress
    
    if progress_doc.get('last_activity') and isinstance(progress_doc['last_activity'], str):
        progress_doc['last_activity'] = datetime.fromisoformat(progress_doc['last_activity'])
    
    return UserProgress(**progress_doc)

# Quiz Routes
@api_router.get("/quizzes", response_model=List[Dict[str, Any]])
async def get_quizzes():
    quizzes = await db.quizzes.find({}, {"_id": 0, "questions": 0}).to_list(100)
    return quizzes

@api_router.get("/quizzes/{quiz_id}")
async def get_quiz(quiz_id: str, user_id: str = Depends(get_current_user)):
    quiz_doc = await db.quizzes.find_one({"id": quiz_id}, {"_id": 0})
    if not quiz_doc:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    # Remove correct answers for security
    questions = quiz_doc.get('questions', [])
    safe_questions = []
    for q in questions:
        safe_questions.append({
            "question": q['question'],
            "options": q['options']
        })
    
    quiz_doc['questions'] = safe_questions
    return quiz_doc

@api_router.post("/quiz/submit")
async def submit_quiz(submission: QuizSubmission, user_id: str = Depends(get_current_user)):
    # Get quiz
    quiz_doc = await db.quizzes.find_one({"id": submission.quiz_id}, {"_id": 0})
    if not quiz_doc:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    # Calculate score
    questions = quiz_doc['questions']
    correct_count = 0
    for i, answer in enumerate(submission.answers):
        if i < len(questions) and answer == questions[i]['correct_answer']:
            correct_count += 1
    
    score_percentage = int((correct_count / len(questions)) * 100)
    xp_earned = quiz_doc['xp_reward']
    
    # Bonus XP for perfect score
    if score_percentage == 100:
        xp_earned = int(xp_earned * 1.5)
    
    # Save attempt
    attempt = QuizAttempt(
        user_id=user_id,
        quiz_id=submission.quiz_id,
        score=score_percentage,
        total_questions=len(questions),
        time_taken=submission.time_taken,
        answers=submission.answers,
        xp_earned=xp_earned
    )
    
    attempt_doc = attempt.model_dump()
    attempt_doc['timestamp'] = attempt_doc['timestamp'].isoformat()
    await db.quiz_attempts.insert_one(attempt_doc)
    
    # Update user progress
    progress_doc = await db.user_progress.find_one({"user_id": user_id})
    if progress_doc:
        new_xp = progress_doc.get('xp', 0) + xp_earned
        new_level = (new_xp // 1000) + 1
        total_quizzes = progress_doc.get('total_quizzes', 0) + 1
        
        # Calculate new average score
        old_avg = progress_doc.get('average_score', 0.0)
        old_total = progress_doc.get('total_quizzes', 0)
        new_avg = ((old_avg * old_total) + score_percentage) / total_quizzes
        
        # Award badges
        badges = progress_doc.get('badges', [])
        if score_percentage == 100 and "Perfectionist" not in badges:
            badges.append("Perfectionist")
        if total_quizzes >= 10 and "Quiz Master" not in badges:
            badges.append("Quiz Master")
        if submission.time_taken < quiz_doc['time_limit'] * 0.5 and "Speed Demon" not in badges:
            badges.append("Speed Demon")
        
        await db.user_progress.update_one(
            {"user_id": user_id},
            {
                "$set": {
                    "xp": new_xp,
                    "level": new_level,
                    "total_quizzes": total_quizzes,
                    "average_score": round(new_avg, 1),
                    "badges": badges,
                    "last_activity": datetime.now(timezone.utc).isoformat()
                }
            }
        )
    
    return {
        "score": score_percentage,
        "correct_answers": correct_count,
        "total_questions": len(questions),
        "xp_earned": xp_earned,
        "badges_earned": [b for b in badges if b not in progress_doc.get('badges', [])]
    }

# Leaderboard Route
@api_router.get("/leaderboard", response_model=List[LeaderboardEntry])
async def get_leaderboard(user_id: str = Depends(get_current_user)):
    pipeline = [
        {
            "$lookup": {
                "from": "users",
                "localField": "user_id",
                "foreignField": "id",
                "as": "user"
            }
        },
        {"$unwind": "$user"},
        {
            "$project": {
                "username": "$user.username",
                "email": "$user.email",
                "xp": 1,
                "level": 1
            }
        },
        {"$sort": {"xp": -1}},
        {"$limit": 100}
    ]
    
    results = await db.user_progress.aggregate(pipeline).to_list(100)
    
    leaderboard = []
    for idx, entry in enumerate(results, 1):
        leaderboard.append(LeaderboardEntry(
            username=entry['username'],
            email=entry['email'],
            xp=entry['xp'],
            level=entry['level'],
            rank=idx
        ))
    
    return leaderboard

@api_router.get("/user/history")
async def get_user_history(user_id: str = Depends(get_current_user)):
    attempts = await db.quiz_attempts.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("timestamp", -1).limit(20).to_list(20)
    
    # Get quiz titles
    for attempt in attempts:
        quiz = await db.quizzes.find_one({"id": attempt['quiz_id']}, {"title": 1, "_id": 0})
        if quiz:
            attempt['quiz_title'] = quiz['title']
        if isinstance(attempt.get('timestamp'), str):
            attempt['timestamp'] = datetime.fromisoformat(attempt['timestamp'])
    
    return attempts

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
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

# Seed initial quizzes on startup
@app.on_event("startup")
async def seed_quizzes():
    existing_quizzes = await db.quizzes.count_documents({})
    if existing_quizzes == 0:
        sample_quizzes = [
            {
                "id": str(uuid.uuid4()),
                "title": "Python Fundamentals",
                "description": "Test your basic Python knowledge",
                "quiz_type": "Multiple Choice",
                "time_limit": 300,
                "xp_reward": 100,
                "difficulty": "Easy",
                "questions": [
                    {
                        "question": "What is the output of print(2 ** 3)?",
                        "options": ["6", "8", "9", "5"],
                        "correct_answer": 1
                    },
                    {
                        "question": "Which keyword is used to define a function in Python?",
                        "options": ["function", "def", "func", "define"],
                        "correct_answer": 1
                    },
                    {
                        "question": "What is the correct file extension for Python files?",
                        "options": [".pyt", ".pt", ".py", ".python"],
                        "correct_answer": 2
                    },
                    {
                        "question": "Which of these is NOT a Python data type?",
                        "options": ["list", "dictionary", "array", "tuple"],
                        "correct_answer": 2
                    },
                    {
                        "question": "What does the len() function do?",
                        "options": ["Returns the length of an object", "Returns the type", "Returns the value", "Returns nothing"],
                        "correct_answer": 0
                    }
                ]
            },
            {
                "id": str(uuid.uuid4()),
                "title": "JavaScript Basics",
                "description": "Essential JavaScript concepts",
                "quiz_type": "Multiple Choice",
                "time_limit": 360,
                "xp_reward": 120,
                "difficulty": "Easy",
                "questions": [
                    {
                        "question": "What does DOM stand for?",
                        "options": ["Document Object Model", "Data Object Model", "Document Oriented Model", "Digital Object Model"],
                        "correct_answer": 0
                    },
                    {
                        "question": "Which method is used to add an element at the end of an array?",
                        "options": ["append()", "push()", "add()", "insert()"],
                        "correct_answer": 1
                    },
                    {
                        "question": "What is the correct syntax for a JavaScript comment?",
                        "options": ["# comment", "<!-- comment -->", "// comment", "/* comment */"],
                        "correct_answer": 2
                    },
                    {
                        "question": "Which operator is used for strict equality in JavaScript?",
                        "options": ["==", "===", "=", "!="],
                        "correct_answer": 1
                    },
                    {
                        "question": "What will 'typeof []' return?",
                        "options": ["array", "object", "list", "undefined"],
                        "correct_answer": 1
                    }
                ]
            },
            {
                "id": str(uuid.uuid4()),
                "title": "Web Development Concepts",
                "description": "Test your web dev knowledge",
                "quiz_type": "Multiple Choice",
                "time_limit": 420,
                "xp_reward": 150,
                "difficulty": "Medium",
                "questions": [
                    {
                        "question": "What does CSS stand for?",
                        "options": ["Computer Style Sheets", "Cascading Style Sheets", "Creative Style Sheets", "Colorful Style Sheets"],
                        "correct_answer": 1
                    },
                    {
                        "question": "Which HTML tag is used to create a hyperlink?",
                        "options": ["<link>", "<a>", "<href>", "<url>"],
                        "correct_answer": 1
                    },
                    {
                        "question": "What is the purpose of the 'alt' attribute in an image tag?",
                        "options": ["To resize the image", "To add a tooltip", "To provide alternative text", "To add a caption"],
                        "correct_answer": 2
                    },
                    {
                        "question": "Which HTTP method is used to send data to a server?",
                        "options": ["GET", "POST", "PUT", "DELETE"],
                        "correct_answer": 1
                    },
                    {
                        "question": "What does API stand for?",
                        "options": ["Application Program Interface", "Application Programming Interface", "Applied Programming Interface", "Advanced Programming Interface"],
                        "correct_answer": 1
                    }
                ]
            }
        ]
        await db.quizzes.insert_many(sample_quizzes)
        logger.info("Sample quizzes seeded successfully")
