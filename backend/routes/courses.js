// backend/routes/courses.js

const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const prisma = require('../utils/prisma');
const router = express.Router();

// RÉCUPÉRER TOUS LES COURS DE L'UTILISATEUR
router.get('/', authenticate, async (req, res) => {
  try {
    const courses = await prisma.course.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        subject: true,
        detailLevel: true,
        vulgarizationLevel: true,
        createdAt: true
      }
    });

    res.json({
      success: true,
      courses
    });
  } catch (error) {
    console.error('Erreur récupération cours:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur lors de la récupération des cours' 
    });
  }
});

// RÉCUPÉRER UN COURS SPÉCIFIQUE
router.get('/:id', authenticate, async (req, res) => {
  try {
    const course = await prisma.course.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id // S'assurer que le cours appartient à l'utilisateur
      }
    });

    if (!course) {
      return res.status(404).json({ 
        success: false,
        error: 'Cours non trouvé' 
      });
    }

    res.json({
      success: true,
      course
    });
  } catch (error) {
    console.error('Erreur récupération cours:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur lors de la récupération du cours' 
    });
  }
});

// SAUVEGARDER UN NOUVEAU COURS
router.post('/', authenticate, [
  body('subject')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Le sujet est requis'),
  body('content')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Le contenu est requis'),
  body('detailLevel')
    .isInt({ min: 1, max: 3 })
    .withMessage('Niveau de détail invalide'),
  body('vulgarizationLevel')
    .isInt({ min: 1, max: 4 })
    .withMessage('Niveau de vulgarisation invalide')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    const { subject, content, detailLevel, vulgarizationLevel } = req.body;

    const course = await prisma.course.create({
      data: {
        subject,
        content,
        detailLevel: parseInt(detailLevel),
        vulgarizationLevel: parseInt(vulgarizationLevel),
        userId: req.user.id
      }
    });

    res.status(201).json({
      success: true,
      message: 'Cours sauvegardé',
      course
    });
  } catch (error) {
    console.error('Erreur sauvegarde cours:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur lors de la sauvegarde du cours' 
    });
  }
});

// SUPPRIMER UN COURS
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const course = await prisma.course.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!course) {
      return res.status(404).json({ 
        success: false,
        error: 'Cours non trouvé' 
      });
    }

    await prisma.course.delete({
      where: { id: req.params.id }
    });

    res.json({
      success: true,
      message: 'Cours supprimé'
    });
  } catch (error) {
    console.error('Erreur suppression cours:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur lors de la suppression du cours' 
    });
  }
});

module.exports = router;