use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};
use crate::contexts::VaultAction;
use crate::errors::VaultError;

pub fn handler(ctx: Context<VaultAction>, amount: u64) -> Result<()> {
    // Transfer lamports from signer to vault using Anchor CPI
    let cpi_context = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        Transfer {
            from: ctx.accounts.signer.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
        },
    );
    
    transfer(cpi_context, amount)?;
    
    // Update vault metadata
    ctx.accounts.vault.total_deposits = ctx.accounts.vault.total_deposits
        .checked_add(amount)
        .ok_or(VaultError::InvalidAmount)?;
    
    Ok(())
}
