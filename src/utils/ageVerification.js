/**
 * Age Verification Utilities for GrowmiesNJ Discord Bot
 * 
 * Handles 21+ age verification for cannabis-related content access
 * Includes verification status checking, compliance tracking, and audit logging
 */

const { User } = require('../database/models/User');

/**
 * Age verification constants
 */
const AGE_VERIFICATION = {
  MINIMUM_AGE: 21,
  VERIFICATION_EXPIRY_DAYS: 365, // Verification valid for 1 year
  GRACE_PERIOD_DAYS: 30, // Grace period before re-verification required
  MAX_VERIFICATION_ATTEMPTS: 3
};

/**
 * Check if user meets 21+ age requirement for cannabis content
 * @param {string} userId - Discord user ID
 * @param {string} guildId - Discord guild ID
 * @returns {Promise<Object>} Verification result
 */
async function checkAge21Plus(userId, guildId) {
  try {
    // Get user record from database
    const user = await User.findOne({
      where: {
        discord_id: userId,
        guild_id: guildId
      }
    });

    if (!user) {
      return {
        verified: false,
        reason: 'user_not_found',
        message: 'User profile not found. Please run `/verify setup` first.',
        requiresSetup: true
      };
    }

    // Check if user has age verification
    if (!user.age_verified) {
      return {
        verified: false,
        reason: 'not_age_verified',
        message: 'Age verification required. Use `/verify age` to complete verification.',
        requiresVerification: true
      };
    }

    // Check if verification is still valid
    const verificationDate = new Date(user.age_verified_at);
    const now = new Date();
    const daysSinceVerification = Math.floor((now - verificationDate) / (1000 * 60 * 60 * 24));

    if (daysSinceVerification > AGE_VERIFICATION.VERIFICATION_EXPIRY_DAYS) {
      return {
        verified: false,
        reason: 'verification_expired',
        message: 'Age verification has expired. Please re-verify using `/verify age`.',
        requiresReverification: true,
        expiredDate: verificationDate
      };
    }

    // Check if approaching expiry (within grace period)
    const daysUntilExpiry = AGE_VERIFICATION.VERIFICATION_EXPIRY_DAYS - daysSinceVerification;
    const approachingExpiry = daysUntilExpiry <= AGE_VERIFICATION.GRACE_PERIOD_DAYS;

    return {
      verified: true,
      reason: 'verified',
      verificationDate: verificationDate,
      daysUntilExpiry: daysUntilExpiry,
      approachingExpiry: approachingExpiry,
      user: {
        id: user.discord_id,
        ageVerified: user.age_verified,
        verifiedAt: user.age_verified_at
      }
    };

  } catch (error) {
    console.error('Error checking age verification:', error);
    return {
      verified: false,
      reason: 'system_error',
      message: 'Unable to verify age status. Please try again later.',
      error: error.message
    };
  }
}

/**
 * Verify user's age (mock implementation - would integrate with real verification service)
 * @param {string} userId - Discord user ID
 * @param {string} guildId - Discord guild ID
 * @param {Object} verificationData - Verification data
 * @returns {Promise<Object>} Verification result
 */
async function verifyUserAge(userId, guildId, verificationData) {
  try {
    // Get or create user record
    let user = await User.findOne({
      where: {
        discord_id: userId,
        guild_id: guildId
      }
    });

    if (!user) {
      return {
        success: false,
        reason: 'user_not_found',
        message: 'User profile not found. Please run `/verify setup` first.'
      };
    }

    // Validate verification data (in real implementation, this would call external verification service)
    const validationResult = await validateAgeVerificationData(verificationData);
    
    if (!validationResult.valid) {
      return {
        success: false,
        reason: 'invalid_verification',
        message: validationResult.message || 'Age verification failed.',
        details: validationResult.details
      };
    }

    // Update user record with verification
    await user.update({
      age_verified: true,
      age_verified_at: new Date(),
      age_verification_method: verificationData.method || 'manual',
      compliance_data: {
        ...user.compliance_data,
        age_verification: {
          verified_at: new Date(),
          method: verificationData.method,
          expiry_date: new Date(Date.now() + (AGE_VERIFICATION.VERIFICATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000))
        }
      }
    });

    // Log verification for compliance
    await logAgeVerification(userId, guildId, {
      action: 'age_verified',
      method: verificationData.method,
      timestamp: new Date()
    });

    return {
      success: true,
      message: 'Age verification completed successfully.',
      expiryDate: new Date(Date.now() + (AGE_VERIFICATION.VERIFICATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000)),
      user: {
        id: user.discord_id,
        ageVerified: true,
        verifiedAt: user.age_verified_at
      }
    };

  } catch (error) {
    console.error('Error verifying user age:', error);
    return {
      success: false,
      reason: 'system_error',
      message: 'Age verification failed due to system error.',
      error: error.message
    };
  }
}

/**
 * Validate age verification data (mock implementation)
 * @param {Object} data - Verification data
 * @returns {Promise<Object>} Validation result
 */
async function validateAgeVerificationData(data) {
  // In a real implementation, this would:
  // 1. Call external age verification service
  // 2. Validate government ID or other documents
  // 3. Perform additional compliance checks
  
  if (!data) {
    return {
      valid: false,
      message: 'No verification data provided'
    };
  }

  // Mock validation - check for required fields
  const requiredFields = ['birthDate', 'method'];
  const missingFields = requiredFields.filter(field => !data[field]);
  
  if (missingFields.length > 0) {
    return {
      valid: false,
      message: `Missing required fields: ${missingFields.join(', ')}`,
      details: { missingFields }
    };
  }

  // Validate birth date
  const birthDate = new Date(data.birthDate);
  const today = new Date();
  const age = Math.floor((today - birthDate) / (365.25 * 24 * 60 * 60 * 1000));

  if (age < AGE_VERIFICATION.MINIMUM_AGE) {
    return {
      valid: false,
      message: `Must be ${AGE_VERIFICATION.MINIMUM_AGE} or older to access cannabis content`,
      details: { calculatedAge: age, minimumAge: AGE_VERIFICATION.MINIMUM_AGE }
    };
  }

  return {
    valid: true,
    calculatedAge: age,
    verificationMethod: data.method
  };
}

/**
 * Get user's age verification status details
 * @param {string} userId - Discord user ID
 * @param {string} guildId - Discord guild ID
 * @returns {Promise<Object>} Detailed verification status
 */
async function getAgeVerificationStatus(userId, guildId) {
  try {
    const user = await User.findOne({
      where: {
        discord_id: userId,
        guild_id: guildId
      }
    });

    if (!user) {
      return {
        found: false,
        status: 'no_profile',
        message: 'User profile not found'
      };
    }

    const status = {
      found: true,
      userId: user.discord_id,
      ageVerified: user.age_verified,
      verifiedAt: user.age_verified_at,
      method: user.age_verification_method
    };

    if (user.age_verified && user.age_verified_at) {
      const verificationDate = new Date(user.age_verified_at);
      const now = new Date();
      const daysSinceVerification = Math.floor((now - verificationDate) / (1000 * 60 * 60 * 24));
      const daysUntilExpiry = AGE_VERIFICATION.VERIFICATION_EXPIRY_DAYS - daysSinceVerification;

      status.daysSinceVerification = daysSinceVerification;
      status.daysUntilExpiry = daysUntilExpiry;
      status.isExpired = daysUntilExpiry <= 0;
      status.isApproachingExpiry = daysUntilExpiry <= AGE_VERIFICATION.GRACE_PERIOD_DAYS;
      status.expiryDate = new Date(verificationDate.getTime() + (AGE_VERIFICATION.VERIFICATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000));
    }

    return status;

  } catch (error) {
    console.error('Error getting age verification status:', error);
    return {
      found: false,
      status: 'error',
      error: error.message
    };
  }
}

/**
 * Remove age verification (for compliance or user request)
 * @param {string} userId - Discord user ID
 * @param {string} guildId - Discord guild ID
 * @param {string} reason - Reason for removal
 * @returns {Promise<Object>} Removal result
 */
async function removeAgeVerification(userId, guildId, reason = 'user_request') {
  try {
    const user = await User.findOne({
      where: {
        discord_id: userId,
        guild_id: guildId
      }
    });

    if (!user) {
      return {
        success: false,
        reason: 'user_not_found',
        message: 'User not found'
      };
    }

    // Update user record
    await user.update({
      age_verified: false,
      age_verified_at: null,
      age_verification_method: null,
      compliance_data: {
        ...user.compliance_data,
        age_verification_removed: {
          removed_at: new Date(),
          reason: reason
        }
      }
    });

    // Log removal for compliance
    await logAgeVerification(userId, guildId, {
      action: 'age_verification_removed',
      reason: reason,
      timestamp: new Date()
    });

    return {
      success: true,
      message: 'Age verification removed successfully',
      reason: reason
    };

  } catch (error) {
    console.error('Error removing age verification:', error);
    return {
      success: false,
      reason: 'system_error',
      message: 'Failed to remove age verification',
      error: error.message
    };
  }
}

/**
 * Log age verification events for compliance
 * @param {string} userId - Discord user ID
 * @param {string} guildId - Discord guild ID
 * @param {Object} eventData - Event data to log
 */
async function logAgeVerification(userId, guildId, eventData) {
  try {
    // In a real implementation, this would log to a compliance database
    // For now, just console log with structured data
    console.log('AGE_VERIFICATION_LOG:', {
      userId,
      guildId,
      timestamp: new Date().toISOString(),
      ...eventData
    });

    // Could also integrate with audit logging service
    // await AuditLog.create({
    //   user_id: userId,
    //   guild_id: guildId,
    //   action: eventData.action,
    //   details: eventData,
    //   timestamp: new Date()
    // });

  } catch (error) {
    console.error('Error logging age verification event:', error);
  }
}

/**
 * Get age verification requirements and info
 * @returns {Object} Verification requirements
 */
function getAgeVerificationRequirements() {
  return {
    minimumAge: AGE_VERIFICATION.MINIMUM_AGE,
    verificationValidDays: AGE_VERIFICATION.VERIFICATION_EXPIRY_DAYS,
    gracePeriodDays: AGE_VERIFICATION.GRACE_PERIOD_DAYS,
    maxAttempts: AGE_VERIFICATION.MAX_VERIFICATION_ATTEMPTS,
    requiredFields: ['birthDate', 'method'],
    acceptedMethods: [
      'government_id',
      'drivers_license',
      'passport',
      'military_id',
      'other_official_id'
    ],
    complianceNote: 'Age verification is required for cannabis-related content access in accordance with local and federal regulations.'
  };
}

/**
 * Check if content requires age verification
 * @param {Object} content - Content object to check
 * @returns {boolean} Whether age verification is required
 */
function requiresAgeVerification(content) {
  if (!content) return false;

  // Check for cannabis content flags
  if (content.isCannabisContent || content.is_cannabis_content) {
    return true;
  }

  // Check for age-restricted flags
  if (content.ageRestricted || content.age_restricted) {
    return true;
  }

  // Check session type
  if (content.sessionType === 'meditation' || content.sessionType === 'educational') {
    return true;
  }

  return false;
}

module.exports = {
  checkAge21Plus,
  verifyUserAge,
  getAgeVerificationStatus,
  removeAgeVerification,
  getAgeVerificationRequirements,
  requiresAgeVerification,
  AGE_VERIFICATION
};