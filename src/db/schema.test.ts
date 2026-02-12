import { describe, it, expect } from 'vitest';
import { events, players, participations } from './schema.js';

describe('Database Schema', () => {
  describe('events table', () => {
    it('必要なカラムが定義されていること', () => {
      const columns = Object.keys(events);
      expect(columns).toContain('id');
      expect(columns).toContain('eventId');
      expect(columns).toContain('name');
      expect(columns).toContain('date');
      expect(columns).toContain('city');
      expect(columns).toContain('createdAt');
      expect(columns).toContain('updatedAt');
    });
  });

  describe('players table', () => {
    it('必要なカラムが定義されていること', () => {
      const columns = Object.keys(players);
      expect(columns).toContain('id');
      expect(columns).toContain('playerIdMasked');
      expect(columns).toContain('firstName');
      expect(columns).toContain('lastName');
      expect(columns).toContain('country');
      expect(columns).toContain('createdAt');
      expect(columns).toContain('updatedAt');
    });
  });

  describe('participations table', () => {
    it('必要なカラムが定義されていること', () => {
      const columns = Object.keys(participations);
      expect(columns).toContain('id');
      expect(columns).toContain('playerId');
      expect(columns).toContain('eventId');
      expect(columns).toContain('division');
      expect(columns).toContain('deckListUrl');
      expect(columns).toContain('standing');
      expect(columns).toContain('createdAt');
      expect(columns).toContain('updatedAt');
    });
  });
});
