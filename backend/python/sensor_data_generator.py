"""Sensor data generation logic."""
import random
from datetime import datetime
from config import SensorConfig


class SensorDataGenerator:
    """Generates realistic sensor readings with occasional spikes."""
    
    def __init__(self, sensors=None):
        self.sensors = sensors or SensorConfig.SENSORS
    
    def generate_reading(self, sensor):
        """
        Generate a single sensor reading.
        
        Args:
            sensor: Sensor configuration dictionary
            
        Returns:
            Dictionary containing the sensor reading document
        """
        value = self._calculate_value(sensor)
        is_critical = value >= sensor["threshold"]
        
        return {
            "timestamp": datetime.utcnow(),
            "metadata": {
                "sensorId": sensor["id"],
                "sensorType": sensor["type"],
                "unit": sensor["unit"],
                "threshold": sensor["threshold"]
            },
            "value": value,
            "isCritical": is_critical
        }
    
    def _calculate_value(self, sensor):
        """
        Calculate sensor value with occasional spikes.
        
        Args:
            sensor: Sensor configuration dictionary
            
        Returns:
            Float value representing the sensor reading
        """
        is_spike = random.random() < SensorConfig.SPIKE_PROBABILITY
        variance = SensorConfig.SPIKE_VARIANCE if is_spike else SensorConfig.NORMAL_VARIANCE
        
        range_size = sensor["max"] - sensor["min"]
        value = sensor["min"] + random.random() * (range_size * variance)
        
        return round(value, 2)
    
    def format_log_message(self, sensor, value, is_critical):
        """
        Format a log message for a sensor reading.
        
        Args:
            sensor: Sensor configuration dictionary
            value: Sensor reading value
            is_critical: Whether the reading is critical
            
        Returns:
            Formatted string for logging
        """
        status = "🔴 CRITICAL" if is_critical else "🟢 OK"
        timestamp = datetime.now().strftime('%H:%M:%S')
        return f"[{timestamp}] {sensor['id']}: {value} {sensor['unit']} {status}"
