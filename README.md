# Anchor & Solana Learning

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

### 1. [My First Anchor Program](./my-first-anchor-program/)

Basic Anchor program to get familiar with the framework:
- SOL transfers (deposit/withdraw)
- PDA basics
- Account initialization
- Simple CPI to System Program

**Status**: ✅ Done

### 2. [Token Vault Practice](./token-vault-practice/)

Token vault with PDA management:
- SPL token transfers via CPI
- PDA token account creation
- Associated token accounts
- Token Program integration

**Status**: ✅ Done

### 3. [Token-2022 Vault Practice](./token22-vault-practice/)

Token-2022 integration (upgraded SPL Token program):
- Token-2022 mints and accounts
- CPI calls to Token-2022 program
- InterfaceAccount for generic token support
- Automatic PDA token account creation

**Status**: ✅ Done

### 4. Next Steps

Planning to build:
- **Escrow program** - Multi-party token escrow
- **Liquidity pool integration** - CPI calls to Meteora/Raydium
- **Privacy features** - Token mixing, confidential transfers
- **Full DeFi protocol** - Combining everything above

## What I'm Learning

### Core Concepts

**Anchor Framework**
- Program structure (lib.rs, contexts, instructions)
- Account validation and constraints
- Error handling
- Testing with TypeScript

**CPI (Cross-Program Invocation)**
- Calling Token Program for transfers
- Calling other Anchor programs
- PDA signing in CPI calls
- Passing accounts between programs

**SPL Token Program**
- Token accounts vs regular accounts
- Mint authority and token authority
- Transferring tokens (not SOL)
- Token-2022 extensions

**PDAs**
- Deriving program addresses
- PDA signing for CPI
- PDA-owned accounts
- Seeds and bumps

**Vault Patterns**
- Deposit/withdraw flows
- State management
- Access control
- Multi-token support

**DeFi Integration**
- Meteora DEX integration
- Raydium AMM calls
- Liquidity pool interactions
- Swap operations via CPI

## Setup

### Prerequisites

- Rust (stable)
- Solana CLI
- Anchor CLI (0.32.1)
- Node.js
- Docker (optional)

### Quick Start

```bash
# Clone and navigate to a project
cd my-first-anchor-program
# or
cd token-vault-practice

# Build
anchor build

# Test
anchor test

# Deploy to devnet
anchor deploy --provider.cluster devnet
```

Each project has its own README with specific setup instructions.

## Learning Resources

- [LEARNING_ROADMAP.md](./LEARNING_ROADMAP.md) - My learning path
- [Anchor Docs](https://www.anchor-lang.com/) - Official Anchor documentation
- [Solana Cookbook](https://solanacookbook.com/) - Common patterns and examples
- [SPL Token Docs](https://spl.solana.com/token) - Token program reference
- [Meteora Docs](https://docs.meteora.ag/) - Meteora DEX integration
- [Raydium Docs](https://docs.raydium.io/) - Raydium AMM docs

## Notes

Check the `notes/` directory for my learning notes and summaries. The `LEARNING_GUIDES/` folder has detailed guides on specific topics.

## Current Status

**Completed:**
- ✅ Basic Anchor program structure
- ✅ SOL transfers and PDAs
- ✅ SPL token transfers
- ✅ PDA token account management
- ✅ Token-2022 integration

**In Progress:**
- 🔄 Escrow patterns
- 🔄 DeFi protocol integration

**Next:**
- ⏳ Privacy-focused features
- ⏳ Full protocol implementation

---

This is a work in progress. I'm learning as I build. If you find this useful, feel free to fork and adapt it for your own learning.
