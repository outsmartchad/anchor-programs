# Problem Definition: Meteora DAMM v2 CPI Integration

## Background

Meteora's DAMM v2 (Dynamic Automated Market Maker) is a sophisticated AMM protocol on Solana featuring:
- Concentrated liquidity with customizable price ranges
- Dynamic fees based on volatility
- Position NFTs for LP tracking
- Dual reward farming campaigns
- Support for both SPL Token and Token-2022

The **Dynamic Bonding Curve** program (`/root/dynamic-bonding-curve`) demonstrates how to make CPI calls to DAMM v2, but only implements a subset of instructions for migration purposes.

## Problem Statement

We need to build a **custom Anchor program** that provides complete CPI integration with Meteora DAMM v2, enabling external programs and protocols to:

1. **Initialize custom pools** with configurable parameters
2. **Add liquidity** to existing pools/positions
3. **Remove liquidity** from positions
4. **Execute swaps** against DAMM v2 pools

### Reference Implementation

The Dynamic Bonding Curve program (`/root/dynamic-bonding-curve`) has some CPI examples but is migration-focused. We use it as a **reference pattern**, not a limitation.

### Our Goal: Complete CPI Wrapper

We will implement **ALL core DAMM v2 instructions** as a complete CPI wrapper:

| Instruction | Priority | Use Case |
|-------------|----------|----------|
| `initialize_pool` | High | Create standard pools |
| `initialize_pool_with_dynamic_config` | High | Create pools with dynamic fees |
| `initialize_customizable_pool` | High | Full custom pool parameters |
| `create_position` | High | Create LP positions |
| `add_liquidity` | **Critical** | Deposit tokens to positions |
| `remove_liquidity` | **Critical** | LP exit, rebalancing, partial withdrawal |
| `remove_all_liquidity` | **Critical** | Full position exit |
| `swap` | High | Execute swaps (legacy interface) |
| `swap2` | **Critical** | Execute swaps (new interface with modes) |
| `claim_position_fee` | Medium | Fee collection for LPs |
| `close_position` | Medium | Clean up empty positions |

This gives external programs/protocols a **single dependency** for full DAMM v2 interaction.

## Technical Challenges

### 1. Account Structure Complexity
DAMM v2 instructions require many accounts (14+ for swap). Each must be:
- Correctly derived (PDAs with proper seeds)
- Properly ordered
- Marked with correct mutability

### 2. Token Program Compatibility
Must handle both:
- SPL Token (`TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA`)
- Token-2022 (`TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`)

### 3. Signer Seeds Management
CPI calls require proper PDA signer seeds:
```rust
CpiContext::new_with_signer(
    program,
    accounts,
    &[&pool_authority_seeds[..]]  // Must derive correctly
)
```

### 4. Slippage Protection
All liquidity and swap operations need proper threshold parameters to protect users from:
- Price manipulation
- Sandwich attacks
- Excessive slippage

### 5. Event Authority
DAMM v2 uses Anchor's `event-cpi` feature. CPI calls must include:
- `event_authority` account
- `program` account (self-reference)

## Constraints

1. **No modification of DAMM v2** - We can only make CPI calls
2. **Anchor framework** - Use Anchor for consistency and safety
3. **Mainnet compatibility** - Must work with deployed DAMM v2 program
4. **Gas efficiency** - Minimize compute units where possible

## Success Criteria

1. Successfully execute CPI calls for all target instructions
2. Proper error handling and propagation
3. Comprehensive test coverage with:
   - Unit tests for parameter validation
   - Integration tests against local DAMM v2 deployment
4. Clear documentation and examples
5. Type-safe interfaces for all operations

## Out of Scope (Phase 1)

- Admin/operator instructions (config management)
- Reward system integration (initialize_reward, claim_reward)
- Position splitting (split_position)
- Protocol fee operations

## Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| `anchor-lang` | 0.30.x | Framework |
| `anchor-spl` | 0.30.x | Token interfaces |
| `damm-v2` | local | CPI types and interfaces |

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Account structure changes in DAMM v2 | High | Pin to specific version, monitor updates |
| Insufficient compute budget | Medium | Optimize account loading, use remaining accounts |
| Token-2022 edge cases | Medium | Comprehensive testing with transfer fees |
| Incorrect PDA derivation | High | Validate against on-chain accounts |
