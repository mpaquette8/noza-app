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
    id: 'teacherType',
    label: "Quel type d'enseignant préfères-tu ?",
    type: 'select',
    options: [
      { value: 'methodical', label: 'Méthodique' },
      { value: 'passionate', label: 'Passionné' },
      { value: 'analogist', label: 'Analogiste' },
      { value: 'pragmatic', label: 'Pragmatique' },
      { value: 'benevolent', label: 'Bienveillant' },
      { value: 'synthetic', label: 'Synthétique' }
    ]
  },
  {
    id: 'vulgarization',
    label: 'Quel niveau de vulgarisation souhaites-tu ?',
    type: 'select',
    options: [
      { value: 'general_public', label: 'Grand public' },
      { value: 'enlightened', label: 'Éclairé' },
      { value: 'knowledgeable', label: 'Connaisseur' },
      { value: 'expert', label: 'Expert' }
    ]
  },
  {
    id: 'duration',
    label: 'Quelle durée de cours préfères-tu ?',
    type: 'select',
    options: [
      { value: 'short', label: 'Courte' },
      { value: 'medium', label: 'Moyenne' },
      { value: 'long', label: 'Longue' }
    ]
  },
  {
    id: 'interests',
    label: "Quels sont tes centres d'intérêt ?",
    type: 'select',
    multiple: true,
    options: [
      { value: 'science', label: 'Science' },
      { value: 'history', label: 'Histoire' },
      { value: 'technology', label: 'Technologie' },
      { value: 'art', label: 'Art' }
    ]
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
    const profileKeys = ['teacherType', 'vulgarization', 'duration'];

    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        teacherType: true,
        vulgarization: true,
        duration: true
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
        teacherType: true,
        vulgarization: true,
        duration: true,
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
      teacherType: user.teacherType || null,
      vulgarization: user.vulgarization || null,
      duration: user.duration || null,
      interests: [],
      onboardingCompleted: user.onboardingCompleted || false,
      profileConfidence: user.profileConfidence ?? 0,
      lastProfileUpdate: user.lastProfileUpdate || null,
      extra: {}
    };

    if (Array.isArray(user.userData)) {
      for (const item of user.userData) {
        if (item.key === 'interests') {
          profile.interests = item.value;
        } else {
          profile.extra[item.key] = item.value;
        }
      }
    }

    return profile;
  }

  isProfileComplete(profile) {
    const keys = ['teacherType', 'vulgarization', 'duration'];
    return keys.every((k) => profile[k]);
  }

  needsOnboarding(profile) {
    if (!profile) return true;
    return !this.isProfileComplete(profile);
  }

  calculateProfileConfidence(profile) {
    const keys = ['teacherType', 'vulgarization', 'duration'];
    const answered = keys.filter((k) => profile[k]).length;
    return answered / keys.length;
  }
}

module.exports = OnboardingService;
