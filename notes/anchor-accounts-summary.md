# Anchor Accounts - Complete Summary

**Source**: Blueshift Course - Anchor for Dummies → Anchor Accounts  

---

## Table of Contents
1. [General Overview](#general-overview)
2. [Program Accounts](#program-accounts)
3. [Token Accounts](#token-accounts)
4. [Additional Account Types](#additional-account-types)
5. [Custom Account Validation](#custom-account-validation)
6. [Remaining Accounts](#remaining-accounts)

---

## General Overview

### Solana Account Structure

All accounts on Solana share the same base layout:

```rust
pub struct Account {
    pub lamports: u64,        // Balance in lamports
    pub data: Vec<u8>,        // Account data
    pub owner: Pubkey,        // Program that owns this account
    pub executable: bool,    // true if program, false if data account
    pub rent_epoch: Epoch,    // Deprecated (set to 0)
}
```

**Key Points**:
- What distinguishes accounts: **owner** (which program controls it) and **data** (how the owner interprets it)
- Token Program accounts are owned by the Token Program
- System accounts have empty data fields
- Token Program accounts can be **Mint** or **Token** accounts (distinguished by discriminators)

---

## Program Accounts

Program accounts are the foundation of state management in Anchor programs. They allow you to create custom data structures owned by your program.

### Account Structure and Discriminators

**Two types of discriminators**:

1. **Default Discriminators** (8-byte prefix):
   - Accounts: `sha256("account:<StructName>")[0..8]` (PascalCase)
   - Instructions: `sha256("global:<instruction_name>")[0..8]` (snake_case)

2. **Custom Discriminators** (Anchor v0.31.0+):
   ```rust
   #[account(discriminator = 1)]  // single-byte
   pub struct Escrow { … }
   ```

**Important Notes**:
- Discriminators must be unique across your program
- Using `[1]` prevents using `[1, 2, …]` (also start with `1`)
- `[0]` cannot be used (conflicts with uninitialized accounts)

### Creating Program Accounts

**Define the account structure**:
```rust
use anchor_lang::prelude::*;

#[derive(InitSpace)]
#[account(discriminator = 1)]
pub struct CustomAccountType {
    data: u64,
}
```

**Key Points**:
- Maximum size: **10,240 bytes (10 KiB)**
- For larger accounts: use `zero_copy` and chunked writes
- `InitSpace` derive macro automatically calculates required space
- **Total space** = `INIT_SPACE` + `DISCRIMINATOR.len()`

**Initialize the account**:
```rust
#[account(
    init,                    // Create the account
    payer = <target_account>, // Who funds the rent
    space = <num_bytes>      // INIT_SPACE + DISCRIMINATOR.len()
)]
pub account: Account<'info, CustomAccountType>,
```

**Reallocate account** (change size):
```rust
#[account(
    mut,                       // Mark as mutable
    realloc = <space>,         // New size
    realloc::payer = <target>, // Who pays for the change
    realloc::zero = <bool>     // Whether to zero new space
)]
```

**Note**: When reducing account size, set `realloc::zero = true` to ensure old data is properly cleared.

**Close account** (recover rent):
```rust
#[account(
    mut,                       // Mark as mutable
    close = <target_account>,  // Where to send remaining lamports
)]
pub account: Account<'info, CustomAccountType>,
```

### Program Derived Addresses (PDAs)

**Basic PDA**:
```rust
#[account(
    seeds = <seeds>,    // Seeds for derivation
    bump                // Standard bump seed
)]
pub account: Account<'info, CustomAccountType>,
```

**Key Points**:
- PDAs are **deterministic**: same seeds + program + bump = same address
- Bump ensures address is off the ed25519 curve
- Calculating bump can "burn" CUs, so save it in the account or pass it in

**Pre-calculated bump** (more efficient):
```rust
#[account(
    seeds = <seeds>,
    bump = <expr>  // Pass in the bump instead of calculating
)]
pub account: Account<'info, CustomAccountType>,
```

**PDA from another program**:
```rust
#[account(
    seeds = <seeds>,
    bump = <expr>,
    seeds::program = <expr>  // Program to derive from
)]
pub account: Account<'info, CustomAccountType>,
```

### LazyAccount (Anchor 0.31.0+)

**Purpose**: More performant way to read account data without deserializing the entire account onto the stack.

**Benefits**:
- Uses only **24 bytes of stack memory** (vs full deserialization)
- Read-only, heap-allocated
- Allows selective field loading

**Enable the feature**:
```toml
# Cargo.toml
anchor-lang = { version = "0.31.1", features = ["lazy-account"] }
```

**Usage**:
```rust
#[derive(Accounts)]
pub struct MyInstruction<'info> {
    pub account: LazyAccount<'info, CustomAccountType>,
}

#[account(discriminator = 1)]
pub struct CustomAccountType {
    pub balance: u64,
    pub metadata: String,
}

pub fn handler(ctx: Context<MyInstruction>) -> Result<()> {
    // Load specific field
    let balance = ctx.accounts.account.get_balance()?;
    let metadata = ctx.accounts.account.get_metadata()?;
    
    Ok(())
}
```

**Important Notes**:
- `LazyAccount` is **read-only** (attempting to mutate will panic)
- After CPIs modify the account, use `unload()` to refresh cached values:
  ```rust
  let initial_value = ctx.accounts.my_account.load_field()?;
  // Do CPI...
  drop(initial_value);  // Drop reference before unload
  let updated_value = ctx.accounts.my_account.unload()?.load_field()?;
  ```

---

## Token Accounts

The Token Program (SPL) is the built-in toolkit for minting and moving non-native SOL assets.

### Account Types

1. **Mint Account**: Stores metadata for a specific token
   - Supply, decimals, mint authority, freeze authority

2. **Token Account**: Holds a balance of that mint for a particular owner
   - Only owner can reduce balance (transfer, burn)
   - Anyone can send tokens to it (increase balance)

### Using Token Accounts in Anchor

**Install `anchor_spl` crate**:
- Helper builders for SPL Token and Token-2022 programs
- Type wrappers for Mint and Token accounts

**Mint Account**:
```rust
#[account(
    mint::decimals     = <expr>,
    mint::authority    = <target_account>,
    mint::freeze_authority = <target_account>
    mint::token_program = <target_account>
)]
pub mint: Account<'info, Mint>,
```

**Token Account**:
```rust
#[account(
    mut,
    associated_token::mint       = <target_account>,
    associated_token::authority  = <target_account>,
    associated_token::token_program = <target_account>
)]
pub maker_ata_a: Account<'info, TokenAccount>,
```

**What `Account<'info, Mint>` and `Account<'info, TokenAccount>` do**:
- Confirm the account really is a Mint or Token account
- Deserialize its data so you can read fields directly
- Enforce extra constraints (authority, decimals, mint, token_program, etc.)

**Initialization**:
- Anchor knows their fixed byte size, so no `space` needed
- Use `init_if_needed`: checks if token account exists, creates if not
- Safe for token accounts, but not for every account type

### InterfaceAccounts (Token & Token-2022)

**Problem**: Token and Token-2022 have similar structures but different programs, so they can't be deserialized the same way.

**Solution**: Use `InterfaceAccounts` to work with both:

```rust
use anchor_spl::token_interface::{Mint, TokenAccount};

#[account(
    mint::decimals     = <expr>,
    mint::authority    = <target_account>,
    mint::freeze_authority = <target_account>
)]
pub mint: InterfaceAccounts<'info, Mint>,

#[account(
    mut,
    associated_token::mint = <target_account>,
    associated_token::authority = <target_account>,
    associated_token::token_program = <target_account>
)]
pub maker_ata_a: InterfaceAccounts<'info, TokenAccount>,
```

**Benefits**:
- Works with both Token and Token-2022 programs
- Eliminates need for separate logic for each program
- Maintains type safety and proper validation

---

## Additional Account Types

### Signer

Verifies that an account has signed the transaction.

```rust
#[derive(Accounts)]
pub struct InstructionAccounts<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
}
```

**Use cases**:
- Ensuring only authorized accounts can perform actions
- Transferring funds
- Modifying account data requiring explicit permission

### AccountInfo & UncheckedAccount

Low-level account types providing direct access without automatic validation. **`UncheckedAccount` is preferred** (name better reflects purpose).

**Use cases**:
1. Accounts without defined structure
2. Custom validation logic
3. Accounts from other programs without Anchor type definitions

**Important**: These bypass Anchor's safety checks, so they're **unsafe** and require `/// CHECK` comment:

```rust
#[derive(Accounts)]
pub struct InstructionAccounts<'info> {
    /// CHECK: This is an unchecked account
    pub account: UncheckedAccount<'info>,

    /// CHECK: This is an unchecked account
    pub account_info: AccountInfo<'info>,
}
```

### Option

Makes accounts optional in instructions.

```rust
#[derive(Accounts)]
pub struct InstructionAccounts<'info> {
    pub optional_account: Option<Account<'info, CustomAccountType>>,
}
```

**Use cases**:
- Flexible instructions that work with or without certain accounts
- Optional parameters
- Backward-compatible instructions

**Note**: When `Option` account is `None`, Anchor uses the Program ID as the account address.

### Box

Stores accounts on the heap rather than the stack.

```rust
#[derive(Accounts)]
pub struct InstructionAccounts<'info> {
    pub boxed_account: Box<Account<'info, LargeAccountType>>,
}
```

**Use cases**:
- Large account structures (inefficient on stack)
- Recursive data structures
- Accounts with size undetermined at compile time

### Program

Validates and interacts with other Solana programs. Anchor identifies program accounts by `executable = true`.

**Use cases**:
- Cross-Program Invocations (CPIs)
- Ensuring correct program interaction
- Verifying program ownership of accounts

**Using built-in program types** (recommended):
```rust
use anchor_spl::token::Token;

#[derive(Accounts)]
pub struct InstructionAccounts<'info> {
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}
```

**Using custom program address**:
```rust
const PROGRAM_ADDRESS: Pubkey = pubkey!("22222222222222222222222222222222222222222222")

#[derive(Accounts)]
pub struct InstructionAccounts<'info> {
    #[account(address = PROGRAM_ADDRESS)]
    /// CHECK: this is fine since we're checking the address
    pub program: UncheckedAccount<'info>,
}
```

**For Token programs** (supporting both Legacy and Token-2022):
```rust
use anchor_spl::token_interface::TokenInterface;

#[derive(Accounts)]
pub struct InstructionAccounts<'info> {
    pub program: Interface<'info, TokenInterface>,
}
```

---

## Custom Account Validation

Anchor provides constraints that can be applied in the `#[account]` attribute to ensure account validity before instruction logic runs.

### Address Constraint

Verifies account's public key matches a specific value.

```rust
#[account(
    address = <expr>,                    // Basic usage
    address = <expr> @ CustomError       // With custom error
)]
pub account: Account<'info, CustomAccountType>,
```

### Owner Constraint

Ensures account is owned by a specific program.

```rust
#[account(
    owner = <expr>,                      // Basic usage
    owner = <expr> @ CustomError         // With custom error
)]
pub account: Account<'info, CustomAccountType>,
```

### Executable Constraint

Verifies account is a program account (`executable = true`).

```rust
#[account(executable)]
pub account: Account<'info, CustomAccountType>,
```

### Mutable Constraint

Marks account as mutable (required for modifications).

```rust
#[account(
    mut,                                 // Basic usage
    mut @ CustomError                    // With custom error
)]
pub account: Account<'info, CustomAccountType>,
```

### Signer Constraint

Verifies account has signed the transaction (explicit alternative to `Signer` type).

```rust
#[account(
    signer,                              // Basic usage
    signer @ CustomError                 // With custom error
)]
pub account: Account<'info, CustomAccountType>,
```

### Has One Constraint

Verifies a specific field on the account struct matches another account's public key.

```rust
#[account(
    has_one = data @ Error::InvalidField
)]
pub account: Account<'info, CustomAccountType>,
```

### Custom Constraint

Write custom validation expressions for complex logic.

```rust
#[account(
    constraint = data == account.data @ Error::InvalidField
)]
pub account: Account<'info, CustomAccountType>,
```

**Benefits of constraints**:
- Validation at account level (before instruction logic)
- Keeps security checks close to account definitions
- Avoids scattering `require!()` calls throughout code

---

## Remaining Accounts

Allows passing additional accounts beyond the defined instruction structure, enabling dynamic behavior.

### Problem

Traditional instruction definitions require exact account specification:

```rust
#[derive(Accounts)]
pub struct Transfer<'info> {
    pub from: Account<'info, TokenAccount>,
    pub to: Account<'info, TokenAccount>,
    pub authority: Signer<'info>,
}
```

This works for single operations, but what about multiple transfers? You'd need multiple instruction calls.

### Solution: Remaining Accounts

Design one instruction that handles "N" operations:

```rust
#[derive(Accounts)]
pub struct BatchTransfer<'info> {
    pub from: Account<'info, TokenAccount>,
    pub to: Account<'info, TokenAccount>,
    pub authority: Signer<'info>,
}

pub fn batch_transfer(ctx: Context<BatchTransfer>, amounts: Vec<u64>) -> Result<()> {
    // Handle first transfer using fixed accounts
    transfer_tokens(&ctx.accounts.from, &ctx.accounts.to, amounts[0])?;
    
    let remaining_accounts = &ctx.remaining_accounts;

    // CRITICAL: Validate remaining accounts schema
    require!(
        remaining_accounts.len() % 2 == 0,
        TransferError::InvalidRemainingAccountsSchema
    );

    // Process remaining accounts in pairs (from_account, to_account)
    for (i, chunk) in remaining_accounts.chunks(2).enumerate() {
        let from_account = &chunk[0];
        let to_account = &chunk[1];
        let amount = amounts[i + 1];
        
        transfer_tokens(from_account, to_account, amount)?;
    }
    
    Ok(())
}
```

### Benefits of Batching

- **Smaller instruction size**: Repeating accounts/data don't need to be included
- **Efficiency**: Each CPI costs 1000 CU, so one call instead of multiple saves compute units

### Important Notes

- Remaining accounts are passed as `UncheckedAccount` (no Anchor validation)
- **Always validate** the `RemainingAccountSchema` and underlying accounts
- Validate account structure matches your expected pattern

### Client Side Implementation

```typescript
await program.methods.someMethod().accounts({
  // some accounts
})
.remainingAccounts([
  {
    isSigner: false,
    isWritable: true,
    pubkey: new Pubkey().default
  }
])
.rpc();
```

---

## Key Takeaways

1. **Account Structure**: All Solana accounts share the same base layout; what differs is owner and data interpretation.

2. **Program Accounts**: 
   - Use discriminators (default or custom) to identify account types
   - Maximum size: 10 KiB
   - Use `InitSpace` for automatic space calculation
   - PDAs provide deterministic addresses

3. **LazyAccount**: Efficient read-only access using only 24 bytes of stack memory.

4. **Token Accounts**: Use `anchor_spl` for Token Program integration; `InterfaceAccounts` for Token-2022 compatibility.

5. **Account Types**: `Signer`, `UncheckedAccount`, `Option`, `Box`, `Program` each serve specific purposes.

6. **Custom Validation**: Use constraints in `#[account]` attribute for security checks at account level.

7. **Remaining Accounts**: Enable dynamic, batched operations but require careful validation.

---

## Practice Recommendations

1. Create accounts with different discriminators
2. Practice PDA derivation with various seeds
3. Implement LazyAccount for read-only operations
4. Work with both Token and Token-2022 using InterfaceAccounts
5. Build batch operations using remaining accounts
6. Apply custom constraints for account validation
