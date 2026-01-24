use anchor_lang::error_code;

#[error_code]
pub enum VaultError {
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Mint mismatch")]
    MintMismatch,
}
