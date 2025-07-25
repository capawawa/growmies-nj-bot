# Growmies NJ Discord Bot - Testing Procedures

## 🧪 Comprehensive Testing Guide for Cannabis Community Discord Automation

**Target Audience**: QA engineers, DevOps teams, and system administrators  
**Estimated Time**: 30-45 minutes for complete testing cycle  
**Prerequisites**: Deployed system, testing environment access

---

## 📋 Table of Contents

1. [Testing Overview](#testing-overview)
2. [Pre-Testing Setup](#pre-testing-setup)
3. [Automated Testing Suite](#automated-testing-suite)
4. [Manual Testing Procedures](#manual-testing-procedures)
5. [Integration Testing](#integration-testing)
6. [Compliance Testing](#compliance-testing)
7. [Performance Testing](#performance-testing)
8. [Security Testing](#security-testing)
9. [Test Reporting](#test-reporting)

---

## 🎯 Testing Overview

### Testing Objectives
- **Functional Validation**: Verify all bot commands and features work correctly
- **Integration Validation**: Confirm third-party bot integrations function properly
- **Compliance Validation**: Ensure age verification and cannabis law adherence
- **Performance Validation**: Validate response times and resource usage
- **Security Validation**: Test access controls and data protection

### Testing Environments
- **Development**: Local testing environment
- **Staging**: Pre-production testing server
- **Production**: Live Discord server (limited testing)

### Testing Scope
- Discord.js v14 bot functionality
- Third-party bot integrations (Carl-bot, Sesh, Statbot, Xenon)
- Instagram RSS.app integration
- Age verification system
- Monitoring and alerting
- Backup and recovery procedures

---

## 🔧 Pre-Testing Setup

### Environment Preparation

1. **Verify System Status**:
   ```bash
   # Check bot status
   npm run health-check
   
   # Verify all services running
   docker ps
   
   # Check database connectivity
   npm run db:ping
   ```

2. **Create Test Data**:
   ```bash
   # Populate test database
   npm run test:seed-data
   
   # Create test Discord accounts
   # (Use Discord's testing features)
   ```

3. **Initialize Test Environment**:
   ```bash
   # Set testing environment variables
   export NODE_ENV=testing
   export DISCORD_GUILD_ID=test_server_id
   
   # Clear previous test artifacts
   npm run test:cleanup
   ```

### Test Account Setup

#### Required Test Accounts
- **Admin Account**: Full server permissions
- **Moderator Account**: Moderation permissions
- **Verified 21+ Account**: Cannabis content access
- **Unverified Account**: Limited access
- **Bot Test Account**: Automated testing

#### Test Server Configuration
- **Isolated Test Server**: Separate from production
- **Mirrored Structure**: Identical to production layout
- **Test Data**: Sample content and user interactions

---

## 🤖 Automated Testing Suite

### Unit Tests

```bash
# Run all unit tests
npm test

# Run specific test suites
npm run test:commands
npm run test:events
npm run test:utils
npm run test:database

# Run with coverage
npm run test:coverage
```

#### Critical Test Cases
- **Command Handler Tests**: All slash commands respond correctly
- **Event Handler Tests**: Discord events processed properly
- **Database Tests**: Data persistence and retrieval
- **Utility Function Tests**: Helper functions work as expected

### Integration Tests

```bash
# Run integration test suite
npm run test:integration

# Test specific integrations
npm run test:instagram
npm run test:third-party-bots
npm run test:monitoring
```

#### Integration Test Scenarios
- **Discord API Integration**: Bot communicates with Discord
- **Database Integration**: Data operations function correctly
- **Webhook Integration**: External webhooks process properly
- **Third-party APIs**: External service connections work

### End-to-End Tests

```bash
# Run comprehensive E2E tests
npm run test:e2e

# Run specific E2E scenarios
npm run test:e2e:user-journey
npm run test:e2e:admin-workflow
npm run test:e2e:compliance
```

#### E2E Test Scenarios
- **New User Onboarding**: Complete signup and verification flow
- **Content Posting**: Instagram integration and moderation
- **Event Management**: Sesh bot integration and scheduling
- **Emergency Procedures**: Incident response and recovery

---

## 📝 Manual Testing Procedures

### Bot Functionality Testing

#### 1. Basic Bot Operations

**Test: Bot Startup and Status**
1. Start the bot: `npm start`
2. Verify bot appears online in Discord
3. Check console for startup messages
4. Test basic ping command: `/ping`

**✅ Expected Result**: Bot responds with latency information

**Test: Slash Command Registration**
1. Type `/` in any channel
2. Verify all custom commands appear
3. Test command auto-completion
4. Check command permissions

**✅ Expected Result**: All commands registered and functioning

#### 2. Age Verification System

**Test: New User Age Verification**
1. Join server with new test account
2. Navigate to #age-verification channel
3. Click "Verify 21+" button
4. Complete verification process
5. Verify role assignment

**✅ Expected Result**: User receives "Verified 21+" role and access to restricted channels

**Test: Under-21 User Handling**
1. Attempt verification with false age
2. Verify rejection and explanation
3. Check limited channel access
4. Confirm compliance logging

**✅ Expected Result**: User denied access with proper explanation and logging

#### 3. Channel Structure and Permissions

**Test: Channel Hierarchy**
1. Verify all 10 categories present:
   - 📋 Information
   - 🎉 Community
   - 🌱 Growing (21+ only)
   - 💬 Discussion
   - 🎮 Gaming
   - 🎵 Music
   - 📸 Media
   - 🔧 Support
   - 👥 Staff
   - 📊 Analytics

**✅ Expected Result**: All categories and channels properly organized

**Test: Age-Restricted Access**
1. Test with unverified account
2. Attempt to access #growing-tips channel
3. Verify access denied
4. Test with verified 21+ account
5. Confirm full access granted

**✅ Expected Result**: Proper access control based on verification status

### Third-Party Bot Integration Testing

#### 1. Carl-bot Moderation

**Test: Automod Functionality**
1. Post prohibited content
2. Verify automatic deletion
3. Check moderation log
4. Test warning system

**✅ Expected Result**: Content removed, user warned, action logged

**Test: Custom Commands**
1. Test `/automod` command
2. Verify configuration options
3. Test role assignment commands
4. Check permission levels

**✅ Expected Result**: All Carl-bot features function correctly

#### 2. Sesh Event Scheduling

**Test: Event Creation**
1. Use `/event create` command
2. Set event details and time
3. Verify calendar integration
4. Test RSVP functionality

**✅ Expected Result**: Event created successfully with proper notifications

**Test: Event Notifications**
1. Set reminder for upcoming event
2. Verify notification delivery
3. Test timezone handling
4. Check calendar sync

**✅ Expected Result**: Accurate notifications and timezone conversion

#### 3. Statbot Analytics

**Test: Statistics Collection**
1. Generate test activity
2. Check `/stats` command
3. Verify data accuracy
4. Test reporting features

**✅ Expected Result**: Accurate statistics and reporting

#### 4. Xenon Backup System

**Test: Server Backup**
1. Execute `/backup create` command
2. Verify backup completion
3. Test backup listing
4. Check backup integrity

**✅ Expected Result**: Complete server backup created successfully

---

## 🔗 Integration Testing

### Instagram Integration Testing

**Test: RSS.app Webhook Reception**
1. Post new content to @growmiesNJ Instagram
2. Verify webhook reception within 5 minutes
3. Check content parsing accuracy
4. Confirm Discord channel posting

**✅ Expected Result**: Instagram post appears in #instagram-feed channel

**Test: Content Moderation**
1. Post content with prohibited keywords
2. Verify content filtering
3. Check moderation queue
4. Test manual approval process

**✅ Expected Result**: Inappropriate content filtered and queued for review

### Monitoring System Testing

**Test: Health Check Monitoring**
1. Verify health checks running every 5 minutes
2. Test failure detection
3. Check alert generation
4. Verify notification delivery

**✅ Expected Result**: Monitoring system reports accurate status

**Test: Performance Metrics**
1. Generate load on the system
2. Check memory usage monitoring
3. Verify CPU usage tracking
4. Test response time metrics

**✅ Expected Result**: All metrics collected and reported accurately

---

## ⚖️ Compliance Testing

### Age Verification Compliance

**Test: Legal Compliance**
1. Verify 21+ requirement enforcement
2. Test age verification process
3. Check compliance logging
4. Verify audit trail

**✅ Expected Result**: All cannabis content properly age-gated

**Test: Privacy Protection**
1. Test data encryption
2. Verify personal information protection
3. Check data retention policies
4. Test data deletion procedures

**✅ Expected Result**: All personal data properly protected

### Content Moderation Compliance

**Test: Cannabis Content Guidelines**
1. Test posting of educational content
2. Verify commercial content blocking
3. Check medical information guidelines
4. Test legal disclaimer display

**✅ Expected Result**: Content guidelines properly enforced

---

## 🚀 Performance Testing

### Load Testing

**Test: Concurrent User Load**
1. Simulate 100 concurrent users
2. Test command response times
3. Monitor memory usage
4. Check error rates

**✅ Expected Result**: System maintains <2 second response times

**Test: Message Volume Handling**
1. Generate high message volume
2. Test message processing speed
3. Monitor queue lengths
4. Check for message loss

**✅ Expected Result**: All messages processed without loss

### Stress Testing

**Test: Resource Limits**
1. Gradually increase system load
2. Monitor breaking points
3. Test recovery procedures
4. Verify graceful degradation

**✅ Expected Result**: System handles load gracefully and recovers properly

---

## 🔒 Security Testing

### Access Control Testing

**Test: Permission Verification**
1. Test role-based access control
2. Verify command permissions
3. Check channel access restrictions
4. Test administrative controls

**✅ Expected Result**: All access controls function correctly

**Test: Authentication Security**
1. Test bot token security
2. Verify webhook authentication
3. Check database access controls
4. Test API key protection

**✅ Expected Result**: All authentication mechanisms secure

### Data Protection Testing

**Test: Data Encryption**
1. Verify database encryption
2. Test transmission encryption
3. Check backup encryption
4. Verify key management

**✅ Expected Result**: All sensitive data properly encrypted

---

## 📊 Test Reporting

### Test Execution Report Template

```markdown
# Test Execution Report - [Date]

## Summary
- **Total Tests**: [Number]
- **Passed**: [Number]
- **Failed**: [Number]
- **Skipped**: [Number]
- **Success Rate**: [Percentage]

## Environment
- **Testing Environment**: [Environment Name]
- **Bot Version**: [Version Number]
- **Discord.js Version**: [Version]
- **Node.js Version**: [Version]

## Test Results by Category

### Unit Tests
- Status: [Pass/Fail]
- Coverage: [Percentage]
- Issues: [List any issues]

### Integration Tests
- Status: [Pass/Fail]
- Third-party Bots: [Status]
- Instagram Integration: [Status]
- Monitoring: [Status]

### Manual Tests
- Bot Functionality: [Pass/Fail]
- Age Verification: [Pass/Fail]
- Channel Structure: [Pass/Fail]
- Compliance: [Pass/Fail]

### Performance Tests
- Load Testing: [Pass/Fail]
- Response Times: [Average time]
- Resource Usage: [Memory/CPU]
- Concurrency: [Max users tested]

## Issues Found
1. [Issue description, severity, status]
2. [Issue description, severity, status]

## Recommendations
- [Recommendation 1]
- [Recommendation 2]

## Sign-off
- **Tester**: [Name]
- **Date**: [Date]
- **Approved by**: [Name]
```

### Automated Test Reports

```bash
# Generate test reports
npm run test:report

# Generate coverage report
npm run test:coverage-report

# Generate performance report
npm run test:performance-report
```

### Continuous Testing Integration

```yaml
# Example GitHub Actions testing workflow
name: Continuous Testing
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm test
      - run: npm run test:integration
      - run: npm run test:e2e
```

---

## 🔧 Testing Utilities

### Helper Scripts

```bash
# Quick health check
npm run quick-test

# Reset test environment
npm run test:reset

# Generate test data
npm run test:generate-data

# Cleanup test artifacts
npm run test:cleanup
```

### Test Data Management

```bash
# Backup test data
npm run test:backup-data

# Restore test data
npm run test:restore-data

# Validate test data integrity
npm run test:validate-data
```

---

## 📚 Related Documentation

- [DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md) - Complete deployment procedures
- [TROUBLESHOOTING_GUIDE.md](docs/TROUBLESHOOTING_GUIDE.md) - Issue resolution guide
- [SECURITY_COMPLIANCE.md](docs/SECURITY_COMPLIANCE.md) - Security testing requirements
- [PERFORMANCE_MONITORING.md](docs/MAINTENANCE_MONITORING.md) - Performance benchmarks

---

**🧪 Comprehensive testing ensures the Growmies NJ Discord automation system operates reliably, securely, and in compliance with all cannabis regulations.**

---

**Last Updated**: January 2025  
**Version**: 1.0.0  
**Maintainer**: Growmies NJ Testing Team