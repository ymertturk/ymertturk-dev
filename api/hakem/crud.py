from sqlalchemy.orm import Session
from typing import List
from sqlalchemy import func, distinct, desc
import models, schemas
import re
import hashlib
from utils import backup_database

def normalize_name(name: str) -> str:
    # Strip spaces, collapse multiple spaces, lower case
    return re.sub(r'\s+', ' ', name.strip()).lower()

def get_referee(db: Session, referee_id: int):
    return db.query(models.Referee).filter(models.Referee.id == referee_id).first()

def get_referee_by_normalized_name(db: Session, normalized_name: str):
    return db.query(models.Referee).filter(models.Referee.full_name_normalized == normalized_name).first()

def get_referees(db: Session, search: str = None, event_filter: str = None, skip: int = 0, limit: int = 100):
    query = db.query(models.Referee)
    
    if event_filter:
        query = query.join(models.Invitation).filter(models.Invitation.event_name == event_filter).distinct()
        
    if search:
        search_norm = normalize_name(search)
        query = query.filter(models.Referee.full_name_normalized.contains(search_norm))
        
    return query.order_by(models.Referee.full_name).offset(skip).limit(limit).all()

def count_referees(db: Session, search: str = None, event_filter: str = None):
    query = db.query(models.Referee)
    
    if event_filter:
        query = query.join(models.Invitation).filter(models.Invitation.event_name == event_filter).distinct()
        
    if search:
        search_norm = normalize_name(search)
        query = query.filter(models.Referee.full_name_normalized.contains(search_norm))
    return query.count()

def get_unique_event_names(db: Session):
    return db.query(models.Invitation.event_name).filter(models.Invitation.event_name != None).distinct().order_by(models.Invitation.event_name.desc()).all()

def create_referee(db: Session, referee: schemas.RefereeCreate):
    normalized = normalize_name(referee.full_name)
    db_referee = models.Referee(
        full_name=referee.full_name.strip(),
        full_name_normalized=normalized,
        phone=referee.phone,
        region=referee.region,
        sicil_no=referee.sicil_no,
        category=referee.category,
        tc_no=referee.tc_no,
        iban=referee.iban,
        gender=referee.gender
    )
    db.add(db_referee)
    db.commit()
    backup_database()
    db.refresh(db_referee)
    return db_referee

def update_referee(db: Session, referee_id: int, referee_data: dict):
    db_referee = db.query(models.Referee).filter(models.Referee.id == referee_id).first()
    if db_referee:
        for key, value in referee_data.items():
            setattr(db_referee, key, value)
        db.commit()
        backup_database()
        db.refresh(db_referee)
    return db_referee

def delete_referee(db: Session, referee_id: int):
    db_referee = get_referee(db, referee_id)
    if db_referee:
        db.delete(db_referee)
        db.commit()
        backup_database()
    return db_referee

def create_invitation(db: Session, invitation: schemas.InvitationCreate, referee_id: int):
    db_invitation = models.Invitation(**invitation.model_dump(), referee_id=referee_id)
    db.add(db_invitation)
    db.commit()
    backup_database()
    db.refresh(db_invitation)
    return db_invitation

def update_invitation_status(db: Session, invitation_id: int, status: str):
    db_invitation = db.query(models.Invitation).filter(models.Invitation.id == invitation_id).first()
    if db_invitation:
        db_invitation.status = status
        db.commit()
        backup_database()
        db.refresh(db_invitation)
    return db_invitation

def get_invitation(db: Session, invitation_id: int):
    return db.query(models.Invitation).filter(models.Invitation.id == invitation_id).first()

def delete_invitation(db: Session, invitation_id: int):
    db_invitation = db.query(models.Invitation).filter(models.Invitation.id == invitation_id).first()
    if db_invitation:
        db.delete(db_invitation)
        db.commit()
        backup_database()
    return db_invitation

def delete_all_data(db: Session):
    db.query(models.Invitation).delete()
    db.query(models.Referee).delete()
    db.commit()
    backup_database()

# --- Auth & System Config ---

def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()

def create_user(db: Session, user: schemas.UserCreate):
    # In a real app we should hash the password. For MVP/simple app:
    # We will use a simple "hash" or plain text if user insists, but generally better to mock hash at least.
    # Given the requirements, we'll store it directly for now or use a simple hash if we import passlib.
    # Let's simple hash it for basic "security".
    import hashlib
    hashed = hashlib.sha256(user.password.encode()).hexdigest()
    
    db_user = models.User(
        username=user.username,
        hashed_password=hashed,
        role=user.role
    )
    db.add(db_user)
    db.commit()
    # Backup user creation too? Maybe not critical but good for consistency
    backup_database()
    db.refresh(db_user)
    return db_user

def verify_password(plain_password, hashed_password):
    import hashlib
    return hashlib.sha256(plain_password.encode()).hexdigest() == hashed_password

def get_users(db: Session):
    return db.query(models.User).order_by(models.User.username).all()

def delete_user(db: Session, user_id: int):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user:
        db.delete(user)
        db.commit()
        backup_database()
    return user

def update_user_password(db: Session, user_id: int, new_password: str):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user:
        import hashlib
        hashed = hashlib.sha256(new_password.encode()).hexdigest()
        user.hashed_password = hashed
        db.commit()
        backup_database()
    return user

def get_system_config(db: Session, key: str):
    config = db.query(models.SystemConfig).filter(models.SystemConfig.key == key).first()
    return config.value if config else None

def set_system_config(db: Session, key: str, value: str):
    config = db.query(models.SystemConfig).filter(models.SystemConfig.key == key).first()
    if config:
        config.value = value
    else:
        config = models.SystemConfig(key=key, value=value)
        db.add(config)
    db.commit()
    backup_database()

def get_referees_without_invitations(db: Session):
    # Select referees where id is NOT IN (select distinct referee_id from invitations)
    # OR using left join and checking for null
    return db.query(models.Referee).outerjoin(models.Invitation).filter(models.Invitation.id == None).all()

# --- Race CRUD ---

def get_races(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Race).order_by(models.Race.date.desc()).offset(skip).limit(limit).all()

def count_races(db: Session):
    return db.query(models.Race).count()

def get_race(db: Session, race_id: int):
    return db.query(models.Race).filter(models.Race.id == race_id).first()

def create_race(db: Session, name: str, date: str, notes: str = None):
    # date is string YYYY-MM-DD from form, convert to date obj
    from datetime import datetime
    date_obj = datetime.strptime(date, "%Y-%m-%d").date()
    
    db_race = models.Race(name=name, date=date_obj, notes=notes)
    db.add(db_race)
    db.commit()
    backup_database()
    db.refresh(db_race)
    return db_race

def update_race(db: Session, race_id: int, name: str, date: str, notes: str = None):
    race = get_race(db, race_id)
    if not race:
        return None
        
    from datetime import datetime
    date_obj = datetime.strptime(date, "%Y-%m-%d").date()
    
    name_changed = (race.name != name)
    
    race.name = name
    race.date = date_obj
    race.notes = notes
    
    if name_changed:
        for inv in race.invitations:
            inv.event_name = name
            
    db.commit()
    backup_database()
    db.refresh(race)
    return race

def delete_race(db: Session, race_id: int):
    race = get_race(db, race_id)
    if race:
        db.delete(race)
        db.commit()
        backup_database()
    return race

def get_referees_by_ids(db: Session, referee_ids: List[int]):
    return db.query(models.Referee).filter(models.Referee.id.in_(referee_ids)).all()

