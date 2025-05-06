import express from 'express';
import { authenticateToken } from '../../../auth.js';
import { MarketplaceModel } from '../../../models/universex/marketplace/x.model.js';

const router = express.Router();

// Get all public products
router.get('/list-all', async (req, res) => {
  try {
    const products = await MarketplaceModel.getPublicProducts();
    res.json({ products });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'Failed to fetch products' });
  }
});

// Get user's products
router.get('/list', authenticateToken, async (req, res) => {
  try {
    const products = await MarketplaceModel.getUserProducts(req.user.id);
    res.json({ products });
  } catch (error) {
    console.error('Error fetching user products:', error);
    res.status(500).json({ message: 'Failed to fetch products' });
  }
});

// Create new product
router.post('/new', authenticateToken, async (req, res) => {
  try {
    const productId = await MarketplaceModel.create({
      ...req.body,
      userId: req.user.id
    });

    const product = await MarketplaceModel.getById(productId);
    res.status(201).json({
      message: 'Product created successfully',
      product
    });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ message: 'Failed to create product' });
  }
});

// Get single product
router.get('/:id', async (req, res) => {
  try {
    const product = await MarketplaceModel.getById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ product });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ message: 'Failed to fetch product' });
  }
});

// Update product
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const product = await MarketplaceModel.getById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (product.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const updated = await MarketplaceModel.update(req.params.id, req.body);
    if (!updated) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    const updatedProduct = await MarketplaceModel.getById(req.params.id);
    res.json({
      message: 'Product updated successfully',
      product: updatedProduct
    });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ message: 'Failed to update product' });
  }
});

// Delete product
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const product = await MarketplaceModel.getById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (product.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await MarketplaceModel.delete(req.params.id);
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ message: 'Failed to delete product' });
  }
});

export default router;
