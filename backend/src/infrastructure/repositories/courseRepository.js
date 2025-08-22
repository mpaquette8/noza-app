class CourseRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async create(data) {
    return this.prisma.course.create({
      data,
      select: {
        id: true,
        subject: true,
        createdAt: true,
      },
    });
  }

  async findById(id) {
    return this.prisma.course.findUnique({
      where: { id, deletedAt: null },
      include: { quizzes: true },
    });
  }

  async findAllByUserId(userId, options = {}) {
    const { cursor, limit = 20, include = {} } = options;
    return this.prisma.course.findMany({
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
  }

  async delete(id) {
    return this.prisma.course.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

module.exports = CourseRepository;
