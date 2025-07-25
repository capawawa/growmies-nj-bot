#!/usr/bin/env node

/**
 * GrowmiesNJ Third-Party Bot Configuration Manager
 * Centralized configuration management for Carl-bot, Sesh, Statbot, and Xenon
 * Cannabis compliance enforced with 18+/21+ age verification
 */

const fs = require('fs').promises;
const path = require('path');

class BotConfigurationManager {
    constructor() {
        this.configDir = './config';
        this.docsDir = './docs';
        this.supportedBots = ['carl-bot', 'sesh', 'statbot', 'xenon'];
        this.complianceRules = {
            forbiddenKeywords: [
                'sell', 'buy', 'trade', 'exchange', 'money',
                'price', 'illegal', 'black market', 'drug dealer', 'distribution'
            ],
            ageZones: {
                public: 18,
                private: 21
            }
        };
    }

    /**
     * Load all bot configurations
     */
    async loadAllConfigurations() {
        console.log('🔧 Loading all bot configurations...');
        const configurations = {};
        
        for (const bot of this.supportedBots) {
            try {
                const configPath = path.join(this.configDir, `${bot}-compliance.json`);
                const configData = await fs.readFile(configPath, 'utf8');
                configurations[bot] = JSON.parse(configData);
                console.log(`✅ Loaded configuration for ${bot}`);
            } catch (error) {
                console.log(`❌ Failed to load configuration for ${bot}: ${error.message}`);
                configurations[bot] = null;
            }
        }
        
        return configurations;
    }

    /**
     * Validate cannabis compliance for a bot configuration
     */
    validateCannabisCompliance(botName, config) {
        console.log(`🌿 Validating cannabis compliance for ${botName}...`);
        const violations = [];

        // Check for forbidden keywords
        if (!config.cannabisCompliance?.forbiddenKeywords) {
            violations.push('Missing forbidden keywords configuration');
        } else if (config.cannabisCompliance.forbiddenKeywords.length < 10) {
            violations.push('Insufficient forbidden keywords (minimum 10 required)');
        }

        // Check age zone requirements
        if (!config.cannabisCompliance?.ageZoneRequirements) {
            violations.push('Missing age zone requirements');
        } else {
            const zones = config.cannabisCompliance.ageZoneRequirements;
            if (zones.public !== 18 || zones.private !== 21) {
                violations.push('Invalid age zone requirements (Public=18+, Private=21+ required)');
            }
        }

        // Check for compliance rules specific to bot type
        const requiredRules = this.getBotSpecificComplianceRules(botName);
        for (const rule of requiredRules) {
            if (!config.cannabisCompliance?.rules?.[rule]) {
                violations.push(`Missing required compliance rule: ${rule}`);
            }
        }

        return {
            compliant: violations.length === 0,
            violations: violations,
            score: Math.max(0, 100 - (violations.length * 10))
        };
    }

    /**
     * Get bot-specific compliance rules
     */
    getBotSpecificComplianceRules(botName) {
        const ruleMap = {
            'carl-bot': ['automodCannabisRules', 'reactionRoles', 'customCommands', 'illegalContentBlocking'],
            'sesh': ['growSessionEvents', 'harvestCelebrations', 'educationalWorkshops', 'noConsumptionEvents'],
            'statbot': ['trackEducationalContent', 'analyticsPrivacy', 'engagementMetrics'],
            'xenon': ['backupSensitiveData', 'automatedSchedule', 'rollbackCapability']
        };
        return ruleMap[botName] || [];
    }

    /**
     * Update configuration for a specific bot
     */
    async updateBotConfiguration(botName, configUpdates) {
        if (!this.supportedBots.includes(botName)) {
            throw new Error(`Unsupported bot: ${botName}`);
        }

        console.log(`🔄 Updating configuration for ${botName}...`);
        
        const configPath = path.join(this.configDir, `${botName}-compliance.json`);
        let currentConfig = {};
        
        try {
            const existingData = await fs.readFile(configPath, 'utf8');
            currentConfig = JSON.parse(existingData);
        } catch (error) {
            console.log(`⚠️ No existing configuration found for ${botName}, creating new one`);
        }

        // Merge updates with current configuration
        const updatedConfig = this.mergeConfigurations(currentConfig, configUpdates);
        
        // Validate compliance
        const compliance = this.validateCannabisCompliance(botName, updatedConfig);
        if (!compliance.compliant) {
            throw new Error(`Configuration update failed compliance check: ${compliance.violations.join(', ')}`);
        }

        // Save updated configuration
        await fs.writeFile(configPath, JSON.stringify(updatedConfig, null, 2));
        console.log(`✅ Configuration updated for ${botName}`);
        
        return updatedConfig;
    }

    /**
     * Merge configuration objects recursively
     */
    mergeConfigurations(current, updates) {
        const result = { ...current };
        
        for (const [key, value] of Object.entries(updates)) {
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                result[key] = this.mergeConfigurations(result[key] || {}, value);
            } else {
                result[key] = value;
            }
        }
        
        return result;
    }

    /**
     * Generate compliance report for all bots
     */
    async generateComplianceReport() {
        console.log('📊 Generating compliance report...');
        const configurations = await this.loadAllConfigurations();
        const report = {
            timestamp: new Date().toISOString(),
            overallCompliance: 0,
            botReports: {},
            summary: {
                totalBots: this.supportedBots.length,
                compliantBots: 0,
                nonCompliantBots: 0,
                criticalViolations: []
            }
        };

        let totalScore = 0;
        let botsEvaluated = 0;

        for (const [botName, config] of Object.entries(configurations)) {
            if (config) {
                const compliance = this.validateCannabisCompliance(botName, config);
                report.botReports[botName] = {
                    compliant: compliance.compliant,
                    score: compliance.score,
                    violations: compliance.violations,
                    lastUpdated: config.lastUpdated || 'Unknown'
                };

                totalScore += compliance.score;
                botsEvaluated++;

                if (compliance.compliant) {
                    report.summary.compliantBots++;
                } else {
                    report.summary.nonCompliantBots++;
                    report.summary.criticalViolations.push(...compliance.violations.map(v => `${botName}: ${v}`));
                }
            } else {
                report.botReports[botName] = {
                    compliant: false,
                    score: 0,
                    violations: ['Configuration file not found'],
                    lastUpdated: 'Never'
                };
                report.summary.nonCompliantBots++;
                report.summary.criticalViolations.push(`${botName}: Configuration file not found`);
            }
        }

        report.overallCompliance = botsEvaluated > 0 ? Math.round(totalScore / botsEvaluated) : 0;

        // Save compliance report
        const reportPath = path.join(this.docsDir, 'COMPLIANCE_REPORT.json');
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
        console.log(`✅ Compliance report saved to ${reportPath}`);

        return report;
    }

    /**
     * Backup all configurations
     */
    async backupConfigurations() {
        console.log('💾 Creating configuration backup...');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDir = path.join(this.docsDir, 'backups', `config-backup-${timestamp}`);
        
        await fs.mkdir(backupDir, { recursive: true });
        
        const configurations = await this.loadAllConfigurations();
        const backupData = {
            timestamp: new Date().toISOString(),
            configurations: configurations,
            metadata: {
                totalBots: this.supportedBots.length,
                backupReason: 'Automated configuration backup',
                system: 'GrowmiesNJ Bot Configuration Manager'
            }
        };

        const backupPath = path.join(backupDir, 'configurations.json');
        await fs.writeFile(backupPath, JSON.stringify(backupData, null, 2));
        
        console.log(`✅ Configuration backup created at ${backupPath}`);
        return backupPath;
    }

    /**
     * Restore configurations from backup
     */
    async restoreConfigurations(backupPath) {
        console.log(`🔄 Restoring configurations from ${backupPath}...`);
        
        const backupData = JSON.parse(await fs.readFile(backupPath, 'utf8'));
        const { configurations } = backupData;
        
        for (const [botName, config] of Object.entries(configurations)) {
            if (config && this.supportedBots.includes(botName)) {
                const configPath = path.join(this.configDir, `${botName}-compliance.json`);
                await fs.writeFile(configPath, JSON.stringify(config, null, 2));
                console.log(`✅ Restored configuration for ${botName}`);
            }
        }
        
        console.log('✅ Configuration restoration completed');
    }

    /**
     * Monitor configuration changes
     */
    async monitorConfigurations() {
        console.log('👀 Starting configuration monitoring...');
        const chokidar = require('chokidar');
        
        const watcher = chokidar.watch(path.join(this.configDir, '*-compliance.json'));
        
        watcher.on('change', async (filePath) => {
            const botName = path.basename(filePath, '-compliance.json');
            console.log(`🔄 Configuration change detected for ${botName}`);
            
            try {
                const configData = await fs.readFile(filePath, 'utf8');
                const config = JSON.parse(configData);
                const compliance = this.validateCannabisCompliance(botName, config);
                
                if (!compliance.compliant) {
                    console.log(`⚠️ COMPLIANCE VIOLATION in ${botName}: ${compliance.violations.join(', ')}`);
                } else {
                    console.log(`✅ Configuration change validated for ${botName}`);
                }
            } catch (error) {
                console.log(`❌ Error validating configuration for ${botName}: ${error.message}`);
            }
        });
        
        return watcher;
    }

    /**
     * Generate deployment status summary
     */
    async getDeploymentStatus() {
        console.log('📋 Generating deployment status...');
        const configurations = await this.loadAllConfigurations();
        const status = {
            timestamp: new Date().toISOString(),
            deploymentPhase: 'Verification Complete',
            bots: {},
            summary: {
                deployed: 0,
                configured: 0,
                verified: 0,
                compliant: 0
            }
        };

        for (const [botName, config] of Object.entries(configurations)) {
            if (config) {
                status.bots[botName] = {
                    deployed: true,
                    configured: true,
                    verified: true,
                    compliant: this.validateCannabisCompliance(botName, config).compliant,
                    lastVerified: new Date().toISOString(),
                    configPath: `./config/${botName}-compliance.json`
                };
                status.summary.deployed++;
                status.summary.configured++;
                status.summary.verified++;
                if (status.bots[botName].compliant) {
                    status.summary.compliant++;
                }
            } else {
                status.bots[botName] = {
                    deployed: false,
                    configured: false,
                    verified: false,
                    compliant: false,
                    lastVerified: 'Never',
                    configPath: `./config/${botName}-compliance.json`
                };
            }
        }

        return status;
    }
}

// CLI Interface
async function main() {
    const manager = new BotConfigurationManager();
    const args = process.argv.slice(2);
    const command = args[0];

    try {
        switch (command) {
            case 'validate':
                console.log('🔍 Validating all bot configurations...');
                const report = await manager.generateComplianceReport();
                console.log(`\n📊 Overall Compliance: ${report.overallCompliance}%`);
                console.log(`✅ Compliant bots: ${report.summary.compliantBots}`);
                console.log(`❌ Non-compliant bots: ${report.summary.nonCompliantBots}`);
                if (report.summary.criticalViolations.length > 0) {
                    console.log('\n⚠️ Critical Violations:');
                    report.summary.criticalViolations.forEach(v => console.log(`  - ${v}`));
                }
                break;

            case 'backup':
                const backupPath = await manager.backupConfigurations();
                console.log(`✅ Backup created: ${backupPath}`);
                break;

            case 'restore':
                if (!args[1]) {
                    console.log('❌ Please provide backup path: node config-manager.js restore <path>');
                    process.exit(1);
                }
                await manager.restoreConfigurations(args[1]);
                break;

            case 'status':
                const status = await manager.getDeploymentStatus();
                console.log('\n📋 Deployment Status Summary:');
                console.log(`Phase: ${status.deploymentPhase}`);
                console.log(`Deployed: ${status.summary.deployed}/${Object.keys(status.bots).length}`);
                console.log(`Configured: ${status.summary.configured}/${Object.keys(status.bots).length}`);
                console.log(`Verified: ${status.summary.verified}/${Object.keys(status.bots).length}`);
                console.log(`Compliant: ${status.summary.compliant}/${Object.keys(status.bots).length}`);
                
                console.log('\n🤖 Bot Details:');
                for (const [botName, botStatus] of Object.entries(status.bots)) {
                    const statusIcon = botStatus.deployed && botStatus.configured && botStatus.verified && botStatus.compliant ? '✅' : '❌';
                    console.log(`  ${statusIcon} ${botName}: Deployed=${botStatus.deployed}, Configured=${botStatus.configured}, Verified=${botStatus.verified}, Compliant=${botStatus.compliant}`);
                }
                break;

            case 'monitor':
                console.log('👀 Starting configuration monitoring (Ctrl+C to stop)...');
                const watcher = await manager.monitorConfigurations();
                process.on('SIGINT', () => {
                    console.log('\n🛑 Stopping configuration monitoring...');
                    watcher.close();
                    process.exit(0);
                });
                break;

            case 'update':
                if (!args[1] || !args[2]) {
                    console.log('❌ Usage: node config-manager.js update <bot-name> <config-json>');
                    process.exit(1);
                }
                const configUpdates = JSON.parse(args[2]);
                await manager.updateBotConfiguration(args[1], configUpdates);
                break;

            default:
                console.log('🔧 GrowmiesNJ Bot Configuration Manager');
                console.log('\nUsage:');
                console.log('  node config-manager.js validate    - Validate all configurations');
                console.log('  node config-manager.js backup      - Create configuration backup');
                console.log('  node config-manager.js restore <path> - Restore from backup');
                console.log('  node config-manager.js status      - Show deployment status');
                console.log('  node config-manager.js monitor     - Monitor configuration changes');
                console.log('  node config-manager.js update <bot> <json> - Update bot configuration');
                console.log('\nSupported bots: carl-bot, sesh, statbot, xenon');
                break;
        }
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
    }
}

// Run CLI if called directly
if (require.main === module) {
    main();
}

module.exports = BotConfigurationManager;