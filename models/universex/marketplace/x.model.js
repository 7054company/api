import { query } from '../../../config/database.js';
import { v4 as uuidv4 } from 'uuid';

export const MarketplaceModel = {
  // Create a new product
  async create({ name, description, type, price, category, tags, visibility, documentation, apiEndpoint, userId }) {
    const id = uuidv4();
    const config = {
      tags: tags || [],
      visibility: visibility || 'private',
      documentation: documentation || '',
      apiEndpoint: apiEndpoint || ''
    };

    const sql = `
      INSERT INTO marketplace_products (
        id, name, description, type, price, category, config,
        user_id, created_at, updated_at, download_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), 0)
    `;
    
    await query(sql, [
      id, name, description, type, price, category,
      JSON.stringify(config), userId
    ]);
    return id;
  },

  // Get all public products
  async getPublicProducts() {
    const sql = `
      SELECT 
        p.*,
        u.username as author_name,
        p.download_count as download_count
      FROM marketplace_products p
      JOIN users u ON p.user_id = u.id
      WHERE JSON_EXTRACT(p.config, '$.visibility') = 'public' 
      AND p.status = 'published'
      ORDER BY p.created_at DESC
    `;
    return await query(sql);
  },

  // Get user's products
  async getUserProducts(userId) {
    const sql = `
      SELECT 
        p.*,
        u.username as author_name,
        p.download_count as download_count
      FROM marketplace_products p
      JOIN users u ON p.user_id = u.id
      WHERE p.user_id = ?
      ORDER BY p.created_at DESC
    `;
    return await query(sql, [userId]);
  },

  // Get single product by ID
  async getById(id) {
    const sql = `
      SELECT 
        p.*,
        u.username as author_name,
        p.download_count as download_count
      FROM marketplace_products p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `;
    const [product] = await query(sql, [id]);
    return product || null;
  },

  // Update product
  async update(id, updates) {
    const allowedFields = [
      'name', 'description', 'type', 'price', 'category', 'status'
    ];
    
    const updateFields = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        updateFields.push(`${key} = ?`);
        values.push(value);
      }
    }

    const configUpdates = ['tags', 'visibility', 'documentation', 'apiEndpoint']
      .filter(key => key in updates);

    if (configUpdates.length > 0) {
      updateFields.push(`config = JSON_SET(
        COALESCE(config, '{}'),
        ${configUpdates.map(() => `'$.${configUpdates.shift()}', ?`).join(', ')}
      )`);
      configUpdates.forEach(key => values.push(updates[key]));
    }

    if (updateFields.length === 0) return false;

    updateFields.push('updated_at = NOW()');
    values.push(id);

    const sql = `
      UPDATE marketplace_products 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `;

    await query(sql, values);
    return true;
  },

  // Delete product
  async delete(id) {
    const sql = 'DELETE FROM marketplace_products WHERE id = ?';
    await query(sql, [id]);
  },

  // Increment download count
  async incrementDownloadCount(productId) {
    const sql = `
      UPDATE marketplace_products
      SET download_count = download_count + 1
      WHERE id = ?
    `;
    await query(sql, [productId]);
  }
};

export default MarketplaceModel;
