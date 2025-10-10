# Teams to Organizations Migration - Restore Instructions

Generated: 2025-10-10T06:38:50.687Z
Backup Path: /Users/paulchrisluke/Repos2025/preact-cloudflare-intake-chatbot/blawby-ai-chatbot/backups/migration-2025-10-10T06-38-50

## To Restore from Backup:

### Option 1: Full Restore (Recommended)
```bash
# Stop any running processes
# Remove current files
rm -rf worker src tests migrations scripts
rm -f package.json package-lock.json tsconfig.json vite.config.ts tailwind.config.js wrangler.toml eslint.config.js vitest.config.ts playwright.config.ts

# Restore from backup
cp -r /Users/paulchrisluke/Repos2025/preact-cloudflare-intake-chatbot/blawby-ai-chatbot/backups/migration-2025-10-10T06-38-50/* .

# Verify checksums
node scripts/verify-backup.js /Users/paulchrisluke/Repos2025/preact-cloudflare-intake-chatbot/blawby-ai-chatbot/backups/migration-2025-10-10T06-38-50
```

### Option 2: Git Restore (if git stash was created)
```bash
# Restore git state
git stash pop

# Or list stashes to find the right one
git stash list
git stash apply stash@{N}
```

### Option 3: Selective Restore
```bash
# Restore specific files
cp /Users/paulchrisluke/Repos2025/preact-cloudflare-intake-chatbot/blawby-ai-chatbot/backups/migration-2025-10-10T06-38-50/worker/routes/teams.ts worker/routes/teams.ts
cp /Users/paulchrisluke/Repos2025/preact-cloudflare-intake-chatbot/blawby-ai-chatbot/backups/migration-2025-10-10T06-38-50/worker/services/TeamService.ts worker/services/TeamService.ts
# ... add more files as needed
```

## Verification Commands:
```bash
# Check git status
git status

# Run tests
npm test

# Check TypeScript compilation
npm run build
```

## Backup Details:
- Backup created: 2025-10-10T06:38:50.687Z
- Git stash: teams-to-organizations-migration-backup-2025-10-10T06-38-50
- Files backed up: See manifest.json for details
