In CLOUDFLARE_WORKERS_AI_ANALYSIS.md around lines 94 to 98, the status list
incorrectly marks "Rate Limiting" as not implemented; update the documentation
to reflect that Rate Limiting has been implemented per
UPGRADE_IMPLEMENTATION_SUMMARY.md by changing the bullet to show implemented
(e.g., ✅ Implemented) and optionally add a one-line note linking to
UPGRADE_IMPLEMENTATION_SUMMARY.md or the implemented rate-limiting mechanism for
traceability.

In CLOUDFLARE_WORKERS_AI_ANALYSIS.md around lines 191 to 192, the section still
indicates "Retry Logic: ❌ Not implemented" and "Circuit Breakers: ❌ Not
implemented" despite retry logic with exponential backoff having been
implemented; update the retry logic entry to reflect implementation (e.g.,
change to "Retry Logic: ✅ Implemented — exponential backoff" and add a short
note or pointer to UPGRADE_IMPLEMENTATION_SUMMARY.md or the specific code
location for details), leaving the circuit breaker entry unchanged if it is
still not implemented.

In env.example around lines 41 to 44, there are duplicate CLOUDFLARE_ACCOUNT_ID
and CLOUDFLARE_API_TOKEN entries also present earlier (lines 2-3); consolidate
by removing the redundant AI-specific duplicate or rename the AI-specific
variables (e.g., CLOUDFLARE_AI_ACCOUNT_ID and CLOUDFLARE_AI_API_TOKEN) and
update any references/docs accordingly so only one canonical set of Cloudflare
credentials is used or clearly separated for AI usage.

In package.json around line 23, the dependency additions for tesseract-wasm
v0.10.0 and pdfjs-dist v4.6.82 may be incompatible with Cloudflare Workers;
update the Worker build and deployment: switch tesseract-wasm to the
single-threaded/browser Wasm build, load trained-data via fetch/ArrayBuffer (no
fs/WASI), optimize or lazy-load the Wasm binary and ensure only standard
WebAssembly APIs are used; for pdfjs-dist avoid the stock ESM top-level-await
entry—transpile or replace with a Workers-compatible wrapper (e.g.
pdfjs-serverless), configure wasmUrl/iccUrl to fetchable asset URLs and import
only core parsing modules (no DOM/viewer or Node entry points); update
wrangler.toml to a recent compatibility_date and set nodejs_compat = true, then
deploy to a Workers preview and run full integration tests to surface any
remaining Node or top-level-await incompatibilities.

In scripts/setup-cloudflare-ai.sh around lines 27-28, the read -s call hides
typing but leaves the entered token visible in the terminal line/scrollback;
after reading the token overwrite and clear that terminal line (for example by
printing a carriage return and the terminal clear-sequence such as printf
'\r\033[K' or using tput) so the token is removed from view, then print a
neutral confirmation message and ensure the variable is unset as soon as it's no
longer needed (unset API_TOKEN) to avoid leaving sensitive data in environment.

worker/services/AIService.ts
Comment on lines +66 to +86
    console.log('Returning default team config');
    return {
      requiresPayment: false,
      consultationFee: 0,
      paymentLink: null,
      availableServices: [
        'Family Law',
        'Employment Law',
        'Business Law',
        'Intellectual Property',
        'Personal Injury',
        'Criminal Law',
        'Civil Law',
        'Tenant Rights Law',
        'Probate and Estate Planning',
        'Special Education and IEP Advocacy',
        'Small Business and Nonprofits',
        'Contract Review',
        'General Consultation'
      ]
    };
@coderabbitai coderabbitai bot 11 minutes ago
🛠️ Refactor suggestion

Default team config should be externalized for maintainability

The hardcoded list of available services in the default team config makes it difficult to maintain and update across the codebase. This list appears to be duplicated in multiple places.

Extract the default configuration to a shared constant:

+// Add at the top of the file or in a separate config file
+const DEFAULT_TEAM_CONFIG: TeamConfig = {
+  requiresPayment: false,
+  consultationFee: 0,
+  paymentLink: null,
+  availableServices: [
+    'Family Law',
+    'Employment Law',
+    'Business Law',
+    'Intellectual Property',
+    'Personal Injury',
+    'Criminal Law',
+    'Civil Law',
+    'Tenant Rights Law',
+    'Probate and Estate Planning',
+    'Special Education and IEP Advocacy',
+    'Small Business and Nonprofits',
+    'Contract Review',
+    'General Consultation'
+  ]
+};
+
 // In the getTeamConfig method
     console.log('Returning default team config');
-    return {
-      requiresPayment: false,
-      consultationFee: 0,
-      paymentLink: null,
-      availableServices: [
-        'Family Law',
-        'Employment Law',
-        'Business Law',
-        'Intellectual Property',
-        'Personal Injury',
-        'Criminal Law',
-        'Civil Law',
-        'Tenant Rights Law',
-        'Probate and Estate Planning',
-        'Special Education and IEP Advocacy',
-        'Small Business and Nonprofits',
-        'Contract Review',
-        'General Consultation'
-      ]
-    };
+    return DEFAULT_TEAM_CONFIG;
Consider moving this to a central configuration file that can be shared across the application.

In worker/utils/chunking.ts around lines 51 to 61, the getEmbedding function
needs input validation before calling the AI API: verify text is non-empty (not
null/undefined and not only whitespace) and enforce a maximum length (e.g.,
5k-10k chars) — if invalid, throw a descriptive Error; if too long, either
truncate to the max length or throw an Error depending on desired behavior; also
normalize whitespace (trim) before sending to env.AI.run so the API never
receives empty or excessively long input.

In worker/utils/retry.ts around lines 7 and 23, the variable lastError is
declared without initialization which makes the later non-null assertion unsafe;
change its declaration to allow undefined (e.g., type it as Error | undefined
and initialize to undefined) and replace the non-null assertion on line 23 with
a safe throw that uses lastError if set or a new Error fallback (e.g., throw
lastError ?? new Error('Retry failed after all attempts')) so you never rely on
an uninitialized value.

In worker/utils/chunking.ts around lines 23 to 45, the function currently strips
sentence-ending punctuation when splitting and reassembles text without
delimiters; update the logic to preserve sentence boundaries by including the
sentence delimiter (e.g., ".", "!", "?") with each sentence when building
chunks. Change the split to capture delimiters (or use a regex match that
returns sentences with their trailing delimiter and surrounding whitespace
trimmed), ensure trimmedSentence includes its delimiter before length checks,
and when concatenating to currentChunk account for the extra character so
maxChunkSize remains respected; push any remaining currentChunk at the end as
before.
