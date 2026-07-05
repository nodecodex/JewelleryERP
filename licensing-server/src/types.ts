import { z } from 'zod';

export const DeviceFingerprintSchema = z.object({
  cpuId: z.string().min(1),
  motherboardSerial: z.string().min(1),
  diskSerial: z.string().min(1),
  machineGuid: z.string().min(1),
  osPlatform: z.string()
});

export type DeviceFingerprint = z.infer<typeof DeviceFingerprintSchema>;
