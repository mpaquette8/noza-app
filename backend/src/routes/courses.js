// backend/src/routes/courses.js
const express = require('express');
const courseController = require('../controllers/courseController');
const { authenticate } = require('../middleware/auth');
const { courseValidation, handleValidationErrors } = require('../middleware/validation');
const { asyncHandler } = require('../utils/helpers');
const { query } = require('express-validator');
const { LIMITS } = require('../utils/constants');

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(authenticate);

// CRUD des cours
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: LIMITS.MAX_HISTORY_ITEMS }).toInt(),
    handleValidationErrors
  ],
  asyncHandler(courseController.getAllCourses)
);
router.get('/:id', asyncHandler(courseController.getCourse));
router.post('/', courseValidation, asyncHandler(courseController.generateCourse));
router.delete('/:id', asyncHandler(courseController.deleteCourse));

module.exports = router;