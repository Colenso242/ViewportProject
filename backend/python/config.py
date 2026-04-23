"""Configuration settings for the sensor simulator."""
import os

class DatabaseConfig:
    """Database connection configuration."""
    MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    DB_NAME = os.getenv("DB_NAME", "iot_digital_twin")
    COLLECTION_NAME = "sensor_readings"
    LIVE_COLLECTION_NAME = "sensor_readings_live"
    CONNECTION_TIMEOUT_MS = 5000


class SensorConfig:
    """Sensor definitions and settings."""
    SENSORS # Temperature alerts are intentionally triggered at 85°C for the simulator's
    # 20-100°C operating range to represent a high-temperature condition near the
    # upper end of normal operation without requiring a full-scale maximum reading.
    TEMPERATURE_ALERT_THRESHOLD = 85

    SENSORS = [
        {
            "id": "temp-1",
            "type": "temperature",
            "min": 20,
            "max": 100,
            "threshold": TEMPERATURE_ALERT_THRESHOLD,
            "unit": "°C"
        },
        {
            "id": "rpm-1",
            "type": "rpm",
            "min": 0,
            "max": 5000,
            "threshold": 4500,
            "unit": "RPM"
        },
        {
            "id": "vib-1",
            "type": "vibration",
            "min": 0,
            "max": 10,
            "threshold": 8,
            "unit": "mm/s"
        }
    ]
    
    SPIKE_PROBABILITY = 0.1  # 10% chance of spike
    NORMAL_VARIANCE = 0.8    # 80% of range for normal readings
    SPIKE_VARIANCE = 1.0     # 100% of range for spike readings
    UPDATE_INTERVAL_SECONDS = 2


class TimeSeriesConfig:
    """MongoDB time series collection configuration."""
    TIME_FIELD = "timestamp"
    META_FIELD = "metadata"
    GRANULARITY = "seconds"
