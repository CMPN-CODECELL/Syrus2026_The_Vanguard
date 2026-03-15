"""
Chat Router
Handles conversational AI interface for patient queries.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.services.gemini_service import GeminiService

router = APIRouter()
gemini = GeminiService()


class ChatMessage(BaseModel):
    message: str
    patient_id: Optional[str] = None
    conversation_id: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    sources: list[str] = []
    confidence: float = 0.0


@router.post("/message")
async def send_chat_message(chat: ChatMessage):
    """
    Send a message to the AI assistant.
    If patient_id is provided, the AI has full patient context.
    """
    context = ""
    
    if chat.patient_id:
        from app.services.hybrid_service import get_database_service
        firebase = get_database_service()
        
        history = firebase.get_patient_history(chat.patient_id)
        if history:
            from app.services.gemini_service import build_patient_context
            context = build_patient_context(history)
    
    # Generate response using Gemini 3
    result = await gemini.chat_response(
        message=chat.message,
        context=context
    )
    
    return {
        "response": result["response"],
        "sources": result.get("sources", []),
        "confidence": result.get("confidence", 0.9),
        "context_used": bool(context),
        "token_count": len(context.split()) if context else 0
    }


@router.post("/ask-about-result")
async def ask_about_result(
    question: str,
    result_name: str,
    result_value: str,
    normal_range: str
):
    """
    Ask a specific question about a lab result.
    For patient portal - helps patients understand their results.
    """
    result = await gemini.explain_lab_result(
        question=question,
        result_name=result_name,
        result_value=result_value,
        normal_range=normal_range
    )
    
    return {
        "question": question,
        "answer": result["answer"],
        "is_concerning": result.get("is_concerning", False),
        "next_steps": result.get("next_steps", [])
    }
