const { execSync } = require('child_process');
const { globSync } = require('glob');
const path = require('path');

// Test configuration - paths relative to this script location
const SCRIPT_DIR = __dirname;
const TESTS_DIR = path.join(SCRIPT_DIR, 'tests');
const VALIDATOR_SCRIPT = path.join(SCRIPT_DIR, 'validate-schemas.js');

// Test results tracking
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function determineExpectedOutcome(filePath) {
  // Determine if test should pass or fail based on folder structure
  const normalizedPath = filePath.toLowerCase();

  // Check the directory path for uppercase (INVALID_FOLDER should fail)
  // Extract just the directory portion by removing the filename
  const dirPath = filePath.substring(0, filePath.lastIndexOf('\\'));
  if (dirPath !== dirPath.toLowerCase()) {
    return 'fail';
  }

  // Files in 'invalid-*' folders should fail validation
  if (normalizedPath.includes('invalid-')) {
    return 'fail';
  }

  // Files in 'valid-*' folders should pass validation
  if (normalizedPath.includes('valid-')) {
    return 'pass';
  }

  // Default: assume should pass
  return 'pass';
}

function getTestDescription(filePath) {
  // Extract meaningful test description from file path and name
  const parts = filePath.split(/[/\\]/);
  const fileName = parts[parts.length - 1].replace('.schema.json', '');
  const category = parts[parts.length - 2];

  const descriptions = {
    'BadFileName': 'PascalCase naming',
    'snake_case_name': 'snake_case naming',
    'file--double-hyphen': 'consecutive hyphens',
    'file.with.dots': 'dots in filename',
    'relative-ref': 'relative $ref',
    'wrong-base-url-ref': 'wrong base URL in $ref',
    'wrong-base-url': 'wrong base URL in $id',
    'relative-id': 'relative $id',
    'mismatched-path': '$id path mismatch',
    'single-letter-v1': 'single letter + version',
    'with-numbers-123': 'numbers in name',
    'multiple-extensions-test': 'hyphenated test suffix',
    'parent': 'nested references',
    'child': 'child reference',
    'item': 'item reference'
  };

  return descriptions[fileName] || fileName;
}

function runValidation(schemaPath) {
  try {
    // Convert absolute path to relative path from SCRIPT_DIR
    const relativePath = path.relative(SCRIPT_DIR, schemaPath).replace(/\\/g, '/');

    const command = `node "${VALIDATOR_SCRIPT}"`;
    const env = { ...process.env, SCHEMA_PATH: relativePath };

    execSync(command, {
      env,
      cwd: SCRIPT_DIR,
      stdio: 'pipe',
      encoding: 'utf8'
    });

    return { success: true, error: null };
  } catch (error) {
    // Validation failed (exit code 1)
    return { success: false, error: error.stdout || error.stderr || error.message };
  }
}

function runTest(schemaPath) {
  totalTests++;
  const expectedOutcome = determineExpectedOutcome(schemaPath);
  const result = runValidation(schemaPath);
  const actualOutcome = result.success ? 'pass' : 'fail';
  const testPassed = expectedOutcome === actualOutcome;
  const description = getTestDescription(schemaPath);
  const fileName = path.basename(schemaPath);

  if (testPassed) {
    passedTests++;
    log('green', `  ✅ ${fileName}`);
    log('gray', `     ${description}`);
  } else {
    failedTests++;
    log('red', `  ❌ ${fileName}`);
    log('yellow', `     Expected: ${expectedOutcome}, Got: ${actualOutcome}`);
    log('gray', `     ${description}`);

    // Show validation error if available
    if (result.error) {
      const lines = result.error.split('\n').filter(line => 
        line.includes('not kebab-case') || 
        line.includes('invalid') ||
        line.includes('does not match') ||
        line.includes('does not use')
      );
      if (lines.length > 0) {
        log('gray', `     Error: ${lines[0].trim()}`);
      }
    }
  }

  return testPassed;
}

// Main test runner
function main() {
  log('cyan', '\n════════════════════════════════════════════════════════════');
  log('cyan', '  JSON Schema Validation Test Suite');
  log('cyan', '════════════════════════════════════════════════════════════\n');

  // Find all test schema files
  const testFiles = globSync(`${TESTS_DIR}/**/*.schema.json`);

  if (testFiles.length === 0) {
    log('red', '❌ No test files found!');
    log('yellow', `   Looked in: ${TESTS_DIR}`);
    process.exit(1);
  }

  log('cyan', `📂 Test Directory: ${TESTS_DIR}`);
  log('cyan', `🔍 Found ${testFiles.length} test file(s)\n`);

  // Group tests by category
  const testsByCategory = {};
  testFiles.forEach(file => {
    const parts = file.split(/[/\\]/);
    const category = parts[parts.length - 2]; // Parent folder name
    if (!testsByCategory[category]) {
      testsByCategory[category] = [];
    }
    testsByCategory[category].push(file);
  });

  // Sort categories: valid first, then invalid
  const sortedCategories = Object.keys(testsByCategory).sort((a, b) => {
    if (a.includes('valid') && !b.includes('valid')) return -1;
    if (!a.includes('valid') && b.includes('valid')) return 1;
    return a.localeCompare(b);
  });

  // Run tests by category
  for (const category of sortedCategories) {
    const files = testsByCategory[category];

    // Determine expected outcome based on category name or first file's expected outcome
    const firstFileExpectedOutcome = files.length > 0 ? determineExpectedOutcome(files[0]) : 'pass';
    const expectedOutcomeLabel = firstFileExpectedOutcome === 'fail' ? 'Should Fail ❌' : 'Should Pass ✅';

    log('cyan', `\n📁 ${category.toUpperCase()} (${expectedOutcomeLabel})`);
    log('gray', '─'.repeat(60));

    files.forEach(file => {
      runTest(file);
    });
  }

  // Print summary
  log('cyan', '\n════════════════════════════════════════════════════════════');
  log('cyan', '  Test Summary');
  log('cyan', '════════════════════════════════════════════════════════════');
  console.log(`  Total Tests:  ${totalTests}`);
  log('green', `  Passed:       ${passedTests}`);
  if (failedTests > 0) {
    log('red', `  Failed:       ${failedTests}`);
  } else {
    log('gray', `  Failed:       ${failedTests}`);
  }

  const successRate = ((passedTests / totalTests) * 100).toFixed(1);
  console.log(`  Success Rate: ${successRate}%`);
  log('cyan', '════════════════════════════════════════════════════════════\n');

  // Exit with appropriate code
  if (failedTests > 0) {
    log('red', `❌ ${failedTests} test(s) failed\n`);
    process.exit(1);
  } else {
    log('green', `✅ All ${passedTests} test(s) passed!\n`);
    process.exit(0);
  }
}

// Run the tests
main();
