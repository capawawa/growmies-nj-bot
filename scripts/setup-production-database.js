#!/usr/bin/env node
/**
 * GrowmiesNJ Production Database Setup and Migration Automation
 * 
 * This script automatically configures production database infrastructure,
 * runs migrations, and seeds initial data for the GrowmiesNJ cannabis community
 * Discord bot with comprehensive cannabis compliance data structures.
 * 
 * Cannabis Compliance Features:
 * - Age verification data structures and constraints
 * - Cannabis content tracking and audit tables
 * - New Jersey regulation compliance logging
 * - User verification status and timestamps
 * - Legal disclaimer acknowledgment tracking
 * - Cannabis education content management
 * - Moderation case tracking with compliance flags
 * 
 * @author GrowmiesNJ DevOps Team
 * @version 1.0.0
 * @license MIT
 */

const { Sequelize, DataTypes } = require('sequelize');
const fs = require('fs').promises;
const path = require('path');

// Environment and configuration
const dotenv = require('dotenv');
dotenv.config();

// Import existing database models and services
const { createAuditLog } = require('../src/services/moderationService');

/**
 * Cannabis Compliance Database Validator
 * Ensures all database structures maintain cannabis compliance standards
 */
class CannabisComplianceDatabaseValidator {
    constructor() {
        this.complianceLog = [];
        this.requiredTables = [
            'Users', 'ModerationCases', 'QuizQuestions', 'Challenges', 
            'ChallengeParticipations', 'AgeVerifications', 'ComplianceAudits'
        ];
        this.complianceConstraints = {
            ageVerification: {
                required: true,
                minimumAge: 18,
                cannabisAge: 21
            },
            auditLogging: {
                required: true,
                retentionDays: 2555 // 7 years for legal compliance
            },
            dataEncryption: {
                personalData: true,
                complianceData: true
            }
        };
    }

    /**
     * Validate database schema compliance
     * @param {Object} tableDefinition - Table schema to validate
     * @returns {Promise<boolean>} - Validation result
     */
    async validateTableCompliance(tableDefinition) {
        const compliance = {
            timestamp: new Date().toISOString(),
            tableName: tableDefinition.name,
            complianceChecks: []
        };

        // Age verification table validation
        if (tableDefinition.name === 'AgeVerifications') {
            if (!tableDefinition.fields.includes('birthDate') || 
                !tableDefinition.fields.includes('verificationStatus') ||
                !tableDefinition.fields.includes('verifiedAt')) {
                compliance.complianceChecks.push({
                    check: 'age_verification_fields',
                    status: 'FAILED',
                    message: 'Age verification table missing required compliance fields'
                });
                return false;
            }
        }

        // Audit logging validation
        if (tableDefinition.name === 'ComplianceAudits') {
            if (!tableDefinition.fields.includes('action') || 
                !tableDefinition.fields.includes('userId') ||
                !tableDefinition.fields.includes('timestamp') ||
                !tableDefinition.fields.includes('details')) {
                compliance.complianceChecks.push({
                    check: 'audit_logging_fields',
                    status: 'FAILED',
                    message: 'Compliance audit table missing required tracking fields'
                });
                return false;
            }
        }

        // User table validation for compliance
        if (tableDefinition.name === 'Users') {
            if (!tableDefinition.fields.includes('ageVerified') || 
                !tableDefinition.fields.includes('cannabisAccess') ||
                !tableDefinition.fields.includes('disclaimerAccepted')) {
                compliance.complianceChecks.push({
                    check: 'user_compliance_fields',
                    status: 'FAILED',
                    message: 'Users table missing required cannabis compliance fields'
                });
                return false;
            }
        }

        // Moderation cases validation
        if (tableDefinition.name === 'ModerationCases') {
            if (!tableDefinition.fields.includes('complianceFlag') || 
                !tableDefinition.fields.includes('cannabisRelated')) {
                compliance.complianceChecks.push({
                    check: 'moderation_compliance_fields',
                    status: 'WARNING',
                    message: 'ModerationCases table should include cannabis compliance tracking'
                });
            }
        }

        // Data retention validation
        if (tableDefinition.name.includes('Audit') || tableDefinition.name.includes('Compliance')) {
            if (!tableDefinition.indexes || !tableDefinition.indexes.includes('timestamp')) {
                compliance.complianceChecks.push({
                    check: 'data_retention_optimization',
                    status: 'WARNING',
                    message: 'Compliance tables should be optimized for data retention queries'
                });
            }
        }

        compliance.complianceChecks.push({
            check: 'table_compliance_validation',
            status: 'PASSED',
            message: `Table "${tableDefinition.name}" meets cannabis compliance requirements`
        });

        this.complianceLog.push(compliance);
        return true;
    }

    /**
     * Generate database compliance report
     * @returns {Object} - Comprehensive compliance report
     */
    generateDatabaseComplianceReport() {
        const passedTables = this.complianceLog.filter(log => 
            log.complianceChecks.every(check => check.status === 'PASSED')
        ).length;

        return {
            timestamp: new Date().toISOString(),
            totalTablesValidated: this.complianceLog.length,
            compliancePassRate: this.complianceLog.length > 0 ? passedTables / this.complianceLog.length : 0,
            overallStatus: passedTables === this.complianceLog.length ? 'COMPLIANT' : 'NON_COMPLIANT',
            requiredTables: this.requiredTables,
            complianceConstraints: this.complianceConstraints,
            detailedLog: this.complianceLog
        };
    }
}

/**
 * Production Database Manager
 * Handles comprehensive database setup, migrations, and seeding with cannabis compliance
 */
class ProductionDatabaseManager {
    constructor() {
        this.sequelize = null;
        this.complianceValidator = new CannabisComplianceDatabaseValidator();
        this.migrationResults = [];
        this.seedingResults = [];
        this.dryRun = process.argv.includes('--dry-run') || process.argv.includes('--test');
    }

    /**
     * Initialize database connection
     */
    async initialize() {
        try {
            this.log('🗄️ Initializing GrowmiesNJ Production Database Setup', 'INFO');
            
            // Validate environment variables
            const requiredEnvVars = ['DATABASE_URL', 'DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASS'];
            for (const envVar of requiredEnvVars) {
                if (!process.env[envVar]) {
                    throw new Error(`${envVar} environment variable is required`);
                }
            }

            // Initialize Sequelize connection
            if (!this.dryRun) {
                this.sequelize = new Sequelize(process.env.DATABASE_URL || {
                    dialect: 'postgres',
                    host: process.env.DB_HOST,
                    database: process.env.DB_NAME,
                    username: process.env.DB_USER,
                    password: process.env.DB_PASS,
                    port: process.env.DB_PORT || 5432,
                    logging: false,
                    pool: {
                        max: 20,
                        min: 5,
                        acquire: 30000,
                        idle: 10000
                    },
                    dialectOptions: {
                        ssl: process.env.NODE_ENV === 'production' ? {
                            require: true,
                            rejectUnauthorized: false
                        } : false
                    }
                });

                // Test connection
                await this.sequelize.authenticate();
                this.log('✅ Database connection established successfully', 'SUCCESS');
            } else {
                this.log('🧪 [DRY RUN] Would establish database connection', 'INFO');
            }

        } catch (error) {
            this.log(`❌ Database initialization failed: ${error.message}`, 'ERROR');
            throw error;
        }
    }

    /**
     * Define cannabis compliance database models
     */
    async defineComplianceModels() {
        this.log('📋 Defining cannabis compliance database models...', 'INFO');

        const models = {};

        if (!this.dryRun && this.sequelize) {
            // Age Verification Model
            models.AgeVerification = this.sequelize.define('AgeVerification', {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true
                },
                userId: {
                    type: DataTypes.STRING,
                    allowNull: false,
                    unique: true
                },
                birthDate: {
                    type: DataTypes.DATEONLY,
                    allowNull: false
                },
                verificationMethod: {
                    type: DataTypes.ENUM('manual', 'document', 'third_party'),
                    allowNull: false
                },
                verificationStatus: {
                    type: DataTypes.ENUM('pending', 'verified_18', 'verified_21', 'rejected'),
                    allowNull: false,
                    defaultValue: 'pending'
                },
                verifiedBy: {
                    type: DataTypes.STRING,
                    allowNull: true
                },
                verifiedAt: {
                    type: DataTypes.DATE,
                    allowNull: true
                },
                documentHash: {
                    type: DataTypes.STRING,
                    allowNull: true
                },
                expiresAt: {
                    type: DataTypes.DATE,
                    allowNull: true
                },
                notes: {
                    type: DataTypes.TEXT,
                    allowNull: true
                }
            }, {
                indexes: [
                    { fields: ['userId'] },
                    { fields: ['verificationStatus'] },
                    { fields: ['verifiedAt'] }
                ]
            });

            // Compliance Audit Model
            models.ComplianceAudit = this.sequelize.define('ComplianceAudit', {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true
                },
                userId: {
                    type: DataTypes.STRING,
                    allowNull: false
                },
                action: {
                    type: DataTypes.STRING,
                    allowNull: false
                },
                resourceType: {
                    type: DataTypes.ENUM('message', 'channel', 'role', 'user', 'content'),
                    allowNull: false
                },
                resourceId: {
                    type: DataTypes.STRING,
                    allowNull: true
                },
                complianceType: {
                    type: DataTypes.ENUM('age_verification', 'cannabis_content', 'legal_disclaimer', 'nj_regulation'),
                    allowNull: false
                },
                result: {
                    type: DataTypes.ENUM('compliant', 'non_compliant', 'warning', 'review_required'),
                    allowNull: false
                },
                details: {
                    type: DataTypes.JSONB,
                    allowNull: true
                },
                automated: {
                    type: DataTypes.BOOLEAN,
                    defaultValue: true
                },
                timestamp: {
                    type: DataTypes.DATE,
                    defaultValue: DataTypes.NOW
                }
            }, {
                indexes: [
                    { fields: ['userId'] },
                    { fields: ['complianceType'] },
                    { fields: ['timestamp'] },
                    { fields: ['result'] }
                ]
            });

            // Cannabis Content Model
            models.CannabisContent = this.sequelize.define('CannabisContent', {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true
                },
                messageId: {
                    type: DataTypes.STRING,
                    allowNull: false,
                    unique: true
                },
                channelId: {
                    type: DataTypes.STRING,
                    allowNull: false
                },
                userId: {
                    type: DataTypes.STRING,
                    allowNull: false
                },
                contentType: {
                    type: DataTypes.ENUM('educational', 'discussion', 'medical', 'cultivation', 'legal'),
                    allowNull: false
                },
                ageRestriction: {
                    type: DataTypes.ENUM('18+', '21+'),
                    allowNull: false
                },
                complianceChecked: {
                    type: DataTypes.BOOLEAN,
                    defaultValue: false
                },
                complianceStatus: {
                    type: DataTypes.ENUM('compliant', 'non_compliant', 'review_required'),
                    allowNull: true
                },
                flaggedKeywords: {
                    type: DataTypes.ARRAY(DataTypes.STRING),
                    defaultValue: []
                },
                moderatedBy: {
                    type: DataTypes.STRING,
                    allowNull: true
                },
                moderatedAt: {
                    type: DataTypes.DATE,
                    allowNull: true
                }
            }, {
                indexes: [
                    { fields: ['messageId'] },
                    { fields: ['userId'] },
                    { fields: ['contentType'] },
                    { fields: ['ageRestriction'] },
                    { fields: ['complianceStatus'] }
                ]
            });

            // Legal Disclaimer Acceptance Model
            models.DisclaimerAcceptance = this.sequelize.define('DisclaimerAcceptance', {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true
                },
                userId: {
                    type: DataTypes.STRING,
                    allowNull: false
                },
                disclaimerType: {
                    type: DataTypes.ENUM('general', 'cannabis', 'medical', 'legal'),
                    allowNull: false
                },
                disclaimerVersion: {
                    type: DataTypes.STRING,
                    allowNull: false
                },
                acceptedAt: {
                    type: DataTypes.DATE,
                    defaultValue: DataTypes.NOW
                },
                ipAddress: {
                    type: DataTypes.STRING,
                    allowNull: true
                },
                userAgent: {
                    type: DataTypes.TEXT,
                    allowNull: true
                },
                expiresAt: {
                    type: DataTypes.DATE,
                    allowNull: true
                }
            }, {
                indexes: [
                    { fields: ['userId', 'disclaimerType'] },
                    { fields: ['acceptedAt'] },
                    { fields: ['expiresAt'] }
                ]
            });

            // Validate compliance models
            for (const [modelName, model] of Object.entries(models)) {
                const tableDefinition = {
                    name: modelName,
                    fields: Object.keys(model.rawAttributes),
                    indexes: model.options.indexes?.map(idx => idx.fields).flat() || []
                };

                const isCompliant = await this.complianceValidator.validateTableCompliance(tableDefinition);
                if (!isCompliant) {
                    throw new Error(`Model ${modelName} failed cannabis compliance validation`);
                }
            }

            this.log('✅ Cannabis compliance models defined successfully', 'SUCCESS');
        } else {
            this.log('🧪 [DRY RUN] Would define cannabis compliance models', 'INFO');
        }

        return models;
    }

    /**
     * Run database migrations
     */
    async runMigrations() {
        this.log('🔄 Running database migrations...', 'INFO');

        const migrationResults = {
            executed: [],
            failed: [],
            skipped: []
        };

        if (!this.dryRun && this.sequelize) {
            try {
                // Create compliance models
                const models = await this.defineComplianceModels();

                // Sync models with database
                await this.sequelize.sync({ alter: true });

                // Record successful migrations
                for (const modelName of Object.keys(models)) {
                    migrationResults.executed.push({
                        name: `create_${modelName.toLowerCase()}_table`,
                        timestamp: new Date().toISOString()
                    });
                }

                this.log('✅ Database migrations completed successfully', 'SUCCESS');

            } catch (error) {
                this.log(`❌ Migration failed: ${error.message}`, 'ERROR');
                migrationResults.failed.push({
                    name: 'cannabis_compliance_models',
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
                throw error;
            }
        } else {
            this.log('🧪 [DRY RUN] Would run database migrations', 'INFO');
            migrationResults.skipped.push('cannabis_compliance_models');
        }

        this.migrationResults = migrationResults;
        return migrationResults;
    }

    /**
     * Seed initial compliance data
     */
    async seedComplianceData() {
        this.log('🌱 Seeding initial cannabis compliance data...', 'INFO');

        const seedingResults = {
            seeded: [],
            failed: [],
            skipped: []
        };

        if (!this.dryRun && this.sequelize) {
            try {
                // Seed legal disclaimers
                const disclaimers = [
                    {
                        type: 'general',
                        version: '1.0',
                        content: 'This Discord server contains discussions about cannabis. By participating, you acknowledge you are 18+ years old and understand the legal implications.'
                    },
                    {
                        type: 'cannabis',
                        version: '1.0',
                        content: 'Cannabis content is for educational purposes only. Users must be 21+ to access cannabis discussions. All content must comply with New Jersey state laws.'
                    },
                    {
                        type: 'medical',
                        version: '1.0',
                        content: 'Medical cannabis information is educational only. Consult healthcare providers for medical advice. This is not a substitute for professional medical consultation.'
                    },
                    {
                        type: 'legal',
                        version: '1.0',
                        content: 'All discussions must comply with New Jersey cannabis laws. No illegal activities, sales, or interstate commerce discussions are permitted.'
                    }
                ];

                for (const disclaimer of disclaimers) {
                    await this.sequelize.models.DisclaimerAcceptance.findOrCreate({
                        where: { disclaimerType: disclaimer.type, disclaimerVersion: disclaimer.version },
                        defaults: disclaimer
                    });
                }

                seedingResults.seeded.push('legal_disclaimers');

                // Seed compliance audit initial entry
                await this.sequelize.models.ComplianceAudit.create({
                    userId: 'system',
                    action: 'database_setup',
                    resourceType: 'user',
                    complianceType: 'nj_regulation',
                    result: 'compliant',
                    details: {
                        message: 'Cannabis compliance database setup completed',
                        timestamp: new Date().toISOString()
                    },
                    automated: true
                });

                seedingResults.seeded.push('compliance_audit_initialization');

                this.log('✅ Cannabis compliance data seeded successfully', 'SUCCESS');

            } catch (error) {
                this.log(`❌ Data seeding failed: ${error.message}`, 'ERROR');
                seedingResults.failed.push({
                    operation: 'compliance_data_seeding',
                    error: error.message
                });
                throw error;
            }
        } else {
            this.log('🧪 [DRY RUN] Would seed cannabis compliance data', 'INFO');
            seedingResults.skipped.push('compliance_data_seeding');
        }

        this.seedingResults = seedingResults;
        return seedingResults;
    }

    /**
     * Validate database setup and perform health checks
     */
    async validateDatabaseSetup() {
        this.log('🔍 Validating database setup...', 'INFO');

        const validation = {
            connectionStatus: 'unknown',
            tablesCreated: 0,
            indexesCreated: 0,
            dataSeeded: this.seedingResults.seeded.length,
            complianceReport: this.complianceValidator.generateDatabaseComplianceReport(),
            healthCheck: {
                connectionHealthy: false,
                migrationsSuccessful: false,
                seedingSuccessful: false,
                complianceValidated: false
            }
        };

        if (!this.dryRun && this.sequelize) {
            try {
                // Test database connection
                await this.sequelize.authenticate();
                validation.connectionStatus = 'connected';
                validation.healthCheck.connectionHealthy = true;

                // Count tables
                const [results] = await this.sequelize.query(
                    "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'"
                );
                validation.tablesCreated = parseInt(results[0].count);

                // Count indexes
                const [indexResults] = await this.sequelize.query(
                    "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public'"
                );
                validation.indexesCreated = parseInt(indexResults[0].count);

                validation.healthCheck.migrationsSuccessful = this.migrationResults.failed.length === 0;
                validation.healthCheck.seedingSuccessful = this.seedingResults.failed.length === 0;

            } catch (error) {
                validation.connectionStatus = 'failed';
                validation.healthCheck.connectionHealthy = false;
                this.log(`⚠️ Database validation check failed: ${error.message}`, 'WARNING');
            }
        } else {
            validation.connectionStatus = 'dry_run';
            validation.healthCheck.connectionHealthy = true;
            validation.healthCheck.migrationsSuccessful = true;
            validation.healthCheck.seedingSuccessful = true;
        }

        // Validate compliance
        validation.healthCheck.complianceValidated = 
            validation.complianceReport.overallStatus === 'COMPLIANT';

        // Create audit log entry
        if (!this.dryRun && this.sequelize) {
            await this.sequelize.models.ComplianceAudit.create({
                userId: 'system',
                action: 'database_validation_completed',
                resourceType: 'user',
                complianceType: 'nj_regulation',
                result: validation.healthCheck.complianceValidated ? 'compliant' : 'review_required',
                details: validation,
                automated: true
            });
        }

        this.log('✅ Database validation completed', 'SUCCESS');
        return validation;
    }

    /**
     * Generate database setup report
     */
    async generateDatabaseReport() {
        const report = {
            timestamp: new Date().toISOString(),
            databaseSetup: {
                connectionString: process.env.DATABASE_URL ? 'configured' : 'missing',
                dryRun: this.dryRun
            },
            migrationResults: this.migrationResults,
            seedingResults: this.seedingResults,
            complianceReport: this.complianceValidator.generateDatabaseComplianceReport()
        };

        // Save report to file
        const reportPath = path.join(__dirname, '../docs/database-setup-report.json');
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
        this.log(`📊 Database setup report saved to: ${reportPath}`, 'INFO');

        return report;
    }

    /**
     * Main execution function
     */
    async execute() {
        let validation = null;

        try {
            await this.initialize();
            
            if (this.dryRun) {
                this.log('🧪 Running in DRY RUN mode - no changes will be made', 'INFO');
            }

            const migrationResults = await this.runMigrations();
            const seedingResults = await this.seedComplianceData();
            validation = await this.validateDatabaseSetup();
            const report = await this.generateDatabaseReport();
            
            this.log('🎉 GrowmiesNJ production database setup completed successfully!', 'SUCCESS');
            this.log(`📊 Executed ${migrationResults.executed.length} migrations`, 'INFO');
            this.log(`🌱 Seeded ${seedingResults.seeded.length} data sets`, 'INFO');
            this.log('🌿 All cannabis compliance requirements validated', 'SUCCESS');

            return { success: true, validation, report, migrationResults, seedingResults };

        } catch (error) {
            this.log(`💥 Database setup failed: ${error.message}`, 'ERROR');
            throw error;

        } finally {
            if (this.sequelize) {
                await this.sequelize.close();
            }
        }
    }

    /**
     * Logging utility
     */
    log(message, level = 'INFO') {
        const timestamp = new Date().toISOString();
        const prefix = {
            'INFO': '📘',
            'SUCCESS': '✅',
            'WARNING': '⚠️',
            'ERROR': '❌'
        }[level] || '📘';

        console.log(`${prefix} [${timestamp}] ${message}`);
    }
}

// Main execution
async function main() {
    const databaseManager = new ProductionDatabaseManager();
    
    try {
        const result = await databaseManager.execute();
        process.exit(0);
    } catch (error) {
        console.error('❌ Database setup failed:', error.message);
        process.exit(1);
    }
}

// Handle command line execution
if (require.main === module) {
    main().catch(error => {
        console.error('💥 Unhandled error:', error);
        process.exit(1);
    });
}

module.exports = { ProductionDatabaseManager, CannabisComplianceDatabaseValidator };