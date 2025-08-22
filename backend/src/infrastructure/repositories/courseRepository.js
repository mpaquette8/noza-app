const { prisma } = require('../database');

class CourseRepository {
  async create(data) {
    return prisma.course.create({ data });
  }
}

module.exports = CourseRepository;
