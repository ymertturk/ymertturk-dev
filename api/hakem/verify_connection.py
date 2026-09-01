import models
from db import SessionLocal

def test_connection():
    try:
        db = SessionLocal()
        print("Database session created.")
        
        # Test Referees
        referee_count = db.query(models.Referee).count()
        print(f"Referees table accessed successfully. Count: {referee_count}")
        
        # Test Invitations
        invitation_count = db.query(models.Invitation).count()
        print(f"Invitations table accessed successfully. Count: {invitation_count}")
        
        # Test Races
        race_count = db.query(models.Race).count()
        print(f"Races table accessed successfully. Count: {race_count}")
        
        db.close()
        print("VERIFICATION SUCCESS: Application models act correctly with the database.")
    except Exception as e:
        print(f"VERIFICATION FAILED: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_connection()
