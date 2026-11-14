use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Company {
    pub id: String,
    pub name: String,
    pub financial_year_start: String,
    pub financial_year_end: String,
    pub gstin: Option<String>,
    pub pan: Option<String>,
    pub bank_name: Option<String>,
    pub bank_account_no: Option<String>,
    pub bank_ifsc: Option<String>,
    pub address: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub settings_json: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct User {
    pub id: String,
    pub company_id: Option<String>,
    pub username: String,
    pub role: String,
    pub permissions_json: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Product {
    pub id: String,
    pub company_id: String,
    pub name: String,
    pub sku: String,
    pub barcode: Option<String>,
    pub qr_code: Option<String>,
    pub category: String,
    pub weight: f64,
    pub tounch: f64,
    pub gross_weight: f64,
    pub fine: f64,
    pub purity: Option<String>,
    pub stone_weight: f64,
    pub making_charges: f64,
    pub making_charges_type: Option<String>,
    pub hsn_code: Option<String>,
    pub gst_rate: f64,
    pub purchase_price: f64,
    pub selling_price: f64,
    pub current_stock: i64,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Customer {
    pub id: String,
    pub company_id: String,
    pub name: String,
    pub mobile: String,
    pub address: Option<String>,
    pub pan: Option<String>,
    pub gstin: Option<String>,
    pub email: Option<String>,
    pub loyalty_points: i64,
    pub created_at: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Supplier {
    pub id: String,
    pub company_id: String,
    pub name: String,
    pub mobile: String,
    pub address: Option<String>,
    pub pan: Option<String>,
    pub gstin: Option<String>,
    pub email: Option<String>,
    pub created_at: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Account {
    pub id: String,
    pub company_id: String,
    pub name: String,
    pub code: String,
    pub parent_group: String,
    pub opening_balance: f64,
    pub current_balance: f64,
    pub created_at: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct SalesItem {
    pub id: Option<String>,
    pub sales_invoice_id: Option<String>,
    pub product_id: Option<String>,
    pub product_name: String,
    pub weight: f64,
    pub net_weight: f64,
    pub gross_weight: f64,
    pub purity: Option<String>,
    pub making_charges: f64,
    pub rate: f64,
    pub quantity: i64,
    pub tax_rate: f64,
    pub tax_amount: f64,
    pub subtotal: f64,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct SalesInvoice {
    pub id: Option<String>,
    pub company_id: String,
    pub invoice_number: String,
    pub invoice_date: String,
    pub customer_id: Option<String>,
    pub invoice_type: Option<String>,
    pub tax_type: Option<String>,
    pub gross_amount: f64,
    pub discount_amount: f64,
    pub tax_amount: f64,
    pub making_charges_total: f64,
    pub round_off: Option<f64>,
    pub net_amount: f64,
    pub payment_mode: Option<String>,
    pub paid_amount: Option<f64>,
    pub balance_amount: Option<f64>,
    pub status: Option<String>,
    pub created_at: Option<String>,
    pub items: Option<Vec<SalesItem>>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct JournalItem {
    pub id: Option<String>,
    pub journal_entry_id: Option<String>,
    pub account_id: String,
    pub debit: f64,
    pub credit: f64,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct JournalEntry {
    pub id: Option<String>,
    pub company_id: String,
    pub entry_date: String,
    pub voucher_type: String,
    pub voucher_number: String,
    pub reference_id: Option<String>,
    pub narration: Option<String>,
    pub items: Option<Vec<JournalItem>>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct DailyRate {
    pub id: Option<String>,
    pub company_id: String,
    pub rate_date: String,
    pub gold_rate_24k: f64,
    pub gold_rate_22k: f64,
    pub gold_rate_18k: f64,
    pub silver_rate: f64,
    pub rates_json: Option<String>,
    pub employee: Option<String>,
    pub created_at: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Party {
    pub id: Option<String>,
    pub company_id: String,
    pub code: String,
    pub name: String,
    pub group_id: Option<String>,
    pub group_name: Option<String>,
    pub mobile: Option<String>,
    pub phone: Option<String>,
    pub contact_person: Option<String>,
    pub ac_short: Option<String>,
    pub address1: Option<String>,
    pub address2: Option<String>,
    pub address3: Option<String>,
    pub city: Option<String>,
    pub pin_code: Option<String>,
    pub city_area: Option<String>,
    pub gst_no: Option<String>,
    pub gst_type: Option<String>,
    pub pan_no: Option<String>,
    pub state: Option<String>,
    pub district: Option<String>,
    pub email: Option<String>,
    pub ref_by: Option<String>,
    pub opening_amount: Option<f64>,
    pub opening_amount_type: Option<String>,
    pub opening_gold: Option<f64>,
    pub opening_gold_type: Option<String>,
    pub opening_silver: Option<f64>,
    pub opening_silver_type: Option<String>,
    pub last_visit: Option<String>,
    pub ledger_date: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Tax {
    pub id: Option<String>,
    pub company_id: String,
    pub code: String,
    pub name: String,
    pub tax_type: Option<String>,
    pub tax_desc: Option<String>,
    pub tax_percent: f64,
    pub add_tax_percent: f64,
    pub ac_code: Option<String>,
    pub ac_name: Option<String>,
    pub components_json: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct LicenseStatus {
    pub activated: bool,
    #[serde(rename = "deviceId")]
    pub device_id: String,
    #[serde(rename = "licenseKey")]
    pub license_key: Option<String>,
    #[serde(rename = "expiryDate")]
    pub expiry_date: Option<String>,
    #[serde(rename = "isTrial")]
    pub is_trial: bool,
    #[serde(rename = "isTrialActive")]
    pub is_trial_active: bool,
    #[serde(rename = "trialDaysRemaining")]
    pub trial_days_remaining: Option<i64>,
    #[serde(rename = "statusMessage")]
    pub status_message: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ScanLog {
    pub company_id: String,
    pub user_id: Option<String>,
    pub device_name: Option<String>,
    pub screen_name: Option<String>,
    pub scanned_value: String,
    pub scan_type: String,
    pub result_status: String,
}
