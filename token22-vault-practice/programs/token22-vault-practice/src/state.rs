use anchor_lang::prelude::*;

#[account]
pub struct Token22Vault {
    pub mint: Pubkey,           // Which Token-2022 mint
    pub total_deposits: u64,    // Total tokens deposited
    pub bump: u8,              // PDA bump
}

impl Token22Vault {
    pub const INIT_SPACE: usize = 32 + 8 + 1; // mint (32) + total_deposits (8) + bump (1)
}
