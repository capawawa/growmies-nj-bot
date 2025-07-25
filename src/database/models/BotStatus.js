const { DataTypes, Model, Op } = require('sequelize');
const { sequelize } = require('../connection');

/**
 * BotStatus Model - Third-party bot monitoring and health tracking
 * 
 * Monitors system health and performance metrics for GrowmiesNJ Discord bot:
 * - Real-time system health and performance tracking
 * - Discord API and database connectivity monitoring
 * - Error tracking and alerting thresholds
 * - Deployment and version management
 * 
 * Production Deployment Monitoring:
 * - Railway.app integration for cloud deployment metrics
 * - Environment-specific health tracking
 * - Uptime and reliability statistics
 * - Resource utilization monitoring
 * 
 * Third-party Integration:
 * - Health endpoint integration for external monitoring
 * - Alert system compatibility
 * - Performance trend analysis
 * 
 * @class BotStatus
 * @extends {Model}
 */
class BotStatus extends Model {
  /**
   * Get or create current bot status for environment
   * Implements singleton pattern per environment
   * 
   * @param {string} environment - Environment name
   * @param {string} version - Bot version
   * @returns {Promise<BotStatus>} Current status instance
   */
  static async getCurrentStatus(environment = 'production', version = '1.0.0') {
    try {
      let status = await this.findOne({
        where: { environment },
        order: [['created_at', 'DESC']]
      });

      if (!status) {
        status = await this.create({
          bot_version: version,
          environment,
          status: 'online',
          last_restart_at: new Date()
        });
        console.log(`[BotStatus] Created new status record for ${environment}`);
      }

      return status;
    } catch (error) {
      console.error(`[BotStatus] Error getting current status for ${environment}:`, error);
      throw error;
    }
  }

  /**
   * Update bot status with current metrics
   * 
   * @param {Object} metrics - Health metrics object
   * @returns {Promise<BotStatus>} Updated instance
   */
  async updateStatus(metrics = {}) {
    try {
      const {
        status = this.status,
        uptime_seconds = this.uptime_seconds,
        memory_usage_mb = this.memory_usage_mb,
        cpu_usage_percent = this.cpu_usage_percent,
        discord_latency_ms = this.discord_latency_ms,
        database_latency_ms = this.database_latency_ms,
        active_guilds = this.active_guilds,
        active_users = this.active_users,
        error_count_24h = this.error_count_24h,
        health_metrics = {},
        deployment_info = {}
      } = metrics;

      // Update basic metrics
      this.status = status;
      this.uptime_seconds = uptime_seconds;
      this.memory_usage_mb = memory_usage_mb;
      this.cpu_usage_percent = cpu_usage_percent;
      this.discord_latency_ms = discord_latency_ms;
      this.database_latency_ms = database_latency_ms;
      this.active_guilds = active_guilds;
      this.active_users = active_users;
      this.error_count_24h = error_count_24h;

      // Update complex metrics
      this.health_metrics = { ...this.health_metrics, ...health_metrics };
      this.deployment_info = { ...this.deployment_info, ...deployment_info };

      // Update performance trends
      this.updatePerformanceTrends({
        timestamp: new Date(),
        memory_usage_mb,
        cpu_usage_percent,
        discord_latency_ms,
        database_latency_ms
      });

      this.updated_at = new Date();
      await this.save();

      console.log(`[BotStatus] Updated status for ${this.environment} - Health Score: ${this.getHealthScore()}`);
      return this;
    } catch (error) {
      console.error(`[BotStatus] Error updating status for ${this.environment}:`, error);
      throw error;
    }
  }

  /**
   * Calculate overall health score (0-100)
   * @returns {number} Health score
   */
  getHealthScore() {
    let score = 100;

    // Status penalties
    if (this.status === 'offline') score -= 50;
    else if (this.status === 'degraded') score -= 25;
    else if (this.status === 'maintenance') score -= 10;

    // Performance penalties
    if (this.memory_usage_mb > 500) score -= 15; // High memory usage
    if (this.cpu_usage_percent > 80) score -= 15; // High CPU usage
    if (this.discord_latency_ms > 200) score -= 10; // Poor Discord latency
    if (this.database_latency_ms > 100) score -= 10; // Poor database latency
    if (this.error_count_24h > 10) score -= 20; // Too many errors

    // Uptime bonus
    const uptimeHours = this.uptime_seconds / 3600;
    if (uptimeHours > 72) score += 5; // Good uptime bonus

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Record error occurrence
   * @param {string} errorType - Type of error
   * @param {string} message - Error message
   * @param {Object} metadata - Additional error metadata
   * @returns {Promise<BotStatus>} Updated instance
   */
  async recordError(errorType, message, metadata = {}) {
    try {
      this.error_count_24h += 1;
      
      const errorLog = {
        timestamp: new Date(),
        type: errorType,
        message,
        metadata
      };

      // Add to health metrics
      const healthMetrics = { ...this.health_metrics };
      if (!healthMetrics.recent_errors) {
        healthMetrics.recent_errors = [];
      }
      
      healthMetrics.recent_errors.unshift(errorLog);
      
      // Keep only last 50 errors
      healthMetrics.recent_errors = healthMetrics.recent_errors.slice(0, 50);
      
      this.health_metrics = healthMetrics;
      this.updated_at = new Date();
      
      await this.save();
      
      console.log(`[BotStatus] Recorded error: ${errorType} - ${message}`);
      return this;
    } catch (error) {
      console.error('[BotStatus] Error recording error:', error);
      throw error;
    }
  }

  /**
   * Update performance trends data
   * @param {Object} dataPoint - Performance data point
   */
  updatePerformanceTrends(dataPoint) {
    const trends = { ...this.performance_trends };
    
    if (!trends.data_points) {
      trends.data_points = [];
    }
    
    trends.data_points.unshift(dataPoint);
    
    // Keep last 24 hours of data (assuming 5-minute intervals = 288 points)
    trends.data_points = trends.data_points.slice(0, 288);
    
    // Calculate averages
    const recent = trends.data_points.slice(0, 12); // Last hour
    trends.averages = {
      memory_usage_mb: this.calculateAverage(recent, 'memory_usage_mb'),
      cpu_usage_percent: this.calculateAverage(recent, 'cpu_usage_percent'),
      discord_latency_ms: this.calculateAverage(recent, 'discord_latency_ms'),
      database_latency_ms: this.calculateAverage(recent, 'database_latency_ms')
    };
    
    this.performance_trends = trends;
  }

  /**
   * Calculate average for a metric
   * @param {Array} dataPoints - Array of data points
   * @param {string} metric - Metric name
   * @returns {number} Average value
   */
  calculateAverage(dataPoints, metric) {
    if (dataPoints.length === 0) return 0;
    const sum = dataPoints.reduce((acc, point) => acc + (point[metric] || 0), 0);
    return Math.round((sum / dataPoints.length) * 100) / 100;
  }

  /**
   * Check if bot is healthy
   * @returns {boolean} True if healthy
   */
  isHealthy() {
    return this.getHealthScore() >= 70 && this.status === 'online';
  }

  /**
   * Check if alerts should be triggered
   * @returns {Array} Array of alert conditions
   */
  checkAlerts() {
    const alerts = [];
    const config = this.alert_config;

    // Default alert thresholds
    const thresholds = {
      memory_threshold: config.memory_threshold || 800,
      cpu_threshold: config.cpu_threshold || 90,
      discord_latency_threshold: config.discord_latency_threshold || 500,
      database_latency_threshold: config.database_latency_threshold || 200,
      error_threshold: config.error_threshold || 20,
      health_score_threshold: config.health_score_threshold || 60,
      ...config
    };

    if (this.memory_usage_mb > thresholds.memory_threshold) {
      alerts.push({
        type: 'high_memory',
        severity: 'warning',
        message: `High memory usage: ${this.memory_usage_mb}MB`,
        threshold: thresholds.memory_threshold
      });
    }

    if (this.cpu_usage_percent > thresholds.cpu_threshold) {
      alerts.push({
        type: 'high_cpu',
        severity: 'warning',
        message: `High CPU usage: ${this.cpu_usage_percent}%`,
        threshold: thresholds.cpu_threshold
      });
    }

    if (this.discord_latency_ms > thresholds.discord_latency_threshold) {
      alerts.push({
        type: 'poor_discord_latency',
        severity: 'warning',
        message: `Poor Discord latency: ${this.discord_latency_ms}ms`,
        threshold: thresholds.discord_latency_threshold
      });
    }

    if (this.database_latency_ms > thresholds.database_latency_threshold) {
      alerts.push({
        type: 'poor_database_latency',
        severity: 'warning',
        message: `Poor database latency: ${this.database_latency_ms}ms`,
        threshold: thresholds.database_latency_threshold
      });
    }

    if (this.error_count_24h > thresholds.error_threshold) {
      alerts.push({
        type: 'high_error_rate',
        severity: 'critical',
        message: `High error rate: ${this.error_count_24h} errors in 24h`,
        threshold: thresholds.error_threshold
      });
    }

    const healthScore = this.getHealthScore();
    if (healthScore < thresholds.health_score_threshold) {
      alerts.push({
        type: 'low_health_score',
        severity: 'critical',
        message: `Low health score: ${healthScore}`,
        threshold: thresholds.health_score_threshold
      });
    }

    if (this.status === 'offline') {
      alerts.push({
        type: 'bot_offline',
        severity: 'critical',
        message: 'Bot is offline',
        threshold: null
      });
    }

    return alerts;
  }

  /**
   * Get formatted status summary for health endpoint
   * @returns {Object} Status summary
   */
  getStatusSummary() {
    const healthScore = this.getHealthScore();
    const alerts = this.checkAlerts();
    
    return {
      status: this.status,
      health_score: healthScore,
      version: this.bot_version,
      environment: this.environment,
      uptime_hours: Math.round(this.uptime_seconds / 3600 * 100) / 100,
      metrics: {
        memory_usage_mb: this.memory_usage_mb,
        cpu_usage_percent: this.cpu_usage_percent,
        discord_latency_ms: this.discord_latency_ms,
        database_latency_ms: this.database_latency_ms,
        active_guilds: this.active_guilds,
        active_users: this.active_users,
        error_count_24h: this.error_count_24h
      },
      alerts: alerts.length > 0 ? alerts : null,
      last_updated: this.updated_at,
      next_maintenance: this.next_maintenance_at
    };
  }

  /**
   * Schedule maintenance window
   * @param {Date} maintenanceTime - Scheduled maintenance time
   * @param {string} reason - Maintenance reason
   * @returns {Promise<BotStatus>} Updated instance
   */
  async scheduleMaintenance(maintenanceTime, reason = 'Scheduled maintenance') {
    try {
      this.next_maintenance_at = maintenanceTime;
      
      const healthMetrics = { ...this.health_metrics };
      healthMetrics.maintenance = {
        scheduled_at: new Date(),
        scheduled_for: maintenanceTime,
        reason: reason
      };
      
      this.health_metrics = healthMetrics;
      this.updated_at = new Date();
      
      await this.save();
      
      console.log(`[BotStatus] Scheduled maintenance for ${maintenanceTime}: ${reason}`);
      return this;
    } catch (error) {
      console.error('[BotStatus] Error scheduling maintenance:', error);
      throw error;
    }
  }

  /**
   * Clean up old status records
   * @param {number} retentionDays - Days to keep records
   * @returns {Promise<number>} Number of records deleted
   */
  static async cleanupOldRecords(retentionDays = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      // Keep current status for each environment
      const currentStatuses = await this.findAll({
        attributes: ['id', 'environment'],
        group: ['environment'],
        order: [['created_at', 'DESC']]
      });

      const keepIds = currentStatuses.map(status => status.id);

      const deletedCount = await this.destroy({
        where: {
          created_at: {
            [Op.lt]: cutoffDate
          },
          id: {
            [Op.notIn]: keepIds
          }
        }
      });

      console.log(`[BotStatus] Cleaned up ${deletedCount} old status records beyond ${retentionDays} days`);
      return deletedCount;
    } catch (error) {
      console.error('[BotStatus] Error cleaning up old records:', error);
      throw error;
    }
  }

  /**
   * Get uptime statistics
   * @param {number} days - Number of days to analyze
   * @returns {Promise<Object>} Uptime statistics
   */
  static async getUptimeStats(days = 7) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const records = await this.findAll({
        where: {
          created_at: {
            [Op.gte]: cutoffDate
          }
        },
        order: [['created_at', 'ASC']]
      });

      if (records.length === 0) {
        return { uptime_percentage: 0, total_downtime_minutes: 0 };
      }

      let totalMinutes = 0;
      let downtimeMinutes = 0;

      for (let i = 0; i < records.length - 1; i++) {
        const current = records[i];
        const next = records[i + 1];
        
        const intervalMinutes = (next.created_at - current.created_at) / (1000 * 60);
        totalMinutes += intervalMinutes;
        
        if (current.status === 'offline') {
          downtimeMinutes += intervalMinutes;
        }
      }

      const uptimePercentage = totalMinutes > 0 ? 
        ((totalMinutes - downtimeMinutes) / totalMinutes * 100) : 100;

      return {
        uptime_percentage: Math.round(uptimePercentage * 100) / 100,
        total_downtime_minutes: Math.round(downtimeMinutes),
        analysis_period_days: days
      };
    } catch (error) {
      console.error('[BotStatus] Error getting uptime stats:', error);
      throw error;
    }
  }
}

/**
 * Initialize BotStatus model with Sequelize
 * @param {Sequelize} sequelize - Sequelize instance
 * @returns {typeof BotStatus} Initialized model
 */
function initBotStatusModel(sequelize) {
  BotStatus.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    bot_version: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    environment: {
      type: DataTypes.ENUM('production', 'staging', 'development'),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('online', 'offline', 'degraded', 'maintenance'),
      allowNull: false,
      defaultValue: 'offline'
    },
    uptime_seconds: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    memory_usage_mb: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0
    },
    cpu_usage_percent: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0
    },
    discord_latency_ms: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    database_latency_ms: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    active_guilds: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    active_users: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    error_count_24h: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    last_restart_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    next_maintenance_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    health_metrics: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {}
    },
    alert_config: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {}
    },
    deployment_info: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {}
    },
    performance_trends: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {}
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    // Sequelize options
    sequelize,
    modelName: 'BotStatus',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    tableName: 'bot_status',
    indexes: [
      {
        fields: ['bot_version']
      },
      {
        fields: ['environment']
      },
      {
        fields: ['status']
      },
      {
        fields: ['last_restart_at']
      },
      {
        fields: ['created_at']
      }
    ]
  });

  return BotStatus;
}

module.exports = { BotStatus, initBotStatusModel };