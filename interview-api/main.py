from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import pandas as pd
import numpy as np
import joblib
import re
import random
from sentence_transformers import SentenceTransformer, util

# ─────────────────────────────────────────
#  STARTUP — load model & data ONCE
# ─────────────────────────────────────────
app = FastAPI(title="Hirely Interview API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("⏳ Loading ML model and data...")

rf_model = joblib.load("hiring_model_v2.pkl")
questions_df = pd.read_csv("Questions.csv", encoding="latin1")
semantic_model = SentenceTransformer("all-MiniLM-L6-v2")

print("✅ Ready!")

# ─────────────────────────────────────────
#  HARDCODED PERSONALITY QUESTIONS (2 questions)
#  These specifically evaluate personality traits
# ─────────────────────────────────────────
PERSONALITY_QUESTIONS = [
    "Describe a time when you faced a significant challenge at work or in a project. How did you handle it and what did you learn?",
    "Tell me about a situation where you had to work with a difficult team member. How did you manage the situation and maintain team harmony?"
]

# Words that indicate good personality traits (teamwork, leadership, problem-solving)
PERSONALITY_POSITIVE_WORDS = {
    "team", "together", "collaborate", "helped", "supported", "listened",
    "learned", "improved", "adapted", "solved", "resolved", "communicated",
    "understood", "patient", "feedback", "cooperate", "shared", "responsible",
    "initiative", "leader", "guided", "motivated", "achieved", "success"
}

# ─────────────────────────────────────────
#  REQUEST / RESPONSE SCHEMAS
# ─────────────────────────────────────────

class CandidateProfile(BaseModel):
    age: int
    gender: int            # 0=Male  1=Female
    education: int         # 1–4
    experience: int
    prev_companies: int
    distance: float
    strategy: int          # 1–3 (kept for compatibility)


class AnswerItem(BaseModel):
    question: str
    answer: str


class SubmitRequest(BaseModel):
    application_id: int
    candidate_id: int
    profile: CandidateProfile
    answers: List[AnswerItem]   # exactly 7 questions (2 personality + 5 technical)


# ─────────────────────────────────────────
#  EVALUATION FUNCTIONS
# ─────────────────────────────────────────

def evaluate_personality_answer(question: str, user_answer: str):
    """
    Specialized evaluation for personality questions.
    Focuses on: length, structure, reflective words, and personality indicators.
    Returns (quality_score, personality_score, feedback)
    """
    words = len(user_answer.split())
    structure_bonus = 10 if ("." in user_answer or "!" in user_answer) else 0
    
    # Length score - good personality answers are detailed (max 50)
    length_score = min(words * 2, 50)
    
    # Reflective/Personality word score (max 50)
    found_words = sum(1 for w in user_answer.lower().split() 
                      if w in PERSONALITY_POSITIVE_WORDS)
    personality_word_score = min(found_words * 5, 50)
    
    # Final personality score
    personality_score = min(length_score + personality_word_score + structure_bonus, 100)
    
    # Quality score (communication clarity)
    quality = min(words * 2 + structure_bonus, 100)
    
    # Feedback based on personality score
    if personality_score >= 80:
        feedback = "Excellent! Shows strong soft skills, self-awareness, and problem-solving abilities."
    elif personality_score >= 60:
        feedback = "Good answer with decent reflection. Could add more specific examples."
    elif personality_score >= 40:
        feedback = "Acceptable but lacks depth. Try using the STAR method (Situation, Task, Action, Result)."
    else:
        feedback = "Answer is too brief or vague. Please provide more detailed examples."
    
    return quality, personality_score, feedback


def evaluate_technical_answer(question: str, user_answer: str):
    """
    Evaluation for technical questions from dataset.
    Returns (quality_score, skill_score, personality_score, feedback)
    """
    row = questions_df[questions_df["Question"] == question]
    
    # ─── 1. QUALITY SCORE (communication) ───
    words = len(user_answer.split())
    structure_bonus = 10 if "." in user_answer else 0
    length_score = min(words * 2, 70)
    quality = min(length_score + structure_bonus, 100)
    
    # If no reference answer found
    if row.empty:
        personality_score = min(40 + (words * 2), 100)
        return quality, quality // 2, personality_score, "No reference answer found."
    
    correct_answer = row.iloc[0]["Answer"]
    
    # ─── 2. SEMANTIC SIMILARITY (for skill score) ───
    emb_user = semantic_model.encode(user_answer, convert_to_tensor=True)
    emb_correct = semantic_model.encode(correct_answer, convert_to_tensor=True)
    semantic_score = util.cos_sim(emb_user, emb_correct).item()
    
    # ─── 3. KEYWORD OVERLAP ───
    def clean(text):
        return set(re.findall(r"\w+", text.lower()))
    
    user_words = clean(user_answer)
    correct_words = clean(correct_answer)
    
    if len(correct_words) == 0:
        keyword_score = 0
    else:
        keyword_score = len(user_words.intersection(correct_words)) / len(correct_words)
    
    # ─── 4. FINAL SKILL SCORE ───
    raw_score = (semantic_score * 0.75) + (keyword_score * 0.25)
    
    if raw_score > 0.6:
        skill_score = int(raw_score * 115)
    else:
        skill_score = int(raw_score * 100)
    
    skill_score = min(skill_score, 100)
    
    # ─── 5. PERSONALITY SCORE (basic from answer quality) ───
    positive_words = [
        "understand", "implement", "improve", "efficient",
        "scalable", "system", "handle", "design", "team", 
        "collaborate", "communicate", "solve", "learn"
    ]
    
    confidence_hits = sum(1 for w in positive_words if w in user_answer.lower())
    structure_bonus_personality = 10 if "." in user_answer else 0
    
    personality_score = min(40 + (confidence_hits * 8) + structure_bonus_personality, 100)
    
    # ─── 6. FEEDBACK ───
    if skill_score >= 85:
        feedback = "Excellent technical answer with strong understanding."
    elif skill_score >= 65:
        feedback = "Good technical answer but missing minor depth."
    elif skill_score >= 40:
        feedback = "Basic technical understanding, needs improvement."
    else:
        feedback = "Incorrect or very weak technical answer."
    
    return quality, skill_score, personality_score, feedback


# ─────────────────────────────────────────
#  ROUTES
# ─────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/questions")
def get_questions():
    """
    Returns exactly 7 questions:
        • 2 hardcoded personality questions (indices 0, 1)
        • 5 random technical questions from Questions.csv (indices 2-6)
    """
    # Get all technical questions from the dataset
    all_questions = questions_df["Question"].tolist()
    
    # Remove personality questions if they somehow exist in dataset
    personality_set = set(PERSONALITY_QUESTIONS)
    technical_pool = [q for q in all_questions if q not in personality_set]
    
    # Randomly select 5 technical questions
    technical_questions = random.sample(technical_pool, min(5, len(technical_pool)))
    
    # Combine: 2 personality + 5 technical = 7 total
    all_questions_list = PERSONALITY_QUESTIONS + technical_questions
    
    return {
        "questions": all_questions_list,
        "personality_indices": [0, 1],        # First 2 questions are personality
        "technical_indices": [2, 3, 4, 5, 6], # Last 5 questions are technical
        "total_questions": 7
    }


@app.post("/submit")
def submit_interview(body: SubmitRequest):
    """
    Receives answers to 7 questions (2 personality + 5 technical),
    scores them appropriately, and runs the Random Forest model.
    
    Personality questions are evaluated separately for personality score.
    Technical questions are evaluated for skill score.
    """
    if len(body.answers) != 7:
        raise HTTPException(status_code=400, detail="Exactly 7 answers required (2 personality + 5 technical).")
    
    qa_results = []
    quality_scores = []
    skill_scores = []
    personality_scores = []
    
    # First 2 answers are personality questions (indices 0, 1)
    for idx in range(2):
        item = body.answers[idx]
        # Check if this is actually a personality question
        if item.question in PERSONALITY_QUESTIONS:
            quality, personality, feedback = evaluate_personality_answer(item.question, item.answer)
            quality_scores.append(quality)
            personality_scores.append(personality)
            # For personality questions, skill_score = None
            skill_scores.append(None)
            
            qa_results.append({
                "question": item.question,
                "answer": item.answer,
                "type": "personality",
                "qualityScore": round(quality, 2),
                "skillScore": None,
                "personalityScore": round(personality, 2),
                "feedback": feedback,
            })
        else:
            # Fallback - if it's not a personality question, treat as technical
            quality, skill, personality, feedback = evaluate_technical_answer(item.question, item.answer)
            quality_scores.append(quality)
            skill_scores.append(skill)
            personality_scores.append(personality)
            
            qa_results.append({
                "question": item.question,
                "answer": item.answer,
                "type": "technical",
                "qualityScore": round(quality, 2),
                "skillScore": round(skill, 2),
                "personalityScore": round(personality, 2),
                "feedback": feedback,
            })
    
    # Last 5 answers are technical questions (indices 2-6)
    for idx in range(2, 7):
        item = body.answers[idx]
        quality, skill, personality, feedback = evaluate_technical_answer(item.question, item.answer)
        
        quality_scores.append(quality)
        skill_scores.append(skill)
        personality_scores.append(personality)
        
        qa_results.append({
            "question": item.question,
            "answer": item.answer,
            "type": "technical",
            "qualityScore": round(quality, 2),
            "skillScore": round(skill, 2),
            "personalityScore": round(personality, 2),
            "feedback": feedback,
        })
    
    # ── Aggregated scores ──
    avg_quality = float(np.mean(quality_scores))
    
    # Filter out None values for skill scores (personality questions don't have skill scores)
    valid_skill_scores = [s for s in skill_scores if s is not None]
    avg_skill = float(np.mean(valid_skill_scores)) if valid_skill_scores else 50.0
    
    # Personality score comes primarily from the 2 dedicated personality questions
    # Average with a small contribution from technical answers (20% weight)
    personality_from_dedicated = float(np.mean(personality_scores[0:2]))  # First 2 questions
    personality_from_technical = float(np.mean(personality_scores[2:7])) if len(personality_scores[2:7]) > 0 else 50.0
    
    # Weighted average: 70% from dedicated personality questions, 30% from technical
    avg_personality = (personality_from_dedicated * 0.7) + (personality_from_technical * 0.3)
    avg_personality = min(avg_personality, 100)
    
    # ── Build feature vector ──
    p = body.profile
    features = pd.DataFrame([[
        p.age,
        p.gender,
        p.education,
        p.experience,
        p.prev_companies,
        p.distance,
        avg_quality,
        avg_skill,
        avg_personality,
        p.strategy,
    ]], columns=[
        "Age", "Gender", "EducationLevel", "ExperienceYears",
        "PreviousCompanies", "DistanceFromCompany",
        "InterviewScore", "SkillScore", "PersonalityScore",
        "RecruitmentStrategy",
    ])
    
    # ── Random Forest prediction ──
    probability = rf_model.predict_proba(features)[0].tolist()
    
    HIRE_THRESHOLD = 0.40
    hired = probability[1] >= HIRE_THRESHOLD
    confidence = round(probability[1] * 100 if hired else probability[0] * 100, 2)
    
    return {
        "applicationId": body.application_id,
        "candidateId": body.candidate_id,
        "qaResults": qa_results,
        "avgInterviewScore": round(avg_quality, 2),
        "avgSkillScore": round(avg_skill, 2),
        "avgPersonalityScore": round(avg_personality, 2),
        "hired": hired,
        "confidence": confidence,
        "hiringProbability": round(probability[1] * 100, 2),
        "notHiringProbability": round(probability[0] * 100, 2),
        "hireThresholdUsed": HIRE_THRESHOLD,
    }