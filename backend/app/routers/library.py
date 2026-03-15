"""
Library Router
Provides endpoints for medical terminology and RAG-powered Q&A.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from app.services.medical_knowledge_service import get_medical_knowledge_service
from app.services.gemini_service import GeminiService

router = APIRouter()
knowledge_service = get_medical_knowledge_service()
gemini = GeminiService()


class AskQuestionRequest(BaseModel):
    question: str
    context: Optional[str] = None


class AskQuestionResponse(BaseModel):
    answer: str
    references: List[dict]
    disclaimer: str


@router.get("/categories")
async def get_categories():
    """Get all available medical terminology categories."""
    categories = knowledge_service.get_categories()
    return {"categories": categories}


@router.get("/terms/{category_id}")
async def get_category_terms(category_id: str):
    """Get all terms for a specific category."""
    result = knowledge_service.get_category_terms(category_id)
    if not result:
        raise HTTPException(status_code=404, detail="Category not found")
    return result


@router.get("/terms/{category_id}/{term_id}")
async def get_term_details(category_id: str, term_id: str):
    """Get detailed information about a specific term."""
    result = knowledge_service.get_term_details(category_id, term_id)
    if not result:
        raise HTTPException(status_code=404, detail="Term not found")
    return result


@router.get("/search")
async def search_terms(q: str):
    """Search across all medical terms."""
    if not q or len(q) < 2:
        raise HTTPException(status_code=400, detail="Search query must be at least 2 characters")
    results = knowledge_service.search_terms(q)
    return {"query": q, "results": results, "count": len(results)}


@router.post("/ask")
async def ask_medical_question(request: AskQuestionRequest):
    """
    Answer a medical question using RAG with the knowledge base.
    Provides verified information with source citations.
    """
    knowledge_context = knowledge_service.get_context_for_rag()
    
    prompt = f"""You are a helpful medical education assistant. A patient is asking a health-related question. 
Your role is to educate them using simple, clear language that anyone can understand.

IMPORTANT GUIDELINES:
1. Use the provided medical knowledge base as your PRIMARY source
2. Explain concepts in plain language, avoiding jargon
3. ALWAYS cite your sources with the format: [Source: SOURCE_NAME, Section: SECTION_NAME]
4. If the question is outside the knowledge base, you may provide general health education but clearly state it's general information
5. NEVER provide specific medical advice, diagnoses, or treatment recommendations
6. Encourage the patient to discuss specifics with their healthcare provider
7. Be empathetic and supportive - remember they may feel embarrassed asking basic questions

MEDICAL KNOWLEDGE BASE:
{knowledge_context}

PATIENT'S QUESTION:
{request.question}

{f"ADDITIONAL CONTEXT FROM PATIENT: {request.context}" if request.context else ""}

Please provide a clear, educational response with proper citations. Format your response in a friendly, conversational tone.
At the end, list all the sources you referenced."""

    try:
        response = await gemini._call_gemini(prompt, temperature=0.3, max_tokens=2048)
        
        # Extract references from knowledge base that might be relevant
        search_results = knowledge_service.search_terms(request.question)
        references = []
        seen_sources = set()
        
        for result in search_results[:3]:  # Top 3 relevant terms
            term = knowledge_service.get_term_details(result["category_id"], result["term_id"])
            if term:
                for ref in term.get("references", []):
                    source_key = ref["source"]
                    if source_key not in seen_sources:
                        seen_sources.add(source_key)
                        references.append({
                            "source": ref["source"],
                            "section": ref["section"],
                            "url": ref["url"],
                            "related_term": term["name"]
                        })
        
        return {
            "answer": response,
            "references": references,
            "disclaimer": "This information is for educational purposes only and is not a substitute for professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare provider with any questions you may have regarding a medical condition."
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate response: {str(e)}")
