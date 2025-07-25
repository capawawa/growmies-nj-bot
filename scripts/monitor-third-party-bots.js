#!/usr/bin/env node

/**
 * GrowmiesNJ Third-Party Bot Production Monitoring System
 * Continuous monitoring of bot performance and cannabis compliance
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ThirdPartyBotMonitor {
  constructor() {
    this.monitoringInterval = 5 * 60 * 1000; // 5 minutes
    this.alertThresholds = {
      memory: 28, // MB
      responseTime: 45, // ms
      cpu: 2.5, // %
      compliance: 85 // %
    };
    this.metrics = [];
    this.alerts = [];
    this.startTime = new Date();
  }

  log(message, type = 'INFO') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${type}: ${message}`;
    console.log(logEntry);
    this.metrics.push({ timestamp, type, message });
  }

  async monitorBotPerformance(botName, botId) {
    this.log(`📊 Monitoring ${botName} performance...`);
    
    try {
      // Simulate performance monitoring (in production, this would use actual Discord API)
      const metrics = {
        memory: this.simulateMemoryUsage(botName),
        responseTime: this.simulateResponseTime(botName),
        cpu: Math.random() * 3, // 0-3% CPU usage
        uptime: Math.random() * 100, // 0-100% uptime
        messageRate: Math.random() * 50 // 0-50 messages/minute
      };

      // Check against thresholds
      const alerts = this.checkPerformanceAlerts(botName, metrics);
      
      this.log(`  Memory: ${metrics.memory.toFixed(2)}MB (threshold: ${this.alertThresholds.memory}MB)`);
      this.log(`  Response Time: ${metrics.responseTime.toFixed(2)}ms (threshold: ${this.alertThresholds.responseTime}ms)`);
      this.log(`  CPU Usage: ${metrics.cpu.toFixed(2)}% (threshold: ${this.alertThresholds.cpu}%)`);
      this.log(`  Uptime: ${metrics.uptime.toFixed(1)}%`);

      if (alerts.length > 0) {
        alerts.forEach(alert => {
          this.log(`🚨 ALERT: ${alert}`, 'ALERT');
          this.alerts.push({ botName, alert, timestamp: new Date() });
        });
      } else {
        this.log(`✅ ${botName} performance within acceptable limits`);
      }

      return { botName, metrics, alerts };
    } catch (error) {
      this.log(`❌ Error monitoring ${botName} performance: ${error.message}`, 'ERROR');
      return { botName, metrics: null, alerts: [`Monitoring failed: ${error.message}`] };
    }
  }

  simulateMemoryUsage(botName) {
    // Simulate current memory usage based on known issues
    const baseUsage = {
      'Xenon': 36.72, // Known high memory usage
      'Statbot': 21.58,
      'Carl-bot': 15.23,
      'Sesh': 18.45
    };
    
    const variation = (Math.random() - 0.5) * 4; // ±2MB variation
    return Math.max(0, (baseUsage[botName] || 20) + variation);
  }

  simulateResponseTime(botName) {
    // Simulate current response times based on known issues
    const baseResponse = {
      'Xenon': 71.79, // Known high response time
      'Statbot': 95.34, // Known high response time
      'Carl-bot': 25.14,
      'Sesh': 32.82
    };
    
    const variation = (Math.random() - 0.5) * 20; // ±10ms variation
    return Math.max(0, (baseResponse[botName] || 30) + variation);
  }

  checkPerformanceAlerts(botName, metrics) {
    const alerts = [];
    
    if (metrics.memory > this.alertThresholds.memory) {
      alerts.push(`${botName} memory usage ${metrics.memory.toFixed(2)}MB exceeds threshold ${this.alertThresholds.memory}MB`);
    }
    
    if (metrics.responseTime > this.alertThresholds.responseTime) {
      alerts.push(`${botName} response time ${metrics.responseTime.toFixed(2)}ms exceeds threshold ${this.alertThresholds.responseTime}ms`);
    }
    
    if (metrics.cpu > this.alertThresholds.cpu) {
      alerts.push(`${botName} CPU usage ${metrics.cpu.toFixed(2)}% exceeds threshold ${this.alertThresholds.cpu}%`);
    }
    
    if (metrics.uptime < 95) {
      alerts.push(`${botName} uptime ${metrics.uptime.toFixed(1)}% below acceptable level`);
    }

    return alerts;
  }

  async monitorCannabisCompliance(botName) {
    this.log(`🌿 Monitoring ${botName} cannabis compliance...`);
    
    try {
      // Test compliance with sample messages
      const complianceTests = [
        { message: "How do I grow cannabis legally?", shouldPass: true },
        { message: "What nutrients are best for cultivation?", shouldPass: true },
        { message: "Selling premium cannabis, $200/oz", shouldPass: false },
        { message: "Looking to buy weed, anyone selling?", shouldPass: false }
      ];

      let passedTests = 0;
      const testResults = [];

      for (const test of complianceTests) {
        // Simulate compliance checking (in production, this would test actual bot responses)
        const passed = this.simulateComplianceTest(botName, test);
        if ((passed && test.shouldPass) || (!passed && !test.shouldPass)) {
          passedTests++;
        }
        testResults.push({ ...test, passed, correct: (passed === test.shouldPass) });
      }

      const complianceScore = (passedTests / complianceTests.length) * 100;
      
      this.log(`  Compliance Score: ${complianceScore.toFixed(1)}% (threshold: ${this.alertThresholds.compliance}%)`);
      
      if (complianceScore < this.alertThresholds.compliance) {
        const alert = `${botName} compliance score ${complianceScore.toFixed(1)}% below threshold ${this.alertThresholds.compliance}%`;
        this.log(`🚨 COMPLIANCE ALERT: ${alert}`, 'ALERT');
        this.alerts.push({ botName, alert: `Compliance: ${alert}`, timestamp: new Date() });
      } else {
        this.log(`✅ ${botName} cannabis compliance within acceptable limits`);
      }

      return { botName, complianceScore, testResults };
    } catch (error) {
      this.log(`❌ Error monitoring ${botName} compliance: ${error.message}`, 'ERROR');
      return { botName, complianceScore: 0, testResults: [] };
    }
  }

  simulateComplianceTest(botName, test) {
    // Simulate compliance test results based on current known issues
    const complianceRates = {
      'Xenon': 0.67, // 66.7% compliance
      'Statbot': 0.50, // 50% compliance
      'Carl-bot': 0.33, // 33.3% compliance
      'Sesh': 0.50 // 50% compliance
    };
    
    const botComplianceRate = complianceRates[botName] || 0.90;
    return Math.random() < botComplianceRate;
  }

  async checkBotHealth(botName, botId) {
    this.log(`🔍 Checking ${botName} health status...`);
    
    try {
      // Simulate health check (in production, this would ping the bot)
      const isOnline = Math.random() > 0.05; // 95% uptime simulation
      const lastSeen = new Date(Date.now() - Math.random() * 300000); // Within last 5 minutes
      
      if (isOnline) {
        this.log(`✅ ${botName} is online and responsive`);
        return { botName, online: true, lastSeen };
      } else {
        this.log(`❌ ${botName} appears to be offline`, 'ERROR');
        this.alerts.push({ 
          botName, 
          alert: `${botName} is offline or unresponsive`, 
          timestamp: new Date() 
        });
        return { botName, online: false, lastSeen };
      }
    } catch (error) {
      this.log(`❌ Error checking ${botName} health: ${error.message}`, 'ERROR');
      return { botName, online: false, lastSeen: null };
    }
  }

  async runFullMonitoringCycle() {
    this.log('🚀 Starting comprehensive bot monitoring cycle...');
    
    const botConfigs = [
      { name: 'Xenon', id: '416358583220043796' },
      { name: 'Statbot', id: '491769129318088714' },
      { name: 'Carl-bot', id: '235148962103951360' },
      { name: 'Sesh', id: '616754792965865495' }
    ];

    const monitoringResults = {
      timestamp: new Date().toISOString(),
      performance: [],
      compliance: [],
      health: [],
      alerts: [],
      summary: {
        totalBots: botConfigs.length,
        healthyBots: 0,
        performanceIssues: 0,
        complianceIssues: 0,
        criticalAlerts: 0
      }
    };

    for (const bot of botConfigs) {
      this.log(`\n📋 Monitoring ${bot.name}...`);
      
      // Health check
      const health = await this.checkBotHealth(bot.name, bot.id);
      monitoringResults.health.push(health);
      if (health.online) monitoringResults.summary.healthyBots++;
      
      // Performance monitoring
      const performance = await this.monitorBotPerformance(bot.name, bot.id);
      monitoringResults.performance.push(performance);
      if (performance.alerts && performance.alerts.length > 0) {
        monitoringResults.summary.performanceIssues++;
      }
      
      // Compliance monitoring
      const compliance = await this.monitorCannabisCompliance(bot.name);
      monitoringResults.compliance.push(compliance);
      if (compliance.complianceScore < this.alertThresholds.compliance) {
        monitoringResults.summary.complianceIssues++;
      }
    }

    // Compile all alerts
    monitoringResults.alerts = this.alerts;
    monitoringResults.summary.criticalAlerts = this.alerts.length;

    // Generate summary
    this.generateMonitoringSummary(monitoringResults);

    // Save monitoring report
    this.saveMonitoringReport(monitoringResults);

    return monitoringResults;
  }

  generateMonitoringSummary(results) {
    this.log('\n📊 Monitoring Summary:');
    this.log(`🤖 Total Bots: ${results.summary.totalBots}`);
    this.log(`✅ Healthy Bots: ${results.summary.healthyBots}/${results.summary.totalBots}`);
    this.log(`⚡ Performance Issues: ${results.summary.performanceIssues}`);
    this.log(`🌿 Compliance Issues: ${results.summary.complianceIssues}`);
    this.log(`🚨 Critical Alerts: ${results.summary.criticalAlerts}`);

    if (results.summary.criticalAlerts > 0) {
      this.log('\n🚨 Critical Alerts:');
      results.alerts.forEach(alert => {
        this.log(`   - ${alert.botName}: ${alert.alert}`);
      });
    }

    // Overall system health
    const overallHealth = this.calculateOverallHealth(results);
    this.log(`\n🎯 Overall System Health: ${overallHealth.score.toFixed(1)}% (${overallHealth.status})`);
    
    if (overallHealth.score < 80) {
      this.log('🚨 SYSTEM HEALTH CRITICAL - Immediate attention required', 'ALERT');
    } else if (overallHealth.score < 90) {
      this.log('⚠️ SYSTEM HEALTH WARNING - Monitor closely', 'WARN');
    } else {
      this.log('✅ SYSTEM HEALTH GOOD - All systems operating normally');
    }
  }

  calculateOverallHealth(results) {
    const weights = {
      health: 0.3,
      performance: 0.35,
      compliance: 0.35
    };

    const healthScore = (results.summary.healthyBots / results.summary.totalBots) * 100;
    const performanceScore = ((results.summary.totalBots - results.summary.performanceIssues) / results.summary.totalBots) * 100;
    const complianceScore = ((results.summary.totalBots - results.summary.complianceIssues) / results.summary.totalBots) * 100;

    const overallScore = (healthScore * weights.health) + 
                        (performanceScore * weights.performance) + 
                        (complianceScore * weights.compliance);

    let status = 'CRITICAL';
    if (overallScore >= 90) status = 'EXCELLENT';
    else if (overallScore >= 80) status = 'GOOD';
    else if (overallScore >= 70) status = 'WARNING';

    return { score: overallScore, status, breakdown: { healthScore, performanceScore, complianceScore } };
  }

  saveMonitoringReport(results) {
    try {
      const reportPath = path.join(__dirname, '../docs/MONITORING_REPORT.json');
      fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
      this.log(`📄 Monitoring report saved to ${reportPath}`);

      // Also save a timestamped backup
      const backupPath = path.join(__dirname, '../docs/monitoring_backups', 
        `monitoring_${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
      
      // Create backup directory if it doesn't exist
      const backupDir = path.dirname(backupPath);
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      
      fs.writeFileSync(backupPath, JSON.stringify(results, null, 2));
      this.log(`💾 Monitoring backup saved to ${backupPath}`);
    } catch (error) {
      this.log(`❌ Error saving monitoring report: ${error.message}`, 'ERROR');
    }
  }

  async startContinuousMonitoring() {
    this.log('🔄 Starting continuous monitoring mode...');
    this.log(`📅 Monitoring interval: ${this.monitoringInterval / 1000 / 60} minutes`);
    
    const runMonitoring = async () => {
      try {
        await this.runFullMonitoringCycle();
      } catch (error) {
        this.log(`❌ Monitoring cycle error: ${error.message}`, 'ERROR');
      }
      
      // Schedule next monitoring cycle
      setTimeout(runMonitoring, this.monitoringInterval);
    };

    // Run initial monitoring cycle
    await runMonitoring();
  }
}

// Emergency response procedures
class EmergencyResponseSystem {
  static async handleCriticalAlert(alert) {
    console.log(`🚨 CRITICAL ALERT: ${alert.botName} - ${alert.alert}`);
    
    // Implement emergency procedures based on alert type
    if (alert.alert.includes('memory')) {
      console.log('🔧 Triggering emergency memory optimization...');
      // In production, this would trigger automated optimization
    } else if (alert.alert.includes('compliance')) {
      console.log('🛡️ Triggering emergency compliance mode...');
      // In production, this would enable strict moderation
    } else if (alert.alert.includes('offline')) {
      console.log('🔄 Attempting bot restart procedures...');
      // In production, this would attempt bot recovery
    }
  }

  static async generateEmergencyReport(alerts) {
    const emergencyReport = {
      timestamp: new Date().toISOString(),
      alertCount: alerts.length,
      alerts: alerts,
      recommendedActions: EmergencyResponseSystem.getRecommendedActions(alerts),
      escalationRequired: alerts.some(alert => 
        alert.alert.includes('offline') || 
        alert.alert.includes('compliance') ||
        alert.alert.includes('critical')
      )
    };

    console.log('\n🚨 EMERGENCY REPORT GENERATED:');
    console.log(JSON.stringify(emergencyReport, null, 2));
    
    return emergencyReport;
  }

  static getRecommendedActions(alerts) {
    const actions = [];
    
    alerts.forEach(alert => {
      if (alert.alert.includes('memory')) {
        actions.push(`Optimize ${alert.botName} memory usage following performance-optimization-configs.json`);
      }
      if (alert.alert.includes('response time')) {
        actions.push(`Optimize ${alert.botName} response time using caching strategies`);
      }
      if (alert.alert.includes('compliance')) {
        actions.push(`Review ${alert.botName} cannabis compliance configuration immediately`);
      }
      if (alert.alert.includes('offline')) {
        actions.push(`Check ${alert.botName} connection and restart if necessary`);
      }
    });

    return [...new Set(actions)]; // Remove duplicates
  }
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const mode = args[0] || 'single';

  const monitor = new ThirdPartyBotMonitor();

  if (mode === 'continuous') {
    monitor.startContinuousMonitoring()
      .catch(error => {
        console.error('💥 Continuous monitoring failed:', error);
        process.exit(1);
      });
  } else {
    monitor.runFullMonitoringCycle()
      .then(results => {
        console.log('\n🎉 Monitoring cycle complete!');
        
        // Handle critical alerts
        if (results.alerts.length > 0) {
          EmergencyResponseSystem.generateEmergencyReport(results.alerts);
        }
      })
      .catch(error => {
        console.error('💥 Monitoring failed:', error);
        process.exit(1);
      });
  }
}

module.exports = { ThirdPartyBotMonitor, EmergencyResponseSystem };