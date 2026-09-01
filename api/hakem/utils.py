import shutil
import os
from datetime import datetime
import glob

DB_FILE = "referee_tracker.db"
BACKUP_DIR = "backups"
MAX_BACKUPS = 50

def backup_database():
    """
    Creates a timestamped copy of the database file in the backups directory.
    Maintains only the last MAX_BACKUPS files.
    """
    if not os.path.exists(BACKUP_DIR):
        os.makedirs(BACKUP_DIR)
        
    if not os.path.exists(DB_FILE):
        return # No DB to backup yet
        
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = os.path.join(BACKUP_DIR, f"referee_tracker_{timestamp}.db")
    
    try:
        shutil.copy2(DB_FILE, backup_path)
        
        # Cleanup old backups
        backups = sorted(glob.glob(os.path.join(BACKUP_DIR, "referee_tracker_*.db")))
        while len(backups) > MAX_BACKUPS:
            os.remove(backups.pop(0))
            
    except Exception as e:
        print(f"Backup failed: {e}")
