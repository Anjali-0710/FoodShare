## Automation Test Resources

This directory contains static test assets used by the automation framework.

### Contents

| File | Purpose |
|------|---------|
| `test_valid_image.jpg` | Small valid JPEG (< 1MB) used in TC_FILE_001, TC_FILE_003 |
| `test_large_file.bin` | Synthetic 25MB binary used in TC_FILE_002 (should be rejected by size guard) |
| `test_invalid.exe` | Invalid file type used in TC_FILE_004 |
| `sample_donation.json` | Canonical donation payload for data-driven test cases |
| `env.properties` | Local environment configuration overrides |
| `selector_map.json` | Centralized element selector registry for all Page Objects |

### Adding New Resources

1. Place test files here.
2. Reference via `path.resolve(__dirname, '../resources/<filename>')` in test code.
3. Update this README table accordingly.

### Notes

- Binary/image test assets are gitignored to keep repo size small.
- CI generates test_large_file.bin dynamically in the workflow before test execution.
- selector_map.json is the single source of truth for all Appium element locators.
