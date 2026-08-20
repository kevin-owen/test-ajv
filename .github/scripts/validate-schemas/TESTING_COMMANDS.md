# Quick Test Commands

## Running Tests

### Full Test Suite
```bash
cd .github/scripts/validate-schemas
npm test
```

### Manual Validation (Single File)
```bash
cd .github/scripts/validate-schemas
SCHEMA_PATH="../../../events/v1/base-event.schema.json" node validate-schemas.js
```

### Validate All Production Schemas
```bash
cd .github/scripts/validate-schemas
npm run validate
```

## Adding a New Test

### 1. Create test file in appropriate folder:
```bash
# For invalid test (should fail)
# .github/scripts/validate-schemas/tests/invalid-[category]/[filename].schema.json

# For valid test (should pass)
# .github/scripts/validate-schemas/tests/valid-[category]/[filename].schema.json
```

### 2. Set correct $id:
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://schemas.test.com/.github/scripts/validate-schemas/tests/[category]/[filename].schema.json",
  "title": "Test - [description]",
  "type": "object",
  "properties": {},
  "examples": [{}]
}
```

### 3. Run tests:
```bash
npm test
```

## Test Result Interpretation

### ✅ Test Passed
```
  ✅ my-test.schema.json
	 test description
```
- **Meaning:** Validation result matched expected outcome
- **For invalid-* folders:** Validation correctly failed
- **For valid-* folders:** Validation correctly passed

### ❌ Test Failed  
```
  ❌ my-test.schema.json
	 Expected: pass, Got: fail
	 test description
	 Error: Path component "..." is not in kebab-case
```
- **Meaning:** Validation result did NOT match expected outcome
- **For invalid-* folders:** Should have failed but passed
- **For valid-* folders:** Should have passed but failed

## Common Fixes

### Test file in valid-* folder is failing

**Cause:** Usually $id path doesn't match file location

**Fix:**
```json
// Before
"$id": "https://schemas.test.com/tests/valid-cases/file.schema.json"

// After  
"$id": "https://schemas.test.com/.github/scripts/validate-schemas/tests/valid-cases/file.schema.json"
```

### Test file in invalid-* folder is passing

**Cause:** The intentional error isn't being detected

**Fix:**
1. Check validation rules in `validate-schemas.js`
2. Verify the error is detectable
3. Update validation logic if needed

## CI/CD Integration

### GitHub Actions
```yaml
- name: Install Dependencies
  working-directory: .github/scripts/validate-schemas
  run: npm install

- name: Run Validation Tests
  working-directory: .github/scripts/validate-schemas
  run: npm test
```

### Exit Codes
- **0** - All tests passed
- **1** - One or more tests failed

## Debugging

### See full validation output
```bash
# Run validation directly (not through test runner)
cd .github/scripts/validate-schemas
SCHEMA_PATH="tests/valid-cases/object.schema.json" node validate-schemas.js
```

### Check specific test file
```javascript
// In test-validation.js, add console.log
console.log('Running test:', schemaPath);
console.log('Expected:', expectedOutcome);
console.log('Result:', result);
```

## Test Statistics

Run tests and check summary:
```bash
npm test | grep -A 5 "Test Summary"
```

Expected output:
```
  Test Summary
════════════════════════════════════════════════════════════
  Total Tests:  19
  Passed:       12
  Failed:       7
  Success Rate: 63.2%
```

## Documentation

- **tests/README.md** - Complete test documentation
- **TEST_SUITE_SUMMARY.md** - Implementation overview
- **validate-schemas/README.md** - Validation rules documentation
