const fs = require('fs');
const path = require('path');
const { globSync } = require('glob');

const formats = {
  reset: '\x1b[0m',
  bold: '\x1b[1m'
}

// ANSI color codes
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

// Parse inputs from environment variables
const SCHEMA_PATTERN = process.env.SCHEMA_PATH;
const DEFAULT_VERSION = process.env.SCHEMA_VERSION || 'draft2020';
const SCHEMA_BASE_URL = 'https://schemas.test.com/';

if (!SCHEMA_PATTERN) {
  console.error("❌ Error: SCHEMA_PATH environment variable must be set.");
  process.exit(1);
}

// Helper to load and cache the right Ajv instance for a given version string
const ajvInstances = {};

let totalErrors = 0;

loadSchemas().forEach(
  file => validateSchemaFile(file)
);

// Block CI pipeline if structural issues exist
if (totalErrors > 0) {
  logError(`🚫 FAIL: ${totalErrors} schema file(s) failed validation.`);
  writeSeperator();
  process.exitCode = 1;
}
else {
  logSuccess(`🎉 All schemas validated successfully!`);
  writeSeperator();
}

function loadSchemas() {
  // Resolve wildcard glob patterns for schemas to validate
  const schemaFiles = globSync(SCHEMA_PATTERN);

  if (schemaFiles.length === 0) {
    console.error(`❌ Error: No schema files found matching pattern "${SCHEMA_PATTERN}"`);
    process.exit(1);
  }

  writeSeperator();
  console.log(`🔍 Found ${schemaFiles.length} schema file(s) to validate.`);

  // For $ref resolution: always pre-load ALL schemas (not just the ones to validate)
  // This ensures that cross-references work even when validating a single file
  // Use the same base pattern/directory as SCHEMA_PATTERN to find related schemas
  const basePath = SCHEMA_PATTERN.includes('/') || SCHEMA_PATTERN.includes('\\') 
    ? SCHEMA_PATTERN.substring(0, Math.max(SCHEMA_PATTERN.lastIndexOf('/'), SCHEMA_PATTERN.lastIndexOf('\\')))
    : '.';
  const allSchemaPattern = `${basePath}/**/*.schema.json`;
  const allSchemaFiles = globSync(allSchemaPattern);

  allSchemaFiles.forEach(file => {
    try {
      const rawContent = fs.readFileSync(file, 'utf8');
      const schema = JSON.parse(rawContent);
      const schemaVersion = getSchemaVersion(schema);
      const ajv = getAjvInstance(schemaVersion);

      // Add schema to AJV by its $id so references can be resolved
      if (schema.$id) {
        ajv.addSchema(schema);
        console.log(`Loaded: ${schema.$id}`);
      }
    }
    catch (err) {
      console.log(`⚠️ Failed to pre-load ${file}: ${err.message}`);
    }
  });

  writeSeperator();

  return schemaFiles;
}

function getSchemaVersion(schema) {
  // Detect version from the $schema tag, or fall back to default
  let schemaVersion = DEFAULT_VERSION;

  if (schema.$schema && typeof schema.$schema === 'string') {
    schemaVersion = schema.$schema;
  }

  return schemaVersion;
}

function getAjvInstance(version) {
  const normalized = version.toLowerCase();
  if (ajvInstances[normalized]) return ajvInstances[normalized];

  let Ajv;

  if (normalized.includes('2020') || normalized === 'draft2020') {
    Ajv = require('ajv/dist/2020');
  }
  else if (normalized.includes('2019') || normalized === 'draft2019') {
    Ajv = require('ajv/dist/2019');
  }
  else {
    Ajv = require('ajv'); // Defaults to Draft 7
  }

  const ajv = new Ajv({ allErrors: true });
  require('ajv-formats')(ajv);
  require("ajv-keywords")(ajv)
  ajvInstances[normalized] = ajv;

  return ajv;
}

function validateSchemaFile(file) {
  try {

    const rawContent = fs.readFileSync(file, 'utf8');
    const schema = JSON.parse(rawContent);
    const schemaVersion = getSchemaVersion(schema);
    const ajv = getAjvInstance(schemaVersion);

    // 3. Print out clean tracking logs for audit visibility
    const versionLabel = schemaVersion.includes('http')
      ? schemaVersion.split('/').slice(-2, -1)[0] // Extracts 'draft-07' or '2020-12' cleanly
      : schemaVersion;

    logInfo(`Testing: ${formats.bold}${file}${formats.reset}`);
    logInfo(`Version: ${schemaVersion}`);

    // Validate file naming conventions
    const namingErrors = validateFileNaming(file);
    if (namingErrors.length > 0) {
      logInvalid(`Naming`);
      namingErrors.forEach(err => logError(`  - ${err}`));
      totalErrors++;
    } else {
      logValid(`Naming`);
    }

    // Validate $id and $ref format
    const idRefErrors = validateIdAndRefs(schema, file);
    if (idRefErrors.length > 0) {
      logInvalid(`Identifiers`);
      idRefErrors.forEach(err => logError(`  - ${err}`));
      totalErrors++;
    } else {
      logValid(`Identifiers`);
    }

    // 4. Validate the schema structure
    const isValidSchema = ajv.validateSchema(schema);

    if (!isValidSchema) {

      logInvalid(`Schema`);
      logError(`Errors: ${JSON.stringify(ajv.errors, null, 2)}`);
      totalErrors++;

    }
    else {

      // Get or compile the validator
      // If schema was pre-loaded with $id, get it; otherwise compile it
      let validate;
      if (schema.$id && ajv.getSchema(schema.$id)) {
        validate = ajv.getSchema(schema.$id);
      } else {
        validate = ajv.compile(schema);
      }

      logValid(`Schema`);

      // Manually loop through your metadata examples to test them
      schema.examples.forEach((example, index) => {
        const isValid = validate(example);
        if (isValid) {
          logValid(`Example #${index + 1}`);
        }
        else {
          logInvalid(`Example #${index + 1}`);
          logError(`Errors: ${JSON.stringify(validate.errors, null, 2)}`);
          totalErrors++;
        }
      });
    }

  }
  catch (err) {
    logInvalid(`Schema`);
    logError(`Error: ${err.message}`);
    totalErrors++;
  }
  finally {
    writeSeperator();
  }
}

// -----------------------------------------------
// Validation helper functions
// -----------------------------------------------

function isKebabCase(name) {
  // Kebab case: lowercase letters, numbers, and hyphens
  // Files must end with .schema.json extension (no other dots allowed)
  // Folders must be kebab-case without dots
  // Examples: 
  //   Valid: base-event.schema.json, my-object.schema.json, v1, events
  //   Invalid: my.file.schema.json, file.test.schema.json, file.json, MyFile.schema.json

  // Check if it's a schema file
  if (name.endsWith('.schema.json')) {
    const nameWithoutExt = name.slice(0, -'.schema.json'.length);
    // Name part (before .schema.json) must be kebab-case without any dots
    return /^[a-z][a-z0-9-]*$/.test(nameWithoutExt) && 
           !nameWithoutExt.includes('--');  // No consecutive hyphens
  }

  // For folders and non-schema files, standard kebab-case (no dots)
  return /^[a-z][a-z0-9-]*$/.test(name) && 
         !name.includes('--');  // No consecutive hyphens
}

function validateFileNaming(filePath) {
  const errors = [];
  const parts = filePath.split(/[/\\]/); // Handle both forward and back slashes

  for (const part of parts) {
    // Skip empty parts, current directory marker, parent directory marker, and hidden folders
    if (!part || part === '.' || part === '..' || part.startsWith('.')) continue;

    if (!isKebabCase(part)) {
      errors.push(`Path component "${part}" is not in kebab-case`);
    }
  }

  return errors;
}

function isFullyQualifiedUrl(url) {
  // Check if URL is absolute (starts with http:// or https://)
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function validateIdAndRefs(schema, filePath) {
  const errors = [];

  // Normalize file path to use forward slashes and resolve relative components
  let normalizedPath = filePath.replace(/\\/g, '/');

  // Remove relative path components (../ and ./)
  const parts = normalizedPath.split('/').filter(part => part && part !== '.' && part !== '..');
  normalizedPath = parts.join('/');

  // Check $id
  if (schema.$id) {
    // Must be fully qualified
    if (!isFullyQualifiedUrl(schema.$id)) {
      errors.push(`$id "${schema.$id}" is not a fully qualified URL`);
    }
    // Must use correct base URL
    else if (!schema.$id.startsWith(SCHEMA_BASE_URL)) {
      errors.push(`$id "${schema.$id}" does not use base URL "${SCHEMA_BASE_URL}"`);
    }
    // Must match file path structure
    else {
      const expectedId = SCHEMA_BASE_URL + normalizedPath;
      if (schema.$id !== expectedId) {
        errors.push(`$id "${schema.$id}" does not match expected path "${expectedId}"`);
      }
    }
  }

  // Check all $ref values recursively
  function checkRefs(obj, path = '') {
    if (!obj || typeof obj !== 'object') return;

    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;

      if (key === '$ref' && typeof value === 'string') {
        // Must be fully qualified
        if (!isFullyQualifiedUrl(value)) {
          errors.push(`$ref "${value}" at ${currentPath} is not a fully qualified URL`);
        }
        // Must use correct base URL
        else if (!value.startsWith(SCHEMA_BASE_URL)) {
          errors.push(`$ref "${value}" at ${currentPath} does not use base URL "${SCHEMA_BASE_URL}"`);
        }
      } else if (typeof value === 'object') {
        checkRefs(value, currentPath);
      }
    }
  }

  checkRefs(schema);

  return errors;
}

// -----------------------------------------------
// console helper functions
// -----------------------------------------------

function writeSeperator() {
  console.log('\n────────────────────────────────────────────────────────────────────\n');
}

function log(color, message) {
  console.log(`${color}${message}${formats.reset}`);
}

function logValid(message) {
  logSuccess(`${message}: ✅ valid`);
}

function logInvalid(message) {
  logError(`${message}: ❌ invalid`);
}

function logSuccess(message) {
  log(colors.green, message);
}

function logError(message) {
  log(colors.red, message);
}

function logWarning(message) {
  log(colors.yellow, message);
}

function logInfo(message) {
  log(colors.cyan, message);
}