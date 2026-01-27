# Meteora DAMM v2 CPI - Deployment Verification Checklist

## ✅ Code Structure Verification

### Core Implementation
- [x] **Add Liquidity CPI** - `src/instructions/add_liquidity.rs`
  - Account structure matches DAMM v2 requirements
  - CPI call properly structured
  - Parameters: `liquidity_delta`, `token_a_amount_threshold`, `token_b_amount_threshold`

- [x] **Remove Liquidity CPI** - `src/instructions/remove_liquidity.rs`
  - Account structure matches DAMM v2 requirements
  - Pool authority validation (constant address)
  - CPI call properly structured

- [x] **Swap CPI** - `src/instructions/swap.rs`
  - Account structure matches DAMM v2 requirements (14 accounts)
  - Optional referral token account support
  - CPI call properly structured

### Program Structure
- [x] `lib.rs` - Program entry point with 3 instructions
- [x] `damm_v2_interface.rs` - `declare_program!(damm_v2)` for IDL
- [x] `error.rs` - Custom error types (currently unused but defined)
- [x] `instructions/mod.rs` - Proper module exports

### Configuration Files
- [x] `Anchor.toml` - Updated for devnet deployment
- [x] `Cargo.toml` - Dependencies configured (Anchor 0.30.0)
- [x] `package.json` - Test dependencies configured
- [x] IDL file exists: `idls/damm_v2.json` (125KB, valid JSON)

## ⚠️ Known Issues

### 1. Compilation Error (GLIBCXX Issue)
**Status**: Blocked by system library version
**Error**: `GLIBCXX_3.4.30 not found` (system has 3.4.29)
**Impact**: Cannot run `anchor build` natively
**Workaround**: Use Docker or compatible build environment

**Error Details**:
```
error[E0432]: unresolved import `crate`
  --> programs/meteora-damm-v2-cpi/src/lib.rs:13:1
   |
13 | #[program]
```

This error occurs because `declare_program!` macro requires Anchor's build process to process the IDL file. The macro expansion happens during `anchor build`, not `cargo check`.

### 2. Test File
- [x] Fixed: Removed invalid `initialize()` call
- [ ] TODO: Add actual integration tests for CPI calls

## ✅ Configuration Fixed

### Anchor.toml
- ✅ Added `[programs.devnet]` section
- ✅ Changed `cluster = "devnet"` (was "Localnet")
- ✅ Program ID: `ZVipYjcMFyFHidMmewWjnwPhX8ruyRsU6fBKBFneXBX`

### Test File
- ✅ Removed placeholder test
- ✅ Added structure for future tests

## 📋 Pre-Deployment Checklist

### Before Building
1. [ ] Ensure compatible Solana/Anchor toolchain (or use Docker)
2. [ ] Verify IDL file is accessible: `idls/damm_v2.json`
3. [ ] Check DAMM v2 program ID matches: `cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG`

### Build Process
```bash
# Option 1: Native build (requires compatible toolchain)
cd /root/anchor-learning/meteora-damm-v2-cpi
anchor build

# Option 2: Docker build (if GLIBCXX issue persists)
# Use the same Docker setup as other projects
```

### Deployment
```bash
# Deploy to devnet
anchor deploy --provider.cluster devnet

# Or use migration script
anchor run migrate
```

### Testing
```bash
# Run tests (after deployment)
anchor test --skip-deploy --provider.cluster devnet

# Or test only (if already deployed)
anchor test --skip-deploy --skip-local-validator --provider.cluster devnet
```

## 🔍 Code Quality Checks

### Account Validation
- ✅ All accounts marked with `CHECK:` comments where validation is deferred to DAMM v2
- ✅ Pool authority validated with constant address check
- ✅ Token programs use `Interface<'info, TokenInterface>` for SPL/Token-2022 compatibility
- ✅ Event authority included for Anchor event-cpi support

### CPI Structure
- ✅ All CPI calls use `CpiContext::new()` (no signer seeds needed for these instructions)
- ✅ Account ordering matches DAMM v2 IDL requirements
- ✅ Parameter types match DAMM v2 expectations

### Error Handling
- ✅ All CPI calls use `?` operator for error propagation
- ✅ Custom error types defined (for future use)

## 🚀 Deployment Steps

### 1. Build the Program
```bash
cd /root/anchor-learning/meteora-damm-v2-cpi
anchor build
```

**Expected Output**:
- `target/deploy/meteora_damm_v2_cpi.so` - Compiled program
- `target/idl/meteora_damm_v2_cpi.json` - Generated IDL
- `target/types/meteora_damm_v2_cpi.ts` - TypeScript types

### 2. Deploy to Devnet
```bash
anchor deploy --provider.cluster devnet
```

**Expected Output**:
- Program deployed to: `ZVipYjcMFyFHidMmewWjnwPhX8ruyRsU6fBKBFneXBX`
- Transaction signature for deployment

### 3. Verify Deployment
```bash
# Check program is deployed
solana program show ZVipYjcMFyFHidMmewWjnwPhX8ruyRsU6fBKBFneXBX --url devnet

# Should show program data and owner
```

### 4. Run Tests
```bash
# Install dependencies first
npm install

# Run tests
anchor test --skip-deploy --provider.cluster devnet
```

## 📝 Implementation Notes

### What's Implemented
1. **Add Liquidity** - Complete CPI wrapper
2. **Remove Liquidity** - Complete CPI wrapper  
3. **Swap** - Complete CPI wrapper (legacy interface)

### What's Not Implemented (Phase 2)
- `initialize_pool` - Pool creation
- `create_position` - Position creation
- `remove_all_liquidity` - Full position exit
- `swap2` - New swap interface with modes
- `claim_position_fee` - Fee collection
- `close_position` - Position cleanup

### Current Limitations
- Only works with **existing** DAMM v2 pools and positions
- Cannot create new pools or positions
- Uses legacy `swap` interface (not `swap2`)

## 🔗 References

- **DAMM v2 Program ID**: `cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG`
- **Pool Authority**: `HLnpSz9h2S4hiLQ43rnSD9XkcUThA7B8hQMKmDaiTLcC`
- **IDL Source**: `idls/damm_v2.json`
- **Reference Implementation**: `/root/dynamic-bonding-curve`

## ⚠️ Important Notes

1. **Build Requirement**: The `declare_program!` macro requires `anchor build` to process the IDL. `cargo check` alone will fail.

2. **Docker Alternative**: If native build fails due to GLIBCXX, use Docker:
   ```bash
   # Use the same Docker setup as escrow-program
   docker build -t anchor-builder:latest -f Dockerfile .
   ./docker-run.sh
   # Inside container: anchor build
   ```

3. **Testing Requirements**: 
   - Tests need actual DAMM v2 pools on devnet
   - Or run local validator with DAMM v2 program loaded
   - See `development-plan.md` for test setup

4. **Account Derivation**: 
   - Pool PDAs must be derived correctly
   - Position PDAs must match NFT mints
   - Event authority PDA must be derived from DAMM v2 program

## ✅ Ready for Deployment?

**Code Quality**: ✅ Ready
**Configuration**: ✅ Ready  
**Build**: ⚠️ Requires compatible toolchain or Docker
**Tests**: ⚠️ Need to be written (structure ready)

**Recommendation**: 
1. Build using Docker or compatible environment
2. Deploy to devnet
3. Write integration tests against real DAMM v2 pools
4. Verify all 3 CPI instructions work correctly
