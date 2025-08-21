// backend/src/services/profileService.js
let defaultPrisma = null;
try {
  ({ prisma: defaultPrisma } = require('../config/database'));
} catch (err) {
  defaultPrisma = null;
}
const fs = require('fs');
const path = require('path');
const OnboardingService = require('./onboardingService');
const { logger } = require('../utils/helpers');

class ProfileService {
  constructor(prismaClient = defaultPrisma) {
    this.prisma = prismaClient;
    this.onboarding = new OnboardingService(prismaClient);
  }

  async getProfile(userId) {
    try {
      const [profile, stats, activity] = await Promise.all([
        this.onboarding.getUserProfile(userId),
        this.getUsageStats(userId),
        this.getActivity(userId, 10)
      ]);
      return { profile, stats, activity };
    } catch (error) {
      logger.error('Erreur récupération profil', error);
      throw error;
    }
  }

  async updatePreferences(userId, prefs) {
    try {
      return await this.onboarding.saveAnswers(userId, prefs);
    } catch (error) {
      logger.error('Erreur mise à jour préférences', error);
      throw error;
    }
  }

  async updateInfo(userId, data = {}) {
    try {
      if (!this.prisma) {
        throw new Error('Prisma client non initialisé');
      }
      const allowed = ['learningContext', 'usageFrequency', 'teacherType', 'vulgarization', 'duration', 'interests'];
      const toUpdate = {};
      for (const key of allowed) {
        if (data[key] !== undefined) {
          toUpdate[key] = data[key];
        }
      }
      if (Object.keys(toUpdate).length === 0) {
        return this.prisma.user.findUnique({ where: { id: userId } });
      }
      const user = await this.prisma.user.update({
        where: { id: userId },
        data: toUpdate
      });
      logger.info('Profil utilisateur mis à jour', { userId, fields: Object.keys(toUpdate) });
      return user;
    } catch (error) {
      logger.error('Erreur mise à jour informations utilisateur', error);
      throw error;
    }
  }

  async uploadAvatar(userId, file) {
    try {
      if (!file || !file.buffer) {
        throw new Error('Fichier invalide');
      }
      const uploadsDir = path.join(__dirname, '../../uploads/avatars');
      await fs.promises.mkdir(uploadsDir, { recursive: true });
      const filename = `${userId}-${Date.now()}${path.extname(file.originalname || '')}`;
      const filepath = path.join(uploadsDir, filename);
      await fs.promises.writeFile(filepath, file.buffer);
      const relativePath = `uploads/avatars/${filename}`;
      const user = await this.prisma.user.update({
        where: { id: userId },
        data: { avatar: relativePath }
      });
      logger.success('Avatar uploadé', { userId, path: relativePath });
      return user;
    } catch (error) {
      logger.error('Erreur upload avatar', error);
      throw error;
    }
  }

  async getUsageStats(userId) {
    try {
      if (!this.prisma) {
        throw new Error('Prisma client non initialisé');
      }
      const [courses, quizzes, sessions] = await Promise.all([
        this.prisma.course.count({ where: { userId } }),
        this.prisma.quiz.count({ where: { userId } }),
        this.prisma.userData.findMany({
          where: { userId, key: 'session_duration' }
        })
      ]);
      const totalTime = sessions.reduce((sum, s) => sum + Number(s.value || 0), 0);
      return { courses, quizzes, totalTime };
    } catch (error) {
      logger.error('Erreur récupération statistiques', error);
      throw error;
    }
  }

  async getActivity(userId, limit = 10) {
    try {
      if (!this.prisma || !this.prisma.activity) {
        return [];
      }
      return await this.prisma.activity.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit
      });
    } catch (error) {
      logger.error('Erreur récupération activité', error);
      throw error;
    }
  }

  async analyzeBehavior(userId) {
    try {
      if (!this.prisma) {
        throw new Error('Prisma client non initialisé');
      }
      const keys = ['preferred_domains', 'learning_pace', 'activity_hours'];
      const data = await this.prisma.userData.findMany({
        where: { userId, key: { in: keys } }
      });
      const result = {};
      for (const item of data) {
        result[item.key] = item.value;
      }
      return result;
    } catch (error) {
      logger.error('Erreur analyse comportement', error);
      throw error;
    }
  }

  async exportData(userId) {
    try {
      if (!this.prisma) {
        throw new Error('Prisma client non initialisé');
      }
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { userData: true }
      });
      return user;
    } catch (error) {
      logger.error('Erreur export données utilisateur', error);
      throw error;
    }
  }

  async deleteData(userId) {
    try {
      if (!this.prisma) {
        throw new Error('Prisma client non initialisé');
      }
      const ops = [
        this.prisma.userData.deleteMany({ where: { userId } }),
        this.prisma.quiz.deleteMany({ where: { userId } }),
        this.prisma.course.deleteMany({ where: { userId } }),
        this.prisma.chatHistory.deleteMany({ where: { userId } })
      ];
      if (this.prisma.activity) {
        ops.push(this.prisma.activity.deleteMany({ where: { userId } }));
      }
      ops.push(this.prisma.user.delete({ where: { id: userId } }));
      await this.prisma.$transaction(ops);
      logger.warn('Données utilisateur supprimées', { userId });
      return true;
    } catch (error) {
      logger.error('Erreur suppression données utilisateur', error);
      throw error;
    }
  }
}

module.exports = ProfileService;
