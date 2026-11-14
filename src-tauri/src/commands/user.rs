use crate::db::DbState;
use crate::models::User;
use rusqlite::params;
use tauri::State;
use uuid::Uuid;

#[tauri::command]
pub fn get_users(company_id: String, db: State<'_, DbState>) -> Result<Vec<User>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, company_id, username, role, permissions_json, created_at, updated_at
             FROM users WHERE company_id = ?1 ORDER BY username ASC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![company_id], |row| {
            Ok(User {
                id: row.get(0)?,
                company_id: row.get(1)?,
                username: row.get(2)?,
                role: row.get(3)?,
                permissions_json: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut list = Vec::new();
    for r in rows {
        if let Ok(u) = r {
            list.push(u);
        }
    }
    Ok(list)
}

#[tauri::command]
pub fn create_user(user: User, password: Option<String>, db: State<'_, DbState>) -> Result<User, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let pass = password.unwrap_or_else(|| "123456".to_string());
    let perms = user.permissions_json.clone().unwrap_or_else(|| "{}".to_string());

    conn.execute(
        "INSERT INTO users (id, company_id, username, password_hash, role, permissions_json)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![id, user.company_id, user.username, pass, user.role, perms],
    )
    .map_err(|e| e.to_string())?;

    let mut res = user;
    res.id = id;
    Ok(res)
}

#[tauri::command]
pub fn update_user_permissions(
    id: String,
    permissions_json: String,
    db: State<'_, DbState>,
) -> Result<bool, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE users SET permissions_json = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
        params![permissions_json, id],
    )
    .map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
pub fn update_user_password(
    id: String,
    _old_password: String,
    new_password: String,
    db: State<'_, DbState>,
) -> Result<bool, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE users SET password_hash = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
        params![new_password, id],
    )
    .map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
pub fn delete_user(id: String, db: State<'_, DbState>) -> Result<bool, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM users WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(true)
}
