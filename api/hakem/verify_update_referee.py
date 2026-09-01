import crud
from db import SessionLocal
import models

def test_update_referee():
    db = SessionLocal()
    try:
        # 1. Get a test referee (or create one)
        referee = db.query(models.Referee).first()
        if not referee:
            print("No referee found to test update.")
            return

        print(f"Original Name: {referee.full_name}, Sicil: {referee.sicil_no}")
        
        # 2. Update Data
        new_data = {
            "sicil_no": "TEST-12345",
            "category": "Ulusal Hakem",
            "tc_no": "11122233344",
            "gender": "Erkek"
        }
        
        # 3. Call Update
        updated_referee = crud.update_referee(db, referee.id, new_data)
        
        # 4. Verify
        print(f"Updated Name: {updated_referee.full_name}, Sicil: {updated_referee.sicil_no}")
        
        if updated_referee.sicil_no == "TEST-12345" and updated_referee.category == "Ulusal Hakem":
            print("VERIFICATION SUCCESS: Referee updated correctly.")
        else:
            print("VERIFICATION FAILED: Data mismatch.")
            
    except Exception as e:
        print(f"VERIFICATION FAILED: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_update_referee()
