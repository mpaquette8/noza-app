// build.js - Secure build script with path validation and optimized regex caching
const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

// Define base directories
const rootDir = __dirname;
const frontendDir = path.join(rootDir, 'frontend');
const backendPublicDir = path.join(rootDir, 'backend', 'public');

/**
 * Validates that a target path is within the allowed base path
 * Prevents path traversal attacks
 * @param {string} targetPath - Path to validate
 * @param {string} basePath - Base directory that should contain the target
 * @param {string} name - Descriptive name for error messages
 * @returns {string} The resolved absolute path
 */
function validatePath(targetPath, basePath, name) {
  const resolvedTarget = path.resolve(targetPath);
  const resolvedBase = path.resolve(basePath);

  // Ensure the target path starts with the base path
  if (!resolvedTarget.startsWith(resolvedBase)) {
    throw new Error(
      `Security Error: ${name} path "${targetPath}" is outside of allowed directory "${basePath}". ` +
      `Resolved to "${resolvedTarget}" which doesn't start with "${resolvedBase}"`
    );
  }

  return resolvedTarget;
}

/**
 * Safely removes a directory after validation
 * @param {string} dirPath - Directory to remove
 * @param {string} basePath - Base path for validation
 */
function safeRemoveDirectory(dirPath, basePath) {
  try {
    const validated = validatePath(dirPath, basePath, 'Remove target');
    if (fs.existsSync(validated)) {
      console.log(`Removing directory: ${validated}`);
      fs.rmSync(validated, { recursive: true, force: true });
    }
  } catch (error) {
    console.error(`Failed to remove directory: ${error.message}`);
    throw error;
  }
}

/**
 * Creates a regex cache for efficient string replacements
 * @param {Object} manifest - The manifest object with original->hashed mappings
 * @returns {Map} Map of original filenames to compiled regex objects
 */
function createRegexCache(manifest) {
  const regexCache = new Map();

  for (const [original] of Object.entries(manifest)) {
    // Escape special regex characters to prevent regex injection
    const escaped = original.replace(new RegExp('[.*+?^${}()|[\\]\\\\]', 'g'), '\\$&');

    // Create and cache the regex for this file
    // Using word boundaries when possible for more accurate matching
    const regex = new RegExp(
      `(["']|\\/)${escaped}(?=["']|\\s|$)`,
      'g'
    );

    regexCache.set(original, regex);
  }

  return regexCache;
}

/**
 * Updates HTML files with hashed asset references
 * @param {string} dir - Directory containing HTML files
 * @param {Object} manifest - Asset manifest
 * @param {Map} regexCache - Precomputed regex cache
 * @param {string} baseDir - Base directory for validation
 */
function updateHtmlFiles(dir, manifest, regexCache, baseDir) {
  try {
    // Validate the directory before processing
    const validatedDir = validatePath(dir, baseDir, 'HTML update');

    const entries = fs.readdirSync(validatedDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(validatedDir, entry.name);

      if (entry.isDirectory()) {
        // Recursively process subdirectories
        updateHtmlFiles(fullPath, manifest, regexCache, baseDir);
      } else if (entry.isFile() && entry.name.endsWith('.html')) {
        updateHtmlFile(fullPath, manifest, regexCache, baseDir);
      }
    }
  } catch (error) {
    console.error(`Error updating HTML files in ${dir}: ${error.message}`);
    throw error;
  }
}

/**
 * Updates a single HTML file with hashed references
 * @param {string} filePath - Path to the HTML file
 * @param {Object} manifest - Asset manifest
 * @param {Map} regexCache - Precomputed regex cache
 * @param {string} baseDir - Base directory for validation
 */
function updateHtmlFile(filePath, manifest, regexCache, baseDir) {
  try {
    // Validate file path
    const validatedPath = validatePath(filePath, baseDir, 'HTML file');

    console.log(`Updating HTML file: ${validatedPath}`);
    let html = fs.readFileSync(validatedPath, 'utf8');
    let changeCount = 0;

    // Apply all replacements using the precomputed regex cache
    for (const [original, hashed] of Object.entries(manifest)) {
      const regex = regexCache.get(original);
      const beforeLength = html.length;

      // Replace maintaining the prefix (quote or slash)
      html = html.replace(regex, `$1${hashed}`);

      if (html.length !== beforeLength) {
        changeCount++;
      }
    }

    if (changeCount > 0) {
      fs.writeFileSync(validatedPath, html, 'utf8');
      console.log(`  Updated ${changeCount} asset reference(s)`);
    }
  } catch (error) {
    console.error(`Error updating HTML file ${filePath}: ${error.message}`);
    throw error;
  }
}

/**
 * Main build function
 */
async function build() {
  console.log('Starting build process...');
  console.log(`Root directory: ${rootDir}`);

  try {
    // Step 1: Validate all paths BEFORE any operations
    console.log('\n1. Validating paths...');
    const validatedFrontend = validatePath(frontendDir, rootDir, 'Frontend');
    const validatedBackend = validatePath(backendPublicDir, rootDir, 'Backend public');
    const validatedDist = validatePath(path.join(frontendDir, 'dist'), rootDir, 'Dist');

    console.log('  \u2713 Frontend:', validatedFrontend);
    console.log('  \u2713 Backend public:', validatedBackend);
    console.log('  \u2713 Dist:', validatedDist);

    // Step 2: Run frontend build
    console.log('\n2. Building frontend...');
    execSync('node scripts/generate-env.js', {
      cwd: validatedFrontend,
      stdio: 'inherit'
    });
    execSync('npx vite build', {
      cwd: validatedFrontend,
      stdio: 'inherit'
    });

    // Step 3: Verify dist was created
    if (!fs.existsSync(validatedDist)) {
      throw new Error('Frontend build failed: dist directory not created');
    }

    // Step 4: Remove old backend public ONLY after successful build and validation
    console.log('\n3. Cleaning backend public directory...');
    safeRemoveDirectory(validatedBackend, rootDir);

    // Step 5: Create backend public directory
    console.log('\n4. Creating backend public directory...');
    fs.mkdirSync(validatedBackend, { recursive: true });

    // Step 6: Copy dist to backend public
    console.log('\n5. Copying build output...');
    fs.cpSync(validatedDist, validatedBackend, { recursive: true });

    // Step 7: Generate manifest
    console.log('\n6. Generating asset manifest...');
    const assetsDir = path.join(validatedBackend, 'assets');
    const manifest = {};

    if (fs.existsSync(assetsDir)) {
      const files = fs.readdirSync(assetsDir);

      for (const file of files) {
        // Match pattern: name-hash.extension
        const match = file.match(/^(.*?)-([a-zA-Z0-9]+)(\.[^.]+)$/);
        if (match) {
          const original = match[1] + match[3];
          manifest[original] = `assets/${file}`;
          console.log(`  Mapped: ${original} -> assets/${file}`);
        }
      }
    }

    // Write manifest
    const manifestPath = path.join(validatedBackend, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`  \u2713 Manifest written with ${Object.keys(manifest).length} entries`);

    // Step 8: Precompute regex cache for performance
    console.log('\n7. Preparing regex cache...');
    const regexCache = createRegexCache(manifest);
    console.log(`  \u2713 Created ${regexCache.size} cached regex patterns`);

    // Step 9: Update HTML files with cached regex
    console.log('\n8. Updating HTML files...');
    updateHtmlFiles(validatedBackend, manifest, regexCache, rootDir);

    console.log('\n\u2705 Build completed successfully!');

  } catch (error) {
    console.error('\n\u274C Build failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the build if this is the main module
if (require.main === module) {
  build().catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
}

// Export for testing
module.exports = {
  validatePath,
  safeRemoveDirectory,
  createRegexCache,
  updateHtmlFiles,
  build
};

