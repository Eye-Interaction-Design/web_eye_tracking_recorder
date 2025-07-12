import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SyncSystem } from '../src/core/SyncSystem';

describe('SyncSystem', () => {
  let syncSystem: SyncSystem;

  beforeEach(() => {
    syncSystem = new SyncSystem();
    vi.clearAllMocks();
  });

  describe('initializeSync', () => {
    it('should initialize sync with session ID', () => {
      const sessionId = 'test-session';
      syncSystem.initializeSync(sessionId);
      
      expect(syncSystem.getSessionStartTime()).toBeGreaterThan(0);
    });
  });

  describe('addSyncMarker', () => {
    it('should add a sync marker', () => {
      syncSystem.initializeSync('test-session');
      
      const marker = syncSystem.addSyncMarker('test_marker', { test: 'data' });
      
      expect(marker).toHaveProperty('id');
      expect(marker.sessionId).toBe('test-session');
      expect(marker.type).toBe('test_marker');
      expect(marker.data).toEqual({ test: 'data' });
    });
  });

  describe('getRelativeTimestamp', () => {
    it('should return relative timestamp', () => {
      syncSystem.initializeSync('test-session');
      
      const timestamp = syncSystem.getRelativeTimestamp();
      expect(timestamp).toBeGreaterThanOrEqual(0);
    });
  });

  describe('validateDataSync', () => {
    it('should validate data sync within threshold', () => {
      const result = syncSystem.validateDataSync(1000, 1010);
      expect(result).toBe(true);
    });

    it('should reject data sync outside threshold', () => {
      const result = syncSystem.validateDataSync(1000, 1020);
      expect(result).toBe(false);
    });
  });

  describe('calculateSyncQuality', () => {
    it('should return poor quality with insufficient markers', () => {
      syncSystem.initializeSync('test-session');
      
      const quality = syncSystem.calculateSyncQuality();
      expect(quality.quality).toBe('poor');
    });

    it('should calculate sync quality with multiple markers', () => {
      syncSystem.initializeSync('test-session');
      
      // Add multiple markers
      syncSystem.addSyncMarker('marker1');
      syncSystem.addSyncMarker('marker2');
      syncSystem.addSyncMarker('marker3');
      
      const quality = syncSystem.calculateSyncQuality();
      expect(quality).toHaveProperty('maxTimeOffset');
      expect(quality).toHaveProperty('averageOffset');
      expect(quality).toHaveProperty('quality');
    });
  });

  describe('stopSync', () => {
    it('should stop sync system', () => {
      syncSystem.initializeSync('test-session');
      syncSystem.stopSync();
      
      // Should not throw error
      expect(() => syncSystem.stopSync()).not.toThrow();
    });
  });
});