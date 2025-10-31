const Inventory = require('../models/Inventory');
const { logAudit } = require('../middleware/auth');

// Get all items
exports.getAllItems = async (req, res) => {
  try {
    const { category, status } = req.query;
    
    let query = {};
    if (category) query.category = category;
    if (status) query.status = status;

    const items = await Inventory.find(query).sort({ itemName: 1 });

    res.json({
      success: true,
      count: items.length,
       items,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching inventory items',
      error: error.message,
    });
  }
};

// Get low stock items
exports.getLowStockItems = async (req, res) => {
  try {
    const items = await Inventory.find({
      status: { $in: ['low-stock', 'out-of-stock'] },
    }).sort({ quantity: 1 });

    res.json({
      success: true,
      count: items.length,
       items,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching low stock items',
      error: error.message,
    });
  }
};

// Get expired items
exports.getExpiredItems = async (req, res) => {
  try {
    const items = await Inventory.find({
      expiryDate: { $lt: new Date() },
    }).sort({ expiryDate: 1 });

    res.json({
      success: true,
      count: items.length,
       items,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching expired items',
      error: error.message,
    });
  }
};

// Get item by ID
exports.getItemById = async (req, res) => {
  try {
    const item = await Inventory.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found',
      });
    }

    res.json({
      success: true,
       item,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching item',
      error: error.message,
    });
  }
};

// Create item
exports.createItem = async (req, res) => {
  try {
    const item = await Inventory.create(req.body);

    await logAudit(req, req.user.userId, 'create', 'inventory', 'success', {
      itemId: item._id,
    });

    res.status(201).json({
      success: true,
      message: 'Item created successfully',
       item,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating item',
      error: error.message,
    });
  }
};

// Update item
exports.updateItem = async (req, res) => {
  try {
    const item = await Inventory.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found',
      });
    }

    await logAudit(req, req.user.userId, 'update', 'inventory', 'success', {
      itemId: req.params.id,
    });

    res.json({
      success: true,
      message: 'Item updated successfully',
       item,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating item',
      error: error.message,
    });
  }
};

// Update stock
exports.updateStock = async (req, res) => {
  try {
    const { quantity, purpose } = req.body;

    const item = await Inventory.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found',
      });
    }

    item.quantity = quantity;
    item.usageHistory.push({
      date: new Date(),
      quantity,
      usedBy: req.user.userId,
      purpose,
    });

    if (quantity > item.reorderLevel) {
      item.lastRestocked = new Date();
    }

    await item.save();

    await logAudit(req, req.user.userId, 'update', 'inventory', 'success', {
      itemId: req.params.id,
      action: 'stock_update',
      quantity,
    });

    res.json({
      success: true,
      message: 'Stock updated successfully',
       item,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating stock',
      error: error.message,
    });
  }
};

// Delete item
exports.deleteItem = async (req, res) => {
  try {
    const item = await Inventory.findByIdAndDelete(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found',
      });
    }

    await logAudit(req, req.user.userId, 'delete', 'inventory', 'success', {
      itemId: req.params.id,
    });

    res.json({
      success: true,
      message: 'Item deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting item',
      error: error.message,
    });
  }
};

// Search items
exports.searchItems = async (req, res) => {
  try {
    const { query } = req.params;

    const items = await Inventory.find({
      $or: [
        { itemName: { $regex: query, $options: 'i' } },
        { genericName: { $regex: query, $options: 'i' } },
        { manufacturer: { $regex: query, $options: 'i' } },
      ],
    });

    res.json({
      success: true,
      count: items.length,
       items,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error searching items',
      error: error.message,
    });
  }
};

module.exports = exports;
