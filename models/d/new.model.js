import { query } from '../../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import https from 'https';
import http from 'http';

export const DataHubModel = {
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
      type: data.type || 'file', // 'file' or 'folder'
      permissions: data.permissions || 'read-write',
      syncUrl: data.syncUrl || null,
      autoSync: data.autoSync || false
    };

    // Handle tags
    let tags = [];
    if (data.tags) {
      tags = Array.isArray(data.tags) ? data.tags : [data.tags];
    }

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
        // Continue with empty content if sync fails
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
    
    // Parse config and tags
    const config = JSON.parse(result.config || '{}');
    result.requiresApiKey = config.ap1 === 'enable';
    result.isPublic = result.is_public;
    result.syncUrl = result.sync_url;
    result.lastSynced = result.last_synced;
    result.tags = JSON.parse(result.tags || '[]');
    result.config = config;
    
    // If it's a folder, get children
    if (result.type === 'folder') {
      result.children = await this.getChildren(id, userId);
    }
    
    return result;
  },

  // Get item by path
  async getByPath(userId, path) {
    if (!path || path === '/') {
      return null;
    }

    // Remove leading slash
    if (path.startsWith('/')) {
      path = path.substring(1);
    }

    const pathParts = path.split('/').filter(part => part.length > 0);
    let currentParentId = null;
    let currentItem = null;

    for (const part of pathParts) {
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
        WHERE user_id = ? AND name = ? AND ${currentParentId ? 'parent_id = ?' : 'parent_id IS NULL'}
      `;
      
      const params = currentParentId 
        ? [userId, part, currentParentId]
        : [userId, part];
      
      const [item] = await query(sql, params);
      
      if (!item) {
        return null;
      }
      
      currentItem = item;
      currentParentId = item.id;
    }

    if (currentItem) {
      // Parse config and tags
      const config = JSON.parse(currentItem.config || '{}');
      currentItem.requiresApiKey = config.ap1 === 'enable';
      currentItem.isPublic = currentItem.is_public;
      currentItem.syncUrl = currentItem.sync_url;
      currentItem.lastSynced = currentItem.last_synced;
      currentItem.tags = JSON.parse(currentItem.tags || '[]');
      currentItem.config = config;
      
      // If it's a folder, get children
      if (currentItem.type === 'folder') {
        currentItem.children = await this.getChildren(currentItem.id);
      }
    }

    return currentItem;
  },

  // Get full path of an item
  async getFullPath(itemId, userId = null) {
    const sql = `
      WITH RECURSIVE path_builder AS (
        SELECT id, parent_id, name, 0 as level
        FROM datahub_data 
        WHERE id = ? ${userId ? 'AND user_id = ?' : ''}
        
        UNION ALL
        
        SELECT d.id, d.parent_id, d.name, pb.level + 1
        FROM datahub_data d
        INNER JOIN path_builder pb ON d.id = pb.parent_id
        ${userId ? 'WHERE d.user_id = ?' : ''}
      )
      SELECT name FROM path_builder WHERE level > 0 ORDER BY level DESC
    `;
    
    const params = userId ? [itemId, userId, userId] : [itemId];
    const pathParts = await query(sql, params);
    
    return pathParts.map(part => part.name).join('/');
  },

  // Get public root items for a user
  async getPublicRootItems(userId) {
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
      WHERE user_id = ? AND parent_id IS NULL AND is_public = TRUE
      ORDER BY type DESC, name ASC
    `;
    
    const items = await query(sql, [userId]);
    
    return items.map(item => ({
      ...item,
      config: JSON.parse(item.config || '{}'),
      tags: JSON.parse(item.tags || '[]'),
      requiresApiKey: JSON.parse(item.config || '{}').ap1 === 'enable',
      isPublic: item.is_public,
      syncUrl: item.sync_url,
      lastSynced: item.last_synced
    }));
  },

  // Get public children of a folder
  async getPublicChildren(parentId) {
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
      WHERE parent_id = ? AND is_public = TRUE
      ORDER BY type DESC, name ASC
    `;
    
    const children = await query(sql, [parentId]);
    
    return children.map(child => ({
      ...child,
      config: JSON.parse(child.config || '{}'),
      tags: JSON.parse(child.tags || '[]'),
      isPublic: child.is_public,
      syncUrl: child.sync_url,
      lastSynced: child.last_synced
    }));
  },

  // Copy item
  async copy(itemId, targetFolderId, newName, userId = null) {
    const originalItem = await this.getById(itemId, userId);
    if (!originalItem) {
      throw new Error('Original item not found');
    }

    const copyName = newName || `${originalItem.name} (Copy)`;
    
    const newItem = await this.create({
      userId: originalItem.user_id,
      parentId: targetFolderId,
      name: copyName,
      type: originalItem.type,
      content: originalItem.content,
      mimeType: originalItem.mime_type,
      isPublic: originalItem.is_public,
      tags: originalItem.tags,
      syncUrl: originalItem.syncUrl
    });

    // If it's a folder, recursively copy children
    if (originalItem.type === 'folder' && originalItem.children) {
      for (const child of originalItem.children) {
        await this.copy(child.id, newItem.id, null, userId);
      }
    }

    return newItem;
  },

  // Toggle public access
  async togglePublic(id, isPublic, userId = null) {
    const sql = `
      UPDATE datahub_data 
      SET is_public = ?, updated_at = NOW()
      WHERE id = ? ${userId ? 'AND user_id = ?' : ''}
    `;

    const params = userId 
      ? [isPublic, id, userId]
      : [isPublic, id];

    const result = await query(sql, params);
    
    if (result.affectedRows === 0) {
      throw new Error('Item not found or unauthorized');
    }
    
    return { isPublic };
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
      config: JSON.parse(child.config || '{}'),
      tags: JSON.parse(child.tags || '[]'),
      requiresApiKey: JSON.parse(child.config || '{}').ap1 === 'enable',
      isPublic: child.is_public,
      syncUrl: child.sync_url,
      lastSynced: child.last_synced
    }));
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
      config: JSON.parse(item.config || '{}'),
      tags: JSON.parse(item.tags || '[]'),
      requiresApiKey: JSON.parse(item.config || '{}').ap1 === 'enable',
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

  // Rename file or folder
  async rename(id, newName, userId = null) {
    return this.update(id, { name: newName }, userId);
  },

  // Move file or folder to different parent
  async move(id, newParentId, userId = null) {
    // Validate that we're not moving a folder into itself or its children
    if (newParentId) {
      const isValidMove = await this.validateMove(id, newParentId, userId);
      if (!isValidMove) {
        throw new Error('Cannot move folder into itself or its children');
      }
    }

    return this.update(id, { parent_id: newParentId }, userId);
  },

  // Validate move operation to prevent circular references
  async validateMove(itemId, newParentId, userId = null) {
    if (itemId === newParentId) return false;

    // Check if newParentId is a descendant of itemId
    const descendants = await this.getAllDescendants(itemId, userId);
    return !descendants.some(desc => desc.id === newParentId);
  },

  // Get all descendants of an item (recursive)
  async getAllDescendants(itemId, userId = null) {
    const sql = `
      WITH RECURSIVE descendants AS (
        SELECT id, parent_id, name, type FROM datahub_data 
        WHERE parent_id = ? ${userId ? 'AND user_id = ?' : ''}
        UNION ALL
        SELECT d.id, d.parent_id, d.name, d.type FROM datahub_data d
        INNER JOIN descendants desc ON d.parent_id = desc.id
        ${userId ? 'WHERE d.user_id = ?' : ''}
      )
      SELECT * FROM descendants
    `;

    const params = userId ? [itemId, userId, userId] : [itemId];
    return await query(sql, params);
  },

  // Delete data entry (and all children if folder)
  async delete(id, userId = null) {
    // First, get the item to check if it's a folder
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

  // Get full path of an item
  async getPath(id, userId = null) {
    const sql = `
      WITH RECURSIVE path AS (
        SELECT id, parent_id, name, 0 as level FROM datahub_data 
        WHERE id = ? ${userId ? 'AND user_id = ?' : ''}
        UNION ALL
        SELECT d.id, d.parent_id, d.name, p.level + 1 FROM datahub_data d
        INNER JOIN path p ON d.id = p.parent_id
        ${userId ? 'WHERE d.user_id = ?' : ''}
      )
      SELECT name FROM path WHERE level > 0 ORDER BY level DESC
    `;

    const params = userId ? [id, userId, userId] : [id];
    const pathItems = await query(sql, params);
    
    return pathItems.map(item => item.name).join('/');
  },

  // Search items by name or content
  async search(searchTerm, userId, type = null) {
    let sql = `
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
      WHERE user_id = ? AND (
        name LIKE ? OR 
        content LIKE ? OR 
        JSON_SEARCH(tags, 'one', ?) IS NOT NULL
      )
    `;

    const params = [userId, `%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`];

    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }

    sql += ' ORDER BY name ASC';

    const results = await query(sql, params);
    
    return results.map(item => ({
      ...item,
      config: JSON.parse(item.config || '{}'),
      tags: JSON.parse(item.tags || '[]'),
      requiresApiKey: JSON.parse(item.config || '{}').ap1 === 'enable',
      isPublic: item.is_public,
      syncUrl: item.sync_url,
      lastSynced: item.last_synced
    }));
  },

  // Get item statistics
  async getStats(userId) {
    const sql = `
      SELECT 
        type,
        COUNT(*) as count,
        SUM(CASE WHEN is_public = true THEN 1 ELSE 0 END) as public_count,
        SUM(CASE WHEN sync_url IS NOT NULL THEN 1 ELSE 0 END) as synced_count
      FROM datahub_data
      WHERE user_id = ?
      GROUP BY type
    `;

    const stats = await query(sql, [userId]);
    
    const result = {
      total: 0,
      files: 0,
      folders: 0,
      public: 0,
      synced: 0
    };

    stats.forEach(stat => {
      result.total += stat.count;
      result.public += stat.public_count;
      result.synced += stat.synced_count;
      if (stat.type === 'file') result.files = stat.count;
      if (stat.type === 'folder') result.folders = stat.count;
    });

    return result;
  }
};
