import mongoose from 'mongoose';
import argon2 from 'argon2';
import * as dotenv from 'dotenv';
import { AdminUser } from '../src/models';

dotenv.config();

const connectionString = process.env.MONGODB_URI;

if (!connectionString) {
  console.error('ERROR: MONGODB_URI not found in .env');
  process.exit(1);
}

const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('Usage: npx ts-node scripts/create-admin.ts <username> <password>');
  process.exit(1);
}

const [username, password] = args;

async function createAdmin() {
  try {
    await mongoose.connect(connectionString!);
    
    // Check if an admin already exists
    const adminCount = await AdminUser.countDocuments();
    if (adminCount > 0) {
       console.log('An Admin user already exists! You cannot create another one using this script.');
       process.exit(0);
    }

    if (password.length < 8) {
      console.log('Password must be at least 8 characters long.');
      process.exit(1);
    }

    const passwordHash = await argon2.hash(password);
    await AdminUser.create({
      username,
      passwordHash,
      role: 'admin'
    });

    console.log(`\nSUCCESS: Admin user '${username}' created successfully in MongoDB!`);
    console.log(`You can now login to your admin dashboard.\n`);
    process.exit(0);
  } catch (err) {
    console.error('Error creating admin:', err);
    process.exit(1);
  }
}

createAdmin();
