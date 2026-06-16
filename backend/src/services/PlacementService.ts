import { Collection } from 'mongodb';
import { SensorPlacement } from '../types';

export class PlacementService {
  constructor(private placementsCollection: Collection<SensorPlacement>) {}

  async getByModel(modelId: string): Promise<SensorPlacement[]> {
    try {
      return await this.placementsCollection
        .find({ modelId }, { projection: { _id: 0 } })
        .sort({ createdAt: 1 })
        .toArray();
    } catch (error) {
      console.error(`Failed to fetch placements for model ${modelId}:`, error);
      throw error;
    }
  }

  async create(placement: Omit<SensorPlacement, '_id' | 'createdAt' | 'updatedAt'>): Promise<SensorPlacement> {
    const now = new Date();
    const doc: SensorPlacement = { ...placement, createdAt: now, updatedAt: now };
    try {
      await this.placementsCollection.insertOne(doc);
      const { _id, ...created } = doc;
      return created;
    } catch (error) {
      console.error('Failed to create placement:', error);
      throw error;
    }
  }

  async updateSensor(placementId: string, sensorId: string): Promise<boolean> {
    try {
      const result = await this.placementsCollection.updateOne(
        { placementId },
        { $set: { sensorId, updatedAt: new Date() } }
      );
      return result.matchedCount > 0;
    } catch (error) {
      console.error(`Failed to update placement ${placementId}:`, error);
      throw error;
    }
  }

  async remove(placementId: string): Promise<boolean> {
    try {
      const result = await this.placementsCollection.deleteOne({ placementId });
      return result.deletedCount > 0;
    } catch (error) {
      console.error(`Failed to delete placement ${placementId}:`, error);
      throw error;
    }
  }
}
