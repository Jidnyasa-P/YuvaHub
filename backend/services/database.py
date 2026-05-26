import os
import motor.motor_asyncio
from dotenv import load_dotenv

load_dotenv()

class Database:
    client: motor.motor_asyncio.AsyncIOMotorClient = None
    db = None

    @classmethod
    async def connect_db(cls):
        uri = os.getenv("MONGODB_URI")
        db_name = os.getenv("MONGODB_DB_NAME", "yuvahub")
        if not uri:
            # Fallback for development if no URI is provided
            print("[WARNING] MONGODB_URI not found. Using local mock.")
            return

        cls.client = motor.motor_asyncio.AsyncIOMotorClient(uri)
        cls.db = cls.client[db_name]
        print(f"[SUCCESS] Connected to MongoDB: {db_name}")

    @classmethod
    async def close_db(cls):
        if cls.client:
            cls.client.close()
            print("[INFO] MongoDB connection closed.")

db = Database
