# Core Concepts

I'm documenting the core concepts I'm learning to build a privacy-focused DeFi project.

## Anchor Framework
- Program structure (lib.rs, contexts, instructions)
- Account validation and constraints
- Error handling
- Testing with TypeScript

## CPI (Cross-Program Invocation)
- Calling Token Program for transfers
- Calling other Anchor programs
- PDA signing in CPI calls
- Passing accounts between programs

## SPL Token Program
- Token accounts vs regular accounts
- Mint authority and token authority
- Transferring tokens (not SOL)
- Token-2022 extensions

## PDAs
- Deriving program addresses
- PDA signing for CPI
- PDA-owned accounts
- Seeds and bumps

## Vault Patterns
- Deposit/withdraw flows
- State management
- Access control
- Multi-token support

## DeFi Integration
- Meteora DEX integration
- Raydium AMM calls
- Liquidity pool interactions
- Swap operations via CPI
