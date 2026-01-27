# Development Plan: Meteora DAMM v2 CPI Program

## Phase 1: Project Setup & Foundation

### 1.1 Initialize Anchor Project
```bash
cd /root/anchor-learning/meteora-damm-v2-cpi
anchor init meteora-damm-v2-cpi --no-git
```

### 1.2 Configure Dependencies
Update `Cargo.toml`:
```toml
[dependencies]
anchor-lang = { version = "0.30.1", features = ["event-cpi"] }
anchor-spl = { version = "0.30.1", features = ["token", "token-2022"] }

[dependencies.damm-v2]
path = "../../damm-v2/programs/cp-amm"
features = ["cpi"]
```

### 1.3 Create Library Wrapper (Alternative)
If direct dependency doesn't work, create a local `libs/damm-v2` wrapper:
```rust
// libs/damm-v2/src/lib.rs
declare_program!(damm_v2);
pub use damm_v2::*;
```

---

## Phase 2: Core Account Structures

### 2.1 Define Common Account Contexts

Create shared account structures used across multiple instructions:

```
src/
├── lib.rs
├── instructions/
│   ├── mod.rs
│   ├── add_liquidity.rs
│   ├── remove_liquidity.rs
│   ├── swap.rs
│   └── initialize_pool.rs
├── state/
│   └── mod.rs
└── error.rs
```

### 2.2 Implement Base Account Helpers
- PDA derivation functions for DAMM v2 accounts
- Pool authority seeds macro
- Token program detection utility

---

## Phase 3: Implement CPI Instructions

We implement **ALL core instructions** for a complete DAMM v2 CPI wrapper.

### 3.1 Add Liquidity CPI (Critical)

**Reference**: `/root/dynamic-bonding-curve/programs/dynamic-bonding-curve/src/instructions/migration/dynamic_amm_v2/migrate_damm_v2_initialize_pool.rs` (lines with `add_liquidity`)

**Accounts Required**:
```rust
pub struct AddLiquidityCpi<'info> {
    pub pool: AccountInfo<'info>,
    pub position: AccountInfo<'info>,
    pub token_a_account: AccountInfo<'info>,      // User's token A
    pub token_b_account: AccountInfo<'info>,      // User's token B
    pub token_a_vault: AccountInfo<'info>,        // Pool's token A vault
    pub token_b_vault: AccountInfo<'info>,        // Pool's token B vault
    pub token_a_mint: AccountInfo<'info>,
    pub token_b_mint: AccountInfo<'info>,
    pub position_nft_account: AccountInfo<'info>,
    pub owner: AccountInfo<'info>,                // Position owner (signer)
    pub token_a_program: AccountInfo<'info>,
    pub token_b_program: AccountInfo<'info>,
    pub event_authority: AccountInfo<'info>,
    pub amm_program: AccountInfo<'info>,
}
```

**Parameters**:
```rust
AddLiquidityParameters {
    liquidity_delta: u128,
    token_a_amount_threshold: u64,  // Max token A to deposit
    token_b_amount_threshold: u64,  // Max token B to deposit
}
```

### 3.2 Remove Liquidity CPI

**Derive from DAMM v2 source**: `/root/damm-v2/programs/cp-amm/src/instructions/ix_remove_liquidity.rs`

**Accounts Required**:
```rust
pub struct RemoveLiquidityCpi<'info> {
    pub pool: AccountInfo<'info>,
    pub position: AccountInfo<'info>,
    pub token_a_account: AccountInfo<'info>,      // User receives token A
    pub token_b_account: AccountInfo<'info>,      // User receives token B
    pub token_a_vault: AccountInfo<'info>,
    pub token_b_vault: AccountInfo<'info>,
    pub token_a_mint: AccountInfo<'info>,
    pub token_b_mint: AccountInfo<'info>,
    pub position_nft_account: AccountInfo<'info>,
    pub owner: AccountInfo<'info>,                // Position owner (signer)
    pub pool_authority: AccountInfo<'info>,       // Pool PDA authority
    pub token_a_program: AccountInfo<'info>,
    pub token_b_program: AccountInfo<'info>,
    pub event_authority: AccountInfo<'info>,
    pub amm_program: AccountInfo<'info>,
}
```

**Parameters**:
```rust
RemoveLiquidityParameters {
    liquidity_delta: u128,
    token_a_amount_threshold: u64,  // Min token A to receive
    token_b_amount_threshold: u64,  // Min token B to receive
}
```

### 3.3 Swap CPI

**Derive from DAMM v2 source**: `/root/damm-v2/programs/cp-amm/src/instructions/swap/ix_swap.rs`

**Accounts Required** (14 accounts):
```rust
pub struct SwapCpi<'info> {
    pub pool: AccountInfo<'info>,
    pub input_token_account: AccountInfo<'info>,  // User's input token
    pub output_token_account: AccountInfo<'info>, // User's output token
    pub input_vault: AccountInfo<'info>,          // Pool's input vault
    pub output_vault: AccountInfo<'info>,         // Pool's output vault
    pub input_mint: AccountInfo<'info>,
    pub output_mint: AccountInfo<'info>,
    pub pool_authority: AccountInfo<'info>,
    pub payer: AccountInfo<'info>,                // Signer
    pub input_token_program: AccountInfo<'info>,
    pub output_token_program: AccountInfo<'info>,
    pub event_authority: AccountInfo<'info>,
    pub amm_program: AccountInfo<'info>,
    // Optional: referral_token_account for referral fees
}
```

**Parameters (swap2)**:
```rust
SwapParameters2 {
    amount_0: u64,      // Input amount (ExactIn) or Output amount (ExactOut)
    amount_1: u64,      // Min output (ExactIn) or Max input (ExactOut)
    swap_mode: u8,      // 0=ExactIn, 1=PartialFill, 2=ExactOut
}
```

### 3.4 Initialize Customizable Pool CPI

**Derive from DAMM v2 source**: `/root/damm-v2/programs/cp-amm/src/instructions/initialize_pool/ix_initialize_customizable_pool.rs`

**Accounts Required**:
```rust
pub struct InitializeCustomizablePoolCpi<'info> {
    pub creator: AccountInfo<'info>,
    pub position_nft_mint: AccountInfo<'info>,    // Signer (new mint)
    pub position_nft_account: AccountInfo<'info>,
    pub payer: AccountInfo<'info>,
    pub pool_creator_authority: AccountInfo<'info>,
    pub config: AccountInfo<'info>,
    pub pool_authority: AccountInfo<'info>,
    pub pool: AccountInfo<'info>,
    pub position: AccountInfo<'info>,
    pub token_a_mint: AccountInfo<'info>,
    pub token_b_mint: AccountInfo<'info>,
    pub token_a_vault: AccountInfo<'info>,
    pub token_b_vault: AccountInfo<'info>,
    pub payer_token_a: AccountInfo<'info>,
    pub payer_token_b: AccountInfo<'info>,
    pub token_a_program: AccountInfo<'info>,
    pub token_b_program: AccountInfo<'info>,
    pub token_2022_program: AccountInfo<'info>,
    pub system_program: AccountInfo<'info>,
    pub event_authority: AccountInfo<'info>,
    pub amm_program: AccountInfo<'info>,
}
```

### 3.5 Initialize Pool CPI

**Accounts Required**:
```rust
pub struct InitializePoolCpi<'info> {
    pub creator: AccountInfo<'info>,
    pub position_nft_mint: AccountInfo<'info>,    // Signer (new mint)
    pub position_nft_account: AccountInfo<'info>,
    pub payer: AccountInfo<'info>,
    pub config: AccountInfo<'info>,
    pub pool_authority: AccountInfo<'info>,
    pub pool: AccountInfo<'info>,
    pub position: AccountInfo<'info>,
    pub token_a_mint: AccountInfo<'info>,
    pub token_b_mint: AccountInfo<'info>,
    pub token_a_vault: AccountInfo<'info>,
    pub token_b_vault: AccountInfo<'info>,
    pub payer_token_a: AccountInfo<'info>,
    pub payer_token_b: AccountInfo<'info>,
    pub token_a_program: AccountInfo<'info>,
    pub token_b_program: AccountInfo<'info>,
    pub token_2022_program: AccountInfo<'info>,
    pub system_program: AccountInfo<'info>,
    pub event_authority: AccountInfo<'info>,
    pub amm_program: AccountInfo<'info>,
}
```

### 3.6 Create Position CPI

**Accounts Required**:
```rust
pub struct CreatePositionCpi<'info> {
    pub owner: AccountInfo<'info>,
    pub pool: AccountInfo<'info>,
    pub position_nft_mint: AccountInfo<'info>,    // Signer (new mint)
    pub position_nft_account: AccountInfo<'info>,
    pub position: AccountInfo<'info>,
    pub pool_authority: AccountInfo<'info>,
    pub payer: AccountInfo<'info>,
    pub token_program: AccountInfo<'info>,        // Token-2022 for NFT
    pub system_program: AccountInfo<'info>,
    pub event_authority: AccountInfo<'info>,
    pub amm_program: AccountInfo<'info>,
}
```

### 3.7 Remove All Liquidity CPI

Same accounts as `RemoveLiquidityCpi`, but no parameters (removes everything).

### 3.8 Claim Position Fee CPI

**Accounts Required**:
```rust
pub struct ClaimPositionFeeCpi<'info> {
    pub pool: AccountInfo<'info>,
    pub position: AccountInfo<'info>,
    pub token_a_account: AccountInfo<'info>,      // User receives fees
    pub token_b_account: AccountInfo<'info>,
    pub token_a_vault: AccountInfo<'info>,
    pub token_b_vault: AccountInfo<'info>,
    pub token_a_mint: AccountInfo<'info>,
    pub token_b_mint: AccountInfo<'info>,
    pub position_nft_account: AccountInfo<'info>,
    pub owner: AccountInfo<'info>,                // Signer
    pub pool_authority: AccountInfo<'info>,
    pub token_a_program: AccountInfo<'info>,
    pub token_b_program: AccountInfo<'info>,
    pub event_authority: AccountInfo<'info>,
    pub amm_program: AccountInfo<'info>,
}
```

### 3.9 Close Position CPI

**Accounts Required**:
```rust
pub struct ClosePositionCpi<'info> {
    pub position: AccountInfo<'info>,
    pub position_nft_mint: AccountInfo<'info>,
    pub position_nft_account: AccountInfo<'info>,
    pub owner: AccountInfo<'info>,                // Signer
    pub pool: AccountInfo<'info>,
    pub token_program: AccountInfo<'info>,
    pub event_authority: AccountInfo<'info>,
    pub amm_program: AccountInfo<'info>,
}
```

---

## Phase 4: Helper Utilities

### 4.1 PDA Derivation
```rust
// Pool PDA
pub fn derive_pool_pda(config: &Pubkey, token_a: &Pubkey, token_b: &Pubkey) -> (Pubkey, u8) {
    let (max_mint, min_mint) = if token_a > token_b {
        (token_a, token_b)
    } else {
        (token_b, token_a)
    };
    Pubkey::find_program_address(
        &[b"pool", config.as_ref(), max_mint.as_ref(), min_mint.as_ref()],
        &damm_v2::ID
    )
}

// Pool Authority PDA
pub fn derive_pool_authority(pool: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[pool.as_ref()], &damm_v2::ID)
}

// Position PDA
pub fn derive_position_pda(nft_mint: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[b"position_nft", nft_mint.as_ref()], &damm_v2::ID)
}

// Event Authority PDA
pub fn derive_event_authority() -> (Pubkey, u8) {
    Pubkey::find_program_address(&[b"__event_authority"], &damm_v2::ID)
}
```

### 4.2 Token Program Detection
```rust
pub fn get_token_program(mint: &AccountInfo) -> Pubkey {
    if mint.owner == &spl_token_2022::ID {
        spl_token_2022::ID
    } else {
        spl_token::ID
    }
}
```

---

## Phase 5: Testing

### 5.1 Local Validator Setup
```bash
# Clone DAMM v2 program to local validator
solana-test-validator \
  --bpf-program cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG /root/damm-v2/target/deploy/cp_amm.so \
  --reset
```

### 5.2 Test Cases

**Initialize Pool Tests**:
- [ ] Create standard pool with initial liquidity
- [ ] Create pool with dynamic config
- [ ] Create customizable pool with custom fees
- [ ] Invalid config handling
- [ ] Duplicate pool prevention

**Position Tests**:
- [ ] Create position in existing pool
- [ ] Create position with Token-2022 NFT
- [ ] Close empty position
- [ ] Close position with remaining liquidity (should fail)

**Add Liquidity Tests**:
- [ ] Add liquidity to existing position
- [ ] Add liquidity with Token-2022
- [ ] Slippage protection (threshold exceeded)
- [ ] Invalid position owner

**Remove Liquidity Tests**:
- [ ] Remove partial liquidity
- [ ] Remove all liquidity
- [ ] Slippage protection (threshold not met)
- [ ] Locked liquidity handling

**Swap Tests**:
- [ ] Exact-in swap (token A -> B)
- [ ] Exact-in swap (token B -> A)
- [ ] Exact-out swap
- [ ] Partial fill mode
- [ ] Minimum output not met
- [ ] Token-2022 with transfer fees

**Fee Tests**:
- [ ] Claim accumulated position fees
- [ ] Claim fees after multiple swaps
- [ ] Zero fees handling

---

## Phase 6: Documentation & Examples

### 6.1 Usage Examples
Create example client code showing:
- How to call each instruction
- Account derivation
- Parameter calculation

### 6.2 Integration Guide
Document how other programs can:
- Import as CPI dependency
- Derive required accounts
- Handle errors

---

## Implementation Order

```
Week 1: Foundation
├── [ ] Project setup & dependencies
├── [ ] PDA derivation helpers
├── [ ] Initialize pool CPI
└── [ ] Initialize pool with dynamic config CPI

Week 2: Position & Liquidity (Core)
├── [ ] Create position CPI
├── [ ] Add liquidity CPI (Critical)
├── [ ] Remove liquidity CPI (Critical)
├── [ ] Remove all liquidity CPI
└── [ ] Unit tests for position/liquidity ops

Week 3: Swap & Pool Variants
├── [ ] Swap CPI (legacy)
├── [ ] Swap2 CPI (Critical - new interface)
├── [ ] Initialize customizable pool CPI
└── [ ] Swap tests (all modes)

Week 4: Fee & Cleanup + Integration
├── [ ] Claim position fee CPI
├── [ ] Close position CPI
├── [ ] Full integration tests
├── [ ] Documentation & examples
└── [ ] Code review & cleanup
```

---

## File Structure (Final)

```
meteora-damm-v2-cpi/
├── CLAUDE.md                    # Project context (persistent)
├── problem-definition.md        # Problem statement
├── development-plan.md          # This file
├── Anchor.toml
├── Cargo.toml
├── programs/
│   └── meteora-damm-v2-cpi/
│       ├── Cargo.toml
│       └── src/
│           ├── lib.rs
│           ├── error.rs
│           ├── constants.rs
│           ├── utils/
│           │   ├── mod.rs
│           │   ├── pda.rs
│           │   └── token.rs
│           └── instructions/
│               ├── mod.rs
│               ├── initialize_pool.rs
│               ├── initialize_pool_with_dynamic_config.rs
│               ├── initialize_customizable_pool.rs
│               ├── create_position.rs
│               ├── add_liquidity.rs
│               ├── remove_liquidity.rs
│               ├── remove_all_liquidity.rs
│               ├── swap.rs
│               ├── swap2.rs
│               ├── claim_position_fee.rs
│               └── close_position.rs
├── tests/
│   ├── initialize_pool.ts
│   ├── position.ts
│   ├── liquidity.ts
│   ├── swap.ts
│   ├── fees.ts
│   └── utils.ts
└── libs/
    └── damm-v2/                 # Local wrapper if needed
        ├── Cargo.toml
        └── src/
            └── lib.rs
```

---

## References

- DAMM v2 Source: `/root/damm-v2/programs/cp-amm/src/`
- CPI Example: `/root/dynamic-bonding-curve/programs/dynamic-bonding-curve/src/instructions/migration/dynamic_amm_v2/`
- Anchor CPI Docs: https://www.anchor-lang.com/docs/cross-program-invocations
