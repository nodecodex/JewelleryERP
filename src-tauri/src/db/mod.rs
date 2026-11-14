pub mod schema;

use rusqlite::Connection;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

pub type DbState = Arc<Mutex<Connection>>;

pub fn get_database_path() -> PathBuf {
    #[cfg(debug_assertions)]
    {
        // In development, store in project root outside src-tauri so Tauri's dev watcher is never triggered
        let cwd = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
        let root = if cwd.ends_with("src-tauri") {
            cwd.parent().unwrap_or(&cwd).to_path_buf()
        } else {
            cwd
        };
        root.join("database.sqlite")
    }
    #[cfg(not(debug_assertions))]
    {
        let base_dir = std::env::var("APPDATA")
            .map(PathBuf::from)
            .or_else(|_| std::env::var("HOME").map(|h| PathBuf::from(h).join(".local/share")))
            .unwrap_or_else(|_| PathBuf::from("."));
        let app_dir = base_dir.join("SwarnProERP");
        if !app_dir.exists() {
            let _ = std::fs::create_dir_all(&app_dir);
        }
        app_dir.join("database.sqlite")
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
