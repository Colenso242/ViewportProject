import time
import random
from datetime import datetime
from pymongo import MongoClient
from pymongo.errors import ServerSelectionTimeoutError

# MongoDB connection
MONGO_URI = "mongodb://localhost:27017"
DB_NAME = "iot_digital_twin"
COLLECTION_NAME = "sensor_readings"

try:
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    client.admin.command('ping')
    print("✓ Connected to MongoDB")
except ServerSelectionTimeoutError:
    print("✗ Could not connect to MongoDB. Make sure mongod is running on localhost:27017")
    exit(1)

db = client[DB_NAME]

# Create or get time series collection
try:
    db.create_collection(
        COLLECTION_NAME,
        timeseries={
            "timeField": "timestamp",
            "metaField": "metadata",
            "granularity": "seconds"
        }
    )
    print(f"✓ Created time series collection: {COLLECTION_NAME}")
except Exception as e:
    if "already exists" in str(e):
        print(f"✓ Using existing collection: {COLLECTION_NAME}")
    else:
        print(f"Error creating collection: {e}")

collection = db[COLLECTION_NAME]

# Sensor definitions
sensors = [
    {"id": "temp-1", "type": "temperature", "min": 20, "max": 100, "threshold": 50, "unit": "°C"},
    {"id": "rpm-1", "type": "rpm", "min": 0, "max": 5000, "threshold": 4500, "unit": "RPM"},
    {"id": "vib-1", "type": "vibration", "min": 0, "max": 10, "threshold": 8, "unit": "mm/s"}
]

print("\n🚀 Starting sensor data generation...")
print(f"Sensors: {[s['id'] for s in sensors]}\n")

try:
    while True:
        for sensor in sensors:
            # Simulate occasional spikes (10% chance)
            is_spike = random.random() > 0.9
            variance = (sensor["max"] - sensor["min"]) * (1.0 if is_spike else 0.8)
            value = sensor["min"] + random.random() * variance
            value = round(value, 2)

            # Create time series document
            document = {
                "timestamp": datetime.utcnow(),
                "metadata": {
                    "sensorId": sensor["id"],
                    "sensorType": sensor["type"],
                    "unit": sensor["unit"],
                    "threshold": sensor["threshold"]
                },
                "value": value,
                "isCritical": value >= sensor["threshold"]
            }

            # Single write to Time Series collection (source of truth)
            collection.insert_one(document)

            status = "🔴 CRITICAL" if document["isCritical"] else "🟢 OK"
            print(f"[{datetime.now().strftime('%H:%M:%S')}] {sensor['id']}: {value} {sensor['unit']} {status}")

        time.sleep(2)

except KeyboardInterrupt:
    print("\n\n✓ Sensor simulator stopped")
    client.close()
    print("✓ MongoDB connection closed")

