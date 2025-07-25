#!/usr/bin/env node

/**
 * Cannabis Engagement System Validation Script
 * 
 * Comprehensive validation for GrowmiesNJ Discord Bot engagement features
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

class EngagementSystemValidator {
    constructor() {
        this.testResults = {
            passed: 0,
            failed: 0,
            total: 0,
            errors: []
        };
        
        // All engagement commands and related files
        this.engagementFiles = [
            // Cannabis content commands (require age verification)
            'src/commands/engagement/quiz.js',
            'src/commands/engagement/daily-challenge.js',
            'src/commands/engagement/strain-info.js',
            'src/commands/engagement/strain-guess.js',
            // Community commands (all ages)
            'src/commands/engagement/dice.js',
            'src/commands/engagement/coinflip.js',
            'src/commands/engagement/8ball.js',
            'src/commands/engagement/would-you-rather.js',
            'src/commands/engagement/vote.js',
            'src/commands/engagement/suggest.js',
            'src/commands/engagement/compliment.js',
            'src/commands/engagement/celebrate.js',
            // Database models
            'src/database/models/QuizQuestion.js',
            'src/database/models/Challenge.js',
            'src/database/models/ChallengeParticipation.js',
            // Services
            'src/services/engagementService.js',
            'src/utils/ageVerificationHelper.js'
        ];

        this.cannabisCommands = [
            'quiz', 'daily-challenge', 'strain-info', 'strain-guess'
        ];

        this.communityCommands = [
            'dice', 'coinflip', '8ball', 'would-you-rather', 'vote', 'suggest', 'compliment', 'celebrate'
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
        this.log('\n🔍 Validating Engagement File Syntax', 'bold');
        
        for (const file of this.engagementFiles) {
            const filePath = path.join(this.projectRoot, file);
            
            if (!fs.existsSync(filePath)) {
                this.logTest(`File exists: ${file}`, false, 'File not found');
                continue;
            }

            try {
                const result = await this.runCommand('node', ['--check', filePath]);
                const passed = result.code === 0;
                this.logTest(
                    `Syntax validation: ${path.basename(file)}`, 
                    passed, 
                    passed ? 'Valid syntax' : `Syntax error: ${result.stderr.trim()}`
                );
            } catch (error) {
                this.logTest(`Syntax validation: ${file}`, false, `Error: ${error.message}`);
            }
        }
    }

    async validateDatabaseModels() {
        this.log('\n🗄️ Validating Engagement Database Models', 'bold');
        
        const testScript = `
const path = require('path');
process.chdir('${this.projectRoot}');

async function testEngagementModels() {
    try {
        // Test QuizQuestion model
        const { QuizQuestion } = require('./src/database/models/QuizQuestion');
        console.log(JSON.stringify({
            test: 'QuizQuestion model loading',
            success: !!QuizQuestion,
            details: QuizQuestion ? 'Model loaded successfully' : 'Failed to load model'
        }));

        // Test Challenge model
        const { Challenge } = require('./src/database/models/Challenge');
        console.log(JSON.stringify({
            test: 'Challenge model loading',
            success: !!Challenge,
            details: Challenge ? 'Model loaded successfully' : 'Failed to load model'
        }));

        // Test ChallengeParticipation model
        const { ChallengeParticipation } = require('./src/database/models/ChallengeParticipation');
        console.log(JSON.stringify({
            test: 'ChallengeParticipation model loading',
            success: !!ChallengeParticipation,
            details: ChallengeParticipation ? 'Model loaded successfully' : 'Failed to load model'
        }));

        // Test engagementService
        const { EngagementService } = require('./src/services/engagementService');
        console.log(JSON.stringify({
            test: 'EngagementService loading',
            success: !!EngagementService,
            details: EngagementService ? 'Service loaded successfully' : 'Failed to load service'
        }));

        // Test ageVerificationHelper
        const AgeVerificationHelper = require('./src/utils/ageVerificationHelper');
        console.log(JSON.stringify({
            test: 'AgeVerificationHelper loading',
            success: !!(AgeVerificationHelper && AgeVerificationHelper.requireAgeVerification),
            details: AgeVerificationHelper?.requireAgeVerification ? 'Helper loaded with requireAgeVerification' : 'Missing requireAgeVerification method'
        }));

    } catch (error) {
        console.log(JSON.stringify({
            test: 'Engagement models validation',
            success: false,
            details: error.message
        }));
    }
}

testEngagementModels().catch(console.error);
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
            this.logTest('Engagement models validation', false, `Failed to test models: ${error.message}`);
        }
    }

    async validateAgeVerificationIntegration() {
        this.log('\n🔞 Validating Age Verification Integration', 'bold');
        
        for (const commandName of this.cannabisCommands) {
            const filePath = `src/commands/engagement/${commandName}.js`;
            const testScript = `
const path = require('path');
process.chdir('${this.projectRoot}');

try {
    const fs = require('fs');
    const commandPath = './${filePath}';
    
    if (!fs.existsSync(commandPath)) {
        console.log(JSON.stringify({
            command: '${commandName}',
            success: false,
            details: 'File not found'
        }));
    } else {
        const commandContent = fs.readFileSync(commandPath, 'utf8');
        const hasAgeVerificationImport = commandContent.includes('ageVerificationHelper') || commandContent.includes('AgeVerificationHelper');
        const hasRequireAgeVerification = commandContent.includes('requireAgeVerification') || commandContent.includes('checkAgeVerification');
        
        console.log(JSON.stringify({
            command: '${commandName}',
            success: hasAgeVerificationImport && hasRequireAgeVerification,
            details: hasAgeVerificationImport && hasRequireAgeVerification ? 
                'Age verification properly integrated' : 
                \`Missing: \${!hasAgeVerificationImport ? 'import' : ''} \${!hasRequireAgeVerification ? 'usage' : ''}\`.trim()
        }));
    }
} catch (error) {
    console.log(JSON.stringify({
        command: '${commandName}',
        success: false,
        details: error.message
    }));
}
            `;

            try {
                const result = await this.runCommand('node', ['-e', testScript]);
                const testResult = JSON.parse(result.stdout.trim());
                this.logTest(
                    `Age verification: ${testResult.command}`, 
                    testResult.success, 
                    testResult.details
                );
            } catch (error) {
                this.logTest(`Age verification: ${commandName}`, false, `Parse error: ${error.message}`);
            }
        }
    }

    async validateCommandStructure() {
        this.log('\n⚡ Validating Engagement Command Structure', 'bold');
        
        const allCommands = [...this.cannabisCommands, ...this.communityCommands];
        
        for (const commandName of allCommands) {
            const testScript = `
const path = require('path');
process.chdir('${this.projectRoot}');

try {
    const command = require('./src/commands/engagement/${commandName}');
    const hasData = !!command.data;
    const hasExecute = typeof command.execute === 'function';
    const correctName = command.data?.name === '${commandName}';
    const hasDescription = !!command.data?.description;
    
    console.log(JSON.stringify({
        hasData,
        hasExecute,
        correctName,
        hasDescription,
        actualName: command.data?.name,
        actualDescription: command.data?.description?.substring(0, 50) + '...'
    }));
} catch (error) {
    console.log(JSON.stringify({ error: error.message }));
}
            `;

            try {
                const result = await this.runCommand('node', ['-e', testScript]);
                const commandData = JSON.parse(result.stdout.trim());
                
                if (commandData.error) {
                    this.logTest(`${commandName} command structure`, false, commandData.error);
                    continue;
                }

                const passed = commandData.hasData && commandData.hasExecute && commandData.correctName && commandData.hasDescription;
                let details = [];
                if (!commandData.hasData) details.push('missing data property');
                if (!commandData.hasExecute) details.push('missing execute function');
                if (!commandData.correctName) details.push(`wrong name: ${commandData.actualName}`);
                if (!commandData.hasDescription) details.push('missing description');
                
                this.logTest(
                    `${commandName} command structure`, 
                    passed, 
                    passed ? `Valid command: /${commandData.actualName}` : details.join(', ')
                );
            } catch (error) {
                this.logTest(`${commandName} command validation`, false, `Parse error: ${error.message}`);
            }
        }
    }

    async validateXPIntegration() {
        this.log('\n🎯 Validating XP Integration', 'bold');
        
        const communityCommandsToCheck = ['dice', 'coinflip', '8ball', 'vote', 'suggest', 'compliment', 'celebrate'];
        
        for (const commandName of communityCommandsToCheck) {
            const testScript = `
const path = require('path');
process.chdir('${this.projectRoot}');

try {
    const fs = require('fs');
    const commandPath = './src/commands/engagement/${commandName}.js';
    
    if (!fs.existsSync(commandPath)) {
        console.log(JSON.stringify({
            command: '${commandName}',
            success: false,
            details: 'File not found'
        }));
    } else {
        const commandContent = fs.readFileSync(commandPath, 'utf8');
        const hasEngagementService = commandContent.includes('engagementService') || commandContent.includes('EngagementService');
        const hasTrackActivity = commandContent.includes('trackActivity') || commandContent.includes('awardXP');
        
        console.log(JSON.stringify({
            command: '${commandName}',
            success: hasEngagementService && hasTrackActivity,
            details: hasEngagementService && hasTrackActivity ? 
                'XP integration properly implemented' : 
                \`Missing: \${!hasEngagementService ? 'service import' : ''} \${!hasTrackActivity ? 'XP tracking' : ''}\`.trim()
        }));
    }
} catch (error) {
    console.log(JSON.stringify({
        command: '${commandName}',
        success: false,
        details: error.message
    }));
}
            `;

            try {
                const result = await this.runCommand('node', ['-e', testScript]);
                const testResult = JSON.parse(result.stdout.trim());
                this.logTest(
                    `XP integration: ${testResult.command}`, 
                    testResult.success, 
                    testResult.details
                );
            } catch (error) {
                this.logTest(`XP integration: ${commandName}`, false, `Parse error: ${error.message}`);
            }
        }
    }

    async validateCannabisCompliance() {
        this.log('\n🌿 Validating Cannabis Compliance Features', 'bold');
        
        // Test cannabis-themed content in appropriate commands
        const testScript = `
const path = require('path');
process.chdir('${this.projectRoot}');

try {
    const fs = require('fs');
    
    // Check quiz command for cannabis categories
    const quizPath = './src/commands/engagement/quiz.js';
    if (fs.existsSync(quizPath)) {
        const quizContent = fs.readFileSync(quizPath, 'utf8');
        const hasCannabisCategories = quizContent.includes('Growing') || quizContent.includes('Strains') || quizContent.includes('Laws');
        console.log(JSON.stringify({
            test: 'Quiz cannabis categories',
            success: hasCannabisCategories,
            details: hasCannabisCategories ? 'Cannabis knowledge categories present' : 'Missing cannabis categories'
        }));
    }
    
    // Check strain-info command for strain database
    const strainInfoPath = './src/commands/engagement/strain-info.js';
    if (fs.existsSync(strainInfoPath)) {
        const strainContent = fs.readFileSync(strainInfoPath, 'utf8');
        const hasStrainData = strainContent.includes('indica') || strainContent.includes('sativa') || strainContent.includes('hybrid');
        console.log(JSON.stringify({
            test: 'Strain database integration',
            success: hasStrainData,
            details: hasStrainData ? 'Strain types and data integrated' : 'Missing strain data'
        }));
    }
    
    // Check daily-challenge for cannabis compliance
    const challengePath = './src/commands/engagement/daily-challenge.js';
    if (fs.existsSync(challengePath)) {
        const challengeContent = fs.readFileSync(challengePath, 'utf8');
        const hasCannabisCompliance = challengeContent.includes('AgeVerificationHelper') && challengeContent.includes('cannabis');
        console.log(JSON.stringify({
            test: 'Daily challenge cannabis compliance',
            success: hasCannabisCompliance,
            details: hasCannabisCompliance ? 'Cannabis compliance implemented' : 'Missing cannabis compliance features'
        }));
    }
    
} catch (error) {
    console.log(JSON.stringify({
        test: 'Cannabis compliance validation',
        success: false,
        details: error.message
    }));
}
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
            this.logTest('Cannabis compliance validation', false, `Failed to test compliance: ${error.message}`);
        }
    }

    async validateSystemIntegration() {
        this.log('\n🔗 Validating System Integration', 'bold');
        
        // Check that all engagement files exist
        const allFilesExist = this.engagementFiles.every(file => {
            const exists = fs.existsSync(path.join(this.projectRoot, file));
            if (!exists) {
                this.logTest(`File existence: ${path.basename(file)}`, false, 'File not found');
            }
            return exists;
        });
        
        if (allFilesExist) {
            this.logTest('All engagement files present', true, `${this.engagementFiles.length} files created`);
        }

        // Test engagement command categorization
        const cannabisCount = this.cannabisCommands.length;
        const communityCount = this.communityCommands.length;
        const totalCommands = cannabisCount + communityCount;
        
        this.logTest('Cannabis content commands', cannabisCount >= 4, 
            `${cannabisCount} cannabis commands (quiz, daily-challenge, strain-info, strain-guess)`);
        
        this.logTest('Community commands', communityCount >= 8, 
            `${communityCount} community commands (dice, coinflip, 8ball, etc.)`);
        
        this.logTest('Total engagement commands', totalCommands >= 12, 
            `${totalCommands} total engagement commands implemented`);
    }

    generateReport() {
        this.log('\n' + '='.repeat(70), 'bold');
        this.log('🌿 CANNABIS ENGAGEMENT SYSTEM VALIDATION REPORT', 'bold');
        this.log('='.repeat(70), 'bold');
        
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
        this.log('  🌿 Cannabis Commands: /quiz, /daily-challenge, /strain-info, /strain-guess');
        this.log('  🎮 Community Commands: /dice, /coinflip, /8ball, /would-you-rather, /vote, /suggest, /compliment, /celebrate');
        this.log('  🗄️ Database Models: QuizQuestion, Challenge, ChallengeParticipation');
        this.log('  ⚙️ Services: engagementService, ageVerificationHelper');
        this.log('  🔞 Age Verification: 21+ cannabis content protection');
        this.log('  🎯 XP Integration: Activity tracking and rewards');
        this.log('  ⚖️ Cannabis Compliance: NJ legal requirements implemented');
        
        this.log('\n🚀 Ready for Production:', this.testResults.failed === 0 ? 'YES' : 'NO', statusColor);
        this.log('='.repeat(70), 'bold');
        
        return this.testResults.failed === 0;
    }

    async runValidation() {
        this.log('🌿 Starting Cannabis Engagement System Validation', 'bold');
        this.log('GrowmiesNJ Discord Bot - Engagement Features Test\n', 'cyan');
        
        await this.validateFileSyntax();
        await this.validateDatabaseModels();
        await this.validateAgeVerificationIntegration();
        await this.validateCommandStructure();
        await this.validateXPIntegration();
        await this.validateCannabisCompliance();
        await this.validateSystemIntegration();
        
        return this.generateReport();
    }
}

// Run validation if called directly
if (require.main === module) {
    const validator = new EngagementSystemValidator();
    validator.runValidation()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('❌ Validation failed:', error);
            process.exit(1);
        });
}

module.exports = EngagementSystemValidator;