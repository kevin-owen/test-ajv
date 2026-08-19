# Validation Updates Summary

## Changes Made

### 1. **Stricter File Extension Validation** ✅
**Change:** Schema files must end with exactly `.schema.json` - no other dots allowed in filenames.

**Before:**
- ✅ Allowed: `file.test.schema.json`, `my.file.schema.json`
- Pattern: Multiple dot-separated extensions were allowed

**After:**
- ✅ Allowed: `base-event.schema.json`, `my-object-123.schema.json`
- ❌ Not Allowed: `file.test.schema.json`, `my.file.schema.json`
- Pattern: Only `.schema.json` extension, filename must be pure kebab-case

**Implementation:**
```javascript
function isKebabCase(name) {
  // Check if it's a schema file
  if (name.endsWith('.schema.json')) {
	const nameWithoutExt = name.slice(0, -'.schema.json'.length);
	// Name part (before .schema.json) must be kebab-case without any dots
	return /^[a-z][a-z0-9-]*$/.test(nameWithoutExt) && 
		   !nameWithoutExt.includes('--');
  }

  // For folders, standard kebab-case (no dots)
  return /^[a-z][a-z0-9-]*$/.test(name) && !name.includes('--');
}
```

---

### 2. **Hidden Folder Support** ✅
**Change:** Skip validation of hidden folders (starting with `.`) like `.github`

**Before:**
- ❌ `.github` would fail kebab-case validation

**After:**
- ✅ `.github`, `.vscode`, etc. are automatically skipped

**Implementation:**
```javascript
// Skip empty parts, current directory marker, parent directory marker, and hidden folders
if (!part || part === '.' || part === '..' || part.startsWith('.')) continue;
```

---

### 3. **Relative Path Normalization** ✅
**From Previous Update:** Already working correctly
- Handles `../` parent directory references
- Normalizes paths before comparing to `$id`

---

## Test Files Updated

### Renamed:
1. **`multiple-extensions.test.schema.json`** → **`multiple-extensions-test.schema.json`**
   - Reason: Multiple dots no longer allowed in filenames
   - Updated `$id` to match new filename

### Added:
2. **`file.with.dots.schema.json`** ❌ (Invalid test case)
   - Purpose: Test that files with dots in the name fail validation
   - Expected: `Naming: ❌ not kebab-case`

---

## Test Results

### ✅ Valid Files Pass:
```
Testing: events\v1\base-event.schema.json
Naming: ✅ kebab-case
$id/$ref: ✅ valid
```

### ❌ Invalid Files Caught:
```
Testing: .github\scripts\tests\invalid-naming\file.with.dots.schema.json
Naming: ❌ not kebab-case
  - Path component "file.with.dots.schema.json" is not in kebab-case
```

---

## Updated Documentation

### Files Updated:
1. **`SCHEMA_RULES.md`** - Quick reference guide
   - Added rule about `.schema.json` extension
   - Added examples of invalid dot usage

2. **`.github/scripts/README.md`** - Full documentation
   - Updated naming convention rules
   - Updated examples

---

## Validation Rules Summary

### File Naming Rules:
1. ✅ Starts with lowercase letter
2. ✅ Contains only lowercase letters, numbers, and hyphens
3. ✅ No consecutive hyphens (`--`)
4. ✅ **Must end with `.schema.json` (no other dots)**
5. ✅ Folders must be kebab-case (no dots)

### Valid Examples:
- `base-event.schema.json`
- `my-object-123.schema.json`
- `derived-event.schema.json`
- Folder: `v1`, `events`, `objects`

### Invalid Examples:
- `file.test.schema.json` ❌ (dot before `.schema.json`)
- `my.file.schema.json` ❌ (dot in filename)
- `BaseEvent.schema.json` ❌ (uppercase)
- `my_object.schema.json` ❌ (underscore)
- `file--name.schema.json` ❌ (double hyphen)

---

## Impact

### Breaking Change: ⚠️
Files with dots in their names (before `.schema.json`) will now fail validation:
- `feature.v2.schema.json` ❌ → Use `feature-v2.schema.json` ✅
- `user.profile.schema.json` ❌ → Use `user-profile.schema.json` ✅

### Migration:
If you have existing schemas with dots in filenames:
1. Rename files to use hyphens instead of dots
2. Update `$id` field to match new filename
3. Update any `$ref` references to the renamed file

---

## Commands to Test

```powershell
# Test valid file
$env:SCHEMA_PATH="events/v1/base-event.schema.json"; node .github/scripts/validate-schemas.js

# Test invalid file with dots
$env:SCHEMA_PATH=".github/scripts/tests/invalid-naming/file.with.dots.schema.json"; node .github/scripts/validate-schemas.js

# Test all schemas
$env:SCHEMA_PATH="**/*.schema.json"; node .github/scripts/validate-schemas.js
```

---

## Summary

✅ **Stricter extension validation** - Only `.schema.json` allowed  
✅ **Hidden folder support** - `.github` and other dot-folders skipped  
✅ **Relative paths handled** - `../` normalized correctly  
✅ **Documentation updated** - All guides reflect new rules  
✅ **Test cases added** - Invalid dot usage tested  

All validation rules now enforce a consistent, predictable naming scheme! 🎉
