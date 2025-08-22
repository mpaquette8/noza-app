const { DomainError } = require('../errors');

class ICourseRepository {
  async create(courseData) {
    throw new DomainError('Method not implemented');
  }

  async findById(id) {
    throw new DomainError('Method not implemented');
  }

  async findAllByUserId(userId) {
    throw new DomainError('Method not implemented');
  }

  async update(id, updateData) {
    throw new DomainError('Method not implemented');
  }

  async delete(id) {
    throw new DomainError('Method not implemented');
  }
}

module.exports = ICourseRepository;
