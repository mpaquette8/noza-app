class Course {
  constructor({ id, subject, content, userId, createdAt }) {
    this.id = id;
    this.subject = subject;
    this.content = content;
    this.userId = userId;
    this.createdAt = createdAt;
  }
}

module.exports = Course;
