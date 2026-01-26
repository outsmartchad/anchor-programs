# Git Push Permission Issue - Solution

## Problem
Both SSH keys (`vincent` and `id_ed25519_github`) are **deploy keys**, which are read-only. Deploy keys cannot push to repositories.

## Solution Options

### Option 1: Use Personal Access Token (HTTPS) - RECOMMENDED

1. **Create a Personal Access Token on GitHub:**
   - Go to: https://github.com/settings/tokens
   - Click "Generate new token" → "Generate new token (classic)"
   - Name it: "anchor-learning-push"
   - Select scope: `repo` (full control of private repositories)
   - Click "Generate token"
   - **Copy the token immediately** (you won't see it again)

2. **Push using the token:**
   ```bash
   cd /root/anchor-learning
   git push
   # When prompted:
   # Username: outsmartchad
   # Password: <paste-your-personal-access-token>
   ```

3. **The credentials will be saved** (credential helper is configured)

### Option 2: Add Personal SSH Key to GitHub

1. **Generate a new SSH key** (if you don't have a personal one):
   ```bash
   ssh-keygen -t ed25519 -C "chiwang1712@gmail.com" -f ~/.ssh/id_ed25519_personal
   ```

2. **Add the public key to GitHub:**
   ```bash
   cat ~/.ssh/id_ed25519_personal.pub
   # Copy the output
   ```
   - Go to: https://github.com/settings/keys
   - Click "New SSH key"
   - Paste the public key
   - Save

3. **Update SSH config to use the personal key:**
   ```bash
   # Edit ~/.ssh/config to prioritize the personal key
   ```

4. **Switch back to SSH:**
   ```bash
   git remote set-url origin git@github.com:outsmartchad/anchor-programs.git
   ```

## Current Status
- ✅ Git user configured: `outsmartchad <chiwang1712@gmail.com>`
- ✅ Remote switched to HTTPS: `https://github.com/outsmartchad/anchor-programs.git`
- ✅ Credential helper configured
- ⚠️ Need: Personal Access Token to push

## Quick Fix (Use Token)
```bash
cd /root/anchor-learning
git push
# Enter token when prompted for password
```
