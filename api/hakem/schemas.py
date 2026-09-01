from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import date, datetime

class InvitationBase(BaseModel):
    event_date: date
    event_name: Optional[str] = None
    notes: Optional[str] = None
    status: str
    whatsapp_message_sid: Optional[str] = None
    sent_at: Optional[datetime] = None
    last_response_at: Optional[datetime] = None
    response_content: Optional[str] = None

class InvitationCreate(InvitationBase):
    pass

class Invitation(InvitationBase):
    id: int
    referee_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class RefereeBase(BaseModel):
    full_name: str
    phone: Optional[str] = None
    region: Optional[str] = None
    sicil_no: Optional[str] = None
    category: Optional[str] = None
    tc_no: Optional[str] = None
    iban: Optional[str] = None
    gender: Optional[str] = None

    @field_validator('full_name')
    def name_must_be_valid(cls, v):
        if not v or len(v.strip()) < 2:
            raise ValueError('Name must be at least 2 characters')
        return v

class RefereeCreate(RefereeBase):
    pass

class Referee(RefereeBase):
    id: int
    full_name_normalized: str
    created_at: datetime
    invitations: List[Invitation] = []
    
    class Config:
        from_attributes = True

class UserBase(BaseModel):
    username: str

class UserCreate(UserBase):
    password: str
    role: str = "user"

class UserLogin(UserBase):
    password: str

class User(UserBase):
    id: int
    role: str
    
    class Config:
        from_attributes = True

class SystemSetup(BaseModel):
    mode: str  # 'admin' or 'new_user'
    username: Optional[str] = None
    password: Optional[str] = None
    mac_address: Optional[str] = None
