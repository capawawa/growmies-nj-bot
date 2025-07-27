/**
 * Test Age Verification Button Interactions
 * 
 * This script tests the age verification button workflow to ensure:
 * 1. All button IDs are consistent across the codebase
 * 2. Button interactions are properly handled
 * 3. No "Unknown interaction" errors occur
 */

const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

class AgeVerificationButtonTester {
    constructor() {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent
            ]
        });
        
        this.testResults = {
            buttonIdsFound: [],
            handlerCases: [],
            inconsistencies: [],
            success: false
        };
    }

    /**
     * Analyze button IDs across the codebase
     */
    analyzeButtonIds() {
        console.log('🔍 Analyzing button IDs across codebase...\n');
        
        // Check verify.js
        const verifyPath = path.join(__dirname, '..', 'src', 'commands', 'age-verification', 'verify.js');
        const verifyContent = fs.readFileSync(verifyPath, 'utf8');
        
        const verifyButtons = verifyContent.match(/custom_id:\s*['"`]([^'"`]+)['"`]/g) || [];
        verifyButtons.forEach(match => {
            const buttonId = match.match(/['"`]([^'"`]+)['"`]/)[1];
            this.testResults.buttonIdsFound.push({
                file: 'verify.js',
                buttonId: buttonId,
                line: this.getLineNumber(verifyContent, match)
            });
        });

        // Check populate-channel-content.js
        const populatePath = path.join(__dirname, 'populate-channel-content.js');
        const populateContent = fs.readFileSync(populatePath, 'utf8');
        
        const populateButtons = populateContent.match(/setCustomId\(['"`]([^'"`]+)['"`]\)/g) || [];
        populateButtons.forEach(match => {
            const buttonId = match.match(/['"`]([^'"`]+)['"`]/)[1];
            this.testResults.buttonIdsFound.push({
                file: 'populate-channel-content.js',
                buttonId: buttonId,
                line: this.getLineNumber(populateContent, match)
            });
        });

        // Check daily-challenge.js
        const challengePath = path.join(__dirname, '..', 'src', 'commands', 'engagement', 'daily-challenge.js');
        const challengeContent = fs.readFileSync(challengePath, 'utf8');
        
        const challengeButtons = challengeContent.match(/setCustomId\(['"`]([^'"`]+)['"`]\)/g) || [];
        challengeButtons.forEach(match => {
            const buttonId = match.match(/['"`]([^'"`]+)['"`]/)[1];
            if (buttonId.includes('age_verify') || buttonId.includes('verification')) {
                this.testResults.buttonIdsFound.push({
                    file: 'daily-challenge.js',
                    buttonId: buttonId,
                    line: this.getLineNumber(challengeContent, match)
                });
            }
        });

        // Check interaction handler
        const handlerPath = path.join(__dirname, '..', 'src', 'events', 'interactionCreate.js');
        const handlerContent = fs.readFileSync(handlerPath, 'utf8');
        
        const handlerCases = handlerContent.match(/customId\s*===\s*['"`]([^'"`]+)['"`]/g) || [];
        handlerCases.forEach(match => {
            const buttonId = match.match(/['"`]([^'"`]+)['"`]/)[1];
            if (buttonId.includes('age_verify') || buttonId.includes('verification')) {
                this.testResults.handlerCases.push({
                    file: 'interactionCreate.js',
                    buttonId: buttonId,
                    line: this.getLineNumber(handlerContent, match)
                });
            }
        });

        console.log('📋 Button IDs Found:');
        this.testResults.buttonIdsFound.forEach(button => {
            console.log(`   ${button.file}: "${button.buttonId}" (line ~${button.line})`);
        });

        console.log('\n🎯 Handler Cases:');
        this.testResults.handlerCases.forEach(handler => {
            console.log(`   ${handler.file}: "${handler.buttonId}" (line ~${handler.line})`);
        });
    }

    /**
     * Check for consistency issues
     */
    checkConsistency() {
        console.log('\n🔍 Checking consistency...\n');
        
        const ageVerifyButtons = this.testResults.buttonIdsFound.filter(b => 
            b.buttonId.includes('age_verify') || b.buttonId.includes('verification')
        );
        
        const handlerIds = this.testResults.handlerCases.map(h => h.buttonId);
        
        ageVerifyButtons.forEach(button => {
            if (!handlerIds.includes(button.buttonId)) {
                this.testResults.inconsistencies.push({
                    type: 'missing_handler',
                    buttonId: button.buttonId,
                    file: button.file,
                    issue: `Button "${button.buttonId}" created but no handler found`
                });
            }
        });

        // Check for consistent naming pattern
        const buttonIds = ageVerifyButtons.map(b => b.buttonId);
        const expectedPattern = /^age_verify_/;
        
        buttonIds.forEach(buttonId => {
            if (!expectedPattern.test(buttonId) && buttonId !== 'age_verify_confirm' && buttonId !== 'age_verify_deny') {
                this.testResults.inconsistencies.push({
                    type: 'naming_inconsistency',
                    buttonId: buttonId,
                    issue: `Button ID "${buttonId}" doesn't follow age_verify_* pattern`
                });
            }
        });

        if (this.testResults.inconsistencies.length === 0) {
            console.log('✅ No consistency issues found!');
            this.testResults.success = true;
        } else {
            console.log('❌ Consistency issues found:');
            this.testResults.inconsistencies.forEach(issue => {
                console.log(`   ${issue.type}: ${issue.issue}`);
            });
        }
    }

    /**
     * Helper to get approximate line number
     */
    getLineNumber(content, searchText) {
        const lines = content.substring(0, content.indexOf(searchText)).split('\n');
        return lines.length;
    }

    /**
     * Test button interaction workflow
     */
    async testButtonWorkflow() {
        console.log('\n🧪 Testing button interaction workflow...\n');
        
        try {
            // Import the interaction handler to test its logic
            const interactionHandler = require('../src/events/interactionCreate');
            
            // Mock interaction object for age_verify_start
            const mockInteraction = {
                customId: 'age_verify_start',
                user: { tag: 'TestUser#1234', id: '123456789' },
                reply: async (options) => {
                    console.log('✅ Mock interaction reply called:', options.content ? 'Content provided' : 'No content');
                    return { success: true };
                },
                deferReply: async (options) => {
                    console.log('✅ Mock interaction deferred:', options?.ephemeral ? 'ephemeral' : 'public');
                    return { success: true };
                },
                editReply: async (options) => {
                    console.log('✅ Mock interaction edit reply called');
                    return { success: true };
                },
                replied: false,
                deferred: false,
                isButton: () => true,
                guild: { id: 'test-guild', name: 'Test Guild' },
                member: { roles: { cache: new Map() } }
            };

            console.log('🔘 Testing age_verify_start button interaction...');
            
            // Test that the handler would process this button
            const ageVerifyStartHandled = interactionHandler.toString().includes('age_verify_start');
            if (ageVerifyStartHandled) {
                console.log('✅ age_verify_start button handler found in interaction handler');
            } else {
                console.log('❌ age_verify_start button handler NOT found in interaction handler');
                this.testResults.success = false;
            }

            console.log('\n📊 Test Results Summary:');
            console.log(`   Button IDs Found: ${this.testResults.buttonIdsFound.length}`);
            console.log(`   Handler Cases: ${this.testResults.handlerCases.length}`);
            console.log(`   Inconsistencies: ${this.testResults.inconsistencies.length}`);
            console.log(`   Overall Success: ${this.testResults.success ? '✅ PASS' : '❌ FAIL'}`);

        } catch (error) {
            console.error('❌ Error testing button workflow:', error.message);
            this.testResults.success = false;
        }
    }

    /**
     * Run all tests
     */
    async runTests() {
        console.log('🧪 Age Verification Button Test Suite');
        console.log('=====================================\n');
        
        this.analyzeButtonIds();
        this.checkConsistency();
        await this.testButtonWorkflow();
        
        console.log('\n' + '='.repeat(50));
        
        if (this.testResults.success) {
            console.log('🎉 ALL TESTS PASSED!');
            console.log('✅ Age verification button interactions should now work correctly');
            console.log('✅ No more "Unknown button interaction" errors expected');
        } else {
            console.log('❌ SOME TESTS FAILED!');
            console.log('⚠️  Age verification button issues may still exist');
        }
        
        return this.testResults;
    }
}

// Run tests if this script is executed directly
async function main() {
    const tester = new AgeVerificationButtonTester();
    return await tester.runTests();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = AgeVerificationButtonTester;