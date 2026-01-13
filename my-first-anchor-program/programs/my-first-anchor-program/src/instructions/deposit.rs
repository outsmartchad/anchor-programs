use anchor_lang::prelude::*;
use crate::contexts::VaultAction;
use crate::state::Vault;
use crate::errors::VaultError;

pub fn handler(ctx: Context<VaultAction>, amount: u64) -> Result<()> {
    // Transfer lamports from signer to vault
    anchor_lang::solana_program::program::invoke(
        &anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.signer.key(),
            &ctx.accounts.vault.key(),
            amount,
        ),
        &[
            ctx.accounts.signer.to_account_info(),
            ctx.accounts.vault.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
        ],
    )?;
    
    // Update vault metadata
    ctx.accounts.vault.total_deposits = ctx.accounts.vault.total_deposits
        .checked_add(amount)
        .ok_or(VaultError::InvalidAmount)?;
    
    Ok(())
}
