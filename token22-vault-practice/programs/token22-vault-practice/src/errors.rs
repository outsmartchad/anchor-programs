use anchor_lang::prelude::*;

#[error_code]
pub enum VaultError {
    #[msg("Mint mismatch")]
    MintMismatch,
    
    #[msg("Invalid amount")]
    InvalidAmount,
}
