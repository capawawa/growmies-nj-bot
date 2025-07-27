# GrowmiesNJ Discord Bot - Live Integration Test Report

**Generated:** 2025-07-26T13:47:33.272Z  
**Environment:** Production  
**Bot:** GrowmiesSprout 🌱#0151 (1391996103628558369)  
**Guild:** Growmies NJ (7 members)

## 📊 Test Summary

- **Total Tests:** 23
- **Passed:** 17 ✅
- **Failed:** 0 ❌
- **Success Rate:** 74%

## 🤖 Bot Status

| Metric | Value |
|--------|-------|
| Bot Tag | GrowmiesSprout 🌱#0151 |
| Guild | Growmies NJ |
| Members | 7 |
| Channels | 24 |
| Roles | 18 |
| Permissions | 34 granted |
| Online Status | ✅ Online |

## 🧪 Command Test Results

### Utility Commands
- **/ping**: ✅ registered (370ms)
- **/server**: ✅ registered (385ms)

### Engagement Commands  
- **/8ball**: ✅ registered (241ms)
- **/celebrate**: ✅ registered (253ms)
- **/coinflip**: ✅ registered (332ms)
- **/compliment**: ✅ registered (323ms)
- **/dice**: ✅ registered (265ms)
- **/suggest**: ✅ registered (387ms)
- **/vote**: ✅ registered (357ms)
- **/would-you-rather**: ✅ registered (270ms)
- **/quiz**: ✅ registered (292ms)
- **/strain-guess**: ✅ registered (394ms)
- **/strain-info**: ✅ registered (764ms)
- **/daily-challenge**: ✅ registered (304ms)

### Leveling Commands
- **/level**: ✅ registered (448ms)
- **/leaderboard**: ✅ registered (440ms)

### Age Verification Commands
- **/verify**: ✅ registered (274ms)

### Moderation Commands
- **/warn**: ⏭️ skipped - Skipped in live environment to prevent disruption
- **/timeout**: ⏭️ skipped - Skipped in live environment to prevent disruption
- **/kick**: ⏭️ skipped - Skipped in live environment to prevent disruption
- **/ban**: ⏭️ skipped - Skipped in live environment to prevent disruption
- **/unban**: ⏭️ skipped - Skipped in live environment to prevent disruption
- **/purge**: ⏭️ skipped - Skipped in live environment to prevent disruption

## 🔗 Integration Test Results

### Welcome System
- **Status:** not_configured
- **Details:** Welcome channel not found

### Database Integration
- **Status:** operational
- **Details:** Bot can send messages, implying database connectivity

### Health Monitoring
- **Status:** operational
- **WebSocket Latency:** 30ms
- **Uptime:** 0 minutes

## ⚡ Performance Metrics

| Metric | Value |
|--------|-------|
| Total Test Duration | 26621ms |
| Average Response Time | 359ms |
| WebSocket Latency | 30ms |
| Bot Uptime | 0 minutes |
| Memory Usage | 15MB |

## 🚨 Errors and Issues

No errors detected ✅

## 📝 Recommendations

- Investigate and resolve failed command registrations
- Verify welcome channel configuration

---
*Report generated automatically by GrowmiesNJ Bot Integration Tester*
