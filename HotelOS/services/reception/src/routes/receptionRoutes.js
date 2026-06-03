const express = require('express');
const { checkIn, checkOut, getAvailability } = require('../controllers/receptionController');

const router = express.Router();
router.post('/check-in', checkIn);
router.post('/check-out', checkOut);
router.get('/rooms/availability', getAvailability);

module.exports = router;
