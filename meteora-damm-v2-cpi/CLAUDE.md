# Meteora DAMM v2 CPI Program - Project Context

## Overview
Custom Anchor program that makes CPI (Cross-Program Invocation) calls to Meteora's DAMM v2 (Dynamic AMM) program. This enables external programs to interact with DAMM v2 pools for liquidity management and trading.

## Current Implementation Status

### Implemented Instructions
| Instruction | Status | File |
|-------------|--------|------|
| `add_liquidity` | Done | `src/instructions/add_liquidity.rs` |
| `remove_liquidity` | Done | `src/instructions/remove_liquidity.rs` |
| `swap` | Done | `src/instructions/swap.rs` |

### Remaining Instructions (Phase 2)
| Instruction | Priority |
|-------------|----------|
| `initialize_pool` | High |
| `initialize_pool_with_dynamic_config` | High |
| `initialize_customizable_pool` | High |
| `create_position` | High |
| `remove_all_liquidity` | High |
| `swap2` | High |
| `claim_position_fee` | Medium |
| `close_position` | Medium |

## Project Structure
```
meteora-damm-v2-cpi/
├── CLAUDE.md                    # This file
├── Anchor.toml
├── Cargo.toml
├── idls/
│   └── damm_v2.json             # DAMM v2 IDL for declare_program! macro
└── programs/
    └── meteora-damm-v2-cpi/
        └── src/
            ├── lib.rs           # Program entry point
            ├── damm_v2_interface.rs  # declare_program! for DAMM v2
            ├── error.rs
            └── instructions/
                ├── mod.rs
                ├── add_liquidity.rs
                ├── remove_liquidity.rs
                └── swap.rs
```

## Reference Codebases

### 1. Meteora DAMM v2 Source
- **Location**: `/root/damm-v2`
- **Program ID**: `cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG`
- **Pool Authority**: `HLnpSz9h2S4hiLQ43rnSD9XkcUThA7B8hQMKmDaiTLcC`

### 2. Dynamic Bonding Curve (CPI Reference)
- **Location**: `/root/dynamic-bonding-curve`
- **CPI Example**: `/root/dynamic-bonding-curve/programs/dynamic-bonding-curve/src/instructions/migration/dynamic_amm_v2/`

## Key Implementation Pattern

We use Anchor's `declare_program!` macro directly in the program (not as a separate library) to avoid macro conflicts:

```rust
// In damm_v2_interface.rs
use anchor_lang::prelude::*;
declare_program!(damm_v2);
pub use damm_v2::*;

// In instruction files
use crate::damm_v2_interface::damm_v2;

// CPI call pattern
let cpi_accounts = damm_v2::cpi::accounts::AddLiquidity { ... };
let cpi_ctx = CpiContext::new(amm_program, cpi_accounts);
damm_v2::cpi::add_liquidity(cpi_ctx, params)?;
```

## CPI Parameter Types

```rust
// Add/Remove Liquidity
AddLiquidityParameters / RemoveLiquidityParameters {
    liquidity_delta: u128,
    token_a_amount_threshold: u64,
    token_b_amount_threshold: u64,
}

// Swap
SwapParameters {
    amount_in: u64,
    minimum_amount_out: u64,
}
```

## Commands
- Build: `anchor build` (requires compatible Solana toolchain)
- Check: `cargo check`
- Test: `anchor test`

## Known Issues
- The Solana toolchain has glibc compatibility issues on this system
- Use `cargo check` for development verification
- For full builds, ensure compatible Solana/Rust toolchain
