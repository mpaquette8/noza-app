const { logger } = require('../utils/helpers');

const MAX_RETRIES = 3;
const SLOW_QUERY_THRESHOLD = 100; // ms

function attachQueryOptimizers(prisma) {
  prisma.$use(async (params, next) => {
    const start = Date.now();
    let attempt = 0;

    while (true) {
      try {
        const result = await next(params);
        const duration = Date.now() - start;
        if (duration > SLOW_QUERY_THRESHOLD) {
          logger.warn(`Slow query (${duration}ms) on ${params.model}.${params.action}`);
        }
        return result;
      } catch (err) {
        const isDeadlock = err.code === 'P2034' || (err.message && err.message.toLowerCase().includes('deadlock'));
        if (isDeadlock && attempt < MAX_RETRIES) {
          attempt += 1;
          logger.warn(`Deadlock detected, retrying ${attempt}/${MAX_RETRIES}`);
          await new Promise(res => setTimeout(res, 50 * attempt));
          continue;
        }
        throw err;
      }
    }
  });
}

module.exports = { attachQueryOptimizers };
