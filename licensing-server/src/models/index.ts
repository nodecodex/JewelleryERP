import mongoose, { Schema, Document } from 'mongoose';

// AdminUser
export interface IAdminUser extends Document {
  username: string;
  passwordHash: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}
const AdminUserSchema = new Schema({
  username: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, default: 'admin' }
}, { timestamps: true });
export const AdminUser = mongoose.model<IAdminUser>('AdminUser', AdminUserSchema);

// Customer
export interface ICustomer extends Document {
  name: string;
  mobile: string;
  email?: string;
  status: 'active' | 'suspended' | 'deleted';
  createdAt: Date;
  updatedAt: Date;
}
const CustomerSchema = new Schema({
  name: { type: String, required: true },
  mobile: { type: String, required: true, unique: true },
  email: { type: String, unique: true, sparse: true },
  status: { type: String, enum: ['active', 'suspended', 'deleted'], default: 'active' }
}, { timestamps: true });
export const Customer = mongoose.model<ICustomer>('Customer', CustomerSchema);

// License
export interface ILicense extends Document {
  customer_id: mongoose.Types.ObjectId;
  license_key: string;
  license_type: 'trial' | 'lifetime' | 'subscription';
  max_devices: number;
  status: 'issued' | 'active' | 'suspended' | 'expired';
  expiry_date?: Date;
  createdAt: Date;
  updatedAt: Date;
}
const LicenseSchema = new Schema({
  customer_id: { type: Schema.Types.ObjectId, ref: 'Customer' },
  license_key: { type: String, required: true, unique: true },
  license_type: { type: String, required: true, enum: ['trial', 'lifetime', 'subscription'] },
  max_devices: { type: Number, default: 1 },
  status: { type: String, default: 'issued', enum: ['issued', 'active', 'suspended', 'expired'] },
  expiry_date: { type: Date }
}, { timestamps: true });
export const License = mongoose.model<ILicense>('License', LicenseSchema);

// DeviceRegistry
export interface IDeviceRegistry extends Document {
  device_hash: string;
  cpu_id: string;
  motherboard_serial: string;
  disk_serial: string;
  machine_guid: string;
  os_platform: string;
  createdAt: Date;
  updatedAt: Date;
}
const DeviceRegistrySchema = new Schema({
  device_hash: { type: String, required: true, unique: true },
  cpu_id: { type: String, required: true },
  motherboard_serial: { type: String, required: true },
  disk_serial: { type: String, required: true },
  machine_guid: { type: String, required: true },
  os_platform: { type: String, required: true }
}, { timestamps: true });
export const DeviceRegistry = mongoose.model<IDeviceRegistry>('DeviceRegistry', DeviceRegistrySchema);

// LicenseActivation
export interface ILicenseActivation extends Document {
  license_id: mongoose.Types.ObjectId;
  device_id: mongoose.Types.ObjectId;
  activation_token: string;
  activation_date: Date;
  last_verified_at: Date;
  is_active: boolean;
}
const LicenseActivationSchema = new Schema({
  license_id: { type: Schema.Types.ObjectId, ref: 'License', required: true },
  device_id: { type: Schema.Types.ObjectId, ref: 'DeviceRegistry', required: true },
  activation_token: { type: String, required: true },
  activation_date: { type: Date, default: Date.now },
  last_verified_at: { type: Date, default: Date.now },
  is_active: { type: Boolean, default: true }
});
LicenseActivationSchema.index({ license_id: 1, device_id: 1 }, { unique: true });
export const LicenseActivation = mongoose.model<ILicenseActivation>('LicenseActivation', LicenseActivationSchema);

// TrialUser
export interface ITrialUser extends Document {
  device_id: mongoose.Types.ObjectId;
  installation_date: Date;
  expiry_date: Date;
  trial_token: string;
  is_expired: boolean;
}
const TrialUserSchema = new Schema({
  device_id: { type: Schema.Types.ObjectId, ref: 'DeviceRegistry', required: true, unique: true },
  installation_date: { type: Date, default: Date.now },
  expiry_date: { type: Date, required: true },
  trial_token: { type: String, required: true },
  is_expired: { type: Boolean, default: false }
});
export const TrialUser = mongoose.model<ITrialUser>('TrialUser', TrialUserSchema);

// LicenseTransferRequest
export interface ILicenseTransferRequest extends Document {
  license_id: mongoose.Types.ObjectId;
  old_device_id: mongoose.Types.ObjectId;
  new_device_id: mongoose.Types.ObjectId;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: Date;
  processed_at?: Date;
  processed_by?: string;
  admin_note?: string;
}
const LicenseTransferRequestSchema = new Schema({
  license_id: { type: Schema.Types.ObjectId, ref: 'License', required: true },
  old_device_id: { type: Schema.Types.ObjectId, ref: 'DeviceRegistry', required: true },
  new_device_id: { type: Schema.Types.ObjectId, ref: 'DeviceRegistry', required: true },
  reason: { type: String, required: true },
  status: { type: String, default: 'pending', enum: ['pending', 'approved', 'rejected'] },
  requested_at: { type: Date, default: Date.now },
  processed_at: { type: Date },
  processed_by: { type: String },
  admin_note: { type: String }
});
export const LicenseTransferRequest = mongoose.model<ILicenseTransferRequest>('LicenseTransferRequest', LicenseTransferRequestSchema);

// LicenseRecoveryLog
export interface ILicenseRecoveryLog extends Document {
  license_id?: mongoose.Types.ObjectId;
  device_id?: mongoose.Types.ObjectId;
  recovery_type: 'windows_reinstall' | 'manual_recovery';
  status: string;
  ip_address?: string;
  requested_at: Date;
}
const LicenseRecoveryLogSchema = new Schema({
  license_id: { type: Schema.Types.ObjectId, ref: 'License' },
  device_id: { type: Schema.Types.ObjectId, ref: 'DeviceRegistry' },
  recovery_type: { type: String, required: true, enum: ['windows_reinstall', 'manual_recovery'] },
  status: { type: String, required: true },
  ip_address: { type: String },
  requested_at: { type: Date, default: Date.now }
});
export const LicenseRecoveryLog = mongoose.model<ILicenseRecoveryLog>('LicenseRecoveryLog', LicenseRecoveryLogSchema);

// AuditLog
export interface IAuditLog extends Document {
  action_type: string;
  details?: string;
  performed_by: string;
  createdAt: Date;
  updatedAt: Date;
}
const AuditLogSchema = new Schema({
  action_type: { type: String, required: true },
  details: { type: String },
  performed_by: { type: String, required: true }
}, { timestamps: true });
export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
