# 🔐 SOPS Configuration for GitHub Actions

## Step 1: Retrieve your private age key

```bash
cat ~/Library/Application\ Support/sops/age/keys.txt
```

## Step 2: Add to GitHub Secrets

1. **GitHub → Settings → Secrets and variables → Actions**
2. **New repository secret**
3. Name: `SOPS_AGE_KEY`
4. Value: Paste your `keys.txt` content (starts with `AGE-SECRET-KEY-1...`)

## Files Management

- ✅ `.env.prod.enc`: Encrypted, safe for Git.
- ✅ `.sops.yaml`: SOPS configuration.
- ❌ `.env`: Ignored by Git (in `.gitignore`).

## Usage

```bash
# Decrypt
sops --decrypt --input-type dotenv --output-type dotenv .env.prod.enc > .env

# Encrypt after modification
sops --encrypt --input-type dotenv --output-type dotenv .env > .env.prod.enc
```