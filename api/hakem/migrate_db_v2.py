
import sqlite3

def migrate():
    conn = sqlite3.connect('referee_tracker.db')
    cursor = conn.cursor()
    
    columns = [
        ('category', 'TEXT'),
        ('tc_no', 'TEXT'),
        ('iban', 'TEXT'),
        ('gender', 'TEXT')
    ]
    
    for col_name, col_type in columns:
        try:
            cursor.execute(f"ALTER TABLE referees ADD COLUMN {col_name} {col_type}")
            print(f"Added column {col_name}")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print(f"Column {col_name} already exists")
            else:
                print(f"Error adding {col_name}: {e}")
                
    conn.commit()
    conn.close()

if __name__ == "__main__":
    migrate()
