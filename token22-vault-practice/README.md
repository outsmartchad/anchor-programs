# Token-2022 Vault Practice

Learning Token-2022 program integration with Anchor. This project demonstrates how to work with Token-2022 (the upgraded SPL Token program) instead of the legacy Token program.

## What's Token-2022?

Token-2022 is an upgraded version of the SPL Token program with additional features:
- **Extensions**: Transfer fees, confidential transfers, interest-bearing tokens, etc.
- **Backward compatible**: Can work alongside regular SPL tokens
- **More features**: Better for privacy-focused and advanced DeFi applications

## Key Differences from Regular Token Program

### In Code

**Regular Token:**
```rust
use anchor_spl::token::{Mint, Token, TokenAccount};
```

**Token-2022:**
```rust
use anchor_spl::token_2022::{Mint, Token2022, TokenAccount};
```

### Program IDs

- **Token Program**: `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA`
- **Token-2022 Program**: `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`

## Project Structure

```
token22-vault-practice/
├── programs/
│   └── token22-vault-practice/
│       └── src/
│           ├── lib.rs              # Main program
│           ├── contexts.rs         # Account validation (uses Token2022)
│           ├── state.rs            # Token22Vault state
│           ├── errors.rs           # Custom errors
│           └── instructions/
│               └── deposit.rs      # Token-2022 transfers
└── tests/
    └── token22-vault-practice.ts   # Tests
```

## Features

- Initialize vault for Token-2022 mints
- Deposit Token-2022 tokens to vault
- PDA token account management
- CPI calls to Token-2022 program

## Setup

```bash
# Build
anchor build

# Test
anchor test

# Deploy to devnet
anchor deploy --provider.cluster devnet
```
