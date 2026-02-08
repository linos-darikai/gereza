# Security Advisory: Exposed API Keys in dianabrunch Branch

⚠️ **INTERNAL ONLY** - Do not share this document publicly until remediation is complete.

## Summary

API keys were exposed in the git history of the `dianabrunch` branch.

## Affected Credentials

The following credentials were exposed in the git history:
- **GEMINI_API_KEY**: Exposed in `backend/.env`
- **REMOVE_BG_API_KEY**: Exposed in `backend/.env`

## Required Actions

### 1. Revoke/Rotate Exposed Keys (CRITICAL)

The exposed API keys should be considered compromised. Please:

1. **Gemini API Key**: Go to [Google AI Studio](https://aistudio.google.com/apikey) or Google Cloud Console. **Immediately revoke the exposed key**, then generate a new one.

2. **RemoveBG API Key**: Go to [remove.bg Account Settings](https://www.remove.bg/dashboard). **Immediately revoke/regenerate** your API key.

### 2. Remove Sensitive Data from Git History

To completely remove the exposed keys from git history, use one of these tools:

#### Option A: Using BFG Repo-Cleaner (Recommended)

Download BFG from the [official releases page](https://rtyley.github.io/bfg-repo-cleaner/) and verify the download.

```bash
# Clone a fresh copy of the repo
git clone --mirror https://github.com/linos-darikai/gereza.git

# Run BFG to remove sensitive files
java -jar bfg-1.14.0.jar --delete-files .env gereza.git

# Clean up and push
cd gereza.git
git reflog expire --expire=now --all && git gc --prune=now --aggressive
git push --force
```

#### Option B: Using git filter-repo
```bash
pip install git-filter-repo

# Clone fresh and remove sensitive file from history
git clone https://github.com/linos-darikai/gereza.git
cd gereza
git filter-repo --invert-paths --path backend/.env
git push --force
```

### 3. Delete the Compromised Branch

After cleaning history or as an alternative:
```bash
git push origin --delete dianabrunch
```

## Prevention

This repository now includes:
- Root-level `.gitignore` that excludes `.env` files
- `backend/.gitignore` already excludes `.env` files

Always use `.env.example` files to document required environment variables without exposing actual values.
