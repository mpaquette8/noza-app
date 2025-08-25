const test = require('node:test');
const assert = require('node:assert');

const { ValidationError } = require('../../../../src/domain/errors');
const GenerateCourseUseCase = require('../../../../src/domain/usecases/GenerateCourseUseCase');

test('throws ValidationError when userId is missing', async () => {
  const useCase = new GenerateCourseUseCase({}, {});
  await assert.rejects(
    () => useCase.execute({ subject: 'Math' }),
    ValidationError
  );
});

test('throws ValidationError when subject is missing', async () => {
  const useCase = new GenerateCourseUseCase({}, {});
  await assert.rejects(
    () => useCase.execute({ userId: 'user1' }),
    ValidationError
  );
});

test('generates and saves course with provided parameters', async () => {
  const generated = 'generated content';
  const serviceCalls = [];
  const repoCalls = [];

  const courseGenerationService = {
    generateCourse: async (
      subject,
      vulgarization,
      duration,
      teacherType,
      visualStyle
    ) => {
      serviceCalls.push({
        subject,
        vulgarization,
        duration,
        teacherType,
        visualStyle
      });
      return generated;
    }
  };

  const courseRepository = {
    create: async data => {
      repoCalls.push(data);
      return { id: '1', ...data };
    }
  };

  const useCase = new GenerateCourseUseCase(courseRepository, courseGenerationService);
  const input = {
    userId: 'user1',
    subject: 'History',
    teacherType: 'METHODICAL',
    duration: 'SHORT',
    vulgarization: 'GENERAL_PUBLIC',
    visualStyle: 'diagrammes'
  };
  const result = await useCase.execute(input);

  assert.deepStrictEqual(serviceCalls, [
    {
      subject: 'History',
      vulgarization: 'GENERAL_PUBLIC',
      duration: 'SHORT',
      teacherType: 'METHODICAL',
      visualStyle: 'diagrammes'
    }
  ]);
  assert.deepStrictEqual(repoCalls, [
    {
      subject: 'History',
      content: generated,
      teacherType: 'METHODICAL',
      duration: 'SHORT',
      vulgarization: 'GENERAL_PUBLIC',
      userId: 'user1'
    }
  ]);
  assert.deepStrictEqual(result, {
    id: '1',
    subject: 'History',
    content: generated,
    teacherType: 'METHODICAL',
    duration: 'SHORT',
    vulgarization: 'GENERAL_PUBLIC',
    userId: 'user1'
  });
});

