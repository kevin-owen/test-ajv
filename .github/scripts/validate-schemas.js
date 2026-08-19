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

  if (normalized.includes('2020') || normalized === 'draft2020') {
    Ajv = require('ajv/dist/2020');
  }
  else if (normalized.includes('2019') || normalized === 'draft2019') {
    Ajv = require('ajv/dist/2019');
  }
  else {
    Ajv = require('ajv'); // Defaults to Draft 7
  }

  ajvInstances[normalized] = new Ajv({ allErrors: true });
  return ajvInstances[normalized];
}

function getSchemaVersion(schema) {
  // Detect version from the $schema tag, or fall back to default
  let schemaVersion = DEFAULT_VERSION;

  if (schema.$schema && typeof schema.$schema === 'string') {
    schemaVersion = schema.$schema;
  }

  return schemaVersion;
}

function writeSeperator() {
  console.log('\n────────────────────────────────────────────────────────────────────\n');
}

function loadSchemas() {
  // Resolve wildcard glob patterns for schemas
  const schemaFiles = globSync(SCHEMA_PATTERN);

  if (schemaFiles.length === 0) {
    console.error(`❌ Error: No schema files found matching pattern "${SCHEMA_PATTERN}"`);
    process.exit(1);
  }

  writeSeperator();
  console.log(`🔍 Found ${schemaFiles.length} schema file(s) to validate.`);

  // Pre-load all schemas into AJV instances to resolve $ref references
  schemaFiles.forEach(file => {
    try {
      const rawContent = fs.readFileSync(file, 'utf8');
      const schema = JSON.parse(rawContent);
      const schemaVersion = getSchemaVersion(schema);
      const ajv = getAjvInstance(schemaVersion);

      // Add schema to AJV by its $id so references can be resolved
      if (schema.$id) {
        ajv.addSchema(schema);
        console.log(`  Loaded: ${schema.$id}`);
      }
    } catch (err) {
      console.log(`  ⚠️ Failed to pre-load ${file}: ${err.message}`);
    }
  });

  writeSeperator();

  return schemaFiles;
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

    console.log(`Testing: ${file}`);
    console.log(`Version: ${schemaVersion}`);

    // 4. Validate the schema structure
    const isValidSchema = ajv.validateSchema(schema);

    if (!isValidSchema) {

      console.log(`Schema valid: ❌`);
      console.log(JSON.stringify(ajv.errors, null, 2));
      totalErrors++;

    } else {

      // Get or compile the validator
      // If schema was pre-loaded with $id, get it; otherwise compile it
      let validate;
      if (schema.$id && ajv.getSchema(schema.$id)) {
        validate = ajv.getSchema(schema.$id);
      } else {
        validate = ajv.compile(schema);
      }

      console.log(`Schema: ✅ valid`);

      // Manually loop through your metadata examples to test them
      schema.examples.forEach((example, index) => {
        const isValid = validate(example);
        if (isValid) {
          console.log(`Example #${index + 1}: ✅ valid`);
        }
        else {
          console.log(`Example #${index + 1}: ❌ not valid`);
          console.log("Errors:", validate.errors);
          totalErrors++;
        }
      });
    }

  }
  catch (err) {
    console.log(`Schema: ❌ not valid`);
    console.log(`Error:`, err.message);
    totalErrors++;
  }
  finally {
    writeSeperator();
  }
}

let totalErrors = 0;

const schemaFiles = loadSchemas();

schemaFiles.forEach(
  file => validateSchemaFile(file)
);

// Block CI pipeline if structural issues exist
if (totalErrors > 0) {
  console.log(`❌ Build Failed: ${totalErrors} schema file(s) failed validation.\n`);
  process.exitCode = 1;
} else {
  console.log(`🎉 All schemas validated successfully!\n`);
}