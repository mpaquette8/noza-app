class CourseRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async create(data) {
    return this.prisma.course.create({ data });
  }
}

module.exports = CourseRepository;
