class GenerateCourseDTO {
  constructor({ subject, teacherType, duration, vulgarization }) {
    this.subject = subject;
    this.teacherType = teacherType;
    this.duration = duration;
    this.vulgarization = vulgarization;
  }
}

module.exports = { GenerateCourseDTO };
