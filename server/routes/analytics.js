/**
 * Analytics Routes
 * Handles analytics-related endpoints
 */

const express = require('express');
const router = express.Router();
const db = require('../database');

/**
 * GET /api/analytics/orders-by-hour
 * Get orders by hour for a specific date
 */
router.get('/orders-by-hour', (req, res) => {
  try {
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({ 
        success: false, 
        error: 'Date parameter is required (YYYY-MM-DD format)' 
      });
    }
    
    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format. Use YYYY-MM-DD'
      });
    }
    
    const ordersByHour = db.getOrdersByHour(date);
    
    res.json({ 
      success: true, 
      date: date,
      hourlyData: ordersByHour 
    });
  } catch (error) {
    console.error('Error fetching orders by hour:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch hourly data',
      details: error.message
    });
  }
});

/**
 * GET /api/analytics/daily-summary
 * Get summary statistics for a specific date
 */
router.get('/daily-summary', (req, res) => {
  try {
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({ 
        success: false, 
        error: 'Date parameter is required (YYYY-MM-DD format)' 
      });
    }
    
    // Get all transactions for the date
    const query = db.getDatabase().prepare(`
      SELECT 
        COUNT(*) as total_orders,
        SUM(total_price) as total_revenue,
        SUM(print_quantity) as total_prints,
        SUM(email_count) as total_emails,
        COUNT(CASE WHEN status_picked_up = 1 THEN 1 END) as completed_orders
      FROM transactions
      WHERE DATE(created_at) = ?
    `);
    
    query.bind([date]);
    query.step();
    const summary = query.getAsObject();
    query.free();
    
    res.json({
      success: true,
      date: date,
      summary: {
        totalOrders: summary.total_orders || 0,
        totalRevenue: parseFloat(summary.total_revenue || 0),
        totalPrints: summary.total_prints || 0,
        totalEmails: summary.total_emails || 0,
        completedOrders: summary.completed_orders || 0
      }
    });
  } catch (error) {
    console.error('Error fetching daily summary:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch daily summary',
      details: error.message
    });
  }
});

module.exports = router;
