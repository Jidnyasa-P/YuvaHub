import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.log("No MONGODB_URI found.");
    return;
  }
  
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DB_NAME || 'yuvahub');
    const cols = await db.listCollections().toArray();
    console.log("Connected to DB! Collections:", cols.map(c => c.name));
    
    // Insert sample data
    const collection = db.collection('test_connection');
    const result = await collection.insertOne({ test: true, timestamp: new Date() });
    console.log("Sample data inserted with ID:", result.insertedId);
    
    const opps = await db.collection("opportunities").find({}).limit(2).toArray();
    console.log("Sample opportunities:", opps.map(o => o.title));
    
  } catch(e) {
    console.error("Error connecting:", e);
  } finally {
    await client.close();
  }
}
test();
