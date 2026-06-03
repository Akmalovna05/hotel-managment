const express = require('express');
const { createOrder, updateOrderStatus, getCharges } = require('../controllers/orderController');

const router = express.Router();
router.post('/orders', createOrder);
router.put('/orders/:id/status', updateOrderStatus);
router.get('/orders/charges/:bookingId', getCharges);

module.exports = router;
