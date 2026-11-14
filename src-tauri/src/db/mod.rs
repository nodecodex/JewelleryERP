pub mod schema;

use rusqlite::Connection;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

pub type DbState = Arc<Mutex<Connection>>;

pub fn get_database_path() -> PathBuf {
    #[cfg(debug_assertions)]
    {
        PathBuf::from("database.sqlite")
    }
    #[cfg(not(debug_assertions))]
    {
        let mut path = dirs::data_dir().unwrap_or_else(|| PathBuf::from("."));
        path.push("com.SwarnProERP.app");
        if !path.exists() {
            let _ = fs::create_dir_all(&path);
        }
        path.push("database.sqlite");
        path
    }
}

pub fn init_database() -> Result<Connection, rusqlite::Error> {
    let db_path = get_database_path();
    let conn = Connection::open(&db_path)?;

    // Enable foreign keys and WAL mode for high performance
    conn.execute_batch(
        "PRAGMA foreign_keys = ON;
         PRAGMA journal_mode = WAL;
         PRAGMA synchronous = NORMAL;",
    )?;

    // Run migrations
    schema::run_migrations(&conn)?;

    Ok(conn)
}
