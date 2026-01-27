use anchor_lang::prelude::*;

#[error_code]
pub enum MeteoraDAMMError {
    #[msg("Invalid liquidity delta")]
    InvalidLiquidityDelta,
    #[msg("Slippage tolerance exceeded")]
    SlippageExceeded,
    #[msg("Invalid swap amount")]
    InvalidSwapAmount,
    #[msg("Invalid pool state")]
    InvalidPoolState,
    #[msg("Insufficient liquidity")]
    InsufficientLiquidity,
}
