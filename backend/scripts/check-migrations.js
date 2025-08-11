const { exec } = require('child_process');

function run(command) {
  return new Promise((resolve) => {
    exec(command, (error, stdout, stderr) => {
      resolve({ error, stdout, stderr });
    });
  });
}

async function hasPendingMigrations() {
  const { error, stdout, stderr } = await run('npx prisma migrate status');
  const output = `${stdout}\n${stderr}`.toLowerCase();

  if (error) {
    console.error('Could not determine migration status.');
    return { pending: true, unknown: true };
  }

  const noPendingPatterns = [
    'database schema is up to date',
    'database is up to date',
    'no pending migrations',
    'already in sync',
  ];

  for (const pattern of noPendingPatterns) {
    if (output.includes(pattern)) {
      return { pending: false };
    }
  }

  const pendingPatterns = [
    'have not yet been applied',
    'pending',
    'not up to date',
  ];

  for (const pattern of pendingPatterns) {
    if (output.includes(pattern)) {
      return { pending: true };
    }
  }

  // Fallback: treat as unknown/pending
  return { pending: true, unknown: true };
}

async function deployMigrations() {
  const { error, stdout, stderr } = await run('npx prisma migrate deploy');
  if (error) {
    console.error('Migration deploy failed.');
    console.error(stderr || stdout);
    return false;
  }
  console.log('Migrations deployed successfully.');
  return true;
}

async function ensureMigrations() {
  const status = await hasPendingMigrations();
  if (!status.pending && !status.unknown) {
    console.log('Database schema is up to date.');
    return true;
  }

  if (status.unknown) {
    console.warn('Unable to determine migration status, attempting to deploy migrations...');
  } else {
    console.log('Pending migrations detected, deploying...');
  }

  const success = await deployMigrations();
  if (!success) {
    process.exit(1);
  }
  return success;
}

if (require.main === module) {
  ensureMigrations().catch((err) => {
    console.error('Error ensuring migrations:', err);
    process.exit(1);
  });
}

module.exports = { ensureMigrations };
