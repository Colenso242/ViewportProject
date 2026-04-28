"""Database connection and collection management."""
import threading
from pymongo import MongoClient
from pymongo.errors import ServerSelectionTimeoutError, OperationFailure
from config import DatabaseConfig, TimeSeriesConfig

class DatabaseManager:
    """Manages MongoDB connections and collections."""
    _instance = None
    _lock = threading.Lock()
    _initialized = False

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            with cls._lock:
                if not cls._instance:
                    cls._instance = super(DatabaseManager, cls).__new__(cls, *args, **kwargs)
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
            
        self.client = None
        self.db = None
        self.timeseries_collection = None
        self._initialized = True

    def connect(self):
        """Establish connection to MongoDB and initialize the time series collection."""
        try:
            self.client = MongoClient(
                DatabaseConfig.MONGO_URI,
                serverSelectionTimeoutMS=DatabaseConfig.CONNECTION_TIMEOUT_MS
            )
            self.client.admin.command('ping')
            print("Connected to MongoDB")

            self.db = self.client[DatabaseConfig.DB_NAME]
            self.initialize_timeseries_collection()

            return True

        except ServerSelectionTimeoutError:
            print(f"Could not connect to MongoDB at {DatabaseConfig.MONGO_URI}")
            print("Make sure mongod is running")
            return False

    def initialize_timeseries_collection(self):
        """Create or get the time series collection."""
        try:
            self.db.create_collection(
                DatabaseConfig.COLLECTION_NAME,
                timeseries={
                    'timeField': TimeSeriesConfig.TIME_FIELD,
                    'metaField': TimeSeriesConfig.META_FIELD,
                    'granularity': TimeSeriesConfig.GRANULARITY
                }
            )
            print(f"Created time series collection: {DatabaseConfig.COLLECTION_NAME}")
        except Exception as e:
            if "already exists" in str(e):
                print(f"Using existing time series collection: {DatabaseConfig.COLLECTION_NAME}")
            else:
                raise e

        self.timeseries_collection = self.db[DatabaseConfig.COLLECTION_NAME]

    def insert_reading(self, document):
        """
        Insert reading into the time series collection.
        This single write automatically triggers the Change Stream in Node.js
        for real-time frontend updates, eliminating the need for a dual write.

        Args:
            document: Sensor reading document to insert

        Returns:
            bool: True if write succeeded, False otherwise
        """
        try:
            self.timeseries_collection.insert_one(document)
            return True
        except Exception as e:
            print(f"Write to timeseries collection failed: {e}")
            return False

    def close(self):
        """Close the database connection."""
        if self.client:
            self.client.close()
            print("MongoDB connection closed")