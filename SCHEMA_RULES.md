# JSON Schema Validation Rules - Quick Reference

## ✅ Valid Schema Checklist

### File Naming
- [ ] Use kebab-case: `my-schema.schema.json`
- [ ] Lowercase only
- [ ] Single hyphens (not double `--`)
- [ ] No underscores
- [ ] Start with a letter

### $id Field
- [ ] Fully qualified URL: `https://schemas.test.com/path/to/file.schema.json`
- [ ] Uses base URL: `https://schemas.test.com/`
- [ ] Matches file path exactly
- [ ] Not relative

### $ref Fields
- [ ] Fully qualified URLs only
- [ ] Uses base URL: `https://schemas.test.com/`
- [ ] No relative references like `../other.schema.json`

### Schema Structure
- [ ] Valid JSON syntax
- [ ] Includes `$schema` field
- [ ] Has `examples` array
- [ ] Examples validate against schema

---

## ❌ Common Mistakes

| ❌ Wrong | ✅ Right | Rule |
|---------|---------|------|
| `MySchema.json` | `my-schema.schema.json` | kebab-case |
| `my_schema.json` | `my-schema.schema.json` | No underscores |
| `my--schema.json` | `my-schema.schema.json` | No double hyphens |
| `SCHEMA/file.json` | `schema/file.json` | Lowercase only |
| `"$id": "file.json"` | `"$id": "https://schemas.test.com/path/file.json"` | Fully qualified |
| `"$id": "https://example.com/..."` | `"$id": "https://schemas.test.com/..."` | Correct base URL |
| `"$ref": "../other.json"` | `"$ref": "https://schemas.test.com/path/other.json"` | Absolute URLs |

---

## 📋 File Structure Template

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://schemas.test.com/[folder]/[version]/[name].schema.json",
  "title": "Descriptive Title",
  "description": "What this schema represents",
  "type": "object",
  "properties": {
	"id": {
	  "description": "Unique identifier",
	  "type": "string"
	}
  },
  "required": ["id"],
  "examples": [
	{
	  "id": "example-value"
	}
  ]
}
```

---

## 🔗 Reference Examples

### Schema with $ref
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://schemas.test.com/events/v1/derived-event.schema.json",
  "allOf": [
	{
	  "$ref": "https://schemas.test.com/events/v1/base-event.schema.json"
	}
  ],
  "properties": {
	"content": {
	  "$ref": "https://schemas.test.com/objects/v1/object.schema.json"
	}
  }
}
```

### Nested $refs
```json
{
  "properties": {
	"items": {
	  "type": "array",
	  "items": {
		"$ref": "https://schemas.test.com/objects/v1/item.schema.json"
	  }
	}
  }
}
```

---

## 🧪 Testing Your Schema

1. **File location vs $id must match:**
   ```
   File: events/v1/my-event.schema.json
   $id:  https://schemas.test.com/events/v1/my-event.schema.json
   ```

2. **All path components must be kebab-case:**
   ```
   ✅ events/v1/my-event.schema.json
   ❌ Events/v1/MyEvent.schema.json
   ```

3. **References must be absolute:**
   ```json
   ✅ "$ref": "https://schemas.test.com/objects/v1/object.schema.json"
   ❌ "$ref": "../objects/v1/object.schema.json"
   ❌ "$ref": "object.schema.json"
   ```

---

## 🚀 Quick Validation

```bash
# PowerShell
$env:SCHEMA_PATH="**/*.schema.json"; node .github/scripts/validate-schemas.js

# Or use NPM script
npm run validate:all
```

---

## 📖 More Information

- Full documentation: `.github/scripts/README.md`
- Test results: `tests/TEST_RESULTS.md`
- Validation summary: `VALIDATION_SUMMARY.md`
