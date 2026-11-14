const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

async function resetDeviceTrial() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const deviceHash = '0C5E79BAC3CC963730931776E1A383DC55126128347B51588FCED4C6080BAD56';

    const device = await db.collection('deviceregistries').findOne({ device_hash: deviceHash });
    console.log('Found device:', device ? device._id : 'Not found');

    if (device) {
      const delTrialRes = await db.collection('trialusers').deleteMany({ device_id: device._id });
      console.log('Deleted trial records:', delTrialRes.deletedCount);

      // Also clean up any audit logs or reset flags if needed
      console.log('Trial records cleared successfully for device:', deviceHash);
    } else {
      console.log('Device not found, checking trialusers directly...');
      const allTrials = await db.collection('trialusers').find({}).toArray();
      console.log('Existing trials:', allTrials.length);
      const delAll = await db.collection('trialusers').deleteMany({});
      console.log('Deleted trials:', delAll.deletedCount);
    }

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (err) {
    console.error('Error during reset:', err);
    process.exit(1);
  }
}

resetDeviceTrial();
