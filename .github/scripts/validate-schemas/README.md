# JSON Schema Validation Script

This script validates JSON schemas to ensure they follow organizational standards and are structurally valid.

## Features

### 1. **Schema Structure Validation** (via AJV)
- Validates that schemas conform to JSON Schema specification
- Supports Draft 7, Draft 2019, and Draft 2020
- Automatically detects schema version from `$schema` field
- Validates example data against the schema

### 2. **Naming Convention Validation**
Enforces kebab-case naming for all files and folders:
- ✅ Valid: `base-event.schema.json`, `my-object.schema.json`, `v1`, `test-123`
- ❌ Invalid: `BaseEvent.json`, `my_object.schema.json`, `file--name.json`, `UPPERCASE`, `file.test.schema.json`

**Rules:**
- Must start with a lowercase letter
- Can contain lowercase letters, numbers, and hyphens
- Cannot have consecutive hyphens (`--`)
- **Schema files must end with exactly `.schema.json`** (no other dots in the filename)

### 3. **$id Validation**
- Must be a fully qualified absolute URL
- Must use base URL: `https://schemas.test.com/`
- Must match the actual file path structure

**Examples:**
```json
// ✅ Valid
{
  "$id": "https://schemas.test.com/events/v1/base-event.schema.json",
  // File location: events/v1/base-event.schema.json
}

// ❌ Invalid - relative path
{
  "$id": "base-event.schema.json"
}

// ❌ Invalid - wrong base URL
{
  "$id": "https://example.com/events/v1/base-event.schema.json"
}

// ❌ Invalid - path mismatch
{
  "$id": "https://schemas.test.com/wrong/path/base-event.schema.json",
  // File location: events/v1/base-event.schema.json
}
```

### 4. **$ref Validation**
- All `$ref` values must be fully qualified absolute URLs
- Must use base URL: `https://schemas.test.com/`
- Relative references are not allowed

**Examples:**
```json
// ✅ Valid
{
  "properties": {
	"content": {
	  "$ref": "https://schemas.test.com/objects/v1/object.schema.json"
	}
  }
}

// ❌ Invalid - relative reference
{
  "properties": {
	"content": {
	  "$ref": "../objects/v1/object.schema.json"
	}
  }
}

// ❌ Invalid - wrong base URL
{
  "properties": {
	"content": {
	  "$ref": "https://example.com/objects/v1/object.schema.json"
	}
  }
}
```

### 5. **Reference Resolution**
- Pre-loads all schemas before validation
- Resolves `$ref` references across multiple files
- Supports complex nested references
- Validates examples against resolved schemas

## Usage

### Environment Variables

**Required:**
- `SCHEMA_PATH` - Glob pattern for schema files to validate

**Optional:**
- `SCHEMA_VERSION` - Default schema version if not specified in `$schema` field (default: `draft2020`)

### Command Line

```bash
# Validate all schemas
SCHEMA_PATH="**/*.schema.json" node .github/scripts/validate-schemas.js

# Validate specific directory
SCHEMA_PATH="events/**/*.schema.json" node .github/scripts/validate-schemas.js

# Validate with specific default version
SCHEMA_PATH="**/*.schema.json" SCHEMA_VERSION="draft2019" node .github/scripts/validate-schemas.js
```

### PowerShell

```powershell
# Validate all schemas
$env:SCHEMA_PATH="**/*.schema.json"; node .github/scripts/validate-schemas.js

# Validate specific directory
$env:SCHEMA_PATH="events/**/*.schema.json"; node .github/scripts/validate-schemas.js
```

### NPM Scripts (package.json)

```bash
# Validate all schemas
npm run validate:all

# Validate events only
npm run validate:events

# Validate objects only
npm run validate:objects
```

## Output

The script provides detailed output for each schema file:

```
────────────────────────────────────────────────────────────────────

🔍 Found 7 schema file(s) to validate.
Loaded: https://schemas.test.com/objects/v1/object.schema.json
Loaded: https://schemas.test.com/events/v1/base-event.schema.json
...

────────────────────────────────────────────────────────────────────

Testing: events/v1/base-event.schema.json
Version: https://json-schema.org/draft/2020-12/schema
Naming: ✅ kebab-case
$id/$ref: ✅ valid
Schema: ✅ valid
Example #1: ✅ valid

────────────────────────────────────────────────────────────────────
```

### Error Example

```
Testing: objects/v1/BadFileName.schema.json
Version: https://json-schema.org/draft/2020-12/schema
Naming: ❌ not kebab-case
  - Path component "BadFileName.schema.json" is not in kebab-case
$id/$ref: ❌ invalid
  - $id "https://example.com/objects/v1/BadFileName.schema.json" does not use base URL "https://schemas.test.com/"
Schema: ❌ not valid
Error: strict mode: unknown keyword: "customField"
```

## Exit Codes

- `0` - All schemas validated successfully
- `1` - One or more schemas failed validation

## GitHub Actions Integration

The script is designed to work in CI/CD pipelines:

```yaml
- name: Validate Schemas
  env:
	SCHEMA_PATH: "**/*.schema.json"
  run: node .github/scripts/validate-schemas.js
```

## Dependencies

- **ajv** (v8+) - JSON Schema validator
  - `ajv/dist/2020` - Draft 2020-12 support
  - `ajv/dist/2019` - Draft 2019-09 support
  - `ajv` - Draft 7 support (default)
- **glob** - File pattern matching
- **fs** - File system operations (built-in)
- **path** - Path operations (built-in)

## Testing

### Automated Test Suite

Run the full test suite to verify validation rules work correctly:

```bash
cd .github/scripts/validate-schemas
npm test
```

The test suite validates:
- ✅ Valid files pass validation
- ❌ Invalid files fail validation with correct error messages

### Test Organization
- `tests/valid-*` - Files that should pass
- `tests/invalid-*` - Files that should fail
- `tests/nested-refs` - Cross-file reference tests

See `tests/README.md` for:
- Complete test documentation
- How to add new tests
- Current test results
- Known issues

### Manual Testing

See `tests/TEST_RESULTS.md` for comprehensive edge case testing results and examples.

## Configuration

### Base URL

The base URL is configured at the top of the script:

```javascript
const SCHEMA_BASE_URL = 'https://schemas.test.com/';
```

To use a different base URL, modify this constant.

### Schema Versions

The script automatically detects schema versions but can be configured with a default:

```javascript
const DEFAULT_VERSION = process.env.SCHEMA_VERSION || 'draft2020';
```

Supported versions:
- `draft2020` or `2020` → `ajv/dist/2020`
- `draft2019` or `2019` → `ajv/dist/2019`
- Any other value → `ajv` (Draft 7)
