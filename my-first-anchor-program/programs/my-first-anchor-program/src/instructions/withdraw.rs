use anchor_lang::prelude::*;
use crate::contexts::WithdrawAction;
use crate::state::Vault;
use crate::errors::VaultError;

pub fn handler(ctx: Context<WithdrawAction>, amount: u64) -> Result<()> {
    // Verify the vault owner matches the signer
    require!(
        ctx.accounts.vault.owner == ctx.accounts.signer.key(),
        VaultError::InvalidAmount
    );
    
    // Calculate rent-exempt minimum for the vault account
    let rent = anchor_lang::solana_program::rent::Rent::get()?;
    let min_rent = rent.minimum_balance(Vault::INIT_SPACE + Vault::DISCRIMINATOR.len());
    
    // Get account infos for lamport manipulation
    let vault_info = ctx.accounts.vault.to_account_info();
    let signer_info = ctx.accounts.signer.to_account_info();
    
    // Get current vault balance
    let vault_balance = vault_info.lamports();
    
    // Ensure we don't withdraw below rent-exempt minimum
    require!(
        vault_balance.saturating_sub(amount) >= min_rent,
        VaultError::InvalidAmount
    );
    
    // Transfer lamports from vault back to signer
    // We can't use system program's transfer on an account with data,
    // so we manually modify lamports
    **vault_info.try_borrow_mut_lamports()? -= amount;
    **signer_info.try_borrow_mut_lamports()? += amount;
    
    // Update vault metadata
    ctx.accounts.vault.total_withdrawals = ctx.accounts.vault.total_withdrawals
        .checked_add(amount)
        .ok_or(VaultError::InvalidAmount)?;
    
    Ok(())
}
