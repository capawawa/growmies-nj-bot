# 🧪 Manual Age Verification Testing Guide

## Current Status: ✅ BOT ONLINE AND READY

The GrowmiesNJ bot is currently running and ready for testing!

- **Bot**: GrowmiesSprout 🌱#0151
- **Server**: Growmies NJ (1390722668025872504)
- **Role Target**: "Verified 21+" (1397725004564791410)
- **Commands**: /verify is loaded and ready

---

## 🔧 Test Scenario 1: Basic Age Verification Workflow

### Step 1: Test the /verify Command
1. Go to any channel in the Growmies NJ Discord server
2. Type `/verify` and press Enter
3. **Expected Result**: 
   - Bot should respond with a private (ephemeral) message
   - Message should contain age verification embed with legal disclaimer
   - Two buttons should appear: "✅ I Verify - I am 21+" and "❌ Under 21"

### Step 2: Test Age Confirmation (21+ Path)
1. Click the "✅ I Verify - I am 21+" button
2. **Expected Result**:
   - Bot should assign the "Verified 21+" role
   - Success message should appear confirming role assignment
   - User should now have access to cannabis-related channels

### Step 3: Verify Role Assignment
1. Check your roles in the server (right-click your name → View Profile)
2. **Expected Result**: 
   - "Verified 21+" role should be visible
   - Role should grant access to restricted channels

---

## 🔧 Test Scenario 2: Under-21 Denial Path

### Step 1: Test Age Denial
1. Have a test user (or alt account) run `/verify`
2. Click the "❌ Under 21" button
3. **Expected Result**:
   - Bot should show appropriate denial message
   - No role should be assigned
   - Message should explain NJ cannabis laws

---

## 🔧 Test Scenario 3: Already Verified User

### Step 1: Test Duplicate Verification
1. After completing Scenario 1, run `/verify` again
2. **Expected Result**:
   - Bot should detect existing verification
   - Message should indicate user is already verified
   - No duplicate role assignment should occur

---

## 🔧 Test Scenario 4: Error Handling

### Step 1: Test Error Recovery
1. Try rapid clicking on verification buttons
2. Test verification from different channels
3. **Expected Result**:
   - System should handle multiple clicks gracefully
   - No duplicate roles or errors should occur

---

## 📋 Test Results Checklist

Please test each scenario and mark results:

- [ ] **Scenario 1 - Basic Workflow**: ✅ Pass / ❌ Fail / ⚠️ Issues
- [ ] **Scenario 2 - Under-21 Denial**: ✅ Pass / ❌ Fail / ⚠️ Issues  
- [ ] **Scenario 3 - Already Verified**: ✅ Pass / ❌ Fail / ⚠️ Issues
- [ ] **Scenario 4 - Error Handling**: ✅ Pass / ❌ Fail / ⚠️ Issues

## 🚨 If You Encounter Issues

### Common Issues & Solutions:

1. **"Interaction failed" error**:
   - Check bot terminal for error messages
   - Verify bot has required permissions

2. **Role not assigned**:
   - Check if bot role is higher than target role
   - Verify ManageRoles permission

3. **Command not found**:
   - Bot may need to restart
   - Check if commands are deployed

4. **Database errors** (expected in current setup):
   - Bot will show database connection errors
   - Age verification will still work without persistence
   - This is normal for current testing

## 📊 Expected Log Output

When testing, you should see these logs in the bot terminal:

```
🎯 Executing command: verify by [username]
🔘 Button interaction: age_verify_confirm by [username]
🌿 Processing age verification confirmation for [username]
✅ Age verification completed successfully for [username]: Verified 21+
```

---

## 🎯 Success Criteria

The age verification system is considered **FULLY FUNCTIONAL** if:

1. ✅ `/verify` command displays proper verification interface
2. ✅ Button interactions work without errors
3. ✅ "Verified 21+" role is assigned correctly
4. ✅ Appropriate messages are shown for all scenarios
5. ✅ System handles edge cases gracefully

---

## 🚀 Next Steps After Testing

Once testing is complete and successful:

1. **Production Database**: Set up PostgreSQL for data persistence
2. **Monitor Logs**: Ensure no errors in production environment
3. **User Training**: Inform server members about the `/verify` command
4. **Documentation**: Update server rules to mention age verification requirement

---

**Test started at**: `$(Get-Date -Format "yyyy-MM-dd HH:mm:ss")`
**Bot status**: ✅ Online and ready
**Ready for manual testing**: ✅ Yes