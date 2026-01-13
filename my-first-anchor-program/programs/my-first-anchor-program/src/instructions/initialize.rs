use anchor_lang::prelude::*;
use crate::contexts::InitializeVault;

pub fn handler(ctx: Context<InitializeVault>) -> Result<()> {
    ctx.accounts.vault.owner = ctx.accounts.signer.key();
    ctx.accounts.vault.total_deposits = 0;
    ctx.accounts.vault.total_withdrawals = 0;
    Ok(())
}
