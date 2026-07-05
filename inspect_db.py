import sqlite3
import os
import glob

def main():
    # Find all jewellery_erp.db files in AppData/Roaming
    appdata = os.environ.get('APPDATA')
    if appdata:
        search_pattern = os.path.join(appdata, '**', 'jewellery_erp.db')
        print(f"Searching in AppData: {search_pattern}")
        db_files = glob.glob(search_pattern, recursive=True)
        print("Found DB files:", db_files)
        
        for dbPath in db_files:
            print(f"\nInspecting DB at: {dbPath}")
            try:
                conn = sqlite3.connect(dbPath)
                cursor = conn.cursor()
                
                # List tables
                cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
                tables = cursor.fetchall()
                print("  Tables:", tables)
                
                # Get schema for license_info if it exists
                cursor.execute("PRAGMA table_info(license_info)")
                columns = cursor.fetchall()
                print("  license_info columns:", columns)
                
                # Select rows
                cursor.execute("SELECT * FROM license_info")
                rows = cursor.fetchall()
                print("  license_info rows:")
                for r in rows:
                    print("    ", r)
                    
                conn.close()
            except Exception as e:
                print("  Error accessing DB:", e)
    else:
        print("APPDATA environment variable not found.")

if __name__ == '__main__':
    main()
