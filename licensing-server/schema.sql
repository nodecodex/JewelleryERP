-- PostgreSQL Database Initialization Script for SwarnPro ERP Licensing System

-- Create Tables
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    mobile VARCHAR(20) NOT NULL UNIQUE,
    email VARCHAR(255) UNIQUE,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS licenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    license_key VARCHAR(100) NOT NULL UNIQUE,
    license_type VARCHAR(50) NOT NULL CHECK (license_type IN ('trial', 'lifetime', 'subscription')),
    max_devices INT DEFAULT 1,
    status VARCHAR(50) DEFAULT 'issued' CHECK (status IN ('issued', 'active', 'suspended', 'expired')),
    expiry_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS device_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_hash VARCHAR(64) NOT NULL UNIQUE,
    cpu_id VARCHAR(100) NOT NULL,
    motherboard_serial VARCHAR(100) NOT NULL,
    disk_serial VARCHAR(100) NOT NULL,
    machine_guid VARCHAR(100) NOT NULL,
    os_platform VARCHAR(50) NOT NULL,
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS license_activations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    license_id UUID NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
    device_id UUID NOT NULL REFERENCES device_registry(id) ON DELETE RESTRICT,
    activation_token TEXT NOT NULL,
    activation_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_verified_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE (license_id, device_id)
);

CREATE TABLE IF NOT EXISTS trial_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID NOT NULL REFERENCES device_registry(id) ON DELETE CASCADE,
    installation_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expiry_date TIMESTAMP WITH TIME ZONE NOT NULL,
    trial_token TEXT NOT NULL,
    is_expired BOOLEAN DEFAULT FALSE,
    UNIQUE (device_id)
);

CREATE TABLE IF NOT EXISTS license_transfer_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    license_id UUID NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
    old_device_id UUID NOT NULL REFERENCES device_registry(id),
    new_device_id UUID NOT NULL REFERENCES device_registry(id),
    reason TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE,
    processed_by VARCHAR(100),
    admin_note TEXT
);

CREATE TABLE IF NOT EXISTS license_recovery_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    license_id UUID REFERENCES licenses(id) ON DELETE SET NULL,
    device_id UUID REFERENCES device_registry(id) ON DELETE SET NULL,
    recovery_type VARCHAR(50) NOT NULL CHECK (recovery_type IN ('windows_reinstall', 'manual_recovery')),
    status VARCHAR(50) NOT NULL,
    ip_address VARCHAR(45),
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_type VARCHAR(100) NOT NULL,
    details TEXT,
    performed_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_licenses_key ON licenses(license_key);
CREATE INDEX IF NOT EXISTS idx_device_hash ON device_registry(device_hash);
CREATE INDEX IF NOT EXISTS idx_device_phys ON device_registry(cpu_id, motherboard_serial, disk_serial);
CREATE INDEX IF NOT EXISTS idx_activations_token ON license_activations(activation_token);
