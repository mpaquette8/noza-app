class Course {
  constructor({ id, subject, content, userId, createdAt, deletedAt = null }) {
    this.id = id;
    this.subject = subject;
    this.content = content;
    this.userId = userId;
    this.createdAt = createdAt;
    this.deletedAt = deletedAt;
  }
}

module.exports = Course;
