from sqlalchemy import Column, Integer, String, Date, ForeignKey, DateTime, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from db import Base

class InvitationStatus(str, enum.Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    EXCUSED = "EXCUSED"

class Referee(Base):
    __tablename__ = "referees"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    full_name_normalized = Column(String, unique=True, index=True, nullable=False)
    phone = Column(String, nullable=True)
    region = Column(String, nullable=True)
    sicil_no = Column(String, nullable=True)
    telegram_chat_id = Column(String, nullable=True)
    
    # Onboarding Fields
    category = Column(String, nullable=True) # İl, Ulusal, Uluslararası
    tc_no = Column(String, nullable=True)
    iban = Column(String, nullable=True)
    gender = Column(String, nullable=True) # Kadın, Erkek

    # KVKK Consent
    kvkk_consent = Column(Integer, default=0)  # 0=Not given, 1=Accepted
    kvkk_consent_date = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    invitations = relationship("Invitation", back_populates="referee", cascade="all, delete-orphan")

class Race(Base):
    __tablename__ = "races"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    date = Column(Date, nullable=False)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    invitations = relationship("Invitation", back_populates="race", cascade="all, delete-orphan")

class Invitation(Base):
    __tablename__ = "invitations"

    id = Column(Integer, primary_key=True, index=True)
    referee_id = Column(Integer, ForeignKey("referees.id"), nullable=False)
    race_id = Column(Integer, ForeignKey("races.id"), nullable=True) # Link to Race
    event_date = Column(Date, nullable=False)
    event_name = Column(String, nullable=True) # Keep for backward compat or manual single invites
    notes = Column(String, nullable=True)
    status = Column(String, default=InvitationStatus.PENDING.value)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # WhatsApp Integration columns
    whatsapp_message_sid = Column(String, nullable=True)
    telegram_message_id = Column(String, nullable=True)
    sent_at = Column(DateTime, nullable=True)
    last_response_at = Column(DateTime, nullable=True)
    response_content = Column(String, nullable=True)
    
    # Automation
    reminder_sent = Column(Integer, default=0) # 0=False, 1=True (using Integer for SQLite boolean safety)

    referee = relationship("Referee", back_populates="invitations")
    race = relationship("Race", back_populates="invitations")

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="user") # 'admin' or 'user'

class SystemConfig(Base):
    __tablename__ = "system_config"

    key = Column(String, primary_key=True, index=True)
    value = Column(String, nullable=False)

