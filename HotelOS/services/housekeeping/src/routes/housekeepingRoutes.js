const express = require('express');
const { getTasks, completeTask } = require('../controllers/housekeepingController');

const router = express.Router();
router.get('/tasks', getTasks);
router.post('/tasks/complete', completeTask);

module.exports = router;
