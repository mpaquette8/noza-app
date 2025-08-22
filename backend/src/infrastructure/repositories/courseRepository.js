class CourseRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async create(data) {
    return this.prisma.course.create({ data });
  }

  async findById(id) {
    return this.prisma.course.findUnique({ where: { id } });
  }

  async findAllByUserId(userId, { skip = 0, take = 10 } = {}) {
    return this.prisma.course.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  }

  async delete(id) {
    return this.prisma.course.delete({ where: { id } });
  }
}

module.exports = CourseRepository;
