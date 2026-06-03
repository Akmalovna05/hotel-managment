const express = require('express');
const { createTicket, assignTicket, listTickets } = require('../controllers/maintenanceController');

const router = express.Router();
router.get('/tickets', listTickets);
router.post('/tickets', createTicket);
router.put('/tickets/assign', assignTicket);

module.exports = router;
