"""
Social networking API endpoints - Follows, Posts, Profile management
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
import uuid
from datetime import datetime

from app.models.social import (
    Post, PostCreate, PostResponse,
    Follow, FollowRequest,
    DoctorPublicProfile, DoctorProfileExtended,
    PrivacySettings, PrivacyLevel,
    calculate_profile_completion
)
from app.services.auth_service import get_current_doctor_from_token
from app.services.hybrid_service import get_firebase_service

router = APIRouter()
firebase = get_firebase_service()


# ============================================
# Profile Endpoints
# ============================================

@router.get("/profile/me", response_model=DoctorProfileExtended)
async def get_my_profile(current_doctor = Depends(get_current_doctor_from_token)):
    """Get current doctor's extended profile"""
    try:
        # Get extended profile from Firebase
        profile_data = await firebase.get_doctor_profile(current_doctor['id'])
        
        if not profile_data:
            # Return default extended profile
            return DoctorProfileExtended(
                profile_completion=35,
                followers_count=0,
                following_count=0,
                posts_count=0
            )
        
        return DoctorProfileExtended(**profile_data)
    except Exception as e:
        print(f"[PROFILE] Error getting profile: {e}")
        return DoctorProfileExtended()


@router.put("/profile/me")
async def update_my_profile(
    profile_data: DoctorProfileExtended,
    current_doctor = Depends(get_current_doctor_from_token)
):
    """Update current doctor's extended profile"""
    try:
        # Calculate profile completion
        data_dict = profile_data.model_dump()
        data_dict['profile_completion'] = calculate_profile_completion(data_dict)
        
        # Save to Firebase
        await firebase.update_doctor_profile(current_doctor['id'], data_dict)
        
        return {"message": "Profile updated", "profile_completion": data_dict['profile_completion']}
    except Exception as e:
        print(f"[PROFILE] Error updating profile: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/profile/{doctor_id}", response_model=DoctorPublicProfile)
async def get_doctor_profile(
    doctor_id: str,
    current_doctor = Depends(get_current_doctor_from_token)
):
    """Get public profile of a doctor"""
    try:
        # Get basic doctor info
        doctor = await firebase.get_doctor_by_id(doctor_id)
        if not doctor:
            raise HTTPException(status_code=404, detail="Doctor not found")
        
        # Get extended profile
        profile = await firebase.get_doctor_profile(doctor_id) or {}
        privacy = profile.get('privacy_settings', {})
        
        # Check follow status
        is_following = await firebase.is_following(current_doctor['id'], doctor_id)
        is_follower = await firebase.is_following(doctor_id, current_doctor['id'])
        
        # Build public profile respecting privacy
        public_profile = DoctorPublicProfile(
            id=doctor_id,
            name=doctor.get('name', 'Doctor'),
            specialization=doctor.get('specialization', 'Medical Professional'),
            hospital=doctor.get('hospital') if privacy.get('hospital_address') != 'private' else None,
            profile_photo_url=profile.get('profile_photo_url'),
            bio=profile.get('bio'),
            experience_years=profile.get('experience_years'),
            verification_status=doctor.get('verification_status', 'pending'),
            is_verified=doctor.get('verification_status') == 'approved',
            followers_count=profile.get('followers_count', 0),
            following_count=profile.get('following_count', 0),
            posts_count=profile.get('posts_count', 0),
            is_following=is_following,
            is_follower=is_follower,
            email=doctor.get('email') if privacy.get('email') == 'public' else None,
            phone=doctor.get('phone') if privacy.get('phone') == 'public' else None,
        )
        
        return public_profile
    except HTTPException:
        raise
    except Exception as e:
        print(f"[PROFILE] Error getting doctor profile: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# Follow Endpoints
# ============================================

@router.post("/follow/{doctor_id}")
async def follow_doctor(
    doctor_id: str,
    current_doctor = Depends(get_current_doctor_from_token)
):
    """Follow a doctor"""
    try:
        if doctor_id == current_doctor['id']:
            raise HTTPException(status_code=400, detail="Cannot follow yourself")
        
        # Check if already following
        if await firebase.is_following(current_doctor['id'], doctor_id):
            raise HTTPException(status_code=400, detail="Already following this doctor")
        
        # Check if target doctor exists
        target = await firebase.get_doctor_by_id(doctor_id)
        if not target:
            raise HTTPException(status_code=404, detail="Doctor not found")
        
        # Create follow relationship
        follow = Follow(
            id=str(uuid.uuid4()),
            follower_id=current_doctor['id'],
            following_id=doctor_id,
            created_at=datetime.utcnow()
        )
        
        await firebase.create_follow(follow.model_dump())
        
        # Update counters
        await firebase.increment_follower_count(doctor_id)
        await firebase.increment_following_count(current_doctor['id'])
        
        return {"message": "Followed successfully"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[FOLLOW] Error following doctor: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/follow/{doctor_id}")
async def unfollow_doctor(
    doctor_id: str,
    current_doctor = Depends(get_current_doctor_from_token)
):
    """Unfollow a doctor"""
    try:
        if doctor_id == current_doctor['id']:
            raise HTTPException(status_code=400, detail="Cannot unfollow yourself")
        
        # Check if following
        if not await firebase.is_following(current_doctor['id'], doctor_id):
            raise HTTPException(status_code=400, detail="Not following this doctor")
        
        # Delete follow relationship
        await firebase.delete_follow(current_doctor['id'], doctor_id)
        
        # Update counters
        await firebase.decrement_follower_count(doctor_id)
        await firebase.decrement_following_count(current_doctor['id'])
        
        return {"message": "Unfollowed successfully"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[FOLLOW] Error unfollowing doctor: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/followers/{doctor_id}")
async def get_followers(
    doctor_id: str,
    limit: int = 20,
    current_doctor = Depends(get_current_doctor_from_token)
):
    """Get followers of a doctor"""
    try:
        followers = await firebase.get_followers(doctor_id, limit)
        return {"followers": followers, "count": len(followers)}
    except Exception as e:
        print(f"[FOLLOW] Error getting followers: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/following/{doctor_id}")
async def get_following(
    doctor_id: str,
    limit: int = 20,
    current_doctor = Depends(get_current_doctor_from_token)
):
    """Get doctors that a doctor is following"""
    try:
        following = await firebase.get_following(doctor_id, limit)
        return {"following": following, "count": len(following)}
    except Exception as e:
        print(f"[FOLLOW] Error getting following: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# Suggested Doctors
# ============================================

@router.get("/suggested-doctors")
async def get_suggested_doctors(
    limit: int = 10,
    current_doctor = Depends(get_current_doctor_from_token)
):
    """Get suggested doctors to follow based on specialization"""
    try:
        # Get current doctor's specialization
        doctor = await firebase.get_doctor_by_id(current_doctor['id'])
        specialization = doctor.get('specialization', '') if doctor else ''
        
        # Get doctors with same specialization that user isn't following
        suggestions = await firebase.get_suggested_doctors(
            current_doctor['id'], 
            specialization, 
            limit
        )
        
        return {"doctors": suggestions}
    except Exception as e:
        print(f"[SOCIAL] Error getting suggestions: {e}")
        raise HTTPException(status_code=500, detail=str(e))
