// backend/src/services/onboardingService.js
let defaultPrisma = null;
try {
  ({ prisma: defaultPrisma } = require('../config/database'));
} catch (err) {
  defaultPrisma = null;
}
const { logger } = require('../utils/helpers');

// Configuration des questions d'onboarding
const QUESTION_CONFIG = [
  {
    key: 'pedagogicalProfile',
    question: 'Quel type de profil pédagogique te correspond le plus ?',
    options: ['methodical', 'socratic', 'adaptive', 'direct']
  },
  {
    key: 'learningGoal',
    question: "Quel est ton objectif d'apprentissage ?",
    options: ['decouvrir', 'consolider', 'approfondir']
  },
  {
    key: 'preferredStyle',
    question: "Quel style d'explication t'aide le plus ?",
    options: ['analogies', 'pratique', 'questions', 'exemples']
  }
];

class OnboardingService {
  constructor(prismaClient = defaultPrisma) {
    this.prisma = prismaClient;
  }

  getQuestionConfig() {
    return QUESTION_CONFIG;
  }

  async saveAnswers(userId, answers = {}) {
    if (!this.prisma) {
      throw new Error("Prisma client non initialisé");
    }
    const profileKeys = ['pedagogicalProfile', 'learningGoal', 'preferredStyle'];

    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        pedagogicalProfile: true,
        learningGoal: true,
        preferredStyle: true
      }
    });

    if (!existing) {
      throw new Error('Utilisateur introuvable');
    }

    const userData = {};
    const extraData = {};
    for (const [key, value] of Object.entries(answers)) {
      if (profileKeys.includes(key)) {
        userData[key] = value;
      } else {
        extraData[key] = value;
      }
    }

    const mergedProfile = { ...existing, ...userData };

    userData.profileConfidence = this.calculateProfileConfidence(mergedProfile);
    userData.onboardingCompleted = this.isProfileComplete(mergedProfile);
    userData.lastProfileUpdate = new Date();

    const ops = [];
    if (Object.keys(userData).length > 0) {
      ops.push(
        this.prisma.user.update({
          where: { id: userId },
          data: userData
        })
      );
    }

    for (const [key, value] of Object.entries(extraData)) {
      ops.push(
        this.prisma.userData.upsert({
          where: {
            userId_key: { userId, key }
          },
          update: { value, category: 'onboarding' },
          create: { userId, key, value, category: 'onboarding' }
        })
      );
    }

    if (ops.length > 0) {
      await Promise.all(ops);
      logger.info('Réponses onboarding sauvegardées', {
        userId,
        keys: Object.keys(answers)
      });
    }

    return this.getUserProfile(userId);
  }

  async getUserProfile(userId) {
    if (!this.prisma) {
      throw new Error("Prisma client non initialisé");
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        pedagogicalProfile: true,
        learningGoal: true,
        preferredStyle: true,
        onboardingCompleted: true,
        profileConfidence: true,
        lastProfileUpdate: true,
        userData: true
      }
    });

    if (!user) return null;

    return this.buildProfile(user);
  }

  buildProfile(user) {
    const profile = {
      pedagogicalProfile: user.pedagogicalProfile || null,
      learningGoal: user.learningGoal || null,
      preferredStyle: user.preferredStyle || null,
      onboardingCompleted: user.onboardingCompleted || false,
      profileConfidence: user.profileConfidence ?? 0,
      lastProfileUpdate: user.lastProfileUpdate || null,
      extra: {}
    };

    if (Array.isArray(user.userData)) {
      for (const item of user.userData) {
        profile.extra[item.key] = item.value;
      }
    }

    return profile;
  }

  isProfileComplete(profile) {
    const keys = ['pedagogicalProfile', 'learningGoal', 'preferredStyle'];
    return keys.every((k) => profile[k]);
  }

  needsOnboarding(profile) {
    if (!profile) return true;
    return !this.isProfileComplete(profile);
  }

  calculateProfileConfidence(profile) {
    const keys = ['pedagogicalProfile', 'learningGoal', 'preferredStyle'];
    const answered = keys.filter((k) => profile[k]).length;
    return answered / keys.length;
  }
}

module.exports = OnboardingService;
