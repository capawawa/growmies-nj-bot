# GrowmiesNJ Third-Party Bot Configuration Guide

## 🚨 CRITICAL: Cannabis Compliance & Performance Optimization

**Status**: Emergency remediation required  
**Last Updated**: 2025-07-24T01:17:00Z  
**Test Results**: 0/4 bots passed compliance tests  
**Performance Issues**: Xenon (memory: 36.72MB, response: 71.79ms), Statbot (response: 95.34ms)

---

## ⚡ Quick Actions Required

### IMMEDIATE PRIORITY 1: Cannabis Compliance (0% pass rate)
All 4 bots failed cannabis compliance tests. **MUST** be fixed before production use.

### IMMEDIATE PRIORITY 2: Performance Optimization
- Xenon: 36.72MB memory usage (target: <30MB), 71.79ms response time (target: <50ms)
- Statbot: 95.34ms response time (target: <50ms)

---

## 🤖 Carl-bot Configuration (ID: 235148962103951360)

### Cannabis Compliance Setup

#### Step 1: Enable Cannabis Education Automod Rules
1. Go to Carl-bot dashboard: https://carl-bot.io/dashboard
2. Navigate to **Automod** → **Create new rule**
3. **Rule Name**: `Cannabis Education Allowed`
4. **Trigger Type**: Select "Regex"
5. **Regex Pattern**: 
   ```regex
   \b(grow(ing)?|cultivat(e|ion)|nutrient)\b(?!.*\b(sell|buy|trade|money|\$)\b)
   ```
6. **Action**: Set to "None" (allow messages)
7. **Channels**: Apply to all channels except 21+ private zones
8. **Save and Enable**

#### Step 2: Block Cannabis Commerce
1. Create another automod rule: **Rule Name**: `Cannabis Commerce Blocked`
2. **Trigger Type**: Select "Regex"
3. **Regex Patterns** (add each separately):
   ```regex
   \b(sell|buy|trade|WTS|WTB|for sale)\b.*\b(cannabis|weed|marijuana|bud|flower)\b
   \b(illegal|black market|dealer|plug)\b
   \$(\\d+).*\b(cannabis|weed|marijuana|bud|flower)\b
   ```
4. **Action**: Delete message + 10 minute timeout
5. **Notification**: DM user with compliance warning
6. **Channels**: Apply to ALL channels including private zones
7. **Save and Enable**

#### Step 3: Configure Allowed Terms Whitelist
Add these terms to the whitelist in automod settings:
```
growing, cultivation, nutrients, hydroponics, soil, lighting, temperature, humidity, harvest, curing, trimming, pruning, germination, seedling, vegetative, flowering, trichomes, terpenes, cannabinoids, pH, PPM, training, LST, SCROG
```

---

## 🎉 Sesh Configuration (ID: 616754792965865495)

### Cannabis Compliance Setup

#### Step 1: Event Content Filtering
1. Go to Sesh dashboard: https://sesh.fyi/dashboard
2. Navigate to **Moderation Settings**
3. Enable **Automatic Event Scanning**
4. **Blocked Keywords**: Add these terms:
   ```
   sale, discount, buy, sell, trade, vendor, commercial, business, profit, money, payment, purchase, illegal, black market, dealer, plug
   ```
5. **Action for Violations**: Set to "Manual Review Queue"
6. **High-Risk Keywords**: Auto-reject events containing "illegal", "dealer", "sell", "buy"

#### Step 2: Create Educational Event Templates
1. Go to **Event Templates**
2. Create these pre-approved templates:
   - "Growing Workshop" - Educational sessions on cultivation techniques
   - "Harvest Techniques" - Learning proper harvesting methods
   - "Nutrient Education" - Understanding plant nutrition
   - "Legal Updates" - Cannabis law and regulation updates
   - "Beginner's Guide" - Cannabis growing fundamentals

#### Step 3: Set Auto-Approval Rules
1. Enable auto-approval for events using approved templates
2. Configure educational tag system
3. Set manual review for any custom event descriptions

---

## 📊 Statbot Configuration (ID: 491769129318088714)

### Cannabis Compliance Setup

#### Step 1: Data Collection Filtering
1. Go to Statbot dashboard: https://statbot.net/dashboard
2. Navigate to **Data Collection Settings**
3. **Excluded Channels**: Add these channels:
   ```
   21-plus-private, verification, mod-only, personal-info, appeals, reports
   ```
4. **Enable Data Anonymization**: Turn ON for all cannabis-related statistics
5. **Keyword Filtering**: Exclude data containing:
   ```
   personal-info, real-name, address, phone, email, location, illegal, transaction, payment, money
   ```

#### Step 2: Performance Optimization
1. Go to **Performance Settings**
2. **Enable Aggressive Caching**: Set cache duration to 1 hour
3. **Precomputed Statistics**: Enable background generation
4. **Batch Processing**: Change real-time updates to 15-minute intervals
5. **Reduced Data Collection**:
   - Disable voice channel activity tracking
   - Limit message history analysis to 7 days
   - Disable reaction tracking

#### Step 3: Create Educational Metrics Dashboard
1. Create custom dashboard focusing on:
   - Educational post engagement
   - Question-answer ratios
   - Community help interactions
   - Learning resource views
2. Exclude any commerce or transaction-related metrics

---

## 🗄️ Xenon Configuration (ID: 416358583220043796)

### Cannabis Compliance Setup

#### Step 1: Sensitive Content Exclusion
1. Go to Xenon dashboard: https://xenon.bot/dashboard
2. Navigate to **Backup Settings** → **Advanced**
3. **Excluded Channels**: Add these channels:
   ```
   verification, mod-logs, admin-only, 21-plus-private, personal-info, appeals, reports, bot-logs, spam-prevention, auto-moderation-logs
   ```
4. **Content Type Filtering**: Exclude:
   - Verification data
   - Personal information
   - Payment details
   - Real names and addresses

#### Step 2: Performance Optimization (CRITICAL)
1. **Memory Management**:
   - Enable "Selective Channel Backup"
   - Set message retention to 30 days maximum
   - Configure attachment size limit: 10MB max
   - Exclude file types: .mp4, .mov, .avi, .zip, .rar
   - Enable maximum compression

2. **Backup Scheduling**:
   - Change frequency from daily to **weekly**
   - Set backup time: **03:00 UTC Sunday** (low activity)
   - Enable **incremental backup mode** (only changes)
   - Enable backup verification with reduced memory footprint

3. **Caching Optimization**:
   - Reduce in-memory cache to minimum
   - Enable **disk-only caching mode**
   - Set maximum cache size: **15MB**
   - Enable automatic cache cleanup

#### Step 3: Response Time Optimization
1. **Async Processing**:
   - Enable asynchronous backup processing
   - Move backup operations to background queue
   - Set up non-blocking command responses
2. **Command Optimization**:
   - Disable: `backup list`, `backup info`, `backup status`
   - Enable lightweight response mode
   - Use minimal embed responses

---

## 🔧 Production Monitoring Setup

### Performance Monitoring Thresholds
```json
{
  "memoryUsage": "<30MB",
  "responseTime": "<50ms", 
  "cpuUsage": "<3%",
  "cannabisCompliance": ">=90%"
}
```

### Alert Configuration
1. **Memory Alerts**: Trigger at 28MB usage
2. **Response Time Alerts**: Trigger at 45ms
3. **Compliance Alerts**: Trigger at <85% compliance score

---

## 🧪 Testing & Verification

### Cannabis Compliance Testing
Test these messages after configuration:

**Should PASS (Educational)**:
- "How do I grow cannabis legally?"
- "What nutrients are best for cultivation?"
- "LED vs HPS lighting for growing?"

**Should FAIL (Commercial)**:
- "Selling premium cannabis, $200/oz"
- "Looking to buy weed, anyone selling?"
- "Meet me for illegal trade tonight"

### Performance Testing
Run these commands to verify optimization:
```bash
# Test bot response times
node scripts/test-third-party-bots.js

# Monitor memory usage
node scripts/monitor-bot-performance.js

# Verify compliance scoring
node scripts/test-cannabis-compliance.js
```

---

## 🚨 Emergency Rollback Procedures

### If Configuration Causes Issues:

#### Carl-bot Rollback (5 minutes):
1. Disable automod rules: "Cannabis Education Allowed" and "Cannabis Commerce Blocked"
2. Clear regex patterns
3. Restore default moderation settings

#### Sesh Rollback (3 minutes):
1. Disable automatic event scanning
2. Clear blocked keywords list
3. Disable manual review queue

#### Statbot Rollback (3 minutes):
1. Disable aggressive caching
2. Restore real-time statistics updates
3. Re-enable voice channel tracking
4. Remove query optimization limits

#### Xenon Rollback (5 minutes):
1. Revert backup frequency to daily
2. Disable selective backup exclusions
3. Restore full in-memory caching
4. Re-enable all status commands

---

## ✅ Success Criteria

### Cannabis Compliance Targets
- **Carl-bot**: ≥90% compliance score
- **Sesh**: ≥90% compliance score  
- **Statbot**: ≥90% compliance score
- **Xenon**: ≥90% compliance score

### Performance Targets
- **Xenon Memory**: <25MB (currently 36.72MB)
- **Xenon Response Time**: <45ms (currently 71.79ms)
- **Statbot Response Time**: <45ms (currently 95.34ms)

### Overall Integration Success
- All 4 bots passing compliance tests
- All performance metrics within acceptable limits
- No command conflicts detected
- Zone architecture compliance maintained

---

## 📞 Emergency Contacts

- **Admin Notification**: Immediate Slack alert
- **Escalation Time**: 15 minutes
- **Fallback Action**: Temporary bot suspension if performance critical

---

## 📋 Implementation Checklist

- [ ] Carl-bot automod rules configured
- [ ] Carl-bot cannabis compliance verified  
- [ ] Sesh event filtering enabled
- [ ] Sesh educational templates created
- [ ] Statbot data filtering configured
- [ ] Statbot performance optimizations applied
- [ ] Xenon memory optimization configured
- [ ] Xenon backup scheduling optimized
- [ ] Production monitoring enabled
- [ ] Compliance testing completed
- [ ] Performance benchmarks verified
- [ ] Emergency procedures documented

---

**CRITICAL**: All configurations must be completed before bots can be considered production-ready. Current 0% compliance rate is unacceptable for cannabis community operations.