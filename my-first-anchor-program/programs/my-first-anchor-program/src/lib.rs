use anchor_lang::prelude::*;

// Import modules
pub mod state;
pub mod errors;
pub mod instructions;
pub mod contexts; // Account structs (renamed from 'accounts' to avoid conflict with Anchor's generated module)

// Re-export for convenience
pub use state::*;
pub use errors::*;
// Re-export account structs at crate root for #[program] macro
pub use contexts::*;

declare_id!("GqSMeguuRK2vT1auHzQrda6ojKFwAxw2GoNso1myd39i");

#[program]
pub mod my_first_anchor_program {
    use super::*;

    // Initialize vault account
    pub fn initialize(ctx: Context<InitializeVault>) -> Result<()> {
        instructions::initialize::handler(ctx)
    }

    // Simple deposit function - adds lamports to the vault
    pub fn deposit(ctx: Context<VaultAction>, amount: u64) -> Result<()> {
        instructions::deposit::handler(ctx, amount)
    }

    // Simple withdraw function - removes lamports from the vault
    pub fn withdraw(ctx: Context<WithdrawAction>, amount: u64) -> Result<()> {
        instructions::withdraw::handler(ctx, amount)
    }

    // Example: Read vault data using LazyAccount (read-only, efficient)
    pub fn read_vault(ctx: Context<ReadVaultAction>) -> Result<()> {
        instructions::read_vault::handler(ctx)
    }
}
