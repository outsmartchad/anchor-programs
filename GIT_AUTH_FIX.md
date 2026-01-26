# Git Authentication Fix

## Problem
Git push was failing with "Authentication failed" error when using HTTPS.

## Solution Applied
✅ Switched remote URL from HTTPS to SSH:
- **Before**: `https://github.com/outsmartchad/anchor-programs.git`
- **After**: `git@github.com:outsmartchad/anchor-programs.git`

## Verification
SSH authentication is working:
```
Hi outsmartchad/pumpswap-sdk! You've successfully authenticated
```

## Now You Can Push
```bash
cd /root/anchor-learning
git push
```

## If Push Still Fails

### Option 1: Use SSH (Already Done)
The remote is now configured to use SSH, which should work.

### Option 2: Use Personal Access Token (If SSH doesn't work)
1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate a new token with `repo` scope
3. Use it as password when pushing:
   ```bash
   git remote set-url origin https://github.com/outsmartchad/anchor-programs.git
   git push
   # Username: outsmartchad
   # Password: <your-personal-access-token>
   ```

### Option 3: Configure Git Credential Helper
```bash
git config --global credential.helper store
# Then push and enter credentials once
```

## Current Configuration
- **Remote URL**: `git@github.com:outsmartchad/anchor-programs.git` (SSH)
- **SSH Key**: `/root/.ssh/id_ed25519_github.pub`
- **Authentication**: ✅ Working
