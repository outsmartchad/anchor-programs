use anchor_lang::prelude::*;

#[account]
pub struct TokenVault {
    pub mint: Pubkey,           // Which token (e.g., USDC mint)
    pub total_deposits: u64,   // Total tokens deposited
    pub bump: u8,              // PDA bump
}

impl TokenVault {
    pub const INIT_SPACE: usize = 32 + 8 + 1; // mint (32) + total_deposits (8) + bump (1)
}
