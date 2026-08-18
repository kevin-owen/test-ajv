const fs = require('fs');
const { globSync } = require('glob');

// Parse inputs from environment variables
const SCHEMA_PATTERN = process.env.SCHEMA_PATH;
const DEFAULT_VERSION = process.env.SCHEMA_VERSION || 'draft2020';

if (!SCHEMA_PATTERN) {
  console.error("❌ Error: SCHEMA_PATH environment variable must be set.");
  process.exit(1);
}

// Helper to load and cache the right Ajv instance for a given version string
const ajvInstances = {};
function getAjvInstance(version) {
  const normalized = version.toLowerCase();
  if (ajvInstances[normalized]) return ajvInstances[normalized];

  let Ajv;
  if (ncormalized.includes('2020') || normalized === 'draft2020') {
    Ajv = require('ajv/dist/2020');
  } else if (normalized.includes('2019') || normalized === 'draft2019') {
    Ajv = require('ajv/dist/2019');
  } else {
    Ajv = require('ajv'); // Defaults to Draft 7
  }

  ajvInstances[normalized] = new Ajv({ allErrors: true });
  return ajvInstances[normalized];
}

// Resolve wildcard glob patterns for schemas
const schemaFiles = globSync(SCHEMA_PATTERN);

if (schemaFiles.length === 0) {
  console.error(`❌ Error: No schema files found matching pattern "${SCHEMA_PATTERN}"`);
  process.exit(1);
}

console.log(`🔍 Found ${schemaFiles.length} schema file(s) to validate.\n`);

let totalErrors = 0;

schemaFiles.forEach(file => {
  try {
    const rawContent = fs.readFileSync(file, 'utf8');
    const schema = JSON.parse(rawContent);

    // 1. Detect version from the $schema tag, or fall back to default
    let chosenVersion = DEFAULT_VERSION;
    if (schema.$schema && typeof schema.$schema === 'string') {
      chosenVersion = schema.$schema;
    }

    // 2. Fetch the corresponding validation engine
    const ajv = getAjvInstance(chosenVersion);

    // 3. Print out clean tracking logs for audit visibility
    const versionLabel = chosenVersion.includes('http') 
      ? chosenVersion.split('/').slice(-2, -1)[0] // Extracts 'draft-07' or '2020-12' cleanly
      : chosenVersion;

    console.log(`Testing [${versionLabel}] -> ${file}`);

    // 4. Validate the schema structure
    const isValidSchema = ajv.validateSchema(schema);

    if (!isValidSchema) {
      console.error(`❌ Invalid Schema Structure in: ${file}`);
      console.error(JSON.stringify(ajv.errors, null, 2));
      totalErrors++;
    } else {
      console.log(`✅ Valid Schema: ${file}`);
    }
    console.log('---');
  } catch (err) {
    console.error(`❌ Failed to process file ${file}:`, err.message);
    totalErrors++;
    console.log('---');
  }
});

// Block CI pipeline if structural issues exist
if (totalErrors > 0) {
  console.error(`\nBuild Failed: ${totalErrors} schema file(s) failed validation.`);
  process.exit(1);
}
console.log('\n🎉 All schema files passed structural verification!');