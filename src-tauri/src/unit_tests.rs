#[cfg(test)]
mod tests {
    use sha2::{Digest, Sha256};

    #[test]
    fn test_jewellery_fine_weight_calculation() {
        // Jewellery Formula: Net Weight = Gross Weight - Stone Weight
        // Fine Gold Weight = (Net Weight * Tounch) / 100
        let gross_weight: f64 = 15.650;
        let stone_weight: f64 = 1.200;
        let tounch: f64 = 91.60; // 22 Karat Gold (91.6% purity)

        let net_weight = gross_weight - stone_weight;
        assert!((net_weight - 14.450).abs() < 1e-4);

        let fine_gold = (net_weight * tounch) / 100.0;
        assert!((fine_gold - 13.2362).abs() < 1e-4);
    }

    #[test]
    fn test_gst_split_calculation() {
        // Standard Gold GST is 3% (1.5% CGST + 1.5% SGST for intra-state)
        let taxable_amount: f64 = 100000.0;
        let gst_rate: f64 = 3.0;

        let total_gst = (taxable_amount * gst_rate) / 100.0;
        let cgst = total_gst / 2.0;
        let sgst = total_gst / 2.0;

        assert_eq!(total_gst, 3000.0);
        assert_eq!(cgst, 1500.0);
        assert_eq!(sgst, 1500.0);
        assert_eq!(cgst + sgst, total_gst);
    }

    #[test]
    fn test_device_id_hash_consistency() {
        let cpu_id = "BFEBFBFF000906EA";
        let mb_serial = "L1HF87G019F";
        let disk_serial = "S3ZJNX0M105432";
        let machine_guid = "d87f7396-857e-4b47-b371-252a1a45bb32";

        let raw = format!("CPU:{}|MB:{}|DISK:{}|GUID:{}", cpu_id, mb_serial, disk_serial, machine_guid);
        let mut hasher = Sha256::new();
        hasher.update(raw.as_bytes());
        let hash1 = hex::encode(hasher.finalize()).to_uppercase();

        let mut hasher2 = Sha256::new();
        hasher2.update(raw.as_bytes());
        let hash2 = hex::encode(hasher2.finalize()).to_uppercase();

        assert_eq!(hash1, hash2);
        assert_eq!(hash1.len(), 64);
    }

    #[test]
    fn test_making_charges_types() {
        let weight: f64 = 12.500;
        let rate_per_gram: f64 = 450.0;
        let per_gram_making = weight * rate_per_gram;
        assert_eq!(per_gram_making, 5625.0);

        let fixed_making: f64 = 2500.0;
        assert_eq!(fixed_making, 2500.0);
    }
}
