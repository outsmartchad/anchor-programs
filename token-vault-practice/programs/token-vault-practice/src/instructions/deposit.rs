use anchor_lang::prelude::*;
use anchor_spl::token;
use crate::contexts::DepositToken;
use crate::errors::VaultError;

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
