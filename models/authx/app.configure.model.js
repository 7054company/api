import { query } from '../../config/database.js';

export const AuthXConfigureModel = {
  // Get configuration by app ID
  async getByAppId(appId) {
    const sql = `
      SELECT 
        a.id,
        a.configure,
        a.updated_at
      FROM authx_apps a
      WHERE a.id = ?
    `;
    
    const [result] = await query(sql, [appId]);
    return result?.configure || null;
  },

  // Update configuration
  async update(appId, updates) {
    // Get current config
    const currentConfig = await this.getByAppId(appId);
    
    // Merge with updates
    const newConfig = {
      ...currentConfig,
      ...updates,
      branding: {
        ...(currentConfig?.branding || {}),
        ...(updates.branding || {})
      },
      legal: {
        ...(currentConfig?.legal || {}),
        ...(updates.legal || {})
      },
      security: {
        ...(currentConfig?.security || {}),
        ...(updates.security || {})
      }
    };

    // Update in database
    const sql = `
      UPDATE authx_apps
      SET 
        configure = ?,
        updated_at = NOW()
      WHERE id = ?
    `;

    await query(sql, [JSON.stringify(newConfig), appId]);
    return newConfig;
  },

  // Reset to default configuration
  async reset(appId) {
    const defaultConfig = {
      branding: {
        appName: '',
        logoUrl: '',
        primaryColor: '#3B82F6',
        description: ''
      },
      legal: {
        privacyPolicyUrl: '',
        termsOfServiceUrl: '',
        companyName: '',
        companyAddress: '',
        dataProcessingEnabled: false,
        cookieConsentEnabled: false
      },
      security: {
        mfaEnabled: false,
        sessionDuration: '7 days',
        emailAuthEnabled: true,
        phoneAuthEnabled: false,
        usernameEnabled: true
      }
    };

    const sql = `
      UPDATE authx_apps
      SET 
        configure = ?,
        updated_at = NOW()
      WHERE id = ?
    `;

    await query(sql, [JSON.stringify(defaultConfig), appId]);
    return defaultConfig;
  },

  // Validate configuration
  validateConfig(config) {
    // Add validation logic here if needed
    return true;
  }
};
