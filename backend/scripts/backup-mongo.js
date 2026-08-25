require('dotenv').config();
const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (_e) {}

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { MongoClient } = require('mongodb');

async function backupMongo() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('❌ MONGO_URI is missing in environment variables. Cannot perform MongoDB backup.');
    process.exit(1);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, '..', 'backups', `mongo_backup_${timestamp}`);
  fs.mkdirSync(backupDir, { recursive: true });

  console.log(`📦 Starting MongoDB backup to: ${backupDir}`);

  // Try mongodump first
  let mongodumpSuccess = false;
  try {
    console.log('🔍 Attempting BSON backup using mongodump...');
    execSync(`mongodump --uri="${mongoUri}" --out="${backupDir}"`, { stdio: 'inherit' });
    mongodumpSuccess = true;
    console.log('✅ Mongodump BSON backup completed successfully!');
  } catch (err) {
    console.warn('⚠️ mongodump CLI tool not found or failed. Falling back to JSON/BSON export strategy...');
  }

  if (!mongodumpSuccess) {
    console.log('🔄 Executing fallback collection export...');
    const client = new MongoClient(mongoUri);
    try {
      await client.connect();
      const db = client.db();
      const collections = await db.listCollections().toArray();

      for (const colDef of collections) {
        const colName = colDef.name;
        console.log(`  └─ Backing up collection: ${colName}...`);
        const docs = await db.collection(colName).find({}).toArray();
        const filePath = path.join(backupDir, `${colName}.json`);
        fs.writeFileSync(filePath, JSON.stringify(docs, null, 2));
      }
      console.log('✅ Fallback collection export completed successfully!');
    } catch (err) {
      console.error('❌ Fallback collection export failed:', err.message);
      process.exit(1);
    } finally {
      await client.close();
    }
  }

  console.log(`🎉 MongoDB Backup completed. Directory: ${backupDir}\n`);
}

if (require.main === module) {
  backupMongo().catch((err) => {
    console.error('❌ Backup process error:', err);
    process.exit(1);
  });
}

module.exports = backupMongo;
