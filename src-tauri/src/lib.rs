pub mod commands;
pub mod db;
pub mod hardware;
pub mod models;

#[cfg(test)]
mod unit_tests;

use db::{init_database, DbState};
use std::sync::{Arc, Mutex};
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            // Initialize SQLite Database with full schemas and migrations
            let conn = init_database().expect("Failed to initialize SQLite database");
            let db_state: DbState = Arc::new(Mutex::new(conn));
            app.manage(db_state);

            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Company
            commands::company::get_companies,
            commands::company::create_company,
            commands::company::update_company,
            commands::company::delete_company,
            // Products
            commands::product::get_products,
            commands::product::get_product_by_barcode,
            commands::product::create_product,
            commands::product::update_product,
            commands::product::delete_product,
            // Parties / Customers / Suppliers
            commands::party::get_parties,
            commands::party::create_party,
            commands::party::update_party,
            commands::party::delete_party,
            commands::party::get_customers,
            commands::party::get_suppliers,
            // Taxes
            commands::tax::get_taxes,
            commands::tax::create_tax,
            commands::tax::update_tax,
            commands::tax::delete_tax,
            // Invoices
            commands::invoice::get_invoices,
            commands::invoice::get_next_invoice_number,
            commands::invoice::create_invoice,
            commands::invoice::delete_invoice,
            commands::invoice::get_tag_stock_report,
            commands::invoice::get_tag_accessories,
            // Rates
            commands::rate::get_daily_rates,
            commands::rate::save_daily_rates,
            // Vouchers & Accounting
            commands::voucher::get_accounts,
            commands::voucher::create_account,
            commands::voucher::get_vouchers,
            commands::voucher::create_voucher,
            commands::voucher::get_ledger_report,
            // Tag Opening & Labour & Stock Limits
            commands::tag_opening::get_tag_opening_vouchers,
            commands::tag_opening::create_tag_opening_voucher,
            commands::tag_opening::update_tag_opening_voucher,
            commands::tag_opening::delete_tag_opening_voucher,
            commands::tag_opening::get_party_wise_labour,
            commands::tag_opening::save_party_wise_labour,
            commands::tag_opening::delete_party_wise_labour,
            commands::tag_opening::get_item_stock_limits,
            commands::tag_opening::save_item_stock_limit,
            commands::tag_opening::delete_item_stock_limit,
            // Purchase
            commands::purchase::get_purchase_vouchers,
            commands::purchase::create_purchase_voucher,
            commands::purchase::update_purchase_voucher,
            commands::purchase::delete_purchase_voucher,
            // Scanner & Hardware Devices
            commands::scanner::get_device_configurations,
            commands::scanner::save_device_configuration,
            commands::scanner::get_printer_configurations,
            commands::scanner::save_printer_configuration,
            commands::scanner::log_scan,
            commands::scanner::get_scan_history,
            commands::scanner::is_barcode_unique,
            commands::scanner::is_qr_unique,
            commands::scanner::search_scanned_value,
            // License
            commands::license::get_device_id_command,
            commands::license::get_license_status,
            commands::license::start_trial,
            commands::license::activate_license,
            commands::license::recover_license,
            commands::license::request_transfer,
            // Backup & Reports
            commands::backup::create_backup,
            commands::backup::restore_backup,
            commands::backup::sync_with_cloud,
            commands::backup::get_stock_report,
            commands::backup::save_to_pdf,
            // Users
            commands::user::get_users,
            commands::user::create_user,
            commands::user::update_user_permissions,
            commands::user::update_user_password,
            commands::user::delete_user,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
