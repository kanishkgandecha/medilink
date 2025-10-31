const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { verifyToken } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

// Get all inventory items
router.get('/', verifyToken, inventoryController.getAllItems);

// Get low stock items
router.get('/low-stock', verifyToken, inventoryController.getLowStockItems);

// Get expired items
router.get('/expired', verifyToken, authorize(['admin', 'staff']), inventoryController.getExpiredItems);

// Get item by ID
router.get('/:id', verifyToken, inventoryController.getItemById);

// Create new item (admin, staff)
router.post('/', verifyToken, authorize(['admin', 'staff']), inventoryController.createItem);

// Update item (admin, staff)
router.put('/:id', verifyToken, authorize(['admin', 'staff']), inventoryController.updateItem);

// Update stock quantity
router.patch('/:id/stock', verifyToken, authorize(['admin', 'staff']), inventoryController.updateStock);

// Delete item (admin only)
router.delete('/:id', verifyToken, authorize(['admin']), inventoryController.deleteItem);

// Search items
router.get('/search/:query', verifyToken, inventoryController.searchItems);

module.exports = router;
