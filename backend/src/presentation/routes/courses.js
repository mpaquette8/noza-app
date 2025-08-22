// backend/src/presentation/routes/courses.js
const express = require('express');
const courseController = require('../controllers/courseController');
const { authenticate } = require('../../infrastructure/middleware/auth');
const { courseValidation, handleValidationErrors } = require('../../infrastructure/middleware/validation');
const { asyncHandler } = require('../../infrastructure/utils/helpers');
const { query } = require('express-validator');
const { LIMITS } = require('../../infrastructure/utils/constants');

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
router.post(
  '/',
  courseValidation,
  (req, res, next) => {
    // Compatibilité : accepter encore teacherType (camelCase)
    if (req.body.teacherType && !req.body.teacher_type) {
      req.body.teacher_type = req.body.teacherType;
    }
    next();
  },
  asyncHandler(courseController.generateCourse)
);
router.delete('/:id', asyncHandler(courseController.deleteCourse));

module.exports = router;
