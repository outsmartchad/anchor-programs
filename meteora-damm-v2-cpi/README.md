# Meteora DAMM v2 CPI Program

A complete Anchor program that provides CPI (Cross-Program Invocation) integration with Meteora's DAMM v2 (Dynamic AMM) protocol. This enables external programs and protocols to interact with DAMM v2 pools for liquidity management and trading.

## Program ID

**Devnet:** `GLpCLLYPGamw2F3bmEsNGGaNw2yYzH5NZhPfgFQ1qkgX`

## Overview

This program acts as a wrapper around Meteora's DAMM v2 protocol, providing a clean interface for:
- Initializing pools with automatic SOL wrapping
- Adding/removing liquidity with automatic SOL wrapping
- Executing swaps
- Creating positions
- Managing liquidity positions

### Key Features

- ✅ **Automatic SOL Wrapping**: Handles SOL-to-WSOL conversion internally for pool initialization and liquidity operations
- ✅ **Type-Safe CPI Calls**: Uses Anchor's `declare_program!` macro for type-safe CPI interactions
- ✅ **Token-2022 Compatible**: Supports both SPL Token and Token-2022
- ✅ **Liquidity Calculations**: Uses Meteora SDK for accurate liquidity calculations from token amounts
- ✅ **Slippage Protection**: Built-in threshold parameters for all operations

## Instructions

| Instruction | Description | Status |
|-------------|-------------|--------|
| `initialize_pool` | Create a new DAMM v2 pool with initial liquidity | ✅ |
| `add_liquidity` | Add liquidity to an existing position | ✅ |
| `remove_liquidity` | Remove liquidity from a position | ✅ |
| `swap` | Execute a swap on a DAMM v2 pool | ✅ |
| `create_position` | Create a new position in an existing pool | ✅ |
| `initialize_pool_with_sol` | Initialize pool with automatic SOL wrapping (alternative) | ✅ |

## Architecture

### SOL Wrapping Integration

The program automatically handles SOL-to-WSOL conversion for operations involving WSOL:

1. **Transfer SOL** to WSOL token account (via System Program CPI)
2. **Sync Native** to update WSOL balance (via Token Program CPI)
3. **Execute DAMM v2 operation** (via DAMM v2 CPI)

This ensures atomic operations - all steps happen in a single transaction.

### Example: Initialize Pool with WSOL

```rust
// Client specifies desired token amounts
let token_a_amount = 1_000_000; // 1M tokens
let token_b_amount = 0.05;      // 0.05 WSOL

// Program automatically:
// 1. Calculates liquidity from amounts using Meteora SDK
// 2. Transfers SOL to WSOL account
// 3. Syncs native to update WSOL balance
// 4. Initializes pool with calculated liquidity
```

## Development

### Prerequisites

- Docker
- Solana wallet at `~/.config/solana/id.json`
- Node.js (for tests)

### Setup

1. **Build Docker Image** (if not already built):
   ```bash
   docker build -t anchor-builder:latest -f Dockerfile .
   ```

2. **Start Container**:
   ```bash
   ./docker-run.sh
   ```

3. **Inside Container**:
   ```bash
   # Install dependencies
   npm install

   # Build the program
   anchor build
   ```

### Deploy

```bash
# Deploy to devnet
anchor deploy --provider.cluster devnet
```

### Test

```bash
# Run all tests (deploys if needed)
anchor test --skip-local-validator

# Skip deployment (if already deployed)
anchor test --skip-deploy --skip-local-validator
```

### Upgrade

```bash
# Upgrade existing program
anchor upgrade target/deploy/meteora_damm_v2_cpi.so \
  --program-id GLpCLLYPGamw2F3bmEsNGGaNw2yYzH5NZhPfgFQ1qkgX \
  --provider.cluster devnet
```

## Usage Examples

### Initialize Pool

```typescript
// Specify desired token amounts
const tokenAAmount = 1_000_000; // 1M tokens
const tokenBAmount = 0.05;       // 0.05 WSOL

// Calculate liquidity using Meteora SDK
const liquidity = calculateLiquidityFromAmounts(
  connection,
  tokenAAmount,
  tokenBAmount,
  sqrtPrice,
  tokenADecimals,
  tokenBDecimals
);

// Initialize pool (SOL wrapping happens automatically)
await program.methods
  .initializePool(liquidity, sqrtPrice, null, solAmount)
  .accounts({...})
  .rpc();
```

### Add Liquidity

```typescript
// Specify desired amounts to add
const tokenAAmount = 100_000; // 100K tokens
const tokenBAmount = 0.01;    // 0.01 WSOL

// Calculate liquidity delta
const liquidityDelta = calculateLiquidityFromAmounts(...);

// Add liquidity (SOL wrapping happens automatically)
await program.methods
  .addLiquidity(liquidityDelta, thresholdA, thresholdB, solAmount)
  .accounts({...})
  .rpc();
```

### Remove Liquidity

```typescript
// Remove 50% of position liquidity
const removePercentage = 50;
const liquidityDelta = totalLiquidity.mul(50).div(100);

// DAMM v2 calculates exact token amounts to remove
await program.methods
  .removeLiquidity(liquidityDelta, 0, 0)
  .accounts({...})
  .rpc();
```

### Swap

```typescript
// Swap 10,000 tokens
const amountIn = new BN(10_000 * 10**9); // 10K tokens with 9 decimals
const minimumAmountOut = new BN(0); // No slippage protection for testing

await program.methods
  .swap(amountIn, minimumAmountOut)
  .accounts({...})
  .rpc();
```

## Project Structure

```
meteora-damm-v2-cpi/
├── Anchor.toml              # Anchor configuration
├── Cargo.toml               # Rust workspace dependencies
├── package.json             # Node.js dependencies
├── Dockerfile               # Docker build configuration
├── docker-run.sh            # Docker run script
├── README.md                # This file
├── idls/
│   └── damm_v2.json         # DAMM v2 IDL for declare_program!
├── programs/
│   └── meteora-damm-v2-cpi/
│       └── src/
│           ├── lib.rs        # Program entry point with all instructions
│           └── error.rs      # Custom error types
├── tests/
│   └── meteora-damm-v2-cpi.ts  # Integration tests
└── migrations/
    └── deploy.ts            # Deployment script
```

## Dependencies

### Rust Dependencies
- `anchor-lang = "0.32.0"` - Anchor framework
- `anchor-spl = "0.32.0"` - SPL token interfaces
- `@meteora-ag/cp-amm-sdk` - Meteora SDK for liquidity calculations

### TypeScript Dependencies
- `@coral-xyz/anchor = "^0.32.0"` - Anchor TypeScript client
- `@solana/spl-token = "^0.4.14"` - SPL token utilities
- `@meteora-ag/cp-amm-sdk` - Meteora SDK

## Key Constants

- **DAMM v2 Program ID**: `cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG`
- **Pool Authority**: `HLnpSz9h2S4hiLQ43rnSD9XkcUThA7B8hQMKmDaiTLcC`
- **Config Account**: `8CNy9goNQNLM4wtgRw528tUQGMKD3vSuFRZY2gLGLLvF` (devnet)

## Testing

The test suite includes:
- ✅ Pool initialization with automatic SOL wrapping
- ✅ Adding liquidity with automatic SOL wrapping
- ✅ Removing liquidity (percentage-based)
- ✅ Swapping tokens
- ✅ Proper error handling

Tests use the Meteora SDK to calculate liquidity from desired token amounts, ensuring accurate pool initialization and liquidity management.

## Security Considerations

- ✅ All CPI calls validate program addresses
- ✅ Pool authority is validated with constant address
- ✅ Token programs are validated via Interface constraints
- ✅ Slippage protection via threshold parameters
- ✅ No hardcoded private keys or secrets

## References

- [Meteora DAMM v2 Docs](https://docs.meteora.ag/)
- [Meteora CP-AMM SDK](https://github.com/MeteoraAg/cp-amm-sdk)
- [Anchor CPI Documentation](https://www.anchor-lang.com/docs/cross-program-invocations)

## License

This project is for educational purposes as part of learning Anchor and Solana development.
