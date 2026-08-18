const fs = require('fs');
const { globSync } = require('glob');

// 1. Parse inputs from environment variables
const SCHEMA_PATTERN = process.env.SCHEMA_PATH;
const SCHEMA_VERSION = process.env.SCHEMA_VERSION || 'draft7';

if (!SCHEMA_PATTERN) {
  console.error("❌ Error: SCHEMA_PATH environment variable must be set.");
  process.exit(1);
}

// 2. Initialize the correct Ajv version for meta-validation
let Ajv;
if (SCHEMA_VERSION === 'draft2020') {
  Ajv = require('ajv/dist/2020'); // Draft 2020-12
} else if (SCHEMA_VERSION === 'draft2019') {
  Ajv = require('ajv/dist/2019'); // Draft 2019-09
} else {
  Ajv = require('ajv');           // Draft 7 (Default)
}

const ajv = new Ajv({ allErrors: true });

// 3. Resolve wildcard glob patterns for schemas
const schemaFiles = globSync(SCHEMA_PATTERN);

if (schemaFiles.length === 0) {
  console.error(`❌ Error: No schema files found matching pattern "${SCHEMA_PATTERN}"`);
  process.exit(1);
}

console.log(`🔍 Found ${schemaFiles.length} schema file(s) to validate using ${SCHEMA_VERSION}.\n`);

// 4. Validate each schema file itself
let totalErrors = 0;
schemaFiles.forEach(file => {
  try {
    const rawContent = fs.readFileSync(file, 'utf8');
    const schema = JSON.parse(rawContent);

    // Validate that the file is a structurally sound JSON Schema
    const isValidSchema = ajv.validateSchema(schema);

    if (!isValidSchema) {
      console.error(`❌ Invalid Schema Structure in: ${file}`);
      console.error(JSON.stringify(ajv.errors, null, 2));
      totalErrors++;
    } else {
      console.log(`✅ Valid Schema: ${file}`);
    }
  } catch (err) {
    console.error(`❌ Failed to read or parse file ${file}:`, err.message);
    totalErrors++;
  }
});

// 5. Block the CI pipeline if structural issues exist
if (totalErrors > 0) {
  console.error(`\nBuild Failed: ${totalErrors} schema file(s) contain syntax or structure errors.`);
  process.exit(1);
}
console.log('\n🎉 All schema files are valid!');