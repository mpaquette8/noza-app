// backend/src/routes/profileRoutes.js
const express = require('express');
const profileController = require('../controllers/profileController');
const { asyncHandler } = require('../utils/helpers');

const router = express.Router();

router.get('/', asyncHandler(profileController.getProfile.bind(profileController)));
router.put('/preferences', asyncHandler(profileController.updatePreferences.bind(profileController)));
router.put('/info', asyncHandler(profileController.updateInfo.bind(profileController)));
router.post('/avatar', asyncHandler(profileController.uploadAvatar.bind(profileController)));
router.get('/stats', asyncHandler(profileController.getStats.bind(profileController)));
router.get('/activity', asyncHandler(profileController.getActivity.bind(profileController)));
router.delete('/data', asyncHandler(profileController.deleteData.bind(profileController)));

module.exports = router;

