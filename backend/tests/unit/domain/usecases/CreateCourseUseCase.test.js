const test = require('node:test');
const assert = require('node:assert');

const { ValidationError } = require('../../../../src/domain/errors');
const CreateCourseUseCase = require('../../../../src/domain/usecases/CreateCourseUseCase');

test('throws ValidationError when userId is missing', async () => {
  const useCase = new CreateCourseUseCase({}, {});
  await assert.rejects(
    () => useCase.execute({ subject: 'Math' }),
    ValidationError
  );
});

test('throws ValidationError when subject is missing', async () => {
  const useCase = new CreateCourseUseCase({}, {});
  await assert.rejects(
    () => useCase.execute({ userId: 'user1' }),
    ValidationError
  );
});

test('generates content and saves course', async () => {
  const generated = 'generated content';
  const serviceCalls = [];
  const repoCalls = [];

  const courseGenerationService = {
    generateCourse: async (subject, options) => {
      serviceCalls.push({ subject, options });
      return generated;
    }
  };

  const courseRepository = {
    create: async data => {
      repoCalls.push(data);
      return { id: 1, ...data };
    }
  };

  const useCase = new CreateCourseUseCase(courseRepository, courseGenerationService);
  const input = { userId: 'user1', subject: 'Physics', options: { level: 'easy' } };
  const result = await useCase.execute(input);

  assert.deepStrictEqual(serviceCalls, [{ subject: 'Physics', options: { level: 'easy' } }]);
  assert.deepStrictEqual(repoCalls, [
    {
      subject: 'Physics',
      content: generated,
      userId: 'user1',
      level: 'easy'
    }
  ]);
  assert.deepStrictEqual(result, {
    id: 1,
    subject: 'Physics',
    content: generated,
    userId: 'user1',
    level: 'easy'
  });
});

