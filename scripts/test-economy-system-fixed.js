/**
 * Economy System Test Script for GrowmiesNJ Discord Bot - Fixed Version
 * 
 * Properly validates the actual code structure including:
 * - Class-based Sequelize models
 * - Service integrations
 * - Cannabis compliance
 * - Command functionality
 */

const fs = require('fs');
const path = require('path');

// Test configuration
const TEST_CONFIG = {
  verbose: true,
  stopOnFirstError: false,
  generateReport: true
};

// Test results tracking
const TestResults = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: [],
  warnings: [],
  details: []
};

/**
 * Main test runner
 */
async function runEconomySystemTests() {
  console.log('🌿 Starting GrowmiesNJ Economy System Validation (Fixed)');
  console.log('='.repeat(60));
  
  try {
    // Run test suites
    await testFileExistence();
    await testDatabaseModels();
    await testServiceLayer();
    await testCommandIntegration();
    await testCannabisCompliance();
    await testSystemIntegrations();
    
    // Generate final report
    generateTestReport();
    
  } catch (error) {
    console.error('❌ Critical test failure:', error);
    TestResults.errors.push({
      test: 'Test Runner',
      error: error.message,
      critical: true
    });
  }
}

/**
 * Test that all required files exist
 */
async function testFileExistence() {
  logTestSection('Testing File Existence');
  
  const requiredFiles = [
    'src/database/models/Economy.js',
    'src/database/models/EconomyItem.js',
    'src/database/models/EconomyTransaction.js',
    'src/database/models/UserInventory.js',
    'src/database/models/EconomyShop.js',
    'src/services/economyService.js',
    'src/utils/economyHelpers.js',
    'src/commands/economy/balance.js',
    'src/commands/economy/daily.js',
    'src/commands/economy/shop.js',
    'src/commands/economy/inventory.js',
    'src/commands/economy/gift.js',
    'src/commands/economy/work.js',
    'src/commands/economy/leaderboard.js',
    'src/database/migrations.js'
  ];
  
  for (const file of requiredFiles) {
    try {
      if (fs.existsSync(file)) {
        logTestPass(`File exists: ${file}`);
      } else {
        logTestFail(`Missing file: ${file}`, new Error(`Required file not found: ${file}`));
      }
    } catch (error) {
      logTestFail(`File check: ${file}`, error);
    }
  }
}

/**
 * Test database models structure
 */
async function testDatabaseModels() {
  logTestSection('Testing Database Models');
  
  const models = [
    { name: 'Economy', file: 'src/database/models/Economy.js' },
    { name: 'EconomyItem', file: 'src/database/models/EconomyItem.js' },
    { name: 'EconomyTransaction', file: 'src/database/models/EconomyTransaction.js' },
    { name: 'UserInventory', file: 'src/database/models/UserInventory.js' },
    { name: 'EconomyShop', file: 'src/database/models/EconomyShop.js' }
  ];
  
  for (const model of models) {
    await testModel(model.name, model.file);
  }
}

/**
 * Test individual model structure
 */
async function testModel(modelName, filePath) {
  try {
    logTestSubsection(`Testing ${modelName} Model`);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`Model file not found: ${filePath}`);
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Test for Class-based model structure
    const classPattern = new RegExp(`class\\s+${modelName}\\s+extends\\s+Model`);
    if (!classPattern.test(content)) {
      throw new Error(`${modelName} missing class definition extending Model`);
    }
    
    // Test for model initialization
    const initPattern = new RegExp(`${modelName}\\.init\\s*\\(`);
    if (!initPattern.test(content)) {
      throw new Error(`${modelName} missing .init() method`);
    }
    
    // Test for required imports
    if (!content.includes('DataTypes') || !content.includes('Model')) {
      throw new Error(`${modelName} missing required Sequelize imports`);
    }
    
    // Test for module exports
    if (!content.includes('module.exports')) {
      throw new Error(`${modelName} missing module.exports`);
    }
    
    logTestPass(`${modelName} model structure`);
    
  } catch (error) {
    logTestFail(`${modelName} model`, error);
  }
}

/**
 * Test service layer
 */
async function testServiceLayer() {
  logTestSection('Testing Service Layer');
  
  await testEconomyService();
  await testEconomyHelpers();
}

/**
 * Test economy service
 */
async function testEconomyService() {
  try {
    logTestSubsection('Testing Economy Service');
    
    const servicePath = 'src/services/economyService.js';
    if (!fs.existsSync(servicePath)) {
      throw new Error('EconomyService file not found');
    }
    
    const content = fs.readFileSync(servicePath, 'utf8');
    
    // Test service class structure
    if (!content.includes('class EconomyService')) {
      throw new Error('EconomyService class not found');
    }
    
    // Test required methods
    const requiredMethods = [
      'getOrCreateUserEconomy',
      'processTransaction',
      'purchaseItem',
      'processDailyReward',
      'processWorkActivity',
      'sendGift',
      'getEconomyLeaderboard',
      'getUserEconomyStats',
      'awardEngagementRewards',
      'calculateEngagementRewards'
    ];
    
    for (const method of requiredMethods) {
      const methodPattern = new RegExp(`(async\\s+)?${method}\\s*\\(`);
      if (!methodPattern.test(content)) {
        throw new Error(`Missing method: ${method}`);
      }
    }
    
    // Test integration imports
    const requiredImports = [
      'EngagementService',
      'XPCalculationService',
      'AgeVerificationService'
    ];
    
    for (const importName of requiredImports) {
      if (!content.includes(importName)) {
        throw new Error(`Missing import: ${importName}`);
      }
    }
    
    // Test module export
    if (!content.includes('module.exports = new EconomyService()')) {
      throw new Error('Missing singleton export');
    }
    
    logTestPass('Economy service structure');
    
  } catch (error) {
    logTestFail('Economy service', error);
  }
}

/**
 * Test economy helpers
 */
async function testEconomyHelpers() {
  try {
    logTestSubsection('Testing Economy Helpers');
    
    const helpersPath = 'src/utils/economyHelpers.js';
    if (!fs.existsSync(helpersPath)) {
      throw new Error('EconomyHelpers file not found');
    }
    
    const content = fs.readFileSync(helpersPath, 'utf8');
    
    // Test helper modules exist
    const requiredModules = [
      'Currency',
      'Validation',
      'CannabisThemed',
      'EmbedBuilders'
    ];
    
    for (const moduleName of requiredModules) {
      if (!content.includes(moduleName)) {
        throw new Error(`Missing helper module: ${moduleName}`);
      }
    }
    
    logTestPass('Economy helpers structure');
    
  } catch (error) {
    logTestFail('Economy helpers', error);
  }
}

/**
 * Test command integration
 */
async function testCommandIntegration() {
  logTestSection('Testing Command Integration');
  
  const commands = [
    'balance',
    'daily',
    'shop',
    'inventory',
    'gift',
    'work',
    'leaderboard'
  ];
  
  for (const command of commands) {
    await testCommand(command);
  }
}

/**
 * Test individual command
 */
async function testCommand(commandName) {
  try {
    logTestSubsection(`Testing ${commandName} Command`);
    
    const commandPath = `src/commands/economy/${commandName}.js`;
    if (!fs.existsSync(commandPath)) {
      throw new Error(`Command file not found: ${commandPath}`);
    }
    
    const content = fs.readFileSync(commandPath, 'utf8');
    
    // Test command structure
    const requiredElements = [
      'SlashCommandBuilder',
      'module.exports',
      'data:',
      'execute'
    ];
    
    for (const element of requiredElements) {
      if (!content.includes(element)) {
        throw new Error(`${commandName} command missing: ${element}`);
      }
    }
    
    // Test economy service integration
    if (!content.includes('economyService')) {
      throw new Error(`${commandName} command missing economy service integration`);
    }
    
    logTestPass(`${commandName} command structure`);
    
  } catch (error) {
    logTestFail(`${commandName} command`, error);
  }
}

/**
 * Test cannabis compliance
 */
async function testCannabisCompliance() {
  logTestSection('Testing Cannabis Compliance');
  
  try {
    // Test age verification in cannabis-related commands
    const cannabisCommands = ['shop', 'daily', 'work'];
    
    for (const command of cannabisCommands) {
      const commandPath = `src/commands/economy/${command}.js`;
      if (fs.existsSync(commandPath)) {
        const content = fs.readFileSync(commandPath, 'utf8');
        
        // Check for age verification patterns
        const hasAgeVerification = content.includes('ageVerificationService') || 
                                 content.includes('isUserVerified') ||
                                 content.includes('is_21_plus') ||
                                 content.includes('21+');
        
        if (!hasAgeVerification) {
          logTestWarning(`${command} command`, 'No obvious age verification found');
        }
      }
    }
    
    // Test service compliance
    const servicePath = 'src/services/economyService.js';
    if (fs.existsSync(servicePath)) {
      const content = fs.readFileSync(servicePath, 'utf8');
      
      if (!content.includes('AgeVerificationService')) {
        throw new Error('Economy service missing age verification service');
      }
      
      if (!content.includes('involvesCannabis') && !content.includes('cannabis')) {
        throw new Error('Economy service missing cannabis compliance tracking');
      }
    }
    
    logTestPass('Cannabis compliance validation');
    
  } catch (error) {
    logTestFail('Cannabis compliance', error);
  }
}

/**
 * Test system integrations
 */
async function testSystemIntegrations() {
  logTestSection('Testing System Integrations');
  
  try {
    // Test engagement service integration
    const engagementPath = 'src/services/engagementService.js';
    if (fs.existsSync(engagementPath)) {
      const content = fs.readFileSync(engagementPath, 'utf8');
      
      if (!content.includes('economyService')) {
        throw new Error('Engagement service missing economy integration');
      }
      
      if (!content.includes('awardEngagementRewards')) {
        throw new Error('Engagement service missing reward integration');
      }
    }
    
    // Test database migrations
    const migrationPath = 'src/database/migrations.js';
    if (fs.existsSync(migrationPath)) {
      const content = fs.readFileSync(migrationPath, 'utf8');
      
      if (!content.includes('007_economy_system')) {
        throw new Error('Database migrations missing economy system migration');
      }
    }
    
    logTestPass('System integrations validation');
    
  } catch (error) {
    logTestFail('System integrations', error);
  }
}

/**
 * Logging functions
 */
function logTestSection(title) {
  console.log(`\n🧪 ${title}`);
  console.log('-'.repeat(title.length + 4));
}

function logTestSubsection(title) {
  if (TEST_CONFIG.verbose) {
    console.log(`\n  📋 ${title}`);
  }
}

function logTestPass(testName) {
  TestResults.total++;
  TestResults.passed++;
  TestResults.details.push({
    test: testName,
    status: 'PASS',
    timestamp: new Date().toISOString()
  });
  
  if (TEST_CONFIG.verbose) {
    console.log(`    ✅ ${testName}`);
  }
}

function logTestFail(testName, error) {
  TestResults.total++;
  TestResults.failed++;
  TestResults.errors.push({
    test: testName,
    error: error.message || error,
    timestamp: new Date().toISOString()
  });
  
  console.log(`    ❌ ${testName}: ${error.message || error}`);
  
  if (TEST_CONFIG.stopOnFirstError) {
    throw error;
  }
}

function logTestWarning(testName, warning) {
  TestResults.warnings.push({
    test: testName,
    warning: warning,
    timestamp: new Date().toISOString()
  });
  
  if (TEST_CONFIG.verbose) {
    console.log(`    ⚠️  ${testName}: ${warning}`);
  }
}

/**
 * Generate test report
 */
function generateTestReport() {
  console.log('\n' + '='.repeat(60));
  console.log('🌿 GrowmiesNJ Economy System Test Report (Fixed)');
  console.log('='.repeat(60));
  
  console.log(`\n📊 Test Summary:`);
  console.log(`   Total Tests: ${TestResults.total}`);
  console.log(`   ✅ Passed: ${TestResults.passed}`);
  console.log(`   ❌ Failed: ${TestResults.failed}`);
  console.log(`   ⚠️  Warnings: ${TestResults.warnings.length}`);
  
  const successRate = TestResults.total > 0 ? (TestResults.passed / TestResults.total * 100).toFixed(1) : 0;
  console.log(`   📈 Success Rate: ${successRate}%`);
  
  if (TestResults.failed > 0) {
    console.log(`\n❌ Failed Tests:`);
    TestResults.errors.forEach(error => {
      console.log(`   • ${error.test}: ${error.error}`);
    });
  }
  
  if (TestResults.warnings.length > 0) {
    console.log(`\n⚠️  Warnings:`);
    TestResults.warnings.forEach(warning => {
      console.log(`   • ${warning.test}: ${warning.warning}`);
    });
  }
  
  // Generate detailed report
  if (TEST_CONFIG.generateReport) {
    const reportData = {
      timestamp: new Date().toISOString(),
      summary: {
        total: TestResults.total,
        passed: TestResults.passed,
        failed: TestResults.failed,
        warnings: TestResults.warnings.length,
        successRate: successRate
      },
      details: TestResults.details,
      errors: TestResults.errors,
      warnings: TestResults.warnings
    };
    
    try {
      fs.writeFileSync(
        'economy-test-report-fixed.json',
        JSON.stringify(reportData, null, 2),
        'utf8'
      );
      console.log(`\n📄 Detailed report saved to: economy-test-report-fixed.json`);
    } catch (error) {
      console.log(`\n⚠️  Could not save detailed report: ${error.message}`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  
  if (TestResults.failed === 0) {
    console.log('🎉 All tests passed! Economy system is ready for deployment.');
  } else {
    console.log('⚠️  Some tests failed. Please review and fix the issues before deployment.');
  }
  
  console.log('='.repeat(60));
}

// Run tests if script is executed directly
if (require.main === module) {
  runEconomySystemTests().catch(error => {
    console.error('💥 Test runner crashed:', error);
    process.exit(1);
  });
}

module.exports = {
  runEconomySystemTests,
  TestResults,
  TEST_CONFIG
};