const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  console.log('[Migration] Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smartcare');
  const db = mongoose.connection.db;

  const backupDir = path.join(__dirname, '../../backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const collections = await db.listCollections().toArray();
  const collectionNames = collections.map(c => c.name);

  const backupData = {};

  // 1. Backup Community Cards
  if (collectionNames.includes('communitycards')) {
    backupData.communitycards = await db.collection('communitycards').find({}).toArray();
    console.log(`[Migration] Backed up ${backupData.communitycards.length} community card records.`);
  }

  // 2. Backup Discount Rules
  if (collectionNames.includes('discountrules')) {
    backupData.discountrules = await db.collection('discountrules').find({}).toArray();
    console.log(`[Migration] Backed up ${backupData.discountrules.length} discount rule records.`);
  }

  // 3. Backup Discount Applications
  if (collectionNames.includes('discountapplications')) {
    backupData.discountapplications = await db.collection('discountapplications').find({}).toArray();
    console.log(`[Migration] Backed up ${backupData.discountapplications.length} discount application records.`);
  }

  // Write backup JSON file
  const backupFilePath = path.join(backupDir, `backup_community_cards_${Date.now()}.json`);
  fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2));
  console.log(`[Migration] Safe backup written to: ${backupFilePath}`);

  // 4. Drop collections
  if (collectionNames.includes('communitycards')) {
    await db.collection('communitycards').drop();
    console.log('[Migration] Dropped collection: communitycards');
  }
  if (collectionNames.includes('discountrules')) {
    await db.collection('discountrules').drop();
    console.log('[Migration] Dropped collection: discountrules');
  }
  if (collectionNames.includes('discountapplications')) {
    await db.collection('discountapplications').drop();
    console.log('[Migration] Dropped collection: discountapplications');
  }

  // 5. Clean up stale references in donors and users
  if (collectionNames.includes('donors')) {
    await db.collection('donors').updateMany({}, {
      $unset: { cardId: '', discountTier: '', cardTier: '' }
    });
    console.log('[Migration] Cleaned card references in donors.');
  }

  if (collectionNames.includes('users')) {
    await db.collection('users').updateMany({}, {
      $unset: { cardId: '', communityCardId: '' }
    });
    console.log('[Migration] Cleaned card references in users.');
  }

  await mongoose.disconnect();
  console.log('[Migration] Migration completed successfully!');
}

runMigration().catch((err) => {
  console.error('[Migration Error]:', err);
  process.exit(1);
});
