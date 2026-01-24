# Token Vault Practice Project - Purpose & Overview

## 🎯 Project Purpose

This is a **learning project** to practice building Solana programs with Anchor that handle SPL token transfers. It demonstrates:

### Core Concepts:
1. **Token Vault System**: A program that acts as a vault where users can deposit SPL tokens (like USDC)
2. **PDA (Program Derived Address)**: The vault is a PDA, meaning it's controlled by the program, not a user's wallet
3. **SPL Token Transfers via CPI**: Uses Cross-Program Invocation (CPI) to transfer tokens from users to the vault
4. **Account Management**: Managing token accounts for both users and the program's PDA

### What It Does:
- **Initialize Vault**: Creates a vault PDA for a specific token mint (e.g., USDC)
- **Deposit Tokens**: Users can deposit tokens from their wallet into the vault
- **Track Deposits**: The vault keeps track of total deposits

### Learning Goals:
- ✅ Understanding PDAs and how to derive them
- ✅ Working with SPL tokens in Anchor programs
- ✅ Using CPI to call the Token Program
- ✅ Managing token accounts for PDAs
- ✅ Building and testing Anchor programs

## 🏗️ Architecture

```
User Wallet
    ↓ (deposits tokens)
Vault PDA (Program Controlled)
    ↓ (stores tokens)
Vault Token Account (owned by PDA)
```

## ⚠️ Current Issue: PDA Token Account Creation

**Problem**: The vault is a PDA, and creating token accounts for PDAs requires special handling. You cannot create an associated token account for a PDA from the client side using standard methods.

**Why**: PDAs are "off-curve" addresses (not derived from private keys), so they can't sign transactions directly. The account creation must happen via the program using CPI.

**Solution Options**:
1. **Modify the program** to create the vault's token account in the `initialize_vault` instruction
2. **Use a regular token account** (not associated) that the program creates
3. **Let the transfer create it** by including the Associated Token Program in the transfer instruction

## 📝 Next Steps

To make this fully functional, you should:
1. Modify `initialize_vault` to create the vault's token account via CPI
2. Or modify `deposit_token` to handle account creation if it doesn't exist

This is a common pattern in Solana development - programs often need to create accounts for their PDAs.
