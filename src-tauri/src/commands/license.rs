use crate::db::DbState;
use crate::hardware::{get_device_fingerprint, get_device_id};
use crate::models::LicenseStatus;
use rusqlite::params;
use serde_json::Value;
use tauri::State;

const SERVER_BASE_URL: &str = "https://jewellery-erp-pi.vercel.app";

#[tauri::command]
pub fn get_device_id_command() -> String {
    get_device_id()
}

#[tauri::command]
pub fn get_license_status(db: State<'_, DbState>) -> Result<LicenseStatus, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let device_id = get_device_id();

    let row = conn.query_row(
        "SELECT license_key, device_id, activation_date, expiry_date, license_type, trial_started_at, trial_expiry_at, last_active_time
         FROM license_info ORDER BY id DESC LIMIT 1",
        [],
        |r| {
            Ok((
                r.get::<_, Option<String>>(0)?,
                r.get::<_, String>(1)?,
                r.get::<_, Option<String>>(2)?,
                r.get::<_, Option<String>>(3)?,
                r.get::<_, String>(4)?,
                r.get::<_, Option<String>>(5)?,
                r.get::<_, Option<String>>(6)?,
                r.get::<_, Option<String>>(7)?,
            ))
        },
    ).ok();

    match row {
        None => Ok(LicenseStatus {
            activated: false,
            device_id,
            license_key: None,
            expiry_date: None,
            is_trial: false,
            is_trial_active: false,
            trial_days_remaining: None,
            status_message: "No license activated. Please activate or start a free trial.".to_string(),
        }),
        Some((lic_key, _dev_id, _act_date, exp_date, lic_type, _trial_start, trial_exp, _last_active)) => {
            if lic_type == "trial" {
                if let Some(ref exp_str) = trial_exp {
                    if let Ok(exp_time) = chrono::DateTime::parse_from_rfc3339(exp_str) {
                        let now = chrono::Utc::now();
                        if now > exp_time {
                            return Ok(LicenseStatus {
                                activated: false,
                                device_id,
                                license_key: lic_key,
                                expiry_date: trial_exp,
                                is_trial: true,
                                is_trial_active: false,
                                trial_days_remaining: Some(0),
                                status_message: "Free evaluation trial has expired. Commercial license activation is required.".to_string(),
                            });
                        } else {
                            let duration = exp_time.signed_duration_since(now);
                            let days = duration.num_days().max(0);
                            return Ok(LicenseStatus {
                                activated: false,
                                device_id,
                                license_key: lic_key,
                                expiry_date: trial_exp,
                                is_trial: true,
                                is_trial_active: true,
                                trial_days_remaining: Some(days),
                                status_message: format!("Trial Mode: {} days remaining.", days),
                            });
                        }
                    }
                }
            }

            Ok(LicenseStatus {
                activated: true,
                device_id,
                license_key: lic_key,
                expiry_date: exp_date,
                is_trial: false,
                is_trial_active: false,
                trial_days_remaining: None,
                status_message: "Lifetime Premium License Active".to_string(),
            })
        }
    }
}

#[tauri::command]
pub async fn start_trial(db: State<'_, DbState>) -> Result<LicenseStatus, String> {
    let device_id = get_device_id();
    let fp = get_device_fingerprint();

    // Call licensing server
    let client = reqwest::Client::new();
    let res = client
        .post(format!("{}/api/v1/trial/start", SERVER_BASE_URL))
        .json(&serde_json::json!({ "deviceFingerprint": fp }))
        .send()
        .await;

    let now_str = chrono::Utc::now().to_rfc3339();
    let expiry_str = (chrono::Utc::now() + chrono::Duration::days(7)).to_rfc3339();

    let mut expiry_date = expiry_str;
    let mut server_key: Option<String> = None;
    let mut token: Option<String> = None;

    if let Ok(resp) = res {
        if let Ok(val) = resp.json::<Value>().await {
            if val["success"].as_bool().unwrap_or(false) {
                if let Some(exp) = val["expiryDate"].as_str() {
                    expiry_date = exp.to_string();
                }
                server_key = val["publicKey"].as_str().map(|s| s.to_string());
                token = val["trialToken"].as_str().map(|s| s.to_string());
            }
        }
    }

    {
        let conn = db.lock().map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM license_info", []).ok();
        conn.execute(
            "INSERT INTO license_info (license_key, device_id, license_type, activation_token, server_public_key, trial_started_at, trial_expiry_at, last_active_time)
             VALUES ('TRIAL', ?1, 'trial', ?2, ?3, ?4, ?5, ?4)",
            params![device_id, token, server_key, now_str, expiry_date],
        ).map_err(|e| e.to_string())?;
    }

    get_license_status(db)
}

#[tauri::command]
pub async fn activate_license(key: String, db: State<'_, DbState>) -> Result<LicenseStatus, String> {
    let device_id = get_device_id();
    let fp = get_device_fingerprint();

    let client = reqwest::Client::new();
    let res = client
        .post(format!("{}/api/v1/license/activate", SERVER_BASE_URL))
        .json(&serde_json::json!({
            "licenseKey": key,
            "deviceFingerprint": fp,
        }))
        .send()
        .await
        .map_err(|e| format!("Failed to connect to license server: {}", e))?;

    let val: Value = res
        .json()
        .await
        .map_err(|e| format!("Invalid server response: {}", e))?;

    if !val["success"].as_bool().unwrap_or(false) {
        let msg = val["message"].as_str().unwrap_or("Activation failed");
        return Err(msg.to_string());
    }

    let token = val["activationToken"].as_str().unwrap_or("");
    let public_key = val["publicKey"].as_str();
    let now_str = chrono::Utc::now().to_rfc3339();

    {
        let conn = db.lock().map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM license_info", []).ok();
        conn.execute(
            "INSERT INTO license_info (license_key, device_id, activation_date, expiry_date, license_type, activation_token, server_public_key, last_verified_at, last_active_time)
             VALUES (?1, ?2, ?3, NULL, 'lifetime', ?4, ?5, ?3, ?3)",
            params![key, device_id, now_str, token, public_key],
        ).map_err(|e| e.to_string())?;
    }

    get_license_status(db)
}

#[tauri::command]
pub async fn recover_license(
    key: Option<String>,
    mobile: Option<String>,
    db: State<'_, DbState>,
) -> Result<LicenseStatus, String> {
    let fp = get_device_fingerprint();
    let client = reqwest::Client::new();
    let res = client
        .post(format!("{}/api/v1/license/recover", SERVER_BASE_URL))
        .json(&serde_json::json!({
            "licenseKey": key,
            "mobile": mobile,
            "deviceFingerprint": fp,
        }))
        .send()
        .await
        .map_err(|e| format!("Recovery network error: {}", e))?;

    let val: Value = res.json().await.map_err(|e| e.to_string())?;
    if !val["success"].as_bool().unwrap_or(false) {
        return Err(val["message"].as_str().unwrap_or("Recovery failed").to_string());
    }

    if let Some(token) = val["activationToken"].as_str() {
        let device_id = get_device_id();
        let now_str = chrono::Utc::now().to_rfc3339();
        let lic_key = val["licenseKey"].as_str().unwrap_or("RECOVERED");
        let conn = db.lock().map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM license_info", []).ok();
        conn.execute(
            "INSERT INTO license_info (license_key, device_id, activation_date, expiry_date, license_type, activation_token, last_verified_at, last_active_time)
             VALUES (?1, ?2, ?3, NULL, 'lifetime', ?4, ?3, ?3)",
            params![lic_key, device_id, now_str, token],
        ).map_err(|e| e.to_string())?;
    }

    get_license_status(db)
}

#[tauri::command]
pub async fn request_transfer(key: String, reason: String) -> Result<bool, String> {
    let fp = get_device_fingerprint();
    let client = reqwest::Client::new();
    let res = client
        .post(format!("{}/api/v1/license/transfer", SERVER_BASE_URL))
        .json(&serde_json::json!({
            "licenseKey": key,
            "reason": reason,
            "deviceFingerprint": fp,
        }))
        .send()
        .await
        .map_err(|e| format!("Transfer request failed: {}", e))?;

    let val: Value = res.json().await.map_err(|e| e.to_string())?;
    Ok(val["success"].as_bool().unwrap_or(false))
}
