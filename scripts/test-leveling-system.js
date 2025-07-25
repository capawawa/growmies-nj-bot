#!/usr/bin/env node

/**
 * Cannabis Leveling System Validation Script
 * 
 * Comprehensive validation for GrowmiesNJ Discord Bot leveling system
 * Tests all components without requiring Discord connection
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// ANSI color codes for output
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

class LevelingSystemValidator {
    constructor() {
        this.testResults = {
            passed: 0,
            failed: 0,
            total: 0,
            errors: []
        };
        
        this.newFiles = [
            'src/database/models/LevelingConfig.js',
            'src/services/xpCalculation.js',
            'src/services/automaticRoleProgression.js',
            'src/commands/leveling/level.js',
            'src/commands/leveling/leaderboard.js',
            'src/events/messageCreate.js'
        ];
        
        this.projectRoot = path.resolve(__dirname, '..');
    }

    log(message, color = 'reset') {
        console.log(`${colors[color]}${message}${colors.reset}`);
    }

    logTest(testName, status, details = '') {
        const icon = status ? '✅' : '❌';
        const statusColor = status ? 'green' : 'red';
        this.log(`${icon} ${testName}`, statusColor);
        if (details) {
            this.log(`   ${details}`, 'cyan');
        }
        
        this.testResults.total++;
        if (status) {
            this.testResults.passed++;
        } else {
            this.testResults.failed++;
            this.testResults.errors.push({ test: testName, details });
        }
    }

    async runCommand(command, args = []) {
        return new Promise((resolve, reject) => {
            const proc = spawn(command, args, {
                cwd: this.projectRoot,
                stdio: 'pipe'
            });

            let stdout = '';
            let stderr = '';

            proc.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            proc.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            proc.on('close', (code) => {
                resolve({ code, stdout, stderr });
            });

            proc.on('error', reject);
        });
    }

    async validateFileSyntax() {
        this.log('\n🔍 Validating File Syntax', 'bold');
        
        for (const file of this.newFiles) {
            const filePath = path.join(this.projectRoot, file);
            
            if (!fs.existsSync(filePath)) {
                this.logTest(`File exists: ${file}`, false, 'File not found');
                continue;
            }

            try {
                const result = await this.runCommand('node', ['--check', filePath]);
                const passed = result.code === 0;
                this.logTest(
                    `Syntax validation: ${file}`, 
                    passed, 
                    passed ? 'Valid syntax' : `Syntax error: ${result.stderr.trim()}`
                );
            } catch (error) {
                this.logTest(`Syntax validation: ${file}`, false, `Error: ${error.message}`);
            }
        }
    }

    async validateImports() {
        this.log('\n📦 Validating Module Imports', 'bold');
        
        const testScript = `
const path = require('path');
process.chdir('${this.projectRoot}');

async function testImports() {
    const results = [];
    
    try {
        const { LevelingConfig } = require('./src/database/models/LevelingConfig');
        results.push({ module: 'LevelingConfig', success: true });
    } catch (error) {
        results.push({ module: 'LevelingConfig', success: false, error: error.message });
    }
    
    try {
        const { XPCalculationService } = require('./src/services/xpCalculation');
        results.push({ module: 'XPCalculationService', success: true });
    } catch (error) {
        results.push({ module: 'XPCalculationService', success: false, error: error.message });
    }
    
    try {
        const { AutomaticRoleProgressionService } = require('./src/services/automaticRoleProgression');
        results.push({ module: 'AutomaticRoleProgressionService', success: true });
    } catch (error) {
        results.push({ module: 'AutomaticRoleProgressionService', success: false, error: error.message });
    }
    
    try {
        const levelCommand = require('./src/commands/leveling/level');
        results.push({ 
            module: 'Level Command', 
            success: !!(levelCommand.data && levelCommand.execute),
            hasRequiredProperties: !!(levelCommand.data && levelCommand.execute)
        });
    } catch (error) {
        results.push({ module: 'Level Command', success: false, error: error.message });
    }
    
    try {
        const leaderboardCommand = require('./src/commands/leveling/leaderboard');
        results.push({ 
            module: 'Leaderboard Command', 
            success: !!(leaderboardCommand.data && leaderboardCommand.execute),
            hasRequiredProperties: !!(leaderboardCommand.data && leaderboardCommand.execute)
        });
    } catch (error) {
        results.push({ module: 'Leaderboard Command', success: false, error: error.message });
    }
    
    try {
        const messageCreateEvent = require('./src/events/messageCreate');
        results.push({ 
            module: 'MessageCreate Event', 
            success: !!(messageCreateEvent.name && messageCreateEvent.execute),
            hasRequiredProperties: !!(messageCreateEvent.name && messageCreateEvent.execute)
        });
    } catch (error) {
        results.push({ module: 'MessageCreate Event', success: false, error: error.message });
    }
    
    console.log(JSON.stringify(results, null, 2));
}

testImports().catch(console.error);
        `;

        try {
            const result = await this.runCommand('node', ['-e', testScript]);
            const importResults = JSON.parse(result.stdout);
            
            importResults.forEach(({ module, success, error, hasRequiredProperties }) => {
                let details = success ? 'Import successful' : `Import failed: ${error}`;
                if (success && hasRequiredProperties !== undefined) {
                    details += hasRequiredProperties ? ', has required properties' : ', missing required properties';
                }
                this.logTest(`Import: ${module}`, success && (hasRequiredProperties !== false), details);
            });
        } catch (error) {
            this.logTest('Module imports validation', false, `Failed to test imports: ${error.message}`);
        }
    }

    async validateDatabaseModels() {
        this.log('\n🗄️ Validating Database Models', 'bold');
        
        const testScript = `
const path = require('path');
process.chdir('${this.projectRoot}');

async function testDatabaseModels() {
    try {
        const { sequelize } = require('./src/database/connection');
        const { LevelingConfig } = require('./src/database/models/LevelingConfig');
        const { User } = require('./src/database/models/User');
        
        // Test LevelingConfig model structure
        const levelingConfigAttributes = LevelingConfig.getTableName ? 'has table methods' : 'missing table methods';
        console.log(JSON.stringify({
            test: 'LevelingConfig model structure',
            success: !!LevelingConfig.findByGuildId,
            details: 'Has findByGuildId method: ' + !!LevelingConfig.findByGuildId
        }));
        
        // Test User model extensions
        const userModel = User.getAttributes ? User.getAttributes() : {};
        const hasXPFields = !!(userModel.total_xp && userModel.current_level && userModel.current_tier);
        console.log(JSON.stringify({
            test: 'User model XP extensions',
            success: hasXPFields,
            details: hasXPFields ? 'XP fields present' : 'Missing XP fields'
        }));
        
        console.log(JSON.stringify({
            test: 'Database connection available',
            success: !!sequelize,
            details: sequelize ? 'Sequelize instance available' : 'No sequelize instance'
        }));
        
    } catch (error) {
        console.log(JSON.stringify({
            test: 'Database models validation',
            success: false,
            details: error.message
        }));
    }
}

testDatabaseModels().catch(console.error);
        `;

        try {
            const result = await this.runCommand('node', ['-e', testScript]);
            const lines = result.stdout.trim().split('\n').filter(line => line.trim());
            
            lines.forEach(line => {
                try {
                    const testResult = JSON.parse(line);
                    this.logTest(testResult.test, testResult.success, testResult.details);
                } catch (e) {
                    // Skip non-JSON lines
                }
            });
        } catch (error) {
            this.logTest('Database models validation', false, `Failed to test models: ${error.message}`);
        }
    }

    async validateCommands() {
        this.log('\n⚡ Validating Slash Commands', 'bold');
        
        const commandTests = [
            {
                file: 'src/commands/leveling/level.js',
                name: 'Level Command',
                expectedName: 'level',
                expectedDescription: 'Check your cannabis community progression level and XP'
            },
            {
                file: 'src/commands/leveling/leaderboard.js',
                name: 'Leaderboard Command',
                expectedName: 'leaderboard',
                expectedDescription: 'View the cannabis community leaderboard rankings'
            }
        ];

        for (const test of commandTests) {
            const testScript = `
const path = require('path');
process.chdir('${this.projectRoot}');

try {
    const command = require('./${test.file}');
    const hasData = !!command.data;
    const hasExecute = typeof command.execute === 'function';
    const correctName = command.data?.name === '${test.expectedName}';
    const hasDescription = !!command.data?.description;
    
    console.log(JSON.stringify({
        hasData,
        hasExecute,
        correctName,
        hasDescription,
        actualName: command.data?.name,
        actualDescription: command.data?.description
    }));
} catch (error) {
    console.log(JSON.stringify({ error: error.message }));
}
            `;

            try {
                const result = await this.runCommand('node', ['-e', testScript]);
                const commandData = JSON.parse(result.stdout.trim());
                
                if (commandData.error) {
                    this.logTest(`${test.name} validation`, false, commandData.error);
                    continue;
                }

                const passed = commandData.hasData && commandData.hasExecute && commandData.correctName && commandData.hasDescription;
                let details = [];
                if (!commandData.hasData) details.push('missing data property');
                if (!commandData.hasExecute) details.push('missing execute function');
                if (!commandData.correctName) details.push(`wrong name: ${commandData.actualName}`);
                if (!commandData.hasDescription) details.push('missing description');
                
                this.logTest(
                    `${test.name} structure`, 
                    passed, 
                    passed ? `Valid command: ${commandData.actualName}` : details.join(', ')
                );
            } catch (error) {
                this.logTest(`${test.name} validation`, false, `Parse error: ${error.message}`);
            }
        }
    }

    async validateEvents() {
        this.log('\n📡 Validating Event Handlers', 'bold');
        
        const testScript = `
const path = require('path');
process.chdir('${this.projectRoot}');

try {
    const messageCreateEvent = require('./src/events/messageCreate');
    const hasName = !!messageCreateEvent.name;
    const hasExecute = typeof messageCreateEvent.execute === 'function';
    const correctName = messageCreateEvent.name === 'messageCreate';
    
    console.log(JSON.stringify({
        hasName,
        hasExecute,
        correctName,
        actualName: messageCreateEvent.name
    }));
} catch (error) {
    console.log(JSON.stringify({ error: error.message }));
}
        `;

        try {
            const result = await this.runCommand('node', ['-e', testScript]);
            const eventData = JSON.parse(result.stdout.trim());
            
            if (eventData.error) {
                this.logTest('MessageCreate event validation', false, eventData.error);
                return;
            }

            const passed = eventData.hasName && eventData.hasExecute && eventData.correctName;
            let details = [];
            if (!eventData.hasName) details.push('missing name property');
            if (!eventData.hasExecute) details.push('missing execute function');
            if (!eventData.correctName) details.push(`wrong name: ${eventData.actualName}`);
            
            this.logTest(
                'MessageCreate event structure', 
                passed, 
                passed ? `Valid event: ${eventData.actualName}` : details.join(', ')
            );
        } catch (error) {
            this.logTest('MessageCreate event validation', false, `Parse error: ${error.message}`);
        }
    }

    async validateIntegration() {
        this.log('\n🔗 Validating System Integration', 'bold');
        
        // Test that main index.js includes LevelingConfig
        const indexPath = path.join(this.projectRoot, 'src/index.js');
        if (fs.existsSync(indexPath)) {
            const indexContent = fs.readFileSync(indexPath, 'utf8');
            const hasLevelingConfigImport = indexContent.includes("require('./database/models/LevelingConfig')");
            const hasLevelingConfigInModels = indexContent.includes('LevelingConfig');
            const hasLevelingConfigInit = indexContent.includes('LevelingConfig.findByGuildId');
            
            this.logTest('LevelingConfig import in index.js', hasLevelingConfigImport, 
                hasLevelingConfigImport ? 'LevelingConfig properly imported' : 'Missing LevelingConfig import');
            
            this.logTest('LevelingConfig in database models', hasLevelingConfigInModels, 
                hasLevelingConfigInModels ? 'LevelingConfig in models object' : 'Missing from models object');
                
            this.logTest('LevelingConfig initialization', hasLevelingConfigInit, 
                hasLevelingConfigInit ? 'Guild initialization includes LevelingConfig' : 'Missing guild initialization');
        } else {
            this.logTest('Index.js integration check', false, 'src/index.js not found');
        }
        
        // Test that all files exist
        const allFilesExist = this.newFiles.every(file => {
            const exists = fs.existsSync(path.join(this.projectRoot, file));
            if (!exists) {
                this.logTest(`File existence: ${file}`, false, 'File not found');
            }
            return exists;
        });
        
        if (allFilesExist) {
            this.logTest('All leveling system files present', true, `${this.newFiles.length} files created`);
        }
    }

    generateReport() {
        this.log('\n' + '='.repeat(60), 'bold');
        this.log('🌿 CANNABIS LEVELING SYSTEM VALIDATION REPORT', 'bold');
        this.log('='.repeat(60), 'bold');
        
        const passRate = ((this.testResults.passed / this.testResults.total) * 100).toFixed(1);
        const status = this.testResults.failed === 0 ? 'PASSED' : 'FAILED';
        const statusColor = this.testResults.failed === 0 ? 'green' : 'red';
        
        this.log(`\nOverall Status: ${status}`, statusColor);
        this.log(`Pass Rate: ${passRate}% (${this.testResults.passed}/${this.testResults.total})`, 
            this.testResults.failed === 0 ? 'green' : 'yellow');
        
        if (this.testResults.failed > 0) {
            this.log(`\n❌ Failed Tests (${this.testResults.failed}):`, 'red');
            this.testResults.errors.forEach(error => {
                this.log(`  • ${error.test}: ${error.details}`, 'red');
            });
        }
        
        this.log('\n📋 Component Status:', 'bold');
        this.log('  🗄️  Database Models: LevelingConfig, User Extensions');
        this.log('  ⚙️  Services: XPCalculationService, AutomaticRoleProgressionService');
        this.log('  💬 Commands: /level, /leaderboard');
        this.log('  📡 Events: messageCreate XP tracking');
        this.log('  🔗 Integration: Audit logging, age verification compliance');
        
        this.log('\n🚀 Ready for Production:', this.testResults.failed === 0 ? 'YES' : 'NO', statusColor);
        this.log('='.repeat(60), 'bold');
        
        return this.testResults.failed === 0;
    }

    async runValidation() {
        this.log('🌿 Starting Cannabis Leveling System Validation', 'bold');
        this.log('GrowmiesNJ Discord Bot - Production Readiness Test\n', 'cyan');
        
        await this.validateFileSyntax();
        await this.validateImports();
        await this.validateDatabaseModels();
        await this.validateCommands();
        await this.validateEvents();
        await this.validateIntegration();
        
        return this.generateReport();
    }
}

// Run validation if called directly
if (require.main === module) {
    const validator = new LevelingSystemValidator();
    validator.runValidation()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('❌ Validation failed:', error);
            process.exit(1);
        });
}

module.exports = LevelingSystemValidator;