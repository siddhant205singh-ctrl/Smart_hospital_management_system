const express = require('express');
const router = express.Router();
const { getHospitals, getHospitalById, getNearbyHospitals } = require('../controllers/hospitalController');
const { optionalProtect } = require('../middleware/authMiddleware');

router.get('/nearby', optionalProtect, getNearbyHospitals);
router.get('/', getHospitals);
router.get('/:id', getHospitalById);

module.exports = router;
