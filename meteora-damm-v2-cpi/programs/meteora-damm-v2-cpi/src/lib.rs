#![allow(unexpected_cfgs)]

use anchor_lang::prelude::*;
use anchor_spl::token_interface::TokenInterface;
use anchor_spl::token;
use std::str::FromStr;

// Declare the external DAMM v2 program from IDL
declare_program!(damm_v2);

mod error;

declare_id!("GLpCLLYPGamw2F3bmEsNGGaNw2yYzH5NZhPfgFQ1qkgX");

/// WSOL (Wrapped SOL) mint address
fn native_mint() -> Pubkey {
    Pubkey::from_str("So11111111111111111111111111111111111111112").unwrap()
}

/// Check if a mint is WSOL (NATIVE_MINT)
fn is_native_mint(mint: &Pubkey) -> bool {
    mint == &native_mint()
}

/// DAMM v2 pool authority address (constant PDA)
fn damm_v2_pool_authority() -> Pubkey {
    Pubkey::from_str("HLnpSz9h2S4hiLQ43rnSD9XkcUThA7B8hQMKmDaiTLcC").unwrap()
}

#[program]
pub mod meteora_damm_v2_cpi {
    use super::*;

    /// Add liquidity to an existing DAMM v2 position
    /// If token_b_mint is WSOL, sol_amount must be provided to wrap SOL
    pub fn add_liquidity(
        ctx: Context<AddLiquidityCtx>,
        liquidity_delta: u128,
        token_a_amount_threshold: u64,
        token_b_amount_threshold: u64,
        sol_amount: Option<u64>, // Amount of SOL to wrap if token_b_mint is WSOL
    ) -> Result<()> {
        // If token_b_mint is WSOL and sol_amount is provided, wrap SOL first
        if is_native_mint(&ctx.accounts.token_b_mint.key()) {
            if let Some(amount) = sol_amount {
                // Step 1: Transfer SOL to WSOL token account
                anchor_lang::system_program::transfer(
                    CpiContext::new(
                        ctx.accounts.system_program.to_account_info(),
                        anchor_lang::system_program::Transfer {
                            from: ctx.accounts.owner.to_account_info(),
                            to: ctx.accounts.token_b_account.to_account_info(),
                        },
                    ),
                    amount,
                )?;

                // Step 2: Sync native to update WSOL balance
                token::sync_native(CpiContext::new(
                    ctx.accounts.token_b_program.to_account_info(),
                    token::SyncNative {
                        account: ctx.accounts.token_b_account.to_account_info(),
                    },
                ))?;
            }
        }

        ctx.accounts.add_liquidity_cpi(
            liquidity_delta,
            token_a_amount_threshold,
            token_b_amount_threshold,
        )
    }

    /// Remove liquidity from a DAMM v2 position
    pub fn remove_liquidity(
        ctx: Context<RemoveLiquidityCtx>,
        liquidity_delta: u128,
        token_a_amount_threshold: u64,
        token_b_amount_threshold: u64,
    ) -> Result<()> {
        ctx.accounts.remove_liquidity_cpi(
            liquidity_delta,
            token_a_amount_threshold,
            token_b_amount_threshold,
        )
    }

    /// Execute a swap on a DAMM v2 pool
    pub fn swap(
        ctx: Context<SwapCtx>,
        amount_in: u64,
        minimum_amount_out: u64,
    ) -> Result<()> {
        ctx.accounts.swap_cpi(amount_in, minimum_amount_out)
    }

    /// Initialize a new DAMM v2 pool with initial liquidity
    /// This also creates the first position for the pool creator
    /// If token_b_mint is WSOL, sol_amount must be provided to wrap SOL
    pub fn initialize_pool(
        ctx: Context<InitializePoolCtx>,
        liquidity: u128,
        sqrt_price: u128,
        activation_point: Option<u64>,
        sol_amount: Option<u64>, // Amount of SOL to wrap if token_b_mint is WSOL
    ) -> Result<()> {
        // If token_b_mint is WSOL and sol_amount is provided, wrap SOL first
        if is_native_mint(&ctx.accounts.token_b_mint.key()) {
            if let Some(amount) = sol_amount {
                require!(amount > 0, error::MeteoraDAMMError::InvalidLiquidityDelta);
                
                // Step 1: Transfer SOL to WSOL token account
                // The account must already exist (created in test/client)
                // Note: The account needs to have enough balance for the transfer
                // plus rent exemption (typically ~0.002 SOL for token accounts)
                anchor_lang::system_program::transfer(
                    CpiContext::new(
                        ctx.accounts.system_program.to_account_info(),
                        anchor_lang::system_program::Transfer {
                            from: ctx.accounts.payer.to_account_info(),
                            to: ctx.accounts.payer_token_b.to_account_info(),
                        },
                    ),
                    amount,
                )?;

                // Step 2: Sync native to update WSOL balance
                // This converts the SOL lamports in the account to WSOL tokens
                // The WSOL balance will be the amount transferred (the account's
                // rent exemption is separate and doesn't count as WSOL balance)
                token::sync_native(CpiContext::new(
                    ctx.accounts.token_b_program.to_account_info(),
                    token::SyncNative {
                        account: ctx.accounts.payer_token_b.to_account_info(),
                    },
                ))?;
            }
        }

        ctx.accounts.initialize_pool_cpi(liquidity, sqrt_price, activation_point)
    }

    /// Create a new position in an existing DAMM v2 pool
    pub fn create_position(ctx: Context<CreatePositionCtx>) -> Result<()> {
        ctx.accounts.create_position_cpi()
    }

    /// Initialize pool with SOL - wraps SOL to WSOL internally via inner CPIs
    /// This combines: transfer SOL → sync native → initialize_pool in one instruction
    pub fn initialize_pool_with_sol(
        ctx: Context<InitializePoolWithSolCtx>,
        liquidity: u128,
        sqrt_price: u128,
        activation_point: Option<u64>,
        sol_amount: u64, // Amount of SOL to wrap for Token B (WSOL)
    ) -> Result<()> {
        // Step 1: Transfer SOL to WSOL token account (inner CPI to System Program)
        anchor_lang::system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                anchor_lang::system_program::Transfer {
                    from: ctx.accounts.payer.to_account_info(),
                    to: ctx.accounts.payer_token_b.to_account_info(),
                },
            ),
            sol_amount,
        )?;

        // Step 2: Sync native to update WSOL balance (inner CPI to Token Program)
        token::sync_native(CpiContext::new(
            ctx.accounts.token_b_program.to_account_info(),
            token::SyncNative {
                account: ctx.accounts.payer_token_b.to_account_info(),
            },
        ))?;

        // Step 3: Call DAMM v2 initialize_pool
        ctx.accounts.initialize_pool_cpi(liquidity, sqrt_price, activation_point)
    }

    /// Remove all liquidity from a DAMM v2 position
    pub fn remove_all_liquidity(
        ctx: Context<RemoveAllLiquidityCtx>,
        token_a_amount_threshold: u64,
        token_b_amount_threshold: u64,
    ) -> Result<()> {
        ctx.accounts.remove_all_liquidity_cpi(
            token_a_amount_threshold,
            token_b_amount_threshold,
        )
    }

    /// Claim accumulated trading fees from a position
    pub fn claim_position_fee(ctx: Context<ClaimPositionFeeCtx>) -> Result<()> {
        ctx.accounts.claim_position_fee_cpi()
    }

    /// Close a position and reclaim rent
    /// Position must have zero liquidity before closing
    pub fn close_position(ctx: Context<ClosePositionCtx>) -> Result<()> {
        ctx.accounts.close_position_cpi()
    }

    /// Initialize a customizable pool without a config account
    /// This allows full control over pool parameters (fees, price range, etc.)
    /// If token_b_mint is WSOL and sol_amount is provided, wraps SOL first
    pub fn initialize_customizable_pool(
        ctx: Context<InitializeCustomizablePoolCtx>,
        pool_fees: damm_v2::types::PoolFeeParameters,
        sqrt_min_price: u128,
        sqrt_max_price: u128,
        has_alpha_vault: bool,
        liquidity: u128,
        sqrt_price: u128,
        activation_type: u8,
        collect_fee_mode: u8,
        activation_point: Option<u64>,
        sol_amount: Option<u64>,
    ) -> Result<()> {
        // If token_b_mint is WSOL and sol_amount is provided, wrap SOL first
        if is_native_mint(&ctx.accounts.token_b_mint.key()) {
            if let Some(amount) = sol_amount {
                anchor_lang::system_program::transfer(
                    CpiContext::new(
                        ctx.accounts.system_program.to_account_info(),
                        anchor_lang::system_program::Transfer {
                            from: ctx.accounts.payer.to_account_info(),
                            to: ctx.accounts.payer_token_b.to_account_info(),
                        },
                    ),
                    amount,
                )?;

                token::sync_native(CpiContext::new(
                    ctx.accounts.token_b_program.to_account_info(),
                    token::SyncNative {
                        account: ctx.accounts.payer_token_b.to_account_info(),
                    },
                ))?;
            }
        }

        ctx.accounts.initialize_customizable_pool_cpi(
            pool_fees,
            sqrt_min_price,
            sqrt_max_price,
            has_alpha_vault,
            liquidity,
            sqrt_price,
            activation_type,
            collect_fee_mode,
            activation_point,
        )
    }

    /// Execute a swap with advanced parameters (swap2)
    /// Supports exact-in, exact-out, and partial fill modes
    pub fn swap2(
        ctx: Context<Swap2Ctx>,
        amount_0: u64,
        amount_1: u64,
        swap_mode: u8,
    ) -> Result<()> {
        ctx.accounts.swap2_cpi(amount_0, amount_1, swap_mode)
    }
}

// =============================================================================
// ADD LIQUIDITY
// =============================================================================

/// Accounts required for adding liquidity to a DAMM v2 position
#[derive(Accounts)]
pub struct AddLiquidityCtx<'info> {
    /// The DAMM v2 pool account
    /// CHECK: Validated by DAMM v2 program
    #[account(mut)]
    pub pool: UncheckedAccount<'info>,

    /// The position account to add liquidity to
    /// CHECK: Validated by DAMM v2 program
    #[account(mut)]
    pub position: UncheckedAccount<'info>,

    /// User's token A account (source of token A)
    /// CHECK: Validated by DAMM v2 program
    #[account(mut)]
    pub token_a_account: UncheckedAccount<'info>,

    /// User's token B account (source of token B)
    /// CHECK: Validated by DAMM v2 program
    #[account(mut)]
    pub token_b_account: UncheckedAccount<'info>,

    /// Pool's token A vault
    /// CHECK: Validated by DAMM v2 program
    #[account(mut)]
    pub token_a_vault: UncheckedAccount<'info>,

    /// Pool's token B vault
    /// CHECK: Validated by DAMM v2 program
    #[account(mut)]
    pub token_b_vault: UncheckedAccount<'info>,

    /// Token A mint
    /// CHECK: Validated by DAMM v2 program
    pub token_a_mint: UncheckedAccount<'info>,

    /// Token B mint
    /// CHECK: Validated by DAMM v2 program
    pub token_b_mint: UncheckedAccount<'info>,

    /// Position NFT token account (proves ownership)
    /// CHECK: Validated by DAMM v2 program
    pub position_nft_account: UncheckedAccount<'info>,

    /// Owner of the position (signer)
    pub owner: Signer<'info>,

    /// Token A program (SPL Token or Token-2022)
    pub token_a_program: Interface<'info, TokenInterface>,

    /// Token B program (SPL Token or Token-2022)
    pub token_b_program: Interface<'info, TokenInterface>,

    /// System program (required for SOL wrapping if token_b_mint is WSOL)
    pub system_program: Program<'info, System>,

    /// DAMM v2 event authority PDA
    /// CHECK: Derived from DAMM v2 program seeds
    pub event_authority: UncheckedAccount<'info>,

    /// DAMM v2 program
    /// CHECK: Validated by address constraint
    #[account(address = damm_v2::ID)]
    pub amm_program: UncheckedAccount<'info>,
}

impl<'info> AddLiquidityCtx<'info> {
    pub fn add_liquidity_cpi(
        &self,
        liquidity_delta: u128,
        token_a_amount_threshold: u64,
        token_b_amount_threshold: u64,
    ) -> Result<()> {
        let cpi_accounts = damm_v2::cpi::accounts::AddLiquidity {
            pool: self.pool.to_account_info(),
            position: self.position.to_account_info(),
            token_a_account: self.token_a_account.to_account_info(),
            token_b_account: self.token_b_account.to_account_info(),
            token_a_vault: self.token_a_vault.to_account_info(),
            token_b_vault: self.token_b_vault.to_account_info(),
            token_a_mint: self.token_a_mint.to_account_info(),
            token_b_mint: self.token_b_mint.to_account_info(),
            position_nft_account: self.position_nft_account.to_account_info(),
            owner: self.owner.to_account_info(),
            token_a_program: self.token_a_program.to_account_info(),
            token_b_program: self.token_b_program.to_account_info(),
            event_authority: self.event_authority.to_account_info(),
            program: self.amm_program.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(self.amm_program.to_account_info(), cpi_accounts);

        damm_v2::cpi::add_liquidity(
            cpi_ctx,
            damm_v2::types::AddLiquidityParameters {
                liquidity_delta,
                token_a_amount_threshold,
                token_b_amount_threshold,
            },
        )?;

        Ok(())
    }
}

// =============================================================================
// REMOVE LIQUIDITY
// =============================================================================

/// Accounts required for removing liquidity from a DAMM v2 position
#[derive(Accounts)]
pub struct RemoveLiquidityCtx<'info> {
    /// DAMM v2 pool authority (constant address)
    /// CHECK: Must match the DAMM v2 pool authority address
    #[account(address = damm_v2_pool_authority())]
    pub pool_authority: UncheckedAccount<'info>,

    /// The DAMM v2 pool account
    /// CHECK: Validated by DAMM v2 program
    #[account(mut)]
    pub pool: UncheckedAccount<'info>,

    /// The position account to remove liquidity from
    /// CHECK: Validated by DAMM v2 program
    #[account(mut)]
    pub position: UncheckedAccount<'info>,

    /// User's token A account (receives token A)
    /// CHECK: Validated by DAMM v2 program
    #[account(mut)]
    pub token_a_account: UncheckedAccount<'info>,

    /// User's token B account (receives token B)
    /// CHECK: Validated by DAMM v2 program
    #[account(mut)]
    pub token_b_account: UncheckedAccount<'info>,

    /// Pool's token A vault
    /// CHECK: Validated by DAMM v2 program
    #[account(mut)]
    pub token_a_vault: UncheckedAccount<'info>,

    /// Pool's token B vault
    /// CHECK: Validated by DAMM v2 program
    #[account(mut)]
    pub token_b_vault: UncheckedAccount<'info>,

    /// Token A mint
    /// CHECK: Validated by DAMM v2 program
    pub token_a_mint: UncheckedAccount<'info>,

    /// Token B mint
    /// CHECK: Validated by DAMM v2 program
    pub token_b_mint: UncheckedAccount<'info>,

    /// Position NFT token account (proves ownership)
    /// CHECK: Validated by DAMM v2 program
    pub position_nft_account: UncheckedAccount<'info>,

    /// Owner of the position (signer)
    pub owner: Signer<'info>,

    /// Token A program (SPL Token or Token-2022)
    pub token_a_program: Interface<'info, TokenInterface>,

    /// Token B program (SPL Token or Token-2022)
    pub token_b_program: Interface<'info, TokenInterface>,

    /// DAMM v2 event authority PDA
    /// CHECK: Derived from DAMM v2 program seeds
    pub event_authority: UncheckedAccount<'info>,

    /// DAMM v2 program
    /// CHECK: Validated by address constraint
    #[account(address = damm_v2::ID)]
    pub amm_program: UncheckedAccount<'info>,
}

impl<'info> RemoveLiquidityCtx<'info> {
    pub fn remove_liquidity_cpi(
        &self,
        liquidity_delta: u128,
        token_a_amount_threshold: u64,
        token_b_amount_threshold: u64,
    ) -> Result<()> {
        let cpi_accounts = damm_v2::cpi::accounts::RemoveLiquidity {
            pool_authority: self.pool_authority.to_account_info(),
            pool: self.pool.to_account_info(),
            position: self.position.to_account_info(),
            token_a_account: self.token_a_account.to_account_info(),
            token_b_account: self.token_b_account.to_account_info(),
            token_a_vault: self.token_a_vault.to_account_info(),
            token_b_vault: self.token_b_vault.to_account_info(),
            token_a_mint: self.token_a_mint.to_account_info(),
            token_b_mint: self.token_b_mint.to_account_info(),
            position_nft_account: self.position_nft_account.to_account_info(),
            owner: self.owner.to_account_info(),
            token_a_program: self.token_a_program.to_account_info(),
            token_b_program: self.token_b_program.to_account_info(),
            event_authority: self.event_authority.to_account_info(),
            program: self.amm_program.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(self.amm_program.to_account_info(), cpi_accounts);

        damm_v2::cpi::remove_liquidity(
            cpi_ctx,
            damm_v2::types::RemoveLiquidityParameters {
                liquidity_delta,
                token_a_amount_threshold,
                token_b_amount_threshold,
            },
        )?;

        Ok(())
    }
}

// =============================================================================
// SWAP
// =============================================================================

/// Accounts required for executing a swap on a DAMM v2 pool
#[derive(Accounts)]
pub struct SwapCtx<'info> {
    /// DAMM v2 pool authority (constant address)
    /// CHECK: Must match the DAMM v2 pool authority address
    #[account(address = damm_v2_pool_authority())]
    pub pool_authority: UncheckedAccount<'info>,

    /// The DAMM v2 pool account
    /// CHECK: Validated by DAMM v2 program
    #[account(mut)]
    pub pool: UncheckedAccount<'info>,

    /// User's input token account (source of swap input)
    /// CHECK: Validated by DAMM v2 program
    #[account(mut)]
    pub input_token_account: UncheckedAccount<'info>,

    /// User's output token account (receives swap output)
    /// CHECK: Validated by DAMM v2 program
    #[account(mut)]
    pub output_token_account: UncheckedAccount<'info>,

    /// Pool's token A vault
    /// CHECK: Validated by DAMM v2 program
    #[account(mut)]
    pub token_a_vault: UncheckedAccount<'info>,

    /// Pool's token B vault
    /// CHECK: Validated by DAMM v2 program
    #[account(mut)]
    pub token_b_vault: UncheckedAccount<'info>,

    /// Token A mint
    /// CHECK: Validated by DAMM v2 program
    pub token_a_mint: UncheckedAccount<'info>,

    /// Token B mint
    /// CHECK: Validated by DAMM v2 program
    pub token_b_mint: UncheckedAccount<'info>,

    /// The user performing the swap (signer)
    pub payer: Signer<'info>,

    /// Token A program (SPL Token or Token-2022)
    pub token_a_program: Interface<'info, TokenInterface>,

    /// Token B program (SPL Token or Token-2022)
    pub token_b_program: Interface<'info, TokenInterface>,

    /// Optional referral token account for referral fees
    /// CHECK: Validated by DAMM v2 program if provided
    #[account(mut)]
    pub referral_token_account: Option<UncheckedAccount<'info>>,

    /// DAMM v2 event authority PDA
    /// CHECK: Derived from DAMM v2 program seeds
    pub event_authority: UncheckedAccount<'info>,

    /// DAMM v2 program
    /// CHECK: Validated by address constraint
    #[account(address = damm_v2::ID)]
    pub amm_program: UncheckedAccount<'info>,
}

impl<'info> SwapCtx<'info> {
    pub fn swap_cpi(
        &self,
        amount_in: u64,
        minimum_amount_out: u64,
    ) -> Result<()> {
        let cpi_accounts = damm_v2::cpi::accounts::Swap {
            pool_authority: self.pool_authority.to_account_info(),
            pool: self.pool.to_account_info(),
            input_token_account: self.input_token_account.to_account_info(),
            output_token_account: self.output_token_account.to_account_info(),
            token_a_vault: self.token_a_vault.to_account_info(),
            token_b_vault: self.token_b_vault.to_account_info(),
            token_a_mint: self.token_a_mint.to_account_info(),
            token_b_mint: self.token_b_mint.to_account_info(),
            payer: self.payer.to_account_info(),
            token_a_program: self.token_a_program.to_account_info(),
            token_b_program: self.token_b_program.to_account_info(),
            referral_token_account: self.referral_token_account
                .as_ref()
                .map(|a| a.to_account_info()),
            event_authority: self.event_authority.to_account_info(),
            program: self.amm_program.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(self.amm_program.to_account_info(), cpi_accounts);

        damm_v2::cpi::swap(
            cpi_ctx,
            damm_v2::types::SwapParameters {
                amount_in,
                minimum_amount_out,
            },
        )?;

        Ok(())
    }
}

// =============================================================================
// INITIALIZE POOL
// =============================================================================

/// Token-2022 program ID
fn token_2022_program_id() -> Pubkey {
    Pubkey::from_str("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb").unwrap()
}

/// Accounts required for initializing a new DAMM v2 pool
#[derive(Accounts)]
pub struct InitializePoolCtx<'info> {
    /// The pool creator
    /// CHECK: Can be any account
    pub creator: UncheckedAccount<'info>,

    /// Position NFT mint (new keypair, signer)
    /// CHECK: Will be initialized by DAMM v2 program
    #[account(mut, signer)]
    pub position_nft_mint: UncheckedAccount<'info>,

    /// Position NFT token account (PDA derived from mint)
    /// CHECK: Will be initialized by DAMM v2 program
    #[account(mut)]
    pub position_nft_account: UncheckedAccount<'info>,

    /// Address paying to create the pool
    #[account(mut)]
    pub payer: Signer<'info>,

    /// Pool config account
    /// CHECK: Validated by DAMM v2 program
    pub config: UncheckedAccount<'info>,

    /// DAMM v2 pool authority (constant address)
    /// CHECK: Must match the DAMM v2 pool authority address
    #[account(address = damm_v2_pool_authority())]
    pub pool_authority: UncheckedAccount<'info>,

    /// The pool account to initialize (PDA derived from config and token mints)
    /// CHECK: Will be initialized by DAMM v2 program
    #[account(mut)]
    pub pool: UncheckedAccount<'info>,

    /// Position account (PDA derived from NFT mint)
    /// CHECK: Will be initialized by DAMM v2 program
    #[account(mut)]
    pub position: UncheckedAccount<'info>,

    /// Token A mint
    /// CHECK: Validated by DAMM v2 program
    pub token_a_mint: UncheckedAccount<'info>,

    /// Token B mint
    /// CHECK: Validated by DAMM v2 program
    pub token_b_mint: UncheckedAccount<'info>,

    /// Token A vault (PDA)
    /// CHECK: Will be initialized by DAMM v2 program
    #[account(mut)]
    pub token_a_vault: UncheckedAccount<'info>,

    /// Token B vault (PDA)
    /// CHECK: Will be initialized by DAMM v2 program
    #[account(mut)]
    pub token_b_vault: UncheckedAccount<'info>,

    /// Payer's token A account
    /// CHECK: Validated by DAMM v2 program
    #[account(mut)]
    pub payer_token_a: UncheckedAccount<'info>,

    /// Payer's token B account
    /// CHECK: Validated by DAMM v2 program
    #[account(mut)]
    pub payer_token_b: UncheckedAccount<'info>,

    /// Token A program (SPL Token or Token-2022)
    pub token_a_program: Interface<'info, TokenInterface>,

    /// Token B program (SPL Token or Token-2022)
    pub token_b_program: Interface<'info, TokenInterface>,

    /// Token-2022 program for NFT mint
    /// CHECK: Must be Token-2022 program
    #[account(address = token_2022_program_id())]
    pub token_2022_program: UncheckedAccount<'info>,

    /// System program
    pub system_program: Program<'info, System>,

    /// DAMM v2 event authority PDA
    /// CHECK: Derived from DAMM v2 program seeds
    pub event_authority: UncheckedAccount<'info>,

    /// DAMM v2 program
    /// CHECK: Validated by address constraint
    #[account(address = damm_v2::ID)]
    pub amm_program: UncheckedAccount<'info>,
}

impl<'info> InitializePoolCtx<'info> {
    pub fn initialize_pool_cpi(
        &self,
        liquidity: u128,
        sqrt_price: u128,
        activation_point: Option<u64>,
    ) -> Result<()> {
        let cpi_accounts = damm_v2::cpi::accounts::InitializePool {
            creator: self.creator.to_account_info(),
            position_nft_mint: self.position_nft_mint.to_account_info(),
            position_nft_account: self.position_nft_account.to_account_info(),
            payer: self.payer.to_account_info(),
            config: self.config.to_account_info(),
            pool_authority: self.pool_authority.to_account_info(),
            pool: self.pool.to_account_info(),
            position: self.position.to_account_info(),
            token_a_mint: self.token_a_mint.to_account_info(),
            token_b_mint: self.token_b_mint.to_account_info(),
            token_a_vault: self.token_a_vault.to_account_info(),
            token_b_vault: self.token_b_vault.to_account_info(),
            payer_token_a: self.payer_token_a.to_account_info(),
            payer_token_b: self.payer_token_b.to_account_info(),
            token_a_program: self.token_a_program.to_account_info(),
            token_b_program: self.token_b_program.to_account_info(),
            token_2022_program: self.token_2022_program.to_account_info(),
            system_program: self.system_program.to_account_info(),
            event_authority: self.event_authority.to_account_info(),
            program: self.amm_program.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(self.amm_program.to_account_info(), cpi_accounts);

        damm_v2::cpi::initialize_pool(
            cpi_ctx,
            damm_v2::types::InitializePoolParameters {
                liquidity,
                sqrt_price,
                activation_point,
            },
        )?;

        Ok(())
    }
}

// =============================================================================
// INITIALIZE POOL WITH SOL (wraps SOL internally)
// =============================================================================

/// Accounts required for initializing a pool with automatic SOL wrapping
#[derive(Accounts)]
pub struct InitializePoolWithSolCtx<'info> {
    /// The pool creator
    /// CHECK: Can be any account
    pub creator: UncheckedAccount<'info>,

    /// Position NFT mint (new keypair, signer)
    /// CHECK: Will be initialized by DAMM v2 program
    #[account(mut, signer)]
    pub position_nft_mint: UncheckedAccount<'info>,

    /// Position NFT token account (PDA derived from mint)
    /// CHECK: Will be initialized by DAMM v2 program
    #[account(mut)]
    pub position_nft_account: UncheckedAccount<'info>,

    /// Address paying to create the pool
    #[account(mut)]
    pub payer: Signer<'info>,

    /// Pool config account
    /// CHECK: Validated by DAMM v2 program
    pub config: UncheckedAccount<'info>,

    /// DAMM v2 pool authority (constant address)
    /// CHECK: Must match the DAMM v2 pool authority address
    #[account(address = damm_v2_pool_authority())]
    pub pool_authority: UncheckedAccount<'info>,

    /// The pool account to initialize (PDA)
    /// CHECK: Will be initialized by DAMM v2 program
    #[account(mut)]
    pub pool: UncheckedAccount<'info>,

    /// Position account (PDA derived from NFT mint)
    /// CHECK: Will be initialized by DAMM v2 program
    #[account(mut)]
    pub position: UncheckedAccount<'info>,

    /// Token A mint
    /// CHECK: Validated by DAMM v2 program
    pub token_a_mint: UncheckedAccount<'info>,

    /// Token B mint (must be WSOL for this instruction)
    /// CHECK: Validated by DAMM v2 program
    pub token_b_mint: UncheckedAccount<'info>,

    /// Token A vault (PDA)
    /// CHECK: Will be initialized by DAMM v2 program
    #[account(mut)]
    pub token_a_vault: UncheckedAccount<'info>,

    /// Token B vault (PDA)
    /// CHECK: Will be initialized by DAMM v2 program
    #[account(mut)]
    pub token_b_vault: UncheckedAccount<'info>,

    /// Payer's token A account
    /// CHECK: Validated by DAMM v2 program
    #[account(mut)]
    pub payer_token_a: UncheckedAccount<'info>,

    /// Payer's WSOL token account (will receive SOL transfer)
    /// CHECK: Must be a WSOL account owned by payer
    #[account(mut)]
    pub payer_token_b: UncheckedAccount<'info>,

    /// Token A program (SPL Token or Token-2022)
    pub token_a_program: Interface<'info, TokenInterface>,

    /// Token B program (must be SPL Token for WSOL sync_native)
    pub token_b_program: Interface<'info, TokenInterface>,

    /// Token-2022 program for NFT mint
    /// CHECK: Must be Token-2022 program
    #[account(address = token_2022_program_id())]
    pub token_2022_program: UncheckedAccount<'info>,

    /// System program
    pub system_program: Program<'info, System>,

    /// DAMM v2 event authority PDA
    /// CHECK: Derived from DAMM v2 program seeds
    pub event_authority: UncheckedAccount<'info>,

    /// DAMM v2 program
    /// CHECK: Validated by address constraint
    #[account(address = damm_v2::ID)]
    pub amm_program: UncheckedAccount<'info>,
}

impl<'info> InitializePoolWithSolCtx<'info> {
    pub fn initialize_pool_cpi(
        &self,
        liquidity: u128,
        sqrt_price: u128,
        activation_point: Option<u64>,
    ) -> Result<()> {
        let cpi_accounts = damm_v2::cpi::accounts::InitializePool {
            creator: self.creator.to_account_info(),
            position_nft_mint: self.position_nft_mint.to_account_info(),
            position_nft_account: self.position_nft_account.to_account_info(),
            payer: self.payer.to_account_info(),
            config: self.config.to_account_info(),
            pool_authority: self.pool_authority.to_account_info(),
            pool: self.pool.to_account_info(),
            position: self.position.to_account_info(),
            token_a_mint: self.token_a_mint.to_account_info(),
            token_b_mint: self.token_b_mint.to_account_info(),
            token_a_vault: self.token_a_vault.to_account_info(),
            token_b_vault: self.token_b_vault.to_account_info(),
            payer_token_a: self.payer_token_a.to_account_info(),
            payer_token_b: self.payer_token_b.to_account_info(),
            token_a_program: self.token_a_program.to_account_info(),
            token_b_program: self.token_b_program.to_account_info(),
            token_2022_program: self.token_2022_program.to_account_info(),
            system_program: self.system_program.to_account_info(),
            event_authority: self.event_authority.to_account_info(),
            program: self.amm_program.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(self.amm_program.to_account_info(), cpi_accounts);

        damm_v2::cpi::initialize_pool(
            cpi_ctx,
            damm_v2::types::InitializePoolParameters {
                liquidity,
                sqrt_price,
                activation_point,
            },
        )?;

        Ok(())
    }
}

// =============================================================================
// CREATE POSITION
// =============================================================================

/// Accounts required for creating a new position in an existing pool
#[derive(Accounts)]
pub struct CreatePositionCtx<'info> {
    /// Owner of the new position
    /// CHECK: Can be any account
    pub owner: UncheckedAccount<'info>,

    /// Position NFT mint (new keypair, signer)
    /// CHECK: Will be initialized by DAMM v2 program
    #[account(mut, signer)]
    pub position_nft_mint: UncheckedAccount<'info>,

    /// Position NFT token account (PDA derived from mint)
    /// CHECK: Will be initialized by DAMM v2 program
    #[account(mut)]
    pub position_nft_account: UncheckedAccount<'info>,

    /// The pool to create position in
    /// CHECK: Validated by DAMM v2 program
    #[account(mut)]
    pub pool: UncheckedAccount<'info>,

    /// Position account (PDA derived from NFT mint)
    /// CHECK: Will be initialized by DAMM v2 program
    #[account(mut)]
    pub position: UncheckedAccount<'info>,

    /// DAMM v2 pool authority (constant address)
    /// CHECK: Must match the DAMM v2 pool authority address
    #[account(address = damm_v2_pool_authority())]
    pub pool_authority: UncheckedAccount<'info>,

    /// Address paying to create the position
    #[account(mut)]
    pub payer: Signer<'info>,

    /// Token-2022 program for NFT mint
    /// CHECK: Must be Token-2022 program
    #[account(address = token_2022_program_id())]
    pub token_program: UncheckedAccount<'info>,

    /// System program
    pub system_program: Program<'info, System>,

    /// DAMM v2 event authority PDA
    /// CHECK: Derived from DAMM v2 program seeds
    pub event_authority: UncheckedAccount<'info>,

    /// DAMM v2 program
    /// CHECK: Validated by address constraint
    #[account(address = damm_v2::ID)]
    pub amm_program: UncheckedAccount<'info>,
}

impl<'info> CreatePositionCtx<'info> {
    pub fn create_position_cpi(&self) -> Result<()> {
        let cpi_accounts = damm_v2::cpi::accounts::CreatePosition {
            owner: self.owner.to_account_info(),
            position_nft_mint: self.position_nft_mint.to_account_info(),
            position_nft_account: self.position_nft_account.to_account_info(),
            pool: self.pool.to_account_info(),
            position: self.position.to_account_info(),
            pool_authority: self.pool_authority.to_account_info(),
            payer: self.payer.to_account_info(),
            token_program: self.token_program.to_account_info(),
            system_program: self.system_program.to_account_info(),
            event_authority: self.event_authority.to_account_info(),
            program: self.amm_program.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(self.amm_program.to_account_info(), cpi_accounts);

        damm_v2::cpi::create_position(cpi_ctx)?;

        Ok(())
    }
}

// =============================================================================
// REMOVE ALL LIQUIDITY
// =============================================================================

/// Accounts required for removing all liquidity from a DAMM v2 position
#[derive(Accounts)]
pub struct RemoveAllLiquidityCtx<'info> {
    /// DAMM v2 pool authority (constant address)
    /// CHECK: Must match the DAMM v2 pool authority address
    #[account(address = damm_v2_pool_authority())]
    pub pool_authority: UncheckedAccount<'info>,

    /// The DAMM v2 pool account
    /// CHECK: Validated by DAMM v2 program
    #[account(mut)]
    pub pool: UncheckedAccount<'info>,

    /// The position account to remove all liquidity from
    /// CHECK: Validated by DAMM v2 program
    #[account(mut)]
    pub position: UncheckedAccount<'info>,

    /// User's token A account (receives token A)
    /// CHECK: Validated by DAMM v2 program
    #[account(mut)]
    pub token_a_account: UncheckedAccount<'info>,

    /// User's token B account (receives token B)
    /// CHECK: Validated by DAMM v2 program
    #[account(mut)]
    pub token_b_account: UncheckedAccount<'info>,

    /// Pool's token A vault
    /// CHECK: Validated by DAMM v2 program
    #[account(mut)]
    pub token_a_vault: UncheckedAccount<'info>,

    /// Pool's token B vault
    /// CHECK: Validated by DAMM v2 program
    #[account(mut)]
    pub token_b_vault: UncheckedAccount<'info>,

    /// Token A mint
    /// CHECK: Validated by DAMM v2 program
    pub token_a_mint: UncheckedAccount<'info>,

    /// Token B mint
    /// CHECK: Validated by DAMM v2 program
    pub token_b_mint: UncheckedAccount<'info>,

    /// Position NFT token account (proves ownership)
    /// CHECK: Validated by DAMM v2 program
    pub position_nft_account: UncheckedAccount<'info>,

    /// Owner of the position (signer)
    pub owner: Signer<'info>,

    /// Token A program (SPL Token or Token-2022)
    pub token_a_program: Interface<'info, TokenInterface>,

    /// Token B program (SPL Token or Token-2022)
    pub token_b_program: Interface<'info, TokenInterface>,

    /// DAMM v2 event authority PDA
    /// CHECK: Derived from DAMM v2 program seeds
    pub event_authority: UncheckedAccount<'info>,

    /// DAMM v2 program
    /// CHECK: Validated by address constraint
    #[account(address = damm_v2::ID)]
    pub amm_program: UncheckedAccount<'info>,
}

impl<'info> RemoveAllLiquidityCtx<'info> {
    pub fn remove_all_liquidity_cpi(
        &self,
        token_a_amount_threshold: u64,
        token_b_amount_threshold: u64,
    ) -> Result<()> {
        let cpi_accounts = damm_v2::cpi::accounts::RemoveAllLiquidity {
            pool_authority: self.pool_authority.to_account_info(),
            pool: self.pool.to_account_info(),
            position: self.position.to_account_info(),
            token_a_account: self.token_a_account.to_account_info(),
            token_b_account: self.token_b_account.to_account_info(),
            token_a_vault: self.token_a_vault.to_account_info(),
            token_b_vault: self.token_b_vault.to_account_info(),
            token_a_mint: self.token_a_mint.to_account_info(),
            token_b_mint: self.token_b_mint.to_account_info(),
            position_nft_account: self.position_nft_account.to_account_info(),
            owner: self.owner.to_account_info(),
            token_a_program: self.token_a_program.to_account_info(),
            token_b_program: self.token_b_program.to_account_info(),
            event_authority: self.event_authority.to_account_info(),
            program: self.amm_program.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(self.amm_program.to_account_info(), cpi_accounts);

        damm_v2::cpi::remove_all_liquidity(
            cpi_ctx,
            token_a_amount_threshold,
            token_b_amount_threshold,
        )?;

        Ok(())
    }
}

// =============================================================================
// CLAIM POSITION FEE
// =============================================================================

/// Accounts required for claiming trading fees from a position
#[derive(Accounts)]
pub struct ClaimPositionFeeCtx<'info> {
    /// DAMM v2 pool authority (constant address)
    /// CHECK: Must match the DAMM v2 pool authority address
    #[account(address = damm_v2_pool_authority())]
    pub pool_authority: UncheckedAccount<'info>,

    /// The DAMM v2 pool account
    /// CHECK: Validated by DAMM v2 program
    #[account(mut)]
    pub pool: UncheckedAccount<'info>,

    /// The position account to claim fees from
    /// CHECK: Validated by DAMM v2 program
    #[account(mut)]
    pub position: UncheckedAccount<'info>,

    /// User's token A account (receives fee in token A)
    /// CHECK: Validated by DAMM v2 program
    #[account(mut)]
    pub token_a_account: UncheckedAccount<'info>,

    /// User's token B account (receives fee in token B)
    /// CHECK: Validated by DAMM v2 program
    #[account(mut)]
    pub token_b_account: UncheckedAccount<'info>,

    /// Pool's token A vault
    /// CHECK: Validated by DAMM v2 program
    #[account(mut)]
    pub token_a_vault: UncheckedAccount<'info>,

    /// Pool's token B vault
    /// CHECK: Validated by DAMM v2 program
    #[account(mut)]
    pub token_b_vault: UncheckedAccount<'info>,

    /// Token A mint
    /// CHECK: Validated by DAMM v2 program
    pub token_a_mint: UncheckedAccount<'info>,

    /// Token B mint
    /// CHECK: Validated by DAMM v2 program
    pub token_b_mint: UncheckedAccount<'info>,

    /// Position NFT token account (proves ownership)
    /// CHECK: Validated by DAMM v2 program
    pub position_nft_account: UncheckedAccount<'info>,

    /// Owner of the position (signer)
    pub owner: Signer<'info>,

    /// Token A program (SPL Token or Token-2022)
    pub token_a_program: Interface<'info, TokenInterface>,

    /// Token B program (SPL Token or Token-2022)
    pub token_b_program: Interface<'info, TokenInterface>,

    /// DAMM v2 event authority PDA
    /// CHECK: Derived from DAMM v2 program seeds
    pub event_authority: UncheckedAccount<'info>,

    /// DAMM v2 program
    /// CHECK: Validated by address constraint
    #[account(address = damm_v2::ID)]
    pub amm_program: UncheckedAccount<'info>,
}

impl<'info> ClaimPositionFeeCtx<'info> {
    pub fn claim_position_fee_cpi(&self) -> Result<()> {
        let cpi_accounts = damm_v2::cpi::accounts::ClaimPositionFee {
            pool_authority: self.pool_authority.to_account_info(),
            pool: self.pool.to_account_info(),
            position: self.position.to_account_info(),
            token_a_account: self.token_a_account.to_account_info(),
            token_b_account: self.token_b_account.to_account_info(),
            token_a_vault: self.token_a_vault.to_account_info(),
            token_b_vault: self.token_b_vault.to_account_info(),
            token_a_mint: self.token_a_mint.to_account_info(),
            token_b_mint: self.token_b_mint.to_account_info(),
            position_nft_account: self.position_nft_account.to_account_info(),
            owner: self.owner.to_account_info(),
            token_a_program: self.token_a_program.to_account_info(),
            token_b_program: self.token_b_program.to_account_info(),
            event_authority: self.event_authority.to_account_info(),
            program: self.amm_program.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(self.amm_program.to_account_info(), cpi_accounts);

        damm_v2::cpi::claim_position_fee(cpi_ctx)?;

        Ok(())
    }
}

// =============================================================================
// CLOSE POSITION
// =============================================================================

/// Accounts required for closing a position
#[derive(Accounts)]
pub struct ClosePositionCtx<'info> {
    /// Position NFT mint (will be burned)
    /// CHECK: Validated by DAMM v2 program
    #[account(mut)]
    pub position_nft_mint: UncheckedAccount<'info>,

    /// Position NFT token account (holds the NFT)
    /// CHECK: Validated by DAMM v2 program
    #[account(mut)]
    pub position_nft_account: UncheckedAccount<'info>,

    /// The pool the position belongs to
    /// CHECK: Validated by DAMM v2 program
    #[account(mut)]
    pub pool: UncheckedAccount<'info>,

    /// The position account to close
    /// CHECK: Validated by DAMM v2 program
    #[account(mut)]
    pub position: UncheckedAccount<'info>,

    /// DAMM v2 pool authority (constant address)
    /// CHECK: Must match the DAMM v2 pool authority address
    #[account(address = damm_v2_pool_authority())]
    pub pool_authority: UncheckedAccount<'info>,

    /// Account to receive rent from closed position
    /// CHECK: Can be any account
    #[account(mut)]
    pub rent_receiver: UncheckedAccount<'info>,

    /// Owner of the position (signer)
    pub owner: Signer<'info>,

    /// Token-2022 program (for burning NFT)
    /// CHECK: Must be Token-2022 program
    #[account(address = token_2022_program_id())]
    pub token_program: UncheckedAccount<'info>,

    /// DAMM v2 event authority PDA
    /// CHECK: Derived from DAMM v2 program seeds
    pub event_authority: UncheckedAccount<'info>,

    /// DAMM v2 program
    /// CHECK: Validated by address constraint
    #[account(address = damm_v2::ID)]
    pub amm_program: UncheckedAccount<'info>,
}

impl<'info> ClosePositionCtx<'info> {
    pub fn close_position_cpi(&self) -> Result<()> {
        let cpi_accounts = damm_v2::cpi::accounts::ClosePosition {
            position_nft_mint: self.position_nft_mint.to_account_info(),
            position_nft_account: self.position_nft_account.to_account_info(),
            pool: self.pool.to_account_info(),
            position: self.position.to_account_info(),
            pool_authority: self.pool_authority.to_account_info(),
            rent_receiver: self.rent_receiver.to_account_info(),
            owner: self.owner.to_account_info(),
            token_program: self.token_program.to_account_info(),
            event_authority: self.event_authority.to_account_info(),
            program: self.amm_program.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(self.amm_program.to_account_info(), cpi_accounts);

        damm_v2::cpi::close_position(cpi_ctx)?;

        Ok(())
    }
}

// =============================================================================
// INITIALIZE CUSTOMIZABLE POOL
// =============================================================================

/// Accounts required for initializing a customizable DAMM v2 pool
/// Unlike initialize_pool, this doesn't require a config account
#[derive(Accounts)]
pub struct InitializeCustomizablePoolCtx<'info> {
    /// The pool creator
    /// CHECK: Can be any account
    pub creator: UncheckedAccount<'info>,

    /// Position NFT mint (new keypair, signer)
    /// CHECK: Will be initialized by DAMM v2 program
    #[account(mut, signer)]
    pub position_nft_mint: UncheckedAccount<'info>,

    /// Position NFT token account (PDA derived from mint)
    /// CHECK: Will be initialized by DAMM v2 program
    #[account(mut)]
    pub position_nft_account: UncheckedAccount<'info>,

    /// Address paying to create the pool
    #[account(mut)]
    pub payer: Signer<'info>,

    /// DAMM v2 pool authority (constant address)
    /// CHECK: Must match the DAMM v2 pool authority address
    #[account(address = damm_v2_pool_authority())]
    pub pool_authority: UncheckedAccount<'info>,

    /// The pool account to initialize
    /// CHECK: Will be initialized by DAMM v2 program
    #[account(mut)]
    pub pool: UncheckedAccount<'info>,

    /// Position account (PDA derived from NFT mint)
    /// CHECK: Will be initialized by DAMM v2 program
    #[account(mut)]
    pub position: UncheckedAccount<'info>,

    /// Token A mint
    /// CHECK: Validated by DAMM v2 program
    pub token_a_mint: UncheckedAccount<'info>,

    /// Token B mint
    /// CHECK: Validated by DAMM v2 program
    pub token_b_mint: UncheckedAccount<'info>,

    /// Token A vault (PDA)
    /// CHECK: Will be initialized by DAMM v2 program
    #[account(mut)]
    pub token_a_vault: UncheckedAccount<'info>,

    /// Token B vault (PDA)
    /// CHECK: Will be initialized by DAMM v2 program
    #[account(mut)]
    pub token_b_vault: UncheckedAccount<'info>,

    /// Payer's token A account
    /// CHECK: Validated by DAMM v2 program
    #[account(mut)]
    pub payer_token_a: UncheckedAccount<'info>,

    /// Payer's token B account
    /// CHECK: Validated by DAMM v2 program
    #[account(mut)]
    pub payer_token_b: UncheckedAccount<'info>,

    /// Token A program (SPL Token or Token-2022)
    pub token_a_program: Interface<'info, TokenInterface>,

    /// Token B program (SPL Token or Token-2022)
    pub token_b_program: Interface<'info, TokenInterface>,

    /// Token-2022 program for NFT mint
    /// CHECK: Must be Token-2022 program
    #[account(address = token_2022_program_id())]
    pub token_2022_program: UncheckedAccount<'info>,

    /// System program
    pub system_program: Program<'info, System>,

    /// DAMM v2 event authority PDA
    /// CHECK: Derived from DAMM v2 program seeds
    pub event_authority: UncheckedAccount<'info>,

    /// DAMM v2 program
    /// CHECK: Validated by address constraint
    #[account(address = damm_v2::ID)]
    pub amm_program: UncheckedAccount<'info>,
}

impl<'info> InitializeCustomizablePoolCtx<'info> {
    pub fn initialize_customizable_pool_cpi(
        &self,
        pool_fees: damm_v2::types::PoolFeeParameters,
        sqrt_min_price: u128,
        sqrt_max_price: u128,
        has_alpha_vault: bool,
        liquidity: u128,
        sqrt_price: u128,
        activation_type: u8,
        collect_fee_mode: u8,
        activation_point: Option<u64>,
    ) -> Result<()> {
        let cpi_accounts = damm_v2::cpi::accounts::InitializeCustomizablePool {
            creator: self.creator.to_account_info(),
            position_nft_mint: self.position_nft_mint.to_account_info(),
            position_nft_account: self.position_nft_account.to_account_info(),
            payer: self.payer.to_account_info(),
            pool_authority: self.pool_authority.to_account_info(),
            pool: self.pool.to_account_info(),
            position: self.position.to_account_info(),
            token_a_mint: self.token_a_mint.to_account_info(),
            token_b_mint: self.token_b_mint.to_account_info(),
            token_a_vault: self.token_a_vault.to_account_info(),
            token_b_vault: self.token_b_vault.to_account_info(),
            payer_token_a: self.payer_token_a.to_account_info(),
            payer_token_b: self.payer_token_b.to_account_info(),
            token_a_program: self.token_a_program.to_account_info(),
            token_b_program: self.token_b_program.to_account_info(),
            token_2022_program: self.token_2022_program.to_account_info(),
            system_program: self.system_program.to_account_info(),
            event_authority: self.event_authority.to_account_info(),
            program: self.amm_program.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(self.amm_program.to_account_info(), cpi_accounts);

        damm_v2::cpi::initialize_customizable_pool(
            cpi_ctx,
            damm_v2::types::InitializeCustomizablePoolParameters {
                pool_fees,
                sqrt_min_price,
                sqrt_max_price,
                has_alpha_vault,
                liquidity,
                sqrt_price,
                activation_type,
                collect_fee_mode,
                activation_point,
            },
        )?;

        Ok(())
    }
}

// =============================================================================
// SWAP2 (Advanced Swap)
// =============================================================================

/// Accounts required for executing a swap2 on a DAMM v2 pool
/// Supports exact-in, exact-out, and partial fill modes
#[derive(Accounts)]
pub struct Swap2Ctx<'info> {
    /// DAMM v2 pool authority (constant address)
    /// CHECK: Must match the DAMM v2 pool authority address
    #[account(address = damm_v2_pool_authority())]
    pub pool_authority: UncheckedAccount<'info>,

    /// The DAMM v2 pool account
    /// CHECK: Validated by DAMM v2 program
    #[account(mut)]
    pub pool: UncheckedAccount<'info>,

    /// User's input token account (source of swap input)
    /// CHECK: Validated by DAMM v2 program
    #[account(mut)]
    pub input_token_account: UncheckedAccount<'info>,

    /// User's output token account (receives swap output)
    /// CHECK: Validated by DAMM v2 program
    #[account(mut)]
    pub output_token_account: UncheckedAccount<'info>,

    /// Pool's token A vault
    /// CHECK: Validated by DAMM v2 program
    #[account(mut)]
    pub token_a_vault: UncheckedAccount<'info>,

    /// Pool's token B vault
    /// CHECK: Validated by DAMM v2 program
    #[account(mut)]
    pub token_b_vault: UncheckedAccount<'info>,

    /// Token A mint
    /// CHECK: Validated by DAMM v2 program
    pub token_a_mint: UncheckedAccount<'info>,

    /// Token B mint
    /// CHECK: Validated by DAMM v2 program
    pub token_b_mint: UncheckedAccount<'info>,

    /// The user performing the swap (signer)
    pub payer: Signer<'info>,

    /// Token A program (SPL Token or Token-2022)
    pub token_a_program: Interface<'info, TokenInterface>,

    /// Token B program (SPL Token or Token-2022)
    pub token_b_program: Interface<'info, TokenInterface>,

    /// Optional referral token account for referral fees
    /// CHECK: Validated by DAMM v2 program if provided
    #[account(mut)]
    pub referral_token_account: Option<UncheckedAccount<'info>>,

    /// DAMM v2 event authority PDA
    /// CHECK: Derived from DAMM v2 program seeds
    pub event_authority: UncheckedAccount<'info>,

    /// DAMM v2 program
    /// CHECK: Validated by address constraint
    #[account(address = damm_v2::ID)]
    pub amm_program: UncheckedAccount<'info>,
}

impl<'info> Swap2Ctx<'info> {
    pub fn swap2_cpi(
        &self,
        amount_0: u64,
        amount_1: u64,
        swap_mode: u8,
    ) -> Result<()> {
        let cpi_accounts = damm_v2::cpi::accounts::Swap2 {
            pool_authority: self.pool_authority.to_account_info(),
            pool: self.pool.to_account_info(),
            input_token_account: self.input_token_account.to_account_info(),
            output_token_account: self.output_token_account.to_account_info(),
            token_a_vault: self.token_a_vault.to_account_info(),
            token_b_vault: self.token_b_vault.to_account_info(),
            token_a_mint: self.token_a_mint.to_account_info(),
            token_b_mint: self.token_b_mint.to_account_info(),
            payer: self.payer.to_account_info(),
            token_a_program: self.token_a_program.to_account_info(),
            token_b_program: self.token_b_program.to_account_info(),
            referral_token_account: self.referral_token_account
                .as_ref()
                .map(|a| a.to_account_info()),
            event_authority: self.event_authority.to_account_info(),
            program: self.amm_program.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(self.amm_program.to_account_info(), cpi_accounts);

        damm_v2::cpi::swap2(
            cpi_ctx,
            damm_v2::types::SwapParameters2 {
                amount_0,
                amount_1,
                swap_mode,
            },
        )?;

        Ok(())
    }
}
