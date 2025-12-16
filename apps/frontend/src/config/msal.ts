/**
 * Microsoft Authentication Library (MSAL) Configuration
 * For Microsoft 365 SSO integration
 */

import { Configuration, LogLevel, PublicClientApplication } from '@azure/msal-browser';

// =============================================================================
// Environment Variables
// =============================================================================

// These should be set in your .env file
const MICROSOFT_CLIENT_ID = import.meta.env.VITE_MICROSOFT_CLIENT_ID || '';
const MICROSOFT_TENANT_ID = import.meta.env.VITE_MICROSOFT_TENANT_ID || 'common';
const REDIRECT_URI = import.meta.env.VITE_MICROSOFT_REDIRECT_URI || `${window.location.origin}/auth/callback`;

// =============================================================================
// MSAL Configuration
// =============================================================================

export const msalConfig: Configuration = {
  auth: {
    clientId: MICROSOFT_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${MICROSOFT_TENANT_ID}`,
    redirectUri: REDIRECT_URI,
    postLogoutRedirectUri: window.location.origin,
    navigateToLoginRequestUrl: true,
  },
  cache: {
    cacheLocation: 'sessionStorage', // More secure than localStorage
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        
        switch (level) {
          case LogLevel.Error:
            console.error('MSAL:', message);
            break;
          case LogLevel.Warning:
            console.warn('MSAL:', message);
            break;
          case LogLevel.Info:
            // console.info('MSAL:', message);
            break;
          case LogLevel.Verbose:
            // console.debug('MSAL:', message);
            break;
        }
      },
      logLevel: LogLevel.Warning,
      piiLoggingEnabled: false,
    },
    windowHashTimeout: 9000,
    iframeHashTimeout: 9000,
  },
};

// =============================================================================
// Authentication Request Scopes
// =============================================================================

export const loginRequest = {
  scopes: ['openid', 'profile', 'email', 'User.Read'],
};

export const graphRequest = {
  scopes: ['User.Read'],
};

// =============================================================================
// MSAL Instance
// =============================================================================

let msalInstance: PublicClientApplication | null = null;

export function getMsalInstance(): PublicClientApplication | null {
  if (!MICROSOFT_CLIENT_ID) {
    console.warn('Microsoft SSO not configured. Set VITE_MICROSOFT_CLIENT_ID.');
    return null;
  }
  
  if (!msalInstance) {
    msalInstance = new PublicClientApplication(msalConfig);
  }
  
  return msalInstance;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check if Microsoft SSO is configured
 */
export function isMicrosoftSSOConfigured(): boolean {
  return !!MICROSOFT_CLIENT_ID;
}

/**
 * Get the current account from MSAL
 */
export function getCurrentAccount() {
  const instance = getMsalInstance();
  if (!instance) return null;
  
  const accounts = instance.getAllAccounts();
  return accounts.length > 0 ? accounts[0] : null;
}

/**
 * Acquire token silently or redirect to login
 */
export async function acquireToken() {
  const instance = getMsalInstance();
  if (!instance) return null;
  
  const account = getCurrentAccount();
  if (!account) return null;
  
  try {
    const response = await instance.acquireTokenSilent({
      ...loginRequest,
      account,
    });
    return response.accessToken;
  } catch (error) {
    // Token expired or not found, will need to login again
    console.warn('Failed to acquire token silently:', error);
    return null;
  }
}

