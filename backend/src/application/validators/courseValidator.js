function validateGenerateCourseDTO(dto) {
  const errors = [];
  if (!dto.subject) errors.push('subject is required');
  return errors;
}

module.exports = { validateGenerateCourseDTO };
