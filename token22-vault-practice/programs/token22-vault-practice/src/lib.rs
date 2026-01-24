use anchor_lang::prelude::*;

pub mod state;
pub mod contexts;
pub mod errors;
pub mod instructions;

use contexts::*;
use instructions::*;

declare_id!("Dwc53rq6GDAYds7zPEksghiEV2PShbNokd3vjeMBDJKQ");

#[program]
pub mod token22_vault_practice {
    use super::*;

    pub fn initialize_vault(ctx: Context<InitializeVault>) -> Result<()> {
        ctx.accounts.vault.mint = ctx.accounts.mint.key();
        ctx.accounts.vault.total_deposits = 0;
        ctx.accounts.vault.bump = ctx.bumps.vault;
        Ok(())
    }

    pub fn deposit_token(ctx: Context<DepositToken>, amount: u64) -> Result<()> {
        instructions::deposit::deposit_token(ctx, amount)
    }
}
