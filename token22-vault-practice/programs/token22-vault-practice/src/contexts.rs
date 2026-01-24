use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount};
use anchor_spl::token_2022::Token2022;
use anchor_spl::associated_token::AssociatedToken;
use crate::state::Token22Vault;

#[derive(Accounts)]
pub struct InitializeVault<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub mint: InterfaceAccount<'info, Mint>,
    
    #[account(
        init,
        payer = user,
        space = 8 + Token22Vault::INIT_SPACE,
        seeds = [b"token22_vault", mint.key().as_ref()],
        bump,
    )]
    pub vault: Account<'info, Token22Vault>,
    
    /// CHECK: This account is created by the associated token program
    #[account(
        init,
        payer = user,
        associated_token::mint = mint,
        associated_token::authority = vault,
    )]
    pub vault_token_account: InterfaceAccount<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token2022>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DepositToken<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    // User's token account (source)
    #[account(mut)]
    pub user_token_account: InterfaceAccount<'info, TokenAccount>,
    
    // Vault's token account (destination)
    #[account(mut)]
    pub vault_token_account: InterfaceAccount<'info, TokenAccount>,
    
    // The Token-2022 mint
    pub mint: InterfaceAccount<'info, Mint>,
    
    // Vault PDA
    #[account(
        mut,
        seeds = [b"token22_vault", mint.key().as_ref()],
        bump = vault.bump,
    )]
    pub vault: Account<'info, Token22Vault>,
    
    // Token-2022 Program (required for token transfers)
    pub token_program: Program<'info, Token2022>,
    
    pub system_program: Program<'info, System>,
}
