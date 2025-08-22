const ICourseRepository = require('../../domain/repositories/ICourseRepository');
const { prisma } = require('.');
const { toDomain, toPersistence } = require('./mappers/courseMapper');

class PrismaCourseRepository extends ICourseRepository {
  async create(courseData) {
    const data = toPersistence(courseData);
    const created = await prisma.course.create({ data });
    return toDomain(created);
  }

  async findById(id) {
    const course = await prisma.course.findUnique({ where: { id } });
    return toDomain(course);
  }

  async findAllByUserId(userId) {
    const courses = await prisma.course.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return courses.map(toDomain);
  }

  async update(id, updateData) {
    const data = toPersistence(updateData);
    const updated = await prisma.course.update({ where: { id }, data });
    return toDomain(updated);
  }

  async delete(id) {
    await prisma.course.delete({ where: { id } });
  }
}

module.exports = PrismaCourseRepository;
