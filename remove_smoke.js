const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const DB_NAME = process.env.MONGODB_DB || 'codomax';

(async () => {
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const blogs = db.collection('blogs');

    const filter = {
      $or: [
        { title: 'Smoke Test' },
        { author: 'Smoke Tester' },
        { content: /Smoke test/i }
      ]
    };

    const found = await blogs.find(filter).toArray();
    if (!found.length) {
      console.log('No smoke-test blogs found.');
      return process.exit(0);
    }

    console.log(`Found ${found.length} blog(s):`, found.map(b => b._id.toString()));

    const ids = found.map(b => b._id);
    const result = await blogs.deleteMany({ _id: { $in: ids } });
    console.log(`Deleted ${result.deletedCount} blog(s).`);
    process.exit(0);
  } catch (err) {
    console.error('Error removing smoke blogs:', err);
    process.exit(1);
  } finally {
    try { await client.close(); } catch (e) {}
  }
})();
