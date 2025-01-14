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

    if (result?.configure) {
      try {
        // Try to parse as JSON
        return JSON.parse(result.configure);
      } catch (e) {
        // If it's not JSON, treat it as plain text
        return result.configure;
      }
    }
    return null;
  },

  // Update configuration
  async update(appId, updates) {
    // Get current config
    const currentConfig = await this.getByAppId(appId);

    let newConfig;

    // If the current configuration is valid JSON, merge the updates into it
    if (typeof currentConfig === 'object') {
      newConfig = {
        ...currentConfig,
        ...updates,
        branding: {
          ...(currentConfig?.branding || {}),
          ...(updates.branding || {}),
        },
        legal: {
          ...(currentConfig?.legal || {}),
          ...(updates.legal || {}),
        },
        security: {
          ...(currentConfig?.security || {}),
          ...(updates.security || {}),
        },
      };
    } else {
      // If current config is plain text, append the updates as text
      newConfig = typeof updates === 'string' ? `${currentConfig}\n${updates}` : updates;
    }

    // Store as JSON string if it's an object, otherwise store as plain text
    const configToStore = typeof newConfig === 'object' ? JSON.stringify(newConfig) : newConfig;

    const sql = `
      UPDATE authx_apps
      SET 
        configure = ?,
        updated_at = NOW()
      WHERE id = ?
    `;

    await query(sql, [configToStore, appId]);
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
