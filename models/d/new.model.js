import { query } from '../../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import https from 'https';
import http from 'http';

export const DataHubModel = {
  // Helper function to safely parse JSON
  safeParse(jsonString) {
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      console.error("JSON parse error:", error);
      return {};  // Return an empty object if parsing fails
    }
  },

  // Generate random API key
  generateApiKey() {
    return crypto.randomBytes(32).toString('hex');
  },

  // Create new data entry (file or folder)
  async create(data = {}) {
    const id = uuidv4();
    const apiKey = this.generateApiKey();
    
    const config = {
      apikey: apiKey,
      ap1: data.requiresAuth ? 'enable' : 'disable',
      type: data.type || 'file',
      permissions: data.permissions || 'read-write',
      syncUrl: data.syncUrl || null,
      autoSync: data.autoSync || false
    };

    // Safely handle tags (ensure tags is an array)
    let tags = Array.isArray(data.tags) ? data.tags : (data.tags ? [data.tags] : []);

    // Handle folder structure
    const parentId = data.parentId || null;
    const name = data.name || `Untitled ${data.type || 'file'}`;
    let content = data.content || (data.type === 'folder' ? null : '');

    // If syncUrl is provided, fetch content from URL
    if (data.syncUrl && data.type === 'file') {
      try {
        content = await this.fetchUrlContent(data.syncUrl);
      } catch (error) {
        console.error('Failed to sync from URL:', error);
        content = '';  // Default empty content if sync fails
      }
    }

    const sql = `
      INSERT INTO datahub_data (
        id, user_id, parent_id, name, type, content, file_size, mime_type, is_public, config, tags, sync_url, last_synced, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    
    await query(sql, [
      id, 
      data.userId || 0,
      parentId,
      name,
      data.type || 'file',
      content,
      content ? content.length : 0,
      data.mimeType || null,
      data.isPublic || false,
      JSON.stringify(config),
      JSON.stringify(tags),
      data.syncUrl || null,
      data.syncUrl ? new Date() : null
    ]);
    
    return { 
      id, 
      apiKey, 
      name, 
      type: data.type || 'file',
      isPublic: data.isPublic || false
    };
  },

  // Fetch content from URL
  async fetchUrlContent(url) {
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https:') ? https : http;
      
      client.get(url, (response) => {
        let data = '';
        
        response.on('data', (chunk) => {
          data += chunk;
        });
        
        response.on('end', () => {
          if (response.statusCode === 200) {
            resolve(data);
          } else {
            reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
          }
        });
      }).on('error', (error) => {
        reject(error);
      });
    });
  },

  // Sync file content from URL
  async syncFromUrl(id, userId = null) {
    const item = await this.getById(id, userId);
    
    if (!item || item.type !== 'file' || !item.config.syncUrl) {
      throw new Error('Item not found or not syncable');
    }

    try {
      const content = await this.fetchUrlContent(item.config.syncUrl);
      
      await this.update(id, {
        content,
        last_synced: new Date()
      }, userId);

      return { success: true, content };
    } catch (error) {
      throw new Error(`Sync failed: ${error.message}`);
    }
  },

  // Create folder
  async createFolder(data = {}) {
    return this.create({
      ...data,
      type: 'folder',
      content: null
    });
  },

  // Create file
  async createFile(data = {}) {
    return this.create({
      ...data,
      type: 'file',
      content: data.content || ''
    });
  },

  // Get data entry by ID with children (for folders)
  async getById(id, userId = null) {
    const sql = `
      SELECT 
        id,
        user_id,
        parent_id,
        name,
        type,
        content,
        file_size,
        mime_type,
        is_public,
        config,
        tags,
        sync_url,
        last_synced,
        logs,
        created_at,
        updated_at
      FROM datahub_data
      WHERE id = ? ${userId ? 'AND user_id = ?' : ''}
    `;
    
    const params = userId ? [id, userId] : [id];
    const [result] = await query(sql, params);
    
    if (!result) return null;
    
    // Safely parse config and tags
    const config = result.config ? this.safeParse(result.config) : {};
    const tags = result.tags ? this.safeParse(result.tags) : [];
    
    result.requiresApiKey = config.ap1 === 'enable';
    result.isPublic = result.is_public;
    result.syncUrl = result.sync_url;
    result.lastSynced = result.last_synced;
    result.tags = tags;
    result.config = config;
    
    // If it's a folder, get children
    if (result.type === 'folder') {
      result.children = await this.getChildren(id, userId);
    }
    
    return result;
  },

  // Get root items for a user
  async getRootItems(userId) {
    const sql = `
      SELECT 
        id,
        user_id,
        parent_id,
        name,
        type,
        content,
        file_size,
        mime_type,
        is_public,
        config,
        tags,
        sync_url,
        last_synced,
        created_at,
        updated_at
      FROM datahub_data
      WHERE user_id = ? AND parent_id IS NULL
      ORDER BY type DESC, name ASC
    `;
    
    const items = await query(sql, [userId]);
    
    return items.map(item => ({
      ...item,
      config: this.safeParse(item.config || '{}'),
      tags: this.safeParse(item.tags || '[]'),
      requiresApiKey: this.safeParse(item.config || '{}').ap1 === 'enable',
      isPublic: item.is_public,
      syncUrl: item.sync_url,
      lastSynced: item.last_synced
    }));
  },

  // Update data entry
  async update(id, updates, userId = null) {
    const allowedFields = ['name', 'content', 'file_size', 'mime_type', 'is_public', 'config', 'logs', 'tags', 'parent_id', 'sync_url', 'last_synced'];
    const updateFields = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        updateFields.push(`${key} = ?`);
        if (['config', 'tags', 'logs'].includes(key)) {
          values.push(JSON.stringify(value));
        } else if (key === 'last_synced' && value instanceof Date) {
          values.push(value);
        } else {
          values.push(value);
        }
      }
    }

    if (updateFields.length === 0) {
      throw new Error('No valid fields to update');
    }

    updateFields.push('updated_at = NOW()');
    values.push(id);
    if (userId) values.push(userId);

    const sql = `
      UPDATE datahub_data 
      SET ${updateFields.join(', ')}
      WHERE id = ? ${userId ? 'AND user_id = ?' : ''}
    `;

    const result = await query(sql, values);
    
    if (result.affectedRows === 0) {
      throw new Error('Item not found or unauthorized');
    }

    return this.getById(id, userId);
  },

  // Delete data entry (and all children if folder)
  async delete(id, userId = null) {
    const item = await this.getById(id, userId);
    if (!item) {
      throw new Error('Item not found');
    }

    // If it's a folder, delete all descendants first
    if (item.type === 'folder') {
      await this.deleteDescendants(id, userId);
    }

    const sql = `DELETE FROM datahub_data WHERE id = ? ${userId ? 'AND user_id = ?' : ''}`;
    const params = userId ? [id, userId] : [id];
    const result = await query(sql, params);
    
    if (result.affectedRows === 0) {
      throw new Error('Item not found or unauthorized');
    }

    return true;
  },

  // Delete all descendants of a folder
  async deleteDescendants(parentId, userId = null) {
    const sql = `
      DELETE FROM datahub_data 
      WHERE id IN (
        WITH RECURSIVE descendants AS (
          SELECT id FROM datahub_data 
          WHERE parent_id = ? ${userId ? 'AND user_id = ?' : ''}
          UNION ALL
          SELECT d.id FROM datahub_data d
          INNER JOIN descendants desc ON d.parent_id = desc.id
          ${userId ? 'WHERE d.user_id = ?' : ''}
        )
        SELECT id FROM descendants
      )
    `;
    const params = userId ? [parentId, userId, userId] : [parentId];
    await query(sql, params);
  },

  // Get children of a folder
  async getChildren(parentId, userId = null) {
    const sql = `
      SELECT 
        id,
        user_id,
        parent_id,
        name,
        type,
        content,
        file_size,
        mime_type,
        is_public,
        config,
        tags,
        sync_url,
        last_synced,
        created_at,
        updated_at
      FROM datahub_data
      WHERE parent_id = ? ${userId ? 'AND user_id = ?' : ''}
      ORDER BY type DESC, name ASC
    `;
    
    const params = userId ? [parentId, userId] : [parentId];
    const children = await query(sql, params);
    
    return children.map(child => ({
      ...child,
      config: this.safeParse(child.config || '{}'),
      tags: this.safeParse(child.tags || '[]'),
      requiresApiKey: this.safeParse(child.config || '{}').ap1 === 'enable',
      isPublic: child.is_public,
      syncUrl: child.sync_url,
      lastSynced: child.last_synced
    }));
  }
};
