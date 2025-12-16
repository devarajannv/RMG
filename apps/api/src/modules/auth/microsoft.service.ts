/**
 * Microsoft 365 SSO Service
 * Handles Azure AD authentication and user provisioning
 */

import { ConfidentialClientApplication, Configuration, AuthorizationCodeRequest } from '@azure/msal-node';
import prisma from '../../lib/prisma';
import { config } from '../../config/env';
import { generateTokenPair, TokenPair } from '../../lib/jwt';
import { storeRefreshTokenFamily } from '../../lib/redis';
import { logger } from '../../lib/logger';
import argon2 from 'argon2';
import { UserStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

// =============================================================================
// MSAL Configuration
// =============================================================================

const msalConfig: Configuration = {
  auth: {
    clientId: config.microsoft.clientId,
    authority: `https://login.microsoftonline.com/${config.microsoft.tenantId}`,
    clientSecret: config.microsoft.clientSecret,
  },
  system: {
    loggerOptions: {
      loggerCallback: (_level, message) => {
        logger.debug(`MSAL: ${message}`);
      },
      piiLoggingEnabled: false,
      logLevel: 3, // Info
    },
  },
};

// Create MSAL client instance
let msalClient: ConfidentialClientApplication | null = null;

function getMsalClient(): ConfidentialClientApplication {
  if (!msalClient) {
    if (!config.microsoft.clientId || !config.microsoft.clientSecret) {
      throw new Error('Microsoft SSO not configured. Set MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET.');
    }
    msalClient = new ConfidentialClientApplication(msalConfig);
  }
  return msalClient;
}

// =============================================================================
// Types
// =============================================================================

export interface MicrosoftUserInfo {
  id: string;
  displayName: string;
  givenName: string;
  surname: string;
  mail: string;
  userPrincipalName: string;
  jobTitle?: string;
  department?: string;
  officeLocation?: string;
}

export interface SSOLoginResult {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    tenantId: string;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
    accessExpiresIn: number;
    refreshExpiresIn: number;
  };
  isNewUser: boolean;
}

// =============================================================================
// Service Functions
// =============================================================================

/**
 * Generate the Microsoft OAuth authorization URL
 */
export async function getAuthorizationUrl(redirectUri: string, state?: string): Promise<string> {
  const client = getMsalClient();
  
  const authCodeUrlParameters = {
    scopes: ['openid', 'profile', 'email', 'User.Read'],
    redirectUri,
    state: state || generateState(),
    prompt: 'select_account',
  };

  const authUrl = await client.getAuthCodeUrl(authCodeUrlParameters);
  return authUrl;
}

/**
 * Exchange authorization code for tokens and get user info
 */
export async function handleCallback(
  code: string,
  redirectUri: string,
  tenantId: string
): Promise<SSOLoginResult> {
  const client = getMsalClient();

  // Exchange code for tokens
  const tokenRequest: AuthorizationCodeRequest = {
    code,
    scopes: ['openid', 'profile', 'email', 'User.Read'],
    redirectUri,
  };

  const response = await client.acquireTokenByCode(tokenRequest);
  
  if (!response || !response.accessToken) {
    throw new Error('Failed to acquire token from Microsoft');
  }

  // Get user info from Microsoft Graph
  const userInfo = await getMicrosoftUserInfo(response.accessToken);
  
  // Find or create user in our system
  const { user, isNewUser } = await provisionUser(userInfo, tenantId);
  
  // Generate our own tokens
  const tokenFamily = uuidv4();
  const tokens = generateTokenPair(user.id, user.tenantId, user.email, tokenFamily);
  
  // Store refresh token family in Redis
  await storeRefreshTokenFamily(user.id, tokenFamily);
  
  // Log the SSO login
  await prisma.auditLog.create({
    data: {
      tenantId: user.tenantId,
      userId: user.id,
      entityType: 'User',
      entityId: user.id,
      action: 'LOGIN',
      metadata: {
        method: 'microsoft_sso',
        microsoftId: userInfo.id,
        isNewUser,
      },
    },
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      tenantId: user.tenantId,
    },
    tokens,
    isNewUser,
  };
}

/**
 * Fetch user information from Microsoft Graph API
 */
async function getMicrosoftUserInfo(accessToken: string): Promise<MicrosoftUserInfo> {
  const response = await fetch('https://graph.microsoft.com/v1.0/me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error('Failed to fetch Microsoft user info', { error });
    throw new Error('Failed to fetch user information from Microsoft');
  }

  const data = await response.json() as {
    id: string;
    displayName: string;
    givenName?: string;
    surname?: string;
    mail?: string;
    userPrincipalName: string;
    jobTitle?: string;
    department?: string;
    officeLocation?: string;
  };
  
  return {
    id: data.id,
    displayName: data.displayName,
    givenName: data.givenName || data.displayName?.split(' ')[0] || 'User',
    surname: data.surname || data.displayName?.split(' ').slice(1).join(' ') || '',
    mail: data.mail || data.userPrincipalName,
    userPrincipalName: data.userPrincipalName,
    jobTitle: data.jobTitle,
    department: data.department,
    officeLocation: data.officeLocation,
  };
}

/**
 * Find existing user or create new user from Microsoft info
 */
async function provisionUser(
  msUser: MicrosoftUserInfo,
  tenantId: string
): Promise<{ user: any; isNewUser: boolean }> {
  const email = msUser.mail.toLowerCase();
  
  // First, try to find existing user by email
  let user = await prisma.user.findFirst({
    where: {
      tenantId,
      email,
    },
  });

  if (user) {
    // Update Microsoft ID if not set
    if (!user.microsoftId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { 
          microsoftId: msUser.id,
          lastLoginAt: new Date(),
        },
      });
    } else {
      // Just update last login
      user = await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
    }
    
    return { user, isNewUser: false };
  }

  // Try to find by Microsoft ID (in case email changed)
  user = await prisma.user.findFirst({
    where: {
      tenantId,
      microsoftId: msUser.id,
    },
  });

  if (user) {
    // Update email if changed
    user = await prisma.user.update({
      where: { id: user.id },
      data: { 
        email,
        lastLoginAt: new Date(),
      },
    });
    
    return { user, isNewUser: false };
  }

  // Create new user
  // Generate a random password (user will use SSO, so won't need it)
  const randomPassword = generateRandomPassword();
  const passwordHash = await argon2.hash(randomPassword);

  // Get default viewer role
  const viewerRole = await prisma.role.findFirst({
    where: {
      tenantId,
      name: 'Viewer',
    },
  });

  // Create the user
  user = await prisma.user.create({
    data: {
      tenantId,
      email,
      firstName: msUser.givenName,
      lastName: msUser.surname,
      passwordHash,
      microsoftId: msUser.id,
      status: UserStatus.ACTIVE,
      emailVerified: true, // Microsoft verified the email
      lastLoginAt: new Date(),
    },
  });

  // Assign default role if exists
  if (viewerRole) {
    await prisma.userRole.create({
      data: {
        userId: user.id,
        roleId: viewerRole.id,
        assignedBy: user.id, // Self-assigned on SSO registration
      },
    });
  }

  logger.info('New user provisioned via Microsoft SSO', {
    userId: user.id,
    email: user.email,
    microsoftId: msUser.id,
  });

  return { user, isNewUser: true };
}

/**
 * Check if Microsoft SSO is configured
 */
export function isMicrosoftSSOConfigured(): boolean {
  return !!(
    config.microsoft.clientId &&
    config.microsoft.clientSecret &&
    config.microsoft.tenantId
  );
}

/**
 * Generate a random state parameter for OAuth
 */
function generateState(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

/**
 * Generate a random secure password
 */
function generateRandomPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 32; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

