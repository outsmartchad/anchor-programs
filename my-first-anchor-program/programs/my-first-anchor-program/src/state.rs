use anchor_lang::prelude::*;

// Custom vault account structure to store metadata
#[derive(InitSpace)]
#[account]
pub struct Vault {
    pub owner: Pubkey,
    pub total_deposits: u64,
    pub total_withdrawals: u64,
}
