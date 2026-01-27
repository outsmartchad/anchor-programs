# Anchor & Solana Program Development Learning

Learning Anchor and basics of solana program to build a privacy-focused DeFi project. This repo tracks my progress and practice projects.

## Goal

Build a privacy-focused DeFi project. To get there, I need to master:

- **Anchor basics** - Writing programs, accounts, instructions
- **CPI calls** - Calling other on-chain programs (Token Program, DeFi protocols)
- **SPL/Token-2022** - Token transfers, minting, token accounts
- **PDAs** - Program Derived Addresses for program-owned accounts
- **Vaults** - Managing token deposits/withdrawals
- **Escrow** - Holding tokens until conditions are met
- **Liquidity Pools** - Understanding AMM mechanics
- **DeFi Integration** - Interacting with Meteora, Raydium, and other protocols

## Projects

Check out [PROJECTS.md](./PROJECTS.md) for a list of projects I've built and their status.

### Recent Projects

- **[Meteora DAMM v2 CPI](./meteora-damm-v2-cpi/)** - Complete CPI wrapper for Meteora's DAMM v2 protocol with automatic SOL wrapping
- **[Escrow Program](./escrow-program/)** - Trustless token swap escrow
- **[Token-2022 Vault](./token22-vault-practice/)** - Token-2022 vault with PDA management

## What I'm Learning

Check out [LEARNING.md](./LEARNING.md) for a detailed list of core concepts and topics I'm mastering.

## Setup

### Prerequisites

- Rust (stable)
- Solana CLI
- Anchor CLI (0.32.1)
- Node.js
- Docker (optional)

### Quick Start (Docker Workflow)

All projects are set up with Docker for a consistent environment.

1. **Build the Docker Image** (Run once from any project directory)
   ```bash
   # Navigate to any project folder (they all have the same Dockerfile)
   cd token22-vault-practice
   docker build -t anchor-builder:latest -f Dockerfile .
   ```

2. **Start the Container**
   ```bash
   # Navigate to your chosen project (e.g., token22-vault-practice)
   cd token22-vault-practice
   
   # Run the container
   ./docker-run.sh
   ```

3. **Inside the Container**
   ```bash
   # 1. Install dependencies
   npm install

   # 2. Build the program
   anchor build

   # 3. Deploy & Test (Default)
   # Deploys to configured cluster (devnet) and runs tests
   anchor test

   # 4. Test Only (Faster)
   # Skips deployment (use if program is already deployed)
   anchor test --skip-deploy --skip-local-validator

   # 5. Upgrade Program (if code changed)
   # Upgrades the on-chain program without changing the Program ID
   # Replace <PROGRAM_ID> with the address from Anchor.toml
   anchor upgrade target/deploy/program_name.so --program-id <PROGRAM_ID> --provider.cluster devnet
   ```

Each project has its own README with specific setup instructions.

## Learning Resources

- [LEARNING_ROADMAP.md](./LEARNING_ROADMAP.md) - My learning path
- [Anchor Docs](https://www.anchor-lang.com/) - Official Anchor documentation
- [Solana Cookbook](https://solanacookbook.com/) - Common patterns and examples
- [SPL Token Docs](https://spl.solana.com/token) - Token program reference
- [Meteora Docs](https://docs.meteora.ag/) - Meteora DEX integration
- [Anchor Escrow Reference](https://github.com/ironaddicteddog/anchor-escrow) - Escrow program implemented in Anchor

## Notes

Check the `notes/` directory for my learning notes and summaries. The `LEARNING_GUIDES/` folder has detailed guides on specific topics.

## Current Status

**Completed:**
- ✅ Basic Anchor program structure
- ✅ SOL transfers and PDAs
- ✅ SPL token transfers
- ✅ PDA token account management
- ✅ Token-2022 integration
- ✅ Escrow program (token swaps between two parties)
- ✅ Meteora DAMM v2 CPI integration (pool initialization, liquidity management, swaps)

**In Progress:**
- 🔄 Advanced DeFi integrations

**Next:**
- ⏳ Privacy-focused features
- ⏳ Full protocol implementation

---

This is a work in progress. I'm learning as I build. If you find this useful, feel free to fork and adapt it for your own learning.
