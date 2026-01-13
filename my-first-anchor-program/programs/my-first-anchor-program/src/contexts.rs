use anchor_lang::prelude::*;
use crate::state::{Vault, LazyVault}; // Import LazyVault trait for LazyAccount methods

// All account structs in one place for easier access by #[program] macro
#[derive(Accounts)]
pub struct InitializeVault<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        init,
        payer = signer,
        space = Vault::INIT_SPACE + Vault::DISCRIMINATOR.len(),
        seeds = [b"vault", signer.key().as_ref()],
        bump,
    )]
    pub vault: Account<'info, Vault>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct VaultAction<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        mut,
        seeds = [b"vault", signer.key().as_ref()],
        bump,
    )]
    pub vault: Account<'info, Vault>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct WithdrawAction<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        mut,
        seeds = [b"vault", signer.key().as_ref()],
        bump,
    )]
    pub vault: Account<'info, Vault>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ReadVaultAction<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    // Using LazyAccount for read-only access to vault data
    // LazyAccount uses only 24 bytes of stack memory and lets you selectively load fields
    #[account(
        seeds = [b"vault", signer.key().as_ref()],
        bump,
    )]
    pub vault: LazyAccount<'info, Vault>,

    pub system_program: Program<'info, System>,
}
