# Reference Configurations

This directory contains reference and example configurations for the application. These files serve as:

1. **Documentation** - Examples of valid configuration structures
2. **Development Templates** - Starting points for new team setups
3. **Testing References** - Known-good configurations for testing
4. **Schema Validation** - Examples that match the expected API schema

## Important Notes

- These files are **examples only** and not active configurations
- The source of truth is always the API/database
- Use these as templates, not as production configurations
- When the API schema changes, these examples should be updated to match

## Directory Structure

- `/examples` - Example configurations for different use cases
  - `/teams` - Team configuration examples
    - Each file represents a possible team configuration template

## Usage

1. **Local Development**:
   ```bash
   # Copy an example config for local development
   cp reference/examples/teams/basic-legal-service.json configs/my-team-config.json
   ```

2. **Creating New Teams**:
   ```bash
   # Use example as template for new team
   node scripts/update-team-config.js NEW_TEAM_ID reference/examples/teams/basic-legal-service.json
   ```

3. **Schema Validation**:
   ```bash
   # Validate your config against examples
   node scripts/validate-team-config.js my-config.json
   ```

## Maintaining Examples

When making changes to the API or schema:

1. Update relevant example files
2. Run validation tests
3. Document any new fields or requirements
4. Keep examples minimal but complete
