use anchor_lang::prelude::*;
use crate::contexts::ReadVaultAction;
use crate::state::LazyVault; // Import the auto-generated LazyVault trait
use crate::errors::VaultError;

// Example instruction showing LazyAccount usage for read-only operations
pub fn handler(ctx: Context<ReadVaultAction>) -> Result<()> {
    // Use LazyAccount to read vault data selectively (read-only, heap-allocated)
    // This is more efficient than deserializing the entire account onto the stack
    // Methods are generated as load_<field_name>() for each field
    let vault_owner = ctx.accounts.vault.load_owner()?;
    let _total_deposits = ctx.accounts.vault.load_total_deposits()?;
    let _total_withdrawals = ctx.accounts.vault.load_total_withdrawals()?;
    
    // You can use the data for validation or logging
    // Note: load_owner() returns a reference, so we need to dereference it for comparison
    require!(
        *vault_owner == ctx.accounts.signer.key(),
        VaultError::InvalidAmount
    );
    
    // Example: You can log the values (they're loaded lazily, only when accessed)
    // The _ prefix indicates we're intentionally not using these values
    let _ = _total_deposits;
    let _ = _total_withdrawals;
    
    // LazyAccount is read-only - you cannot mutate fields
    // For mutations, use Account<'info, Vault> instead
    
    Ok(())
}
