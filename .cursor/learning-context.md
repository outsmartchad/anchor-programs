# Anchor & Solana Learning Context

This directory contains learning materials for Anchor and Solana development.

## 📚 Learning Materials

### Core Documents
- **LEARNING_ROADMAP.md** - Complete learning path from basics to advanced topics
- **LEARNING_GUIDES/** - Detailed guides for each topic
  - `01-spl-token-basics.md` - SPL Token Program fundamentals

### Practice Projects
- **my-first-anchor-program/** - Initial Anchor program with SOL transfers
- **token-vault-practice/** - SPL Token vault with PDA management
- **token22-vault-practice/** - Token-2022 vault with PDA management
- **escrow-program/** - Trustless token swap escrow program
- **meteora-damm-v2-cpi/** - CPI integration with Meteora DAMM v2 (add/remove liquidity, swap)

## 🎯 Current Learning Focus

Based on LEARNING_ROADMAP.md, the recommended learning path:

1. **Phase 1: Essential Concepts** (Start Here)
   - SPL Token Program
   - Advanced CPI
   - Advanced PDA Management
   - Account Constraints & Security

2. **Phase 2: Advanced Token Features**
   - Token-2022 Extensions
   - Associated Token Accounts (ATA)

3. **Phase 3: DeFi Integration**
   - Meteora DLMM (Dynamic Liquidity Market Maker)
   - Meteora DAMM v2 (Dynamic AMM)
   - CPI to Meteora Protocols
   - Advanced CPI Patterns

4. **Phase 4: Advanced Topics** (Optional)
   - Account Compression
   - Advanced PDA Patterns

5. **Phase 5: Testing & Security**
   - Advanced Testing

## 🔗 Related Projects

For hackathon/production work, see: `/root/anchor-building/`
- Contains project-specific agent instructions and architecture
- Privacy-focused DeFi vault project
- Not included in public learning materials

## 📖 Quick Reference

### Key Concepts to Master
- **SPL Tokens**: Token accounts, mints, transfers
- **CPI**: Cross-program invocation patterns
- **PDAs**: Program Derived Addresses and signing
- **DeFi Integration**: Meteora DLMM and DAMM v2 protocols

### Practice Projects Order
1. ✅ my-first-anchor-program (SOL transfers, PDAs)
2. ✅ token-vault-practice (SPL Token basics)
3. ✅ token22-vault-practice (Token-2022 Integration)
4. ✅ escrow-program (Trustless token swaps, Escrow patterns)
5. 🔄 meteora-damm-v2-cpi (CPI to DAMM v2: swap, add/remove liquidity)
6. Token Swap (CPI basics)
7. Multi-PDA System (Advanced PDAs)
8. DLMM Liquidity Provider
9. DAMM v2 Liquidity Provider
10. Advanced Vault (Full integration)

## 💡 Usage

When working on learning materials or practice projects:
- Reference `LEARNING_ROADMAP.md` for the complete path
- Check `LEARNING_GUIDES/` for detailed explanations
- Build practice projects in order
- Test on devnet before mainnet

---

**Note**: This is a learning repository. For production/hackathon work, see `/root/anchor-building/`
