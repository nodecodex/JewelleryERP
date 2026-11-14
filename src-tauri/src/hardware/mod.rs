use sha2::{Digest, Sha256};
use std::process::Command;
use std::sync::Mutex;

static CACHED_DEVICE_ID: Mutex<Option<String>> = Mutex::new(None);

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
pub struct DeviceFingerprint {
    #[serde(rename = "cpuId")]
    pub cpu_id: String,
    #[serde(rename = "motherboardSerial")]
    pub motherboard_serial: String,
    #[serde(rename = "diskSerial")]
    pub disk_serial: String,
    #[serde(rename = "machineGuid")]
    pub machine_guid: String,
    #[serde(rename = "osPlatform")]
    pub os_platform: String,
}

pub fn get_device_fingerprint() -> DeviceFingerprint {
    let mut cpu_id = "CPU-GENERIC".to_string();
    let mut mb_serial = "MB-GENERIC".to_string();
    let mut disk_serial = "DISK-GENERIC".to_string();
    let mut machine_guid = "GUID-GENERIC".to_string();

    #[cfg(target_os = "windows")]
    {
        // 1. Processor ID
        if let Ok(output) = Command::new("powershell")
            .args([
                "-NoProfile",
                "-Command",
                "Get-CimInstance Win32_Processor | Select-Object -ExpandProperty ProcessorId",
            ])
            .output()
        {
            let val = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !val.is_empty() {
                cpu_id = val;
            }
        }

        // 2. BaseBoard Serial Number
        if let Ok(output) = Command::new("powershell")
            .args([
                "-NoProfile",
                "-Command",
                "Get-CimInstance Win32_BaseBoard | Select-Object -ExpandProperty SerialNumber",
            ])
            .output()
        {
            let val = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !val.is_empty() {
                mb_serial = val;
            }
        }

        // 3. Disk Drive Serial Number
        if let Ok(output) = Command::new("powershell")
            .args([
                "-NoProfile",
                "-Command",
                "Get-CimInstance Win32_DiskDrive | Where-Object { $_.Index -eq 0 } | Select-Object -ExpandProperty SerialNumber",
            ])
            .output()
        {
            let val = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !val.is_empty() {
                disk_serial = val;
            }
        }

        // 4. Registry MachineGuid
        if let Ok(output) = Command::new("REG")
            .args(["QUERY", "HKLM\\SOFTWARE\\Microsoft\\Cryptography", "/v", "MachineGuid"])
            .output()
        {
            let val = String::from_utf8_lossy(&output.stdout);
            for line in val.lines() {
                if line.contains("MachineGuid") {
                    let parts: Vec<&str> = line.split_whitespace().collect();
                    if parts.len() >= 3 {
                        machine_guid = parts[parts.len() - 1].to_string();
                        break;
                    }
                }
            }
        }
    }

    DeviceFingerprint {
        cpu_id,
        motherboard_serial: mb_serial,
        disk_serial,
        machine_guid,
        os_platform: std::env::consts::OS.to_string(),
    }
}

pub fn get_device_id() -> String {
    let mut lock = CACHED_DEVICE_ID.lock().unwrap();
    if let Some(ref id) = *lock {
        return id.clone();
    }

    let fp = get_device_fingerprint();
    let raw_string = format!(
        "CPU:{}|MB:{}|DISK:{}|GUID:{}",
        fp.cpu_id, fp.motherboard_serial, fp.disk_serial, fp.machine_guid
    );

    let mut hasher = Sha256::new();
    hasher.update(raw_string.as_bytes());
    let hash = hasher.finalize();
    let id_str = hex::encode(hash).to_uppercase();

    *lock = Some(id_str.clone());
    id_str
}
