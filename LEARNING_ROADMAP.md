# Anchor & Solana Learning Roadmap

## Current Knowledge ✅
- Anchor basics (build, test, deploy, upgrade)
- Writing accounts + instructions
- CPI to System Program (SOL transfers)
- Basic PDA usage

---

## Phase 1: Essential Solana/Anchor Concepts (Start Here)

### 1. **SPL Token Program** ⭐ CRITICAL
**Why**: Most DeFi applications handle tokens (USDC, USDT, etc.), not just SOL
**Learn**:
- Token accounts vs. regular accounts
- Mint authority, token authority
- Transferring tokens (not SOL)
- CPI to Token Program
- Token account ownership

**Resources**:
- Anchor docs: `anchor-spl` crate
- SPL Token docs: https://spl.solana.com/token
- Practice: Build a simple token transfer instruction

**Practice Project**: Create a vault that accepts token deposits

---

### 2. **Advanced CPI (Cross-Program Invocation)** ⭐ CRITICAL
**Why**: You'll call other programs (Token Program, DeFi protocols, etc.)
**Learn**:
- CPI to Token Program (transfer tokens)
- CPI to other Anchor programs
- Passing accounts in CPI
- CPI with signers (PDAs signing)
- Error handling in CPI

**Resources**:
- Anchor CPI docs
- Practice: Call Token Program from your program

**Practice Project**: Build a token swap using CPI

---

### 3. **Advanced PDA Management** ⭐ CRITICAL
**Why**: PDAs are essential for program-owned accounts and signing
**Learn**:
- Multiple PDAs per program
- PDA seeds with multiple values
- Finding PDAs in client code
- PDA as signer in CPI
- Nested PDAs

**Resources**:
- Anchor PDA docs
- Practice: Create multiple PDAs with different seeds

**Practice Project**: Create a multi-vault system with PDAs

---

### 4. **Account Constraints & Security** ⭐ CRITICAL
**Why**: Prevent exploits and ensure program correctness
**Learn**:
- `has_one`, `owner`, `seeds` constraints
- Custom account validation
- Reentrancy protection
- Access control patterns
- Safe math (checked_add, etc.)

**Resources**:
- Anchor constraints docs
- Security best practices

**Practice Project**: Add access control to your vault

---

## Phase 2: Advanced Token Features

### 5. **Token-2022 Extensions** ⭐ HIGH PRIORITY
**Why**: Token-2022 offers advanced features beyond standard SPL tokens
**Learn**:
- ✅ Token-2022 vs. SPL Token Program
- ✅ Creating Token-2022 mints
- ✅ CPI to Token-2022 program
- Transfer hooks
- Metadata extensions
- Using extensions in your program

**Resources**:
- Solana Token-2022 docs
- Token-2022 extension specs
- Practice: Create a token with extensions

**Practice Project**: Build deposit with Token-2022 tokens (Completed in `token22-vault-practice`)

---

### 6. **Associated Token Accounts (ATA)** ⭐ HIGH PRIORITY
**Why**: Standard way to find and create token accounts
**Learn**:
- ATA derivation
- Creating ATAs in programs
- Using `anchor-spl` ATA helpers
- ATA vs. regular token accounts

**Resources**:
- SPL Associated Token Account docs
- Anchor SPL ATA examples
- Practice: Create ATAs in your program

**Practice Project**: Implement ATA creation in vault

---

## Phase 3: DeFi Integration

### 7. **Meteora DLMM (Dynamic Liquidity Market Maker)** ⭐ HIGH PRIORITY
**Why**: DLMM is a popular DeFi protocol for liquidity provision on Solana
**Learn**:
- DLMM vs. traditional AMM concepts
- Bins and price ranges
- Liquidity strategies
- `addLiquidityByStrategy` function
- `removeLiquidity` function
- Position management

**Resources**:
- Meteora DLMM docs: https://docs.meteora.ag/
- Meteora SDK: `@meteora-ag/dlmm`
- Practice: Add/remove liquidity manually on devnet

**Practice Project**: Build a simple DLMM liquidity provider

---

### 8. **Meteora DAMM v2 (Dynamic AMM)** ⭐ HIGH PRIORITY
**Why**: DAMM v2 is another Meteora protocol for liquidity provision
**Learn**:
- DAMM v2 vs. DLMM differences
- Pool state and position management
- Adding liquidity to DAMM v2 pools
- Removing liquidity from positions
- CPI to DAMM v2 program

**Resources**:
- Meteora DAMM v2 docs: https://docs.meteora.ag/
- Meteora DAMM v2 SDK
- Practice: Interact with DAMM v2 pools on devnet

**Practice Project**: Build a DAMM v2 liquidity provider

---

### 9. **CPI to Meteora Protocols** ⭐ HIGH PRIORITY
**Why**: Your programs need to deploy liquidity via CPI
**Learn**:
- Meteora program IDs (DLMM and DAMM v2)
- Account structure for Meteora CPI
- Passing strategy parameters
- Handling Meteora errors
- Position tracking

**Resources**:
- Meteora CPI examples
- Practice: CPI to add liquidity to DLMM/DAMM v2

**Practice Project**: Vault that adds liquidity to Meteora pools via CPI

---

### 10. **Advanced CPI Patterns** ⭐ HIGH PRIORITY
**Why**: Complex programs require sophisticated CPI patterns
**Learn**:
- Multi-step CPI transactions
- CPI with multiple signers
- Handling CPI errors
- Optimizing CPI calls
- CPI to multiple protocols in one transaction

**Resources**:
- Anchor CPI advanced docs
- Practice: Build complex CPI flows

**Practice Project**: Multi-step DeFi operation via CPI

---

## Phase 4: Advanced Topics (Optional)

### 11. **Account Compression** ⚠️ ADVANCED
**Why**: Reduce on-chain storage costs
**Learn**:
- Merkle trees on Solana
- Compressed accounts
- State compression programs
- Using compression in your program

**Resources**:
- Solana account compression docs
- Practice: Use compressed accounts

**Note**: This is advanced - focus on basics first

---

### 12. **Program Derived Addresses (PDAs) - Advanced** ⚠️ ADVANCED
**Why**: Complex programs need sophisticated PDA patterns
**Learn**:
- Nested PDAs
- PDA hierarchies
- PDA signing patterns
- Advanced seed derivation

**Resources**:
- Anchor PDA advanced docs
- Practice: Build complex PDA structures

**Note**: Master basic PDAs first

---

## Phase 5: Testing & Security

### 11. **Advanced Testing** ⭐ IMPORTANT
**Learn**:
- Integration tests with multiple programs
- Testing CPI calls
- Testing PDAs
- Fuzz testing
- Security audits

**Resources**:
- Anchor testing docs
- Practice: Comprehensive test suite

---

## Recommended Learning Order

### Week 1-2: Foundation
1. ✅ SPL Token Program
2. ✅ Advanced CPI
3. ✅ Advanced PDAs
4. ✅ Account Constraints

### Week 3: Token Features
5. ✅ Token-2022 Extensions
6. ✅ Associated Token Accounts

### Week 4: DeFi Integration
7. ✅ Meteora DLMM
8. ✅ Meteora DAMM v2
9. ✅ CPI to Meteora Protocols
10. ✅ Advanced CPI Patterns

### Week 5+: Advanced (Optional)
9. Account Compression
10. Advanced PDA Patterns

---

## Practice Projects (Build as You Learn)

1. **Token Vault**: Accept tokens, store in PDA
2. **Token Swap**: CPI to swap tokens
3. **Multi-PDA System**: Multiple vaults with different seeds
4. **Token-2022 Integration**: Create and use Token-2022 tokens
5. **DLMM Liquidity Provider**: Add/remove liquidity to Meteora DLMM pools
6. **DAMM v2 Liquidity Provider**: Add/remove liquidity to Meteora DAMM v2 pools
7. **Advanced Vault**: Full-featured vault with Meteora integration

---

## Next Steps

1. **Start with Phase 1** - Master Token Program and CPI
2. **Build practice projects** - Don't jump to complex projects yet
3. **Gradually add complexity** - Foundation → Advanced → Expert
4. **Reference this roadmap** - Check off items as you learn

**Ready to start?** Begin with SPL Token Program - it's the foundation for everything else!
