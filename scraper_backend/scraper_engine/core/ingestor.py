import os
import logging
from typing import List, Dict, Any
from datetime import datetime

try:
    from dotenv import load_dotenv
    # search parent/root folder for .env
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    dotenv_path = os.path.join(base_dir, '.env')
    if os.path.exists(dotenv_path):
        load_dotenv(dotenv_path)
    else:
        load_dotenv()
except ImportError:
    pass

try:
    from pymongo import MongoClient, UpdateOne
    MONGO_AVAILABLE = True
except ImportError:
    MongoClient = None
    UpdateOne = None
    MONGO_AVAILABLE = False

class Ingestor:
    """
    Handles persisting scraped data into MongoDB with deduplication.
    """
    def __init__(self):
        self.uri = os.getenv("MONGODB_URI")
        self.db_name = os.getenv("MONGODB_DB_NAME", "yuvahub")
        self.client = None
        self.db = None
        
        if self.uri and MONGO_AVAILABLE:
            try:
                self.client = MongoClient(self.uri)
                self.db = self.client[self.db_name]
                # Ensure index for speed
                self.db.opportunities.create_index("fingerprint", unique=True)
                logging.info(f"Ingestor connected to MongoDB: {self.db_name}")
            except Exception as ex:
                logging.warning(f"Connection failed to MongoDB: {ex}. Falling back to mock/stream.")
                self.db = None
        else:
            logging.warning("No MONGODB_URI found or pymongo not installed! Ingestor running in mock/stream mode.")

    def save_batch(self, items: List[Dict[str, Any]]) -> Dict[str, int]:
        if not items:
            return {"inserted": 0, "updated": 0}
            
        if not self.db:
            print(f"[INGESTOR MOCK] Would save {len(items)} items to Mongo.")
            for item in items[:2]:
                print(f" - Item: {item.get('title')}")
            return {"inserted": len(items), "updated": 0}

        ops = []
        for item in items:
            # Use fingerprint as upsert key to avoid duplicates
            fingerprint = item.get("fingerprint")
            if not fingerprint: continue
            
            # Add timestamps
            item["updated_at"] = datetime.utcnow()
            if "created_at" not in item:
                item["created_at"] = datetime.utcnow()

            ops.append(
                UpdateOne(
                    {"fingerprint": fingerprint},
                    {"$set": item},
                    upsert=True
                )
            )

        if ops:
            result = self.db.opportunities.bulk_write(ops)
            return {
                "inserted": result.upserted_count,
                "updated": result.modified_count + result.matched_count
            }
        
        return {"inserted": 0, "updated": 0}

    def close(self):
        if self.client:
            self.client.close()
