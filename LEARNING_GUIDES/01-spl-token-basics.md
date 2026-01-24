# SPL Token Program Basics - Learning Guide

## 🎯 Goal
Learn how to handle SPL tokens (like USDC, USDT) in Anchor programs, not just SOL.

## 📚 Key Concepts

### 1. Token Accounts vs Regular Accounts

**Regular Account (SOL)**:
- Stores lamports (native SOL)
- Owned by System Program
- Simple: just a balance

**Token Account (SPL Token)**:
- Stores tokens (USDC, USDT, etc.)
- Owned by Token Program
- More complex: has mint, owner, amount, decimals

### 2. Key Token Program Concepts

#### **Mint Account**
- Represents a token type (e.g., USDC mint)
- Stores: supply, decimals, mint authority
- Example: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` (USDC on mainnet)

#### **Token Account**
- Holds tokens for a specific user
- Each user has separate token accounts for each mint
- Stores: mint, owner, amount, state

#### **Associated Token Account (ATA)**
- PDA derived from: `[owner, token_program, mint]`
- Standard way to find a user's token account for a mint
- Created with `get_or_create_associated_token_account`

### 3. Token Transfer Flow

```
User Token Account → [CPI to Token Program] → Vault Token Account
```

Unlike SOL transfers:
- Need source token account (user's)
- Need destination token account (vault's)
- Need mint account (for validation)
- Need token program (SPL Token Program)

## 🔧 Anchor SPL Crate

Use `anchor-spl` for token operations:

```rust
use anchor_spl::token::{self, Token, TokenAccount, Mint};
use anchor_spl::associated_token::AssociatedToken;
```

## 📝 Practice Project: Token Vault

Let's build a vault that accepts token deposits!

### Step 1: Add Dependencies

```toml
# Cargo.toml
[dependencies]
anchor-lang = "0.30.0"
anchor-spl = "0.30.0"  # Add this!
```

### Step 2: State Structure

```rust
#[account]
pub struct TokenVault {
    pub mint: Pubkey,           // Which token (e.g., USDC mint)
    pub total_deposits: u64,   // Total tokens deposited
    pub bump: u8,              // PDA bump
}

impl TokenVault {
    pub const INIT_SPACE: usize = 32 + 8 + 1; // mint (32) + total_deposits (8) + bump (1)
}
```

### Step 3: Deposit Instruction Context

```rust
#[derive(Accounts)]
pub struct DepositToken<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    // User's token account (source)
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    
    // Vault's token account (destination)
    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,
    
    // The mint (e.g., USDC)
    pub mint: Account<'info, Mint>,
    
    // Vault PDA
    #[account(
        init_if_needed,
        payer = user,
        space = 8 + TokenVault::INIT_SPACE,
        seeds = [b"token_vault", mint.key().as_ref()],
        bump,
    )]
    pub vault: Account<'info, TokenVault>,
    
    // Token Program (required for token transfers)
    pub token_program: Program<'info, Token>,
    
    pub system_program: Program<'info, System>,
}
```

### Step 4: Deposit Handler

```rust
pub fn deposit_token(ctx: Context<DepositToken>, amount: u64) -> Result<()> {
    // Validate mint matches
    require!(
        ctx.accounts.user_token_account.mint == ctx.accounts.mint.key(),
        VaultError::MintMismatch
    );
    require!(
        ctx.accounts.vault_token_account.mint == ctx.accounts.mint.key(),
        VaultError::MintMismatch
    );
    require!(amount > 0, VaultError::InvalidAmount);
    
    // Transfer tokens from user to vault using CPI
    let cpi_accounts = token::Transfer {
        from: ctx.accounts.user_token_account.to_account_info(),
        to: ctx.accounts.vault_token_account.to_account_info(),
        authority: ctx.accounts.user.to_account_info(),
    };
    
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    
    token::transfer(cpi_ctx, amount)?;
    
    // Update vault state
    ctx.accounts.vault.total_deposits = ctx.accounts.vault.total_deposits
        .checked_add(amount)
        .ok_or(VaultError::InvalidAmount)?;
    
    Ok(())
}
```

## 🔑 Key Differences from SOL Transfers

| SOL Transfer | Token Transfer |
|-------------|---------------|
| `system_program` | `token_program` |
| `Transfer` struct | `token::Transfer` struct |
| `transfer()` function | `token::transfer()` function |
| Source: `from` account | Source: `user_token_account` |
| Dest: `to` account | Dest: `vault_token_account` |
| Authority: `signer` | Authority: `user` (token account owner) |

## ✅ Validation Rules

Always validate:

1. **Mint matches**: `user_token_account.mint == mint.key()`
2. **Vault token account mint matches**: `vault_token_account.mint == mint.key()`
3. **User owns source account**: `user_token_account.owner == user.key()`
4. **Amount > 0**: Check in handler

## 🎓 Next Steps

1. Build the token vault practice project
2. Test with devnet tokens
3. Add withdraw functionality
4. Learn about Associated Token Accounts (ATA)

## 📖 Resources

- [SPL Token Docs](https://spl.solana.com/token)
- [Anchor SPL Docs](https://docs.rs/anchor-spl/latest/anchor_spl/)
- [Associated Token Account](https://spl.solana.com/associated-token-account)
