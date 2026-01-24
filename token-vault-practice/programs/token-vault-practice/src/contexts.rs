use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};
use anchor_spl::associated_token::AssociatedToken;
use crate::state::TokenVault;

#[derive(Accounts)]
pub struct InitializeVault<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub mint: Account<'info, Mint>,
    
    #[account(
        init,
        payer = user,
        space = 8 + TokenVault::INIT_SPACE,
        seeds = [b"token_vault", mint.key().as_ref()],
        bump,
    )]
    pub vault: Account<'info, TokenVault>,
    
    /// CHECK: This account is created by the associated token program
    #[account(
        init,
        payer = user,
        associated_token::mint = mint,
        associated_token::authority = vault,
    )]
    pub vault_token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DepositToken<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    // User's token account (source)
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    
    // Vault's token account (destination)
    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,
    
    // The mint (e.g., USDC)
    pub mint: Account<'info, Mint>,
    
    // Vault PDA
    #[account(
        mut,
        seeds = [b"token_vault", mint.key().as_ref()],
        bump = vault.bump,
    )]
    pub vault: Account<'info, TokenVault>,
    
    // Token Program (required for token transfers)
    pub token_program: Program<'info, Token>,
    
    pub system_program: Program<'info, System>,
}
