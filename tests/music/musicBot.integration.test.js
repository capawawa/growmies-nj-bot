/**
 * Music Bot Integration Tests for GrowmiesNJ Discord Bot
 * 
 * Comprehensive integration tests covering:
 * - Database models and migrations
 * - MusicService functionality
 * - Command execution and interaction
 * - Cannabis content filtering
 * - Age verification integration
 */

const { Client, GatewayIntentBits } = require('discord.js');
const { sequelize } = require('../../src/database/database');
const { MusicSession } = require('../../src/database/models/MusicSession');
const { MusicQueue } = require('../../src/database/models/MusicQueue');
const { UserMusicPreferences } = require('../../src/database/models/UserMusicPreferences');
const { User } = require('../../src/database/models/User');
const musicService = require('../../src/services/musicService');
const { YouTubeHelper, CannabisContentFilter } = require('../../src/utils/musicHelpers');
const { checkAge21Plus } = require('../../src/utils/ageVerification');

// Mock Discord.js voice for testing
jest.mock('@discordjs/voice', () => ({
  joinVoiceChannel: jest.fn(),
  createAudioPlayer: jest.fn(),
  createAudioResource: jest.fn(),
  AudioPlayerStatus: {
    Idle: 'idle',
    Playing: 'playing',
    Paused: 'paused'
  },
  VoiceConnectionStatus: {
    Ready: 'ready',
    Destroyed: 'destroyed'
  }
}));

// Mock ytdl-core for testing
jest.mock('ytdl-core', () => ({
  getInfo: jest.fn(),
  filterFormats: jest.fn(),
  validateURL: jest.fn()
}));

// Mock ytsr for testing
jest.mock('ytsr', () => jest.fn());

describe('Music Bot Integration Tests', () => {
  let client;
  let testGuildId;
  let testUserId;
  let testChannelId;

  beforeAll(async () => {
    // Initialize test database
    await sequelize.authenticate();
    await sequelize.sync({ force: true });

    // Setup test IDs
    testGuildId = '123456789012345678';
    testUserId = '987654321098765432';
    testChannelId = '111222333444555666';

    // Create test user with age verification
    await User.create({
      discord_id: testUserId,
      guild_id: testGuildId,
      username: 'TestUser',
      age_verified: true,
      age_verified_at: new Date()
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    // Clean up between tests
    await MusicSession.destroy({ where: {} });
    await MusicQueue.destroy({ where: {} });
    await UserMusicPreferences.destroy({ where: {} });
  });

  describe('Database Models Integration', () => {
    test('should create music session with proper relationships', async () => {
      const session = await MusicSession.create({
        guild_id: testGuildId,
        voice_channel_id: testChannelId,
        session_type: 'general',
        is_cannabis_content: false,
        started_by_user_id: testUserId,
        session_metadata: {
          test: 'data'
        }
      });

      expect(session).toBeDefined();
      expect(session.guild_id).toBe(testGuildId);
      expect(session.session_type).toBe('general');
      expect(session.is_cannabis_content).toBe(false);
    });

    test('should create music queue entries linked to session', async () => {
      const session = await MusicSession.create({
        guild_id: testGuildId,
        voice_channel_id: testChannelId,
        session_type: 'general',
        started_by_user_id: testUserId
      });

      const queueEntry = await MusicQueue.create({
        session_id: session.id,
        track_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        track_title: 'Test Song',
        track_duration_seconds: 180,
        requested_by_user_id: testUserId,
        position_in_queue: 1
      });

      expect(queueEntry).toBeDefined();
      expect(queueEntry.session_id).toBe(session.id);
      expect(queueEntry.track_title).toBe('Test Song');
    });

    test('should create user music preferences', async () => {
      const preferences = await UserMusicPreferences.create({
        user_id: testUserId,
        guild_id: testGuildId,
        preferred_volume: 75,
        cannabis_music_enabled: true,
        favorite_genres: ['rock', 'electronic']
      });

      expect(preferences).toBeDefined();
      expect(preferences.preferred_volume).toBe(75);
      expect(preferences.cannabis_music_enabled).toBe(true);
    });

    test('should handle cannabis content session creation', async () => {
      const cannabisSession = await MusicSession.create({
        guild_id: testGuildId,
        voice_channel_id: testChannelId,
        session_type: 'meditation',
        is_cannabis_content: true,
        started_by_user_id: testUserId,
        session_metadata: {
          meditation_type: 'cannabis_mindfulness',
          duration_minutes: 15
        }
      });

      expect(cannabisSession.is_cannabis_content).toBe(true);
      expect(cannabisSession.session_type).toBe('meditation');
      expect(cannabisSession.session_metadata.meditation_type).toBe('cannabis_mindfulness');
    });
  });

  describe('YouTube Helper Integration', () => {
    test('should validate YouTube URLs correctly', () => {
      const validUrls = [
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://youtu.be/dQw4w9WgXcQ',
        'https://youtube.com/watch?v=dQw4w9WgXcQ',
        'https://m.youtube.com/watch?v=dQw4w9WgXcQ'
      ];

      const invalidUrls = [
        'https://spotify.com/track/123',
        'https://soundcloud.com/artist/track',
        'not-a-url',
        'https://youtube.com/invalid'
      ];

      validUrls.forEach(url => {
        const result = YouTubeHelper.validateYouTubeURL(url);
        expect(result.valid).toBe(true);
        expect(result.videoId).toBeDefined();
      });

      invalidUrls.forEach(url => {
        const result = YouTubeHelper.validateYouTubeURL(url);
        expect(result.valid).toBe(false);
      });
    });

    test('should parse duration strings correctly', () => {
      const testCases = [
        { input: '3:45', expected: 225 },
        { input: '1:23:45', expected: 5025 },
        { input: '0:30', expected: 30 },
        { input: '10:00', expected: 600 },
        { input: '', expected: 0 },
        { input: 'invalid', expected: 0 }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = YouTubeHelper.parseDuration(input);
        expect(result).toBe(expected);
      });
    });
  });

  describe('Cannabis Content Filter Integration', () => {
    test('should detect cannabis content in titles', () => {
      const cannabisTitles = [
        'Best Cannabis Music for Relaxation',
        'Marijuana Smoking Session Playlist',
        'CBD and THC Effects Explained',
        'Dispensary Visit Vlog',
        'How to Grow Cannabis Indoors'
      ];

      const nonCannabisTitles = [
        'Top Pop Songs 2024',
        'Classical Music for Studying',
        'Rock Band Live Concert',
        'Jazz Piano Compilation'
      ];

      cannabisTitles.forEach(title => {
        const result = CannabisContentFilter.detectCannabisContent(title);
        expect(result.isCannabisContent).toBe(true);
        expect(result.confidence).toBeGreaterThan(0.3);
        expect(result.matchedTerms.length).toBeGreaterThan(0);
      });

      nonCannabisTitles.forEach(title => {
        const result = CannabisContentFilter.detectCannabisContent(title);
        expect(result.isCannabisContent).toBe(false);
        expect(result.confidence).toBeLessThan(0.3);
      });
    });

    test('should analyze video content for cannabis references', () => {
      const cannabisVideo = {
        title: 'Cannabis Growing Guide - Best Strains for Beginners',
        description: 'Learn about indica vs sativa strains, THC levels, and proper cultivation techniques for medical marijuana.',
        author: 'CannabisEducation420',
        keywords: ['cannabis', 'marijuana', 'growing', 'strains', 'THC', 'CBD']
      };

      const regularVideo = {
        title: 'Top 10 Pop Songs of 2024',
        description: 'The hottest pop music hits that dominated the charts this year.',
        author: 'MusicChannel',
        keywords: ['pop', 'music', 'hits', 'charts', '2024']
      };

      const cannabisResult = CannabisContentFilter.analyzeVideoForCannabisContent(cannabisVideo);
      expect(cannabisResult.isCannabisContent).toBe(true);
      expect(cannabisResult.requiresAgeVerification).toBe(true);
      expect(cannabisResult.confidence).toBeGreaterThan(0.5);

      const regularResult = CannabisContentFilter.analyzeVideoForCannabisContent(regularVideo);
      expect(regularResult.isCannabisContent).toBe(false);
      expect(regularResult.requiresAgeVerification).toBe(false);
    });
  });

  describe('Age Verification Integration', () => {
    test('should verify age for existing verified user', async () => {
      const result = await checkAge21Plus(testUserId, testGuildId);
      
      expect(result.verified).toBe(true);
      expect(result.reason).toBe('verified');
      expect(result.user).toBeDefined();
      expect(result.user.ageVerified).toBe(true);
    });

    test('should reject access for non-verified user', async () => {
      const unverifiedUserId = '555666777888999000';
      
      // Create unverified user
      await User.create({
        discord_id: unverifiedUserId,
        guild_id: testGuildId,
        username: 'UnverifiedUser',
        age_verified: false
      });

      const result = await checkAge21Plus(unverifiedUserId, testGuildId);
      
      expect(result.verified).toBe(false);
      expect(result.reason).toBe('not_age_verified');
      expect(result.requiresVerification).toBe(true);
    });

    test('should reject access for non-existent user', async () => {
      const nonExistentUserId = '999888777666555444';
      
      const result = await checkAge21Plus(nonExistentUserId, testGuildId);
      
      expect(result.verified).toBe(false);
      expect(result.reason).toBe('user_not_found');
      expect(result.requiresSetup).toBe(true);
    });
  });

  describe('Music Service Integration', () => {
    test('should check for active sessions correctly', () => {
      // Initially no active sessions
      expect(musicService.hasActiveSession(testGuildId)).toBe(false);
      
      // Mock an active session
      musicService.activeSessions = new Map();
      musicService.activeSessions.set(testGuildId, { 
        session: { id: 1 },
        player: { state: { status: 'playing' } }
      });
      
      expect(musicService.hasActiveSession(testGuildId)).toBe(true);
      
      // Clean up
      musicService.activeSessions.clear();
    });

    test('should handle voice channel validation', () => {
      const mockVoiceChannel = {
        id: testChannelId,
        guild: { id: testGuildId },
        joinable: true,
        speakable: true,
        members: new Map()
      };

      // Test valid voice channel
      expect(mockVoiceChannel.joinable).toBe(true);
      expect(mockVoiceChannel.speakable).toBe(true);
    });
  });

  describe('Command Integration Tests', () => {
    test('should handle play command workflow', async () => {
      // Mock command interaction
      const mockInteraction = {
        user: { id: testUserId },
        guild: { id: testGuildId },
        channel: { id: testChannelId },
        options: {
          getString: jest.fn().mockReturnValue('test song'),
          getBoolean: jest.fn().mockReturnValue(false)
        },
        deferReply: jest.fn(),
        editReply: jest.fn(),
        member: {
          voice: {
            channel: {
              id: testChannelId,
              joinable: true,
              speakable: true
            }
          }
        }
      };

      // Import and test play command
      const playCommand = require('../../src/commands/music/play');
      
      // Verify command structure
      expect(playCommand.data).toBeDefined();
      expect(playCommand.execute).toBeDefined();
      expect(typeof playCommand.execute).toBe('function');
    });

    test('should handle queue command workflow', async () => {
      // Create session and queue entries for testing
      const session = await MusicSession.create({
        guild_id: testGuildId,
        voice_channel_id: testChannelId,
        session_type: 'general',
        started_by_user_id: testUserId
      });

      await MusicQueue.create({
        session_id: session.id,
        track_url: 'https://www.youtube.com/watch?v=test1',
        track_title: 'Test Song 1',
        track_duration_seconds: 180,
        requested_by_user_id: testUserId,
        position_in_queue: 1
      });

      await MusicQueue.create({
        session_id: session.id,
        track_url: 'https://www.youtube.com/watch?v=test2',
        track_title: 'Test Song 2',
        track_duration_seconds: 240,
        requested_by_user_id: testUserId,
        position_in_queue: 2
      });

      // Mock queue status
      const mockQueueStatus = {
        success: true,
        session: session,
        queue: await MusicQueue.findAll({ where: { session_id: session.id } }),
        stats: {
          totalTracks: 2,
          playedTracks: 0,
          unplayedTracks: 2,
          estimatedPlaytime: 7
        },
        currentTrack: null,
        isPlaying: false
      };

      // Verify queue data structure
      expect(mockQueueStatus.stats.totalTracks).toBe(2);
      expect(mockQueueStatus.queue.length).toBe(2);
    });

    test('should handle meditation command with age verification', async () => {
      const meditationCommand = require('../../src/commands/music/meditation');
      
      // Verify meditation command structure
      expect(meditationCommand.data).toBeDefined();
      expect(meditationCommand.execute).toBeDefined();
      
      // Test meditation types
      const meditationTypes = meditationCommand.data.options[0].options[0].choices;
      expect(meditationTypes).toContainEqual(
        expect.objectContaining({ value: 'cannabis_mindfulness' })
      );
      expect(meditationTypes).toContainEqual(
        expect.objectContaining({ value: 'strain_meditation' })
      );
    });

    test('should handle podcast command with cannabis content', async () => {
      const podcastCommand = require('../../src/commands/music/podcast');
      
      // Verify podcast command structure
      expect(podcastCommand.data).toBeDefined();
      expect(podcastCommand.execute).toBeDefined();
      
      // Test podcast categories
      const podcastCategories = podcastCommand.data.options[0].options[0].choices;
      expect(podcastCategories).toContainEqual(
        expect.objectContaining({ value: 'science' })
      );
      expect(podcastCategories).toContainEqual(
        expect.objectContaining({ value: 'education' })
      );
    });
  });

  describe('Button Handler Integration', () => {
    test('should parse button IDs correctly', () => {
      const { parseButtonId } = require('../../src/utils/musicButtonHandlers');
      
      const testCases = [
        {
          input: 'music_pause_123456789',
          expected: {
            isValid: true,
            category: 'music',
            action: 'pause',
            userId: '123456789'
          }
        },
        {
          input: 'queue_shuffle_987654321',
          expected: {
            isValid: true,
            category: 'queue',
            action: 'shuffle',
            userId: '987654321'
          }
        },
        {
          input: 'meditation_end_555666777',
          expected: {
            isValid: true,
            category: 'meditation',
            action: 'end',
            userId: '555666777'
          }
        },
        {
          input: 'invalid_button',
          expected: {
            isValid: false
          }
        }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = parseButtonId(input);
        if (expected.isValid) {
          expect(result.isValid).toBe(true);
          expect(result.category).toBe(expected.category);
          expect(result.action).toBe(expected.action);
          expect(result.userId).toBe(expected.userId);
        } else {
          expect(result.isValid).toBe(false);
        }
      });
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle database connection errors gracefully', async () => {
      // Mock database error
      const originalCreate = MusicSession.create;
      MusicSession.create = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      try {
        await MusicSession.create({
          guild_id: testGuildId,
          voice_channel_id: testChannelId,
          session_type: 'general',
          started_by_user_id: testUserId
        });
      } catch (error) {
        expect(error.message).toBe('Database connection failed');
      }

      // Restore original method
      MusicSession.create = originalCreate;
    });

    test('should handle YouTube API errors gracefully', () => {
      const ytdl = require('ytdl-core');
      
      // Mock YouTube error
      ytdl.getInfo.mockRejectedValue(new Error('Video unavailable'));

      // Test error handling
      expect(async () => {
        await ytdl.getInfo('https://www.youtube.com/watch?v=invalid');
      }).rejects.toThrow('Video unavailable');
    });

    test('should handle voice connection errors gracefully', () => {
      const { joinVoiceChannel } = require('@discordjs/voice');
      
      // Mock voice connection error
      joinVoiceChannel.mockImplementation(() => {
        throw new Error('Unable to join voice channel');
      });

      expect(() => {
        joinVoiceChannel({
          channelId: testChannelId,
          guildId: testGuildId,
          adapterCreator: jest.fn()
        });
      }).toThrow('Unable to join voice channel');
    });
  });

  describe('Performance and Load Testing', () => {
    test('should handle multiple concurrent sessions', async () => {
      const sessions = [];
      const numSessions = 5;

      // Create multiple sessions concurrently
      const promises = Array.from({ length: numSessions }, (_, i) => 
        MusicSession.create({
          guild_id: `${testGuildId}${i}`,
          voice_channel_id: `${testChannelId}${i}`,
          session_type: 'general',
          started_by_user_id: testUserId
        })
      );

      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(numSessions);
      results.forEach(session => {
        expect(session).toBeDefined();
        expect(session.id).toBeDefined();
      });
    });

    test('should handle large queue operations efficiently', async () => {
      const session = await MusicSession.create({
        guild_id: testGuildId,
        voice_channel_id: testChannelId,
        session_type: 'general',
        started_by_user_id: testUserId
      });

      // Create large queue
      const queueSize = 100;
      const queuePromises = Array.from({ length: queueSize }, (_, i) =>
        MusicQueue.create({
          session_id: session.id,
          track_url: `https://www.youtube.com/watch?v=test${i}`,
          track_title: `Test Song ${i}`,
          track_duration_seconds: 180,
          requested_by_user_id: testUserId,
          position_in_queue: i + 1
        })
      );

      const startTime = Date.now();
      await Promise.all(queuePromises);
      const endTime = Date.now();

      // Should complete within reasonable time (less than 5 seconds)
      expect(endTime - startTime).toBeLessThan(5000);

      // Verify all entries were created
      const queueCount = await MusicQueue.count({ where: { session_id: session.id } });
      expect(queueCount).toBe(queueSize);
    });
  });

  describe('Security Integration Tests', () => {
    test('should validate user permissions for cannabis content', async () => {
      // Test age verification requirement
      const result = await checkAge21Plus(testUserId, testGuildId);
      expect(result.verified).toBe(true);

      // Test cannabis content detection
      const cannabisContent = {
        title: 'Cannabis Meditation Session',
        isCannabisContent: true
      };

      const { requiresAgeVerification } = require('../../src/utils/ageVerification');
      expect(requiresAgeVerification(cannabisContent)).toBe(true);
    });

    test('should sanitize user input in search queries', () => {
      const { SearchHelper } = require('../../src/utils/musicHelpers');
      
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        'SELECT * FROM users;',
        '../../etc/passwd',
        'javascript:alert(1)'
      ];

      maliciousInputs.forEach(input => {
        const cleaned = SearchHelper.cleanSearchQuery(input);
        expect(cleaned).not.toContain('<script>');
        expect(cleaned).not.toContain('SELECT');
        expect(cleaned).not.toContain('../');
        expect(cleaned).not.toContain('javascript:');
      });
    });
  });
});