export class ApiService {
  private static get baseUrl() {
    return window.location.hostname === 'localhost' ? 'http://localhost:3000/api' : '/api';
  }

  static async fetchHistory(sensorId: string, limit: number = 500, timeRangeMinutes: number = 60) {
    const response = await fetch(`${this.baseUrl}/sensors/${sensorId}/history?limit=${limit}&timeRangeMinutes=${timeRangeMinutes}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch historical data: ${response.statusText}`);
    }
    return response.json();
  }

  static async checkHealth() {
    const response = await fetch(`${this.baseUrl}/health`);
    if (!response.ok) throw new Error('API Offline');
    return response.json();
  }
}

