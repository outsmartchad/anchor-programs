# Token Vault Practice

A Solana program built with Anchor that demonstrates SPL token transfers, PDAs (Program Derived Addresses), and Cross-Program Invocations (CPI).

## 🎯 Overview

This project implements a **token vault system** where users can deposit SPL tokens (like USDC) into a program-controlled vault. It's designed as a learning project to understand core Solana/Anchor concepts.

## ✨ Features

- **Initialize Vault**: Create a vault PDA for a specific token mint
- **Deposit Tokens**: Transfer tokens from user wallets to the vault
- **Track Deposits**: Maintain state of total deposits in the vault
- **PDA Management**: Demonstrates creating and managing token accounts for PDAs

## 🏗️ Architecture

```
User Wallet
    ↓ (deposits tokens via CPI)
Vault PDA (Program Controlled)
    ↓ (stores tokens)
Vault Token Account (owned by PDA)
```

## 🎓 Key Concepts Demonstrated

1. **PDAs (Program Derived Addresses)**: The vault is a PDA controlled by the program, not a user wallet
2. **SPL Token Transfers**: Using CPI to transfer tokens via the Token Program
3. **Associated Token Accounts**: Creating token accounts for PDAs
4. **Account Management**: Managing both user and program-owned token accounts
5. **Anchor Framework**: Using Anchor's account constraints and CPI helpers

## 📋 Prerequisites

- Rust (stable or nightly)
- Solana CLI
- Anchor CLI (0.32.1)
- Node.js and npm/yarn
- Docker (optional, for containerized development)

## 🚀 Quick Start

### Using Docker (Recommended)

```bash
# Build the Docker image
docker build -t anchor-builder:latest -f Dockerfile .

# Run the container
./docker-run.sh

# Inside the container
anchor build
anchor test
```

### Local Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Build the Program**
   ```bash
   anchor build
   ```

3. **Run Tests**
   ```bash
   anchor test
   ```

## 📁 Project Structure

```
token-vault-practice/
├── programs/
│   └── token-vault-practice/
│       └── src/
│           ├── lib.rs              # Main program entry point
│           ├── contexts.rs          # Account validation structs
│           ├── state.rs            # Vault state definition
│           ├── errors.rs            # Custom error types
│           └── instructions/
│               └── deposit.rs      # Deposit token logic
├── tests/
│   └── token-vault-practice.ts     # Integration tests
├── migrations/
│   └── deploy.ts                   # Deployment script
├── Anchor.toml                      # Anchor configuration
└── Dockerfile                       # Docker setup
```

## 🔧 How It Works

### 1. Initialize Vault

Creates a vault PDA for a specific token mint:

```rust
pub fn initialize_vault(ctx: Context<InitializeVault>) -> Result<()> {
    ctx.accounts.vault.mint = ctx.accounts.mint.key();
    ctx.accounts.vault.total_deposits = 0;
    ctx.accounts.vault.bump = ctx.bumps.vault;
    Ok(())
}
```

This also creates the vault's associated token account automatically using Anchor's `associated_token` constraints.

### 2. Deposit Tokens

Transfers tokens from user to vault using CPI:

```rust
pub fn deposit_token(ctx: Context<DepositToken>, amount: u64) -> Result<()> {
    // Transfer tokens via CPI
    token::transfer(cpi_ctx, amount)?;
    
    // Update vault state
    ctx.accounts.vault.total_deposits += amount;
    Ok(())
}
```

## 🧪 Testing

The test suite demonstrates the complete flow:

1. **Create Token Mint**: Creates a new SPL token for testing
2. **Mint Tokens**: Mints tokens to the test wallet
3. **Initialize Vault**: Creates the vault PDA and its token account
4. **Deposit Tokens**: Transfers tokens from wallet to vault

Run tests:
```bash
anchor test --skip-deploy --skip-local-validator
```

## 🌐 Deployment

### Deploy to Devnet

```bash
anchor deploy --provider.cluster devnet
```

### Deploy to Mainnet

```bash
anchor deploy --provider.cluster mainnet
```

**Note**: Update the program ID in `Anchor.toml` and `lib.rs` after deployment.

## 💡 Real-World Use Cases

This pattern is used in many DeFi applications:

- **Staking Platforms**: Users stake tokens to earn rewards
- **Liquidity Pools**: Pool tokens from multiple users
- **Escrow Services**: Hold tokens until conditions are met
- **Time-Locked Savings**: Lock tokens for a specific period
- **Treasury Management**: Program-controlled token storage

## 🔐 Security Considerations

- The vault PDA has no private key (can't be stolen)
- Only the program code can move tokens (transparent and auditable)
- All operations are on-chain and verifiable
- Users can review the code before depositing

## 📚 Learning Resources

- [Anchor Documentation](https://www.anchor-lang.com/)
- [Solana Cookbook](https://solanacookbook.com/)
- [SPL Token Program](https://spl.solana.com/token)

## 🤝 Contributing

This is a learning project. Feel free to:
- Add withdrawal functionality
- Implement multi-token support
- Add access control/authorization
- Create a frontend interface

## 📄 License

This project is for educational purposes.

## 🙏 Acknowledgments

Built as part of learning Solana and Anchor development. Special thanks to the Anchor and Solana communities for excellent documentation and examples.
