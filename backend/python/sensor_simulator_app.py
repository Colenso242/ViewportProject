"""Main application for the IoT sensor simulator."""
import time
import sys
from database_manager import DatabaseManager
from sensor_data_generator import SensorDataGenerator
from config import SensorConfig


class SensorSimulatorApp:
    """Application orchestrator for the sensor simulator."""
    
    def __init__(self):
        self.db_manager = DatabaseManager()
        self.data_generator = SensorDataGenerator()
        self.running = False
    
    def initialize(self):
        """Initialize the application and connect to database."""
        print("\n🚀 Initializing IoT Sensor Simulator...\n")
        
        if not self.db_manager.connect():
            print("\n✗ Failed to initialize. Exiting.")
            return False
        
        sensor_ids = [s['id'] for s in SensorConfig.SENSORS]
        print(f"\n📡 Configured sensors: {sensor_ids}")
        print(f"⏱️  Update interval: {SensorConfig.UPDATE_INTERVAL_SECONDS}s\n")
        
        return True
    
    def run(self):
        """Main application loop - generate and publish sensor data."""
        self.running = True
        
        try:
            print("▶️  Starting data generation...\n")
            
            while self.running:
                self._publish_sensor_batch()
                time.sleep(SensorConfig.UPDATE_INTERVAL_SECONDS)
                
        except KeyboardInterrupt:
            print("\n\n⏸️  Received shutdown signal")
        finally:
            self.shutdown()
    
    def _publish_sensor_batch(self):
        """Generate and publish readings for all sensors."""
        for sensor in SensorConfig.SENSORS:
            reading = self.data_generator.generate_reading(sensor)
            self.db_manager.insert_reading(reading)
            
            log_message = self.data_generator.format_log_message(
                sensor,
                reading["value"],
                reading["isCritical"]
            )
            print(log_message)
    
    def shutdown(self):
        """Clean shutdown of the application."""
        self.running = False
        self.db_manager.close()
        print("✓ Sensor simulator stopped\n")


def main():
    """Application entry point."""
    app = SensorSimulatorApp()
    
    if app.initialize():
        app.run()
    else:
        sys.exit(1)


if __name__ == "__main__":
    main()
