# Meteora DAMM v2 CPI Program - Project Context

## Overview
Custom Anchor program that makes CPI (Cross-Program Invocation) calls to Meteora's DAMM v2 (Dynamic AMM) program. This enables external programs to interact with DAMM v2 pools for liquidity management and trading.

## Current Implementation Status

### Implemented Instructions (All Wrapped & Tested via CPI)
| Instruction | Description | SOL Wrapping |
|-------------|-------------|--------------|
| `initialize_pool` | Create new DAMM v2 pool with initial liquidity | Optional via `sol_amount` param |
| `initialize_customizable_pool` | Create customizable pools with explicit fee parameters | Optional via `sol_amount` param |
| `add_liquidity` | Add liquidity to an existing position | Optional via `sol_amount` param |
| `remove_liquidity` | Remove liquidity from a position (percentage-based in tests) | - |
| `remove_all_liquidity` | Remove all liquidity from a position | - |
| `swap` | Execute a swap on a DAMM v2 pool (legacy interface) | - |
| `swap2` | Advanced swap with modes (ExactIn, etc.) | - |
| `create_position` | Create a new position in an existing pool | - |
| `claim_position_fee` | Claim accumulated trading fees | - |
| `close_position` | Close a position and reclaim rent | - |
| `initialize_pool_with_sol` | Legacy - use `initialize_pool` with `sol_amount` instead | Yes |

### Remaining Instructions (Optional/Low Priority)
| Instruction | Priority | Notes |
|-------------|----------|-------|
| `initialize_pool_with_dynamic_config` | Low | For dynamic config pools (covered by customizable pool patterns) |
| `claim_reward` | Low | For reward claiming |

## Project Structure
```
meteora-damm-v2-cpi/
├── CLAUDE.md                    # This file
├── Anchor.toml
├── Cargo.toml
├── docker-run.sh                # Docker build environment
├── idls/
│   └── damm_v2.json             # DAMM v2 IDL for declare_program! macro
├── programs/
│   └── meteora-damm-v2-cpi/
│       └── src/
│           ├── lib.rs           # All instructions (flattened structure)
│           └── error.rs
└── tests/
    └── meteora-damm-v2-cpi.ts   # Integration tests
```

## Deployed Program
- **Program ID**: `GLpCLLYPGamw2F3bmEsNGGaNw2yYzH5NZhPfgFQ1qkgX`
- **Network**: Devnet

## Reference Programs
- **DAMM v2 Program ID**: `cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG`
- **Pool Authority**: `HLnpSz9h2S4hiLQ43rnSD9XkcUThA7B8hQMKmDaiTLcC`
- **Config Account**: `8CNy9goNQNLM4wtgRw528tUQGMKD3vSuFRZY2gLGLLvF`

## Key Implementation Pattern

All instructions are flattened in `lib.rs` (not separate module files) to avoid Anchor macro conflicts.

```rust
// declare_program! macro for external DAMM v2 IDL
declare_program!(damm_v2);

// CPI call pattern
let cpi_accounts = damm_v2::cpi::accounts::AddLiquidity { ... };
let cpi_ctx = CpiContext::new(amm_program, cpi_accounts);
damm_v2::cpi::add_liquidity(cpi_ctx, params)?;
```

### SOL Wrapping (WSOL)
Instructions that interact with WSOL pools support optional `sol_amount` parameter:
- If `token_b_mint` is WSOL and `sol_amount` is provided, the program will:
  1. Transfer SOL to the WSOL token account
  2. Call `sync_native` to update the WSOL balance
  3. Execute the main instruction

## Commands

### Build (use Docker container)
```bash
docker exec <container_id> anchor build
```

### Test
```bash
ANCHOR_PROVIDER_URL=https://api.devnet.solana.com \
ANCHOR_WALLET=/root/.config/solana/id.json \
npx ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts
```

### Deploy
```bash
docker exec <container_id> anchor deploy --provider.cluster devnet
```

## Test Results (All Passing)
```
✔ Program is deployed and accessible
✔ Creates test tokens and WSOL accounts
✔ Initializes a DAMM v2 pool via CPI (with automatic SOL wrapping)
✔ Adds liquidity to the pool (SDK-based liquidity calculations)
✔ Performs swaps via `swap` and `swap2` (CPI verification)
✔ Removes liquidity (percentage-based) and via `remove_all_liquidity`
✔ Claims position fees (CPI verification)
✔ Closes positions (CPI verification)
✔ Initializes a customizable pool (fee scheduler config)
✔ Combined workflows: claim + removeAll + close in single tx

All integration tests passing
```

## Pool PDA Derivation
```typescript
// Pool PDA seeds: ["pool", config, max(tokenA, tokenB), min(tokenA, tokenB)]
const maxKey = (a, b) => a.toBuffer().compare(b.toBuffer()) > 0 ? a : b;
const minKey = (a, b) => a.toBuffer().compare(b.toBuffer()) <= 0 ? a : b;

[poolPda] = PublicKey.findProgramAddressSync(
  [
    Buffer.from("pool"),
    CONFIG_ACCOUNT.toBuffer(),
    maxKey(tokenAMint, tokenBMint).toBuffer(),
    minKey(tokenAMint, tokenBMint).toBuffer(),
  ],
  DAMM_V2_PROGRAM_ID
);
```

## Dependencies
- `@meteora-ag/cp-amm-sdk` - For liquidity calculations (`getLiquidityDelta`, `getSqrtPriceFromPrice`)
- `@coral-xyz/anchor` - Anchor framework
- `@solana/spl-token` - SPL token operations
