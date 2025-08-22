const ICourseRepository = require('../../domain/repositories/ICourseRepository');
const { prisma } = require('.');
const { toDomain, toPersistence } = require('./mappers/courseMapper');

class PrismaCourseRepository extends ICourseRepository {
  async create(courseData) {
    const data = toPersistence(courseData);
    const created = await prisma.course.create({
      data,
      select: { id: true, subject: true, createdAt: true },
    });
    return toDomain(created);
  }

  async findById(id) {
    const course = await prisma.course.findUnique({
      where: { id, deletedAt: null },
      include: { quizzes: true },
    });
    return toDomain(course);
  }

  async findAllByUserId(userId, options = {}) {
    const { cursor, limit = 20, include = {} } = options;
    const courses = await prisma.course.findMany({
      where: { userId, deletedAt: null },
      select: {
        id: true,
        subject: true,
        createdAt: true,
        _count: { select: { quizzes: true } },
        ...include,
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor } }),
    });
    return courses.map(toDomain);
  }

  async update(id, updateData) {
    const data = toPersistence(updateData);
    const updated = await prisma.course.update({
      where: { id },
      data,
      select: { id: true, subject: true, createdAt: true },
    });
    return toDomain(updated);
  }

  async delete(id) {
    await prisma.course.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

module.exports = PrismaCourseRepository;
