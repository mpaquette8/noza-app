const Course = require('../../../domain/entities/Course');

function toDomain(persistenceCourse) {
  if (!persistenceCourse) return null;
  return new Course({
    id: persistenceCourse.id,
    subject: persistenceCourse.subject,
    content: persistenceCourse.content,
    userId: persistenceCourse.userId,
    createdAt: persistenceCourse.createdAt,
    deletedAt: persistenceCourse.deletedAt,
  });
}

function toPersistence(domainCourse) {
  if (!domainCourse) return null;
  const persistence = {
    id: domainCourse.id,
    subject: domainCourse.subject,
    content: domainCourse.content,
    userId: domainCourse.userId,
    duration: domainCourse.duration,
    detailLevel: domainCourse.detailLevel,
    vulgarizationLevel: domainCourse.vulgarizationLevel,
    style: domainCourse.style,
    intent: domainCourse.intent,
    vulgarization: domainCourse.vulgarization,
    teacherType: domainCourse.teacherType,
    createdAt: domainCourse.createdAt,
    deletedAt: domainCourse.deletedAt,
  };
  Object.keys(persistence).forEach(
    (key) => persistence[key] === undefined && delete persistence[key]
  );
  return persistence;
}

module.exports = { toDomain, toPersistence };
