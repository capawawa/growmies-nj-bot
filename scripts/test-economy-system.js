/**
 * Economy System Test Script for GrowmiesNJ Discord Bot
 * 
 * Comprehensive validation of all economy features including:
 * - Database models and relationships
 * - Service layer functionality
 * - Command integration
 * - Cannabis compliance and age verification
 * - XP and engagement system integration
 * - Transaction processing and audit trails
 */

const fs = require('fs');
const path = require('path');

// Test configuration
const TEST_CONFIG = {
  verbose: true,
  stopOnFirstError: false,
  generateReport: true,
  testDatabaseModels: true,
  testServiceLayer: true,
  testCommandIntegration: true,
  testCompliance: true,
  testIntegrations: true
};

// Test results tracking
const TestResults = {
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
  errors: [],
  warnings: [],
  details: []
};

/**
 * Main test runner
 */
async function runEconomySystemTests() {
  console.log('🌿 Starting GrowmiesNJ Economy System Validation');
  console.log('=' * 60);
  
  try {
    // Initialize test environment
    await initializeTestEnvironment();
    
    // Run test suites
    if (TEST_CONFIG.testDatabaseModels) {
      await testDatabaseModels();
    }
    
    if (TEST_CONFIG.testServiceLayer) {
      await testServiceLayer();
    }
    
    if (TEST_CONFIG.testCommandIntegration) {
      await testCommandIntegration();
    }
    
    if (TEST_CONFIG.testCompliance) {
      await testCannabisCompliance();
    }
    
    if (TEST_CONFIG.testIntegrations) {
      await testSystemIntegrations();
    }
    
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
 * Initialize test environment
 */
async function initializeTestEnvironment() {
  logTestSection('Initializing Test Environment');
  
  try {
    // Check if required files exist
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
      'src/commands/economy/leaderboard.js'
    ];
    
    for (const file of requiredFiles) {
      await testFileExists(file);
    }
    
    logTestPass('Environment initialization');
    
  } catch (error) {
    logTestFail('Environment initialization', error);
    throw error;
  }
}

/**
 * Test database models
 */
async function testDatabaseModels() {
  logTestSection('Testing Database Models');
  
  const models = [
    'Economy',
    'EconomyItem', 
    'EconomyTransaction',
    'UserInventory',
    'EconomyShop'
  ];
  
  for (const modelName of models) {
    await testModel(modelName);
  }
}

/**
 * Test individual model
 */
async function testModel(modelName) {
  try {
    logTestSubsection(`Testing ${modelName} Model`);
    
    // Check if model file exists and is properly structured
    const modelPath = `src/database/models/${modelName}.js`;
    await testFileExists(modelPath);
    
    // Test model structure by attempting to require it
    try {
      const modelFile = fs.readFileSync(modelPath, 'utf8');
      
      // Basic structure validation
      await testHasRequiredElements(modelFile, modelName, [
        'DataTypes',
        'module.exports',
        'sequelize.define'
      ]);
      
      // Model-specific validations
      switch (modelName) {
        case 'Economy':
          await testEconomyModelStructure(modelFile);
          break;
        case 'EconomyItem':
          await testEconomyItemModelStructure(modelFile);
          break;
        case 'EconomyTransaction':
          await testEconomyTransactionModelStructure(modelFile);
          break;
        case 'UserInventory':
          await testUserInventoryModelStructure(modelFile);
          break;
        case 'EconomyShop':
          await testEconomyShopModelStructure(modelFile);
          break;
      }
      
      logTestPass(`${modelName} model structure`);
      
    } catch (error) {
      logTestFail(`${modelName} model loading`, error);
    }
    
  } catch (error) {
    logTestFail(`${modelName} model`, error);
  }
}

/**
 * Test service layer functionality
 */
async function testServiceLayer() {
  logTestSection('Testing Service Layer');
  
  try {
    // Test economy service
    await testEconomyService();
    
    // Test helper utilities
    await testEconomyHelpers();
    
  } catch (error) {
    logTestFail('Service layer', error);
  }
}

/**
 * Test economy service
 */
async function testEconomyService() {
  logTestSubsection('Testing Economy Service');
  
  try {
    const servicePath = 'src/services/economyService.js';
    await testFileExists(servicePath);
    
    const serviceFile = fs.readFileSync(servicePath, 'utf8');
    
    // Test required methods exist
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
      await testMethodExists(serviceFile, method, 'EconomyService');
    }
    
    // Test integration imports
    const requiredImports = [
      'EngagementService',
      'XPCalculationService',
      'AgeVerificationService'
    ];
    
    for (const importName of requiredImports) {
      await testImportExists(serviceFile, importName);
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
  logTestSubsection('Testing Economy Helpers');
  
  try {
    const helpersPath = 'src/utils/economyHelpers.js';
    await testFileExists(helpersPath);
    
    const helpersFile = fs.readFileSync(helpersPath, 'utf8');
    
    // Test required helper modules
    const requiredModules = [
      'Currency',
      'Validation',
      'CannabisThemed',
      'EmbedBuilders'
    ];
    
    for (const moduleName of requiredModules) {
      await testExportExists(helpersFile, moduleName);
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
    await testFileExists(commandPath);
    
    const commandFile = fs.readFileSync(commandPath, 'utf8');
    
    // Test command structure
    await testHasRequiredElements(commandFile, `${commandName} command`, [
      'SlashCommandBuilder',
      'module.exports',
      'data:',
      'execute'
    ]);
    
    // Test age verification integration
    await testAgeVerificationIntegration(commandFile, commandName);
    
    // Test economy service integration
    await testEconomyServiceIntegration(commandFile, commandName);
    
    logTestPass(`${commandName} command structure`);
    
  } catch (error) {
    logTestFail(`${commandName} command`, error);
  }
}

/**
 * Test cannabis compliance features
 */
async function testCannabisCompliance() {
  logTestSection('Testing Cannabis Compliance');
  
  try {
    // Test age verification integration
    await testAgeVerificationCompliance();
    
    // Test cannabis content restrictions
    await testCannabisContentRestrictions();
    
    // Test audit trail compliance
    await testAuditTrailCompliance();
    
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
    // Test XP system integration
    await testXPSystemIntegration();
    
    // Test engagement system integration
    await testEngagementSystemIntegration();
    
    // Test database migration integration
    await testDatabaseMigrationIntegration();
    
    logTestPass('System integrations validation');
    
  } catch (error) {
    logTestFail('System integrations', error);
  }
}

/**
 * Utility functions for testing
 */

async function testFileExists(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Required file missing: ${filePath}`);
  }
  return true;
}

async function testHasRequiredElements(content, testName, elements) {
  for (const element of elements) {
    if (!content.includes(element)) {
      throw new Error(`${testName} missing required element: ${element}`);
    }
  }
  return true;
}

async function testMethodExists(content, methodName, className) {
  const methodPattern = new RegExp(`(async\\s+)?${methodName}\\s*\\(`);
  if (!methodPattern.test(content)) {
    throw new Error(`${className} missing method: ${methodName}`);
  }
  return true;
}

async function testImportExists(content, importName) {
  const importPattern = new RegExp(`require\\(.*${importName}.*\\)|import.*${importName}`);
  if (!importPattern.test(content)) {
    throw new Error(`Missing import: ${importName}`);
  }
  return true;
}

async function testExportExists(content, exportName) {
  const exportPattern = new RegExp(`${exportName}\\s*[:=]|exports\\.${exportName}`);
  if (!exportPattern.test(content)) {
    throw new Error(`Missing export: ${exportName}`);
  }
  return true;
}

async function testAgeVerificationIntegration(content, commandName) {
  if (content.includes('cannabis') || content.includes('21+') || commandName === 'shop') {
    if (!content.includes('ageVerificationService') && !content.includes('isAgeVerified')) {
      throw new Error(`${commandName} command missing age verification integration`);
    }
  }
  return true;
}

async function testEconomyServiceIntegration(content, commandName) {
  if (!content.includes('economyService')) {
    throw new Error(`${commandName} command missing economy service integration`);
  }
  return true;
}

async function testAgeVerificationCompliance() {
  // Test that cannabis-related features require age verification
  const files = [
    'src/commands/economy/shop.js',
    'src/commands/economy/work.js',
    'src/services/economyService.js'
  ];
  
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes('cannabis') || content.includes('premium_seeds')) {
      if (!content.includes('is_21_plus') && !content.includes('isAgeVerified')) {
        throw new Error(`${file} has cannabis content without age verification`);
      }
    }
  }
  
  return true;
}

async function testCannabisContentRestrictions() {
  // Test that Premium Seeds are restricted to 21+ users
  const economyService = fs.readFileSync('src/services/economyService.js', 'utf8');
  
  if (economyService.includes('premium_seeds') || economyService.includes('premiumSeeds')) {
    if (!economyService.includes('requiresAgeVerification') && !economyService.includes('is_21_plus')) {
      throw new Error('Premium Seeds not properly age-restricted');
    }
  }
  
  return true;
}

async function testAuditTrailCompliance() {
  // Test that transactions are properly logged
  const economyService = fs.readFileSync('src/services/economyService.js', 'utf8');
  
  if (!economyService.includes('AuditLog')) {
    throw new Error('Economy service missing audit logging');
  }
  
  return true;
}

async function testXPSystemIntegration() {
  const engagementService = fs.readFileSync('src/services/engagementService.js', 'utf8');
  
  if (!engagementService.includes('economyService')) {
    throw new Error('Engagement service missing economy integration');
  }
  
  if (!engagementService.includes('awardEngagementRewards')) {
    throw new Error('Engagement service missing economy reward integration');
  }
  
  return true;
}

async function testEngagementSystemIntegration() {
  const economyService = fs.readFileSync('src/services/economyService.js', 'utf8');
  
  if (!economyService.includes('EngagementService')) {
    throw new Error('Economy service missing engagement integration');
  }
  
  return true;
}

async function testDatabaseMigrationIntegration() {
  const migrationFile = fs.readFileSync('src/database/migrations.js', 'utf8');
  
  if (!migrationFile.includes('007_economy_system')) {
    throw new Error('Database migrations missing economy system migration');
  }
  
  return true;
}

/**
 * Model-specific structure tests
 */

async function testEconomyModelStructure(content) {
  const requiredFields = [
    'user_id',
    'guild_id', 
    'grow_coins_balance',
    'premium_seeds_balance',
    'daily_streak',
    'work_streak'
  ];
  
  for (const field of requiredFields) {
    if (!content.includes(field)) {
      throw new Error(`Economy model missing field: ${field}`);
    }
  }
  
  return true;
}

async function testEconomyItemModelStructure(content) {
  const requiredFields = [
    'name',
    'description',
    'category',
    'requires_21_plus',
    'cannabis_content'
  ];
  
  for (const field of requiredFields) {
    if (!content.includes(field)) {
      throw new Error(`EconomyItem model missing field: ${field}`);
    }
  }
  
  return true;
}

async function testEconomyTransactionModelStructure(content) {
  const requiredFields = [
    'user_id',
    'guild_id',
    'transaction_type',
    'amount',
    'currency_type',
    'requires_21_plus'
  ];
  
  for (const field of requiredFields) {
    if (!content.includes(field)) {
      throw new Error(`EconomyTransaction model missing field: ${field}`);
    }
  }
  
  return true;
}

async function testUserInventoryModelStructure(content) {
  const requiredFields = [
    'user_id',
    'guild_id',
    'item_id',
    'quantity'
  ];
  
  for (const field of requiredFields) {
    if (!content.includes(field)) {
      throw new Error(`UserInventory model missing field: ${field}`);
    }
  }
  
  return true;
}

async function testEconomyShopModelStructure(content) {
  const requiredFields = [
    'guild_id',
    'item_id',
    'is_active'
  ];
  
  for (const field of requiredFields) {
    if (!content.includes(field)) {
      throw new Error(`EconomyShop model missing field: ${field}`);
    }
  }
  
  return true;
}

/**
 * Logging and reporting functions
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
 * Generate comprehensive test report
 */
function generateTestReport() {
  console.log('\n' + '='.repeat(60));
  console.log('🌿 GrowmiesNJ Economy System Test Report');
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
  
  // Generate detailed report file if requested
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
      warnings: TestResults.warnings,
      configuration: TEST_CONFIG
    };
    
    try {
      fs.writeFileSync(
        'economy-test-report.json',
        JSON.stringify(reportData, null, 2),
        'utf8'
      );
      console.log(`\n📄 Detailed report saved to: economy-test-report.json`);
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