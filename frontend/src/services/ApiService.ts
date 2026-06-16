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

  static async fetchPlacements(modelId: string) {
    const response = await fetch(`${this.baseUrl}/placements/${encodeURIComponent(modelId)}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch placements: ${response.statusText}`);
    }
    return response.json();
  }

  static async createPlacement(placement: {
    placementId: string;
    modelId: string;
    sensorId: string;
    position: { x: number; y: number; z: number };
  }) {
    const response = await fetch(`${this.baseUrl}/placements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(placement)
    });
    if (!response.ok) {
      throw new Error(`Failed to create placement: ${response.statusText}`);
    }
    return response.json();
  }

  static async updatePlacement(placementId: string, sensorId: string) {
    const response = await fetch(`${this.baseUrl}/placements/${encodeURIComponent(placementId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sensorId })
    });
    if (!response.ok) {
      throw new Error(`Failed to update placement: ${response.statusText}`);
    }
    return response.json();
  }

  static async deletePlacement(placementId: string) {
    const response = await fetch(`${this.baseUrl}/placements/${encodeURIComponent(placementId)}`, {
      method: 'DELETE'
    });
    if (!response.ok) {
      throw new Error(`Failed to delete placement: ${response.statusText}`);
    }
    return response.json();
  }
}

