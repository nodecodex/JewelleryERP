import sqlite3
import os

def run_migration():
    db_path = r"C:\Users\jagji\AppData\Roaming\Electron\swarnpro_erp.db"
    if not os.path.exists(db_path):
        print("DB file not found.")
        return
        
    print(f"Connecting to {db_path}...")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check current columns
        cursor.execute("PRAGMA table_info(license_info)")
        cols = cursor.fetchall()
        print("Columns before migration:", cols)
        
        # Disable foreign keys
        cursor.execute("PRAGMA foreign_keys = OFF")
        
        # Start transaction
        cursor.execute("BEGIN TRANSACTION")
        
        cursor.execute("ALTER TABLE license_info RENAME TO _license_info_old")
        
        cursor.execute("""
          CREATE TABLE license_info (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            license_key TEXT,
            device_id TEXT NOT NULL,
            activation_date TEXT,
            expiry_date TEXT,
            license_type TEXT DEFAULT 'trial',
            activation_token TEXT,
            trial_started_at TEXT,
            trial_expiry_at TEXT,
            last_verified_at TEXT,
            last_active_time TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        """)
        
        # Copy data, dynamically selecting columns that exist in the old table
        old_cols = [c[1] for c in cols]
        target_cols = [
          'id', 'license_key', 'device_id', 'activation_date', 'expiry_date',
          'license_type', 'activation_token', 'trial_started_at', 'trial_expiry_at',
          'last_verified_at', 'last_active_time'
        ]
        common_cols = [col for col in target_cols if col in old_cols]
        if 'created_at' in old_cols:
            common_cols.append('created_at')
            
        cols_str = ", ".join(common_cols)
        cursor.execute(f"""
          INSERT INTO license_info ({cols_str})
          SELECT {cols_str} FROM _license_info_old
        """)
        
        cursor.execute("DROP TABLE _license_info_old")
        
        conn.commit()
        cursor.execute("PRAGMA foreign_keys = ON")
        print("Migration committed successfully!")
        
        # Check columns after
        cursor.execute("PRAGMA table_info(license_info)")
        cols_after = cursor.fetchall()
        print("Columns after migration:", cols_after)
        
    except Exception as e:
        print("Error during migration, rolling back:", e)
        conn.rollback()
    finally:
        conn.close()

if __name__ == '__main__':
    run_migration()
