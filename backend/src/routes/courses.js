// backend/src/routes/courses.js
const express = require('express');
const courseController = require('../controllers/courseController');
const { authenticate } = require('../middleware/auth');
const { courseValidation } = require('../middleware/validation');
const { asyncHandler } = require('../utils/helpers');

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(authenticate);

// CRUD des cours
router.get('/', asyncHandler(courseController.getAllCourses));
router.get('/:id', asyncHandler(courseController.getCourse));
router.post('/', courseValidation, asyncHandler(courseController.generateCourse));
router.delete('/:id', asyncHandler(courseController.deleteCourse));

module.exports = router;