# Escrow Program

A token escrow program built with Anchor framework on Solana. Enables trustless token swaps between two parties.

## Program ID

**Devnet:** `Gxqbvq5HqLVN3Rom9wBTC5jCtrwA92KiqoEKWxt3k9hL`

## Overview

This escrow program allows two parties to swap different SPL tokens without requiring trust:

1. **Initializer** creates an escrow and deposits Token A
2. **Taker** can either:
   - Complete the exchange by sending Token B (receiving Token A)
   - Or the Initializer can cancel and reclaim their tokens

## Instructions

| Instruction | Description |
|-------------|-------------|
| `initialize` | Create escrow, deposit Token A into vault |
| `cancel` | Refund tokens to initializer, close escrow |
| `exchange` | Taker sends Token B, receives Token A, escrow closes |

## Account Structure

### Escrow Account
```rust
pub struct Escrow {
    pub seed: u64,           // Random seed for PDA
    pub bump: u8,            // PDA bump
    pub initializer: Pubkey, // Escrow creator
    pub mint_a: Pubkey,      // Token A mint
    pub mint_b: Pubkey,      // Token B mint
    pub initializer_amount: u64, // Amount of Token A deposited
    pub taker_amount: u64,   // Expected amount of Token B
}
```

## How It Works

```
┌─────────────┐                    ┌─────────────┐
│ Initializer │                    │    Taker    │
└──────┬──────┘                    └──────┬──────┘
       │                                  │
       │ 1. initialize()                  │
       │ (deposits Token A)               │
       ▼                                  │
┌─────────────┐                           │
│   Escrow    │◄──────────────────────────┤
│   + Vault   │  2. exchange()            │
│  (Token A)  │  (sends Token B)          │
└──────┬──────┘                           │
       │                                  │
       │ Token A ──────────────────────►  │
       │ Token B ◄──────────────────────  │
       │                                  │
       ▼                                  ▼
   Receives                          Receives
   Token B                           Token A
```

## Development

### Prerequisites

- Docker
- Solana wallet at `~/.config/solana/id.json`

### Build

```bash
# Build Docker image (run once from anchor-learning root)
docker build -t anchor-builder:latest -f Dockerfile .

# Start container
./docker-run.sh

# Inside container
anchor build
```

### Deploy

```bash
# Inside container
anchor deploy --provider.cluster devnet
```

### Test

```bash
# Inside container
anchor test --skip-deploy --skip-local-validator --provider.cluster devnet
```

### Upgrade

```bash
anchor upgrade target/deploy/escrow_program.so \
  --program-id Gxqbvq5HqLVN3Rom9wBTC5jCtrwA92KiqoEKWxt3k9hL \
  --provider.cluster devnet
```

## Project Structure

```
escrow-program/
├── Anchor.toml
├── Cargo.toml
├── Dockerfile
├── docker-run.sh
├── package.json
├── programs/escrow-program/src/
│   ├── lib.rs                 # Program entrypoint
│   ├── states/
│   │   └── escrow.rs          # Escrow account structure
│   └── contexts/
│       ├── initialize.rs      # Initialize instruction
│       ├── cancel.rs          # Cancel instruction
│       └── exchange.rs        # Exchange instruction
└── tests/
    └── escrow-program.ts      # Integration tests
```

## References

- Based on [paulx Escrow tutorial](https://paulx.dev/blog/2021/01/14/programming-on-solana-an-introduction/)
- [Anchor Escrow Reference](https://github.com/ironaddicteddog/anchor-escrow)
