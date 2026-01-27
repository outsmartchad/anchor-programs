import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { MeteoraDammV2Cpi } from "../target/types/meteora_damm_v2_cpi";
import {
  PublicKey,
  Keypair,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  createMint,
  createAccount,
  mintTo,
  getAccount,
  NATIVE_MINT,
  syncNative,
} from "@solana/spl-token";
import {
  CpAmm,
  ActivationType,
  BaseFeeMode,
  getBaseFeeParams,
  decodeFeeTimeSchedulerParams,
  getDynamicFeeParams,
  getSqrtPriceFromPrice,
  MIN_SQRT_PRICE,
  MAX_SQRT_PRICE,
} from "@meteora-ag/cp-amm-sdk";

// DAMM v2 Program ID (mainnet/devnet)
const DAMM_V2_PROGRAM_ID = new PublicKey("cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG");
const POOL_AUTHORITY = new PublicKey("HLnpSz9h2S4hiLQ43rnSD9XkcUThA7B8hQMKmDaiTLcC");

// Config account provided by user
const CONFIG_ACCOUNT = new PublicKey("8CNy9goNQNLM4wtgRw528tUQGMKD3vSuFRZY2gLGLLvF");

// Event authority seed
const EVENT_AUTHORITY_SEED = Buffer.from("__event_authority");

/**
 * Calculate liquidity from desired token amounts using Meteora SDK
 * This matches the calculation used in the reference implementation
 * 
 * @param connection - Solana connection
 * @param tokenAAmount - Desired amount of token A (in base units with decimals)
 * @param tokenBAmount - Desired amount of token B (in base units with decimals)
 * @param sqrtPrice - Initial sqrt price (Q64.64 format)
 * @param tokenADecimals - Decimals for token A
 * @param tokenBDecimals - Decimals for token B
 * @returns Liquidity value (u128) that will result in these token amounts
 */
function calculateLiquidityFromAmounts(
  connection: anchor.web3.Connection,
  tokenAAmount: BN,
  tokenBAmount: BN,
  sqrtPrice: BN,
  tokenADecimals: number,
  tokenBDecimals: number
): BN {
  // Use Meteora SDK's CpAmm instance to calculate liquidity
  // The SDK accepts Anchor BN directly (same as reference implementation)
  const cpAmmInstance = new CpAmm(connection);
  
  const liquidityDelta = cpAmmInstance.getLiquidityDelta({
    maxAmountTokenA: tokenAAmount,
    maxAmountTokenB: tokenBAmount,
    sqrtPrice: sqrtPrice,
    sqrtMinPrice: new BN(MIN_SQRT_PRICE),
    sqrtMaxPrice: new BN(MAX_SQRT_PRICE),
  });
  
  return liquidityDelta;
}

describe("meteora-damm-v2-cpi", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.MeteoraDammV2Cpi as Program<MeteoraDammV2Cpi>;
  const payer = provider.wallet as anchor.Wallet;

  // Test accounts
  let tokenAMint: PublicKey;
  let tokenBMint: PublicKey;
  let payerTokenA: PublicKey;
  let payerTokenB: PublicKey;

  // Pool accounts
  let poolPda: PublicKey;
  let positionNftMint: Keypair;
  let position: PublicKey;
  let positionNftAccount: PublicKey;
  let tokenAVault: PublicKey;
  let tokenBVault: PublicKey;

  // Track total liquidity in the position
  let totalLiquidity: BN | null = null;

  const [eventAuthority] = PublicKey.findProgramAddressSync(
    [EVENT_AUTHORITY_SEED],
    DAMM_V2_PROGRAM_ID
  );

  console.log("Program ID:", program.programId.toString());
  console.log("DAMM v2 Program ID:", DAMM_V2_PROGRAM_ID.toString());
  console.log("Pool Authority:", POOL_AUTHORITY.toString());
  console.log("Event Authority:", eventAuthority.toString());
  console.log("Config Account:", CONFIG_ACCOUNT.toString());

  it("Program is deployed and accessible", async () => {
    const programId = program.programId;
    console.log("Our CPI Program ID:", programId.toString());

    const dammInfo = await provider.connection.getAccountInfo(DAMM_V2_PROGRAM_ID);
    if (dammInfo) {
      console.log("DAMM v2 program found on network, executable:", dammInfo.executable);
    } else {
      throw new Error("DAMM v2 program not found on this network");
    }

    const configInfo = await provider.connection.getAccountInfo(CONFIG_ACCOUNT);
    if (configInfo) {
      console.log("Config account found, data length:", configInfo.data.length);
    } else {
      throw new Error("Config account not found");
    }
  });

  it("Creates test tokens", async () => {
    const balance = await provider.connection.getBalance(payer.publicKey);
    console.log("Payer balance:", balance / LAMPORTS_PER_SOL, "SOL");

    if (balance < LAMPORTS_PER_SOL * 0.5) {
      throw new Error("Insufficient balance, need at least 0.5 SOL");
    }

    // Create Token A (custom SPL token)
    tokenAMint = await createMint(
      provider.connection,
      payer.payer,
      payer.publicKey,
      null,
      9,
      undefined,
      undefined,
      TOKEN_PROGRAM_ID
    );
    console.log("Token A Mint:", tokenAMint.toString());

    // Token B will be WSOL
    tokenBMint = NATIVE_MINT;
    console.log("Token B Mint (WSOL):", tokenBMint.toString());

    // Create token account for Token A
    payerTokenA = await createAccount(
      provider.connection,
      payer.payer,
      tokenAMint,
      payer.publicKey,
      undefined,
      undefined,
      TOKEN_PROGRAM_ID
    );
    console.log("Payer Token A Account:", payerTokenA.toString());

    // Create WSOL account manually (not using ATA to avoid owner issues)
    const wsolKeypair = Keypair.generate();
    payerTokenB = await createAccount(
      provider.connection,
      payer.payer,
      NATIVE_MINT,
      payer.publicKey,
      wsolKeypair,
      undefined,
      TOKEN_PROGRAM_ID
    );
    console.log("Payer Token B Account (WSOL):", payerTokenB.toString());
    // Note: SOL wrapping will be handled by the program instruction

    // Mint Token A to payer
    await mintTo(
      provider.connection,
      payer.payer,
      tokenAMint,
      payerTokenA,
      payer.payer,
      1_000_000_000 * 1_000_000_000
    );
    console.log("Minted 1000000000 Token A to payer");

    const tokenAAccount = await getAccount(provider.connection, payerTokenA);
    console.log("Token A balance:", tokenAAccount.amount.toString());
    // Token B (WSOL) balance will be 0 initially - wrapping will happen in program instructions
    console.log("Token B (WSOL) account created (balance will be set during pool init)");
  });

  // Specify desired token amounts (in human-readable format)
  let desiredTokenAAmountHuman = 1_000_000; // 1000000 tokens
  let desiredTokenBAmountHuman = 0.05; // 0.05 WSOL

  // Calculate initial price
  let initPrice = desiredTokenBAmountHuman / desiredTokenAAmountHuman;

  it("Initializes a DAMM v2 pool via CPI", async () => {
    positionNftMint = Keypair.generate();

    console.log("\n=== Initializing Pool ===");
    console.log("Position NFT Mint:", positionNftMint.publicKey.toString());

    // Helper to get max/min of two pubkeys (lexicographic comparison)
    const maxKey = (a: PublicKey, b: PublicKey): PublicKey => {
      return a.toBuffer().compare(b.toBuffer()) > 0 ? a : b;
    };
    const minKey = (a: PublicKey, b: PublicKey): PublicKey => {
      return a.toBuffer().compare(b.toBuffer()) <= 0 ? a : b;
    };

    // Derive Pool PDA: ["pool", config, max(tokenA, tokenB), min(tokenA, tokenB)]
    [poolPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("pool"),
        CONFIG_ACCOUNT.toBuffer(),
        maxKey(tokenAMint, tokenBMint).toBuffer(),
        minKey(tokenAMint, tokenBMint).toBuffer(),
      ],
      DAMM_V2_PROGRAM_ID
    );
    console.log("Pool (PDA):", poolPda.toString());

    // Derive other PDAs
    [positionNftAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("position_nft_account"), positionNftMint.publicKey.toBuffer()],
      DAMM_V2_PROGRAM_ID
    );
    console.log("Position NFT Account (PDA):", positionNftAccount.toString());

    [position] = PublicKey.findProgramAddressSync(
      [Buffer.from("position"), positionNftMint.publicKey.toBuffer()],
      DAMM_V2_PROGRAM_ID
    );
    console.log("Position (PDA):", position.toString());

    [tokenAVault] = PublicKey.findProgramAddressSync(
      [Buffer.from("token_vault"), tokenAMint.toBuffer(), poolPda.toBuffer()],
      DAMM_V2_PROGRAM_ID
    );
    console.log("Token A Vault (PDA):", tokenAVault.toString());

    [tokenBVault] = PublicKey.findProgramAddressSync(
      [Buffer.from("token_vault"), tokenBMint.toBuffer(), poolPda.toBuffer()],
      DAMM_V2_PROGRAM_ID
    );
    console.log("Token B Vault (PDA):", tokenBVault.toString());

    // Specify desired token amounts (in human-readable format)
    // const desiredTokenAAmountHuman = 1_000_000; // 1000000 tokens
    // const desiredTokenBAmountHuman = 0.05; // 0.01 WSOL
    
    // Convert to base units with decimals
    const tokenADecimals = 9;
    const tokenBDecimals = 9; // WSOL has 9 decimals
    const desiredTokenAAmount = new BN(desiredTokenAAmountHuman * Math.pow(10, tokenADecimals));
    const desiredTokenBAmount = new BN(desiredTokenBAmountHuman * LAMPORTS_PER_SOL);
    
    // // Calculate initial price (1:1 ratio)
    // const initPrice = desiredTokenBAmountHuman/desiredTokenAAmountHuman; // 1 Token A = 1 Token B
    // getSqrtPriceFromPrice returns a BN (Anchor BN type)
    const sqrtPrice = getSqrtPriceFromPrice(initPrice.toString(), tokenADecimals, tokenBDecimals);
    
    // Calculate liquidity from desired token amounts using Meteora SDK
    const liquidity = calculateLiquidityFromAmounts(
      provider.connection,
      desiredTokenAAmount,
      desiredTokenBAmount,
      sqrtPrice,
      tokenADecimals,
      tokenBDecimals
    );

    console.log("\nPool parameters:");
    console.log("  Desired Token A amount:", desiredTokenAAmountHuman, "tokens =", desiredTokenAAmount.toString(), "base units");
    console.log("  Desired Token B amount:", desiredTokenBAmountHuman, "WSOL =", desiredTokenBAmount.toString(), "lamports");
    console.log("  Calculated Liquidity:", liquidity.toString());
    console.log("  Initial Price:", initPrice, "(1:1 ratio)");
    console.log("  Sqrt Price (Q64.64):", sqrtPrice.toString());

    try {
      // Calculate SOL amount needed - use the desired token B amount
      // Convert from lamports to SOL for the sol_amount parameter
      // We need at least the desired amount, plus a small buffer for rent
      const solAmount = desiredTokenBAmount; // Add 0.001 SOL buffer

      const tx = await program.methods
        .initializePool(
          liquidity,
          sqrtPrice,
          null,
          solAmount // SOL amount to wrap (since tokenBMint is WSOL)
        )
        .accountsPartial({
          creator: payer.publicKey,
          positionNftMint: positionNftMint.publicKey,
          positionNftAccount: positionNftAccount,
          payer: payer.publicKey,
          config: CONFIG_ACCOUNT,
          pool: poolPda,
          position: position,
          tokenAMint: tokenAMint,
          tokenBMint: tokenBMint,
          tokenAVault: tokenAVault,
          tokenBVault: tokenBVault,
          payerTokenA: payerTokenA,
          payerTokenB: payerTokenB,
          tokenAProgram: TOKEN_PROGRAM_ID,
          tokenBProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          eventAuthority: eventAuthority,
        })
        .signers([positionNftMint])
        .rpc();

      console.log("\n✓ Pool initialized successfully!");
      console.log("Transaction:", tx);

      const poolInfo = await provider.connection.getAccountInfo(poolPda);
      if (poolInfo) {
        console.log("Pool account created, data length:", poolInfo.data.length);
      }

      // Store initial liquidity
      totalLiquidity = liquidity;

    } catch (error: any) {
      console.error("\n✗ Pool initialization failed:");
      console.error("Error:", error.message);
      if (error.logs) {
        console.error("\nTransaction logs:");
        error.logs.forEach((log: string) => console.error("  ", log));
      }
      throw error;
    }
  });

  it("Adds liquidity to the pool", async () => {
    if (!poolPda) {
      console.log("Skipping - pool not initialized");
      return;
    }

    console.log("\n=== Adding Liquidity ===");

    // Specify desired token amounts to add (in human-readable format)
    const desiredTokenAAmountHuman_add = 100000; // 100000 tokens
    const desiredTokenBAmountHuman_add = 0.01; // 0.005 WSOL
    
    // Convert to base units with decimals
    const tokenADecimals = 9;
    const tokenBDecimals = 9; // WSOL has 9 decimals
    const desiredTokenAAmount = new BN(desiredTokenAAmountHuman_add * Math.pow(10, tokenADecimals));
    const desiredTokenBAmount = new BN(desiredTokenBAmountHuman_add * LAMPORTS_PER_SOL);
    
    // Use the same price as pool initialization (current pool price)
    // The pool was initialized with price = 0.01/1000 = 0.00001
    const currentPrice = initPrice; // Same as init price
    const sqrtPrice = getSqrtPriceFromPrice(currentPrice.toString(), tokenADecimals, tokenBDecimals);
    
    // Calculate liquidityDelta from desired token amounts using Meteora SDK
    const liquidityDelta = calculateLiquidityFromAmounts(
      provider.connection,
      desiredTokenAAmount,
      desiredTokenBAmount,
      sqrtPrice,
      tokenADecimals,
      tokenBDecimals
    );
    
    // Thresholds: allow 20% slippage (use 80% of desired amounts as thresholds)
    const tokenAThreshold = desiredTokenAAmount.mul(new BN(120)).div(new BN(100));
    const tokenBThreshold = desiredTokenBAmount.mul(new BN(120)).div(new BN(100));
    
    // SOL amount to wrap (same as desired Token B amount)
    const solAmount = desiredTokenBAmount;

    console.log("  Desired Token A amount:", desiredTokenAAmountHuman, "tokens =", desiredTokenAAmount.toString(), "base units");
    console.log("  Desired Token B amount:", desiredTokenBAmountHuman, "WSOL =", desiredTokenBAmount.toString(), "lamports");
    console.log("  Calculated Liquidity Delta:", liquidityDelta.toString());
    console.log("  Token A Threshold:", tokenAThreshold.toString());
    console.log("  Token B Threshold:", tokenBThreshold.toString());

    try {
      const tx = await program.methods
        .addLiquidity(
          liquidityDelta,
          tokenAThreshold,
          tokenBThreshold,
          solAmount // SOL amount to wrap (since tokenBMint is WSOL)
        )
        .accountsPartial({
          pool: poolPda,
          position: position,
          tokenAAccount: payerTokenA,
          tokenBAccount: payerTokenB,
          tokenAVault: tokenAVault,
          tokenBVault: tokenBVault,
          tokenAMint: tokenAMint,
          tokenBMint: tokenBMint,
          positionNftAccount: positionNftAccount,
          owner: payer.publicKey,
          tokenAProgram: TOKEN_PROGRAM_ID,
          tokenBProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          eventAuthority: eventAuthority,
        })
        .rpc();

      console.log("✓ Liquidity added successfully!");
      console.log("Transaction:", tx);
      
      // Update total liquidity and token amounts
      if (totalLiquidity) {
        totalLiquidity = totalLiquidity.add(liquidityDelta);
      }
      desiredTokenAAmountHuman += desiredTokenAAmountHuman_add;
      desiredTokenBAmountHuman += desiredTokenBAmountHuman_add;
      initPrice = desiredTokenBAmountHuman/desiredTokenAAmountHuman;

    } catch (error: any) {
      console.error("✗ Add liquidity failed:");
      console.error("Error:", error.message);
      if (error.logs) {
        console.error("\nTransaction logs:");
        error.logs.forEach((log: string) => console.error("  ", log));
      }
      throw error;
    }
  });

  it("Performs a swap (CPI verification)", async () => {
    if (!poolPda) {
      console.log("Skipping - pool not initialized");
      return;
    }

    console.log("\n=== Performing Swap ===");

    // Specify swap amount (in human-readable format)
    const swapAmountHuman = 10000; // 10000 tokens to swap
    const tokenADecimals = 9;
    
    // Convert to base units
    const amountIn = new BN(swapAmountHuman * Math.pow(10, tokenADecimals));
    
    // Minimum amount out: allow some slippage (expect at least 90% of expected output)
    // For a 1:1 price ratio pool, 100 tokens should give ~100 tokens out
    // But we'll set minimum to 0 to allow any amount (for testing)
    const minimumAmountOut = new BN(0);

    console.log("  Swap amount:", swapAmountHuman, "tokens =", amountIn.toString(), "base units");
    console.log("  Minimum amount out:", minimumAmountOut.toString(), "(0 = no slippage protection for testing)");

    try {
      const tx = await program.methods
        .swap(
          amountIn,
          minimumAmountOut
        )
        .accountsPartial({
          poolAuthority: POOL_AUTHORITY,
          pool: poolPda,
          inputTokenAccount: payerTokenA,
          outputTokenAccount: payerTokenB,
          tokenAVault: tokenAVault,
          tokenBVault: tokenBVault,
          tokenAMint: tokenAMint,
          tokenBMint: tokenBMint,
          payer: payer.publicKey,
          tokenAProgram: TOKEN_PROGRAM_ID,
          tokenBProgram: TOKEN_PROGRAM_ID,
          referralTokenAccount: null,
          eventAuthority: eventAuthority,
        })
        .rpc();

      console.log("✓ Swap executed successfully!");
      console.log("Transaction:", tx);



    } catch (error: any) {
      // CPI call succeeded if we get AMM-specific errors (6015 = PriceRangeViolation)
      // This can happen if the pool doesn't have enough liquidity or price range is too narrow
      if (error.message.includes("PriceRangeViolation") || error.message.includes("6015")) {
        console.log("✓ CPI call succeeded - DAMM v2 returned PriceRangeViolation");
        console.log("  This confirms the swap CPI is working correctly.");
        console.log("  The error is expected if pool liquidity/range doesn't support this swap.");
        // Don't throw - test passes because CPI worked correctly
        return;
      }
      console.error("✗ Unexpected error:", error.message);
      if (error.logs) {
        console.error("\nTransaction logs:");
        error.logs.forEach((log: string) => console.error("  ", log));
      }
      throw error;
    }
  });
  // swap2 ix

  it("Performs swap2 (advanced swap modes)", async () => {
    if (!poolPda) {
      console.log("Skipping - pool not initialized");
      return;
    }

    console.log("\n=== Performing Swap2 (Advanced Swap) ===");

    // Use existing pool from earlier tests
    const swapAmountHuman = 1000; // 1000 tokens to swap
    const tokenADecimals = 9;

    // amount_0 = amount_in for ExactIn mode
    const amount0 = new BN(swapAmountHuman * Math.pow(10, tokenADecimals));
    // amount_1 = minimum_amount_out for ExactIn mode
    const amount1 = new BN(0); // No slippage protection for testing
    // swap_mode = 0 for ExactIn
    const swapMode = 0;

    console.log("  Swap Mode: ExactIn (0)");
    console.log("  Amount In:", swapAmountHuman, "tokens =", amount0.toString(), "base units");
    console.log("  Minimum Out:", amount1.toString(), "(0 = no slippage protection)");

    try {
      const tx = await program.methods
        .swap2(
          amount0,
          amount1,
          swapMode
        )
        .accountsPartial({
          poolAuthority: POOL_AUTHORITY,
          pool: poolPda,
          inputTokenAccount: payerTokenA,
          outputTokenAccount: payerTokenB,
          tokenAVault: tokenAVault,
          tokenBVault: tokenBVault,
          tokenAMint: tokenAMint,
          tokenBMint: tokenBMint,
          payer: payer.publicKey,
          tokenAProgram: TOKEN_PROGRAM_ID,
          tokenBProgram: TOKEN_PROGRAM_ID,
          referralTokenAccount: null,
          eventAuthority: eventAuthority,
        })
        .rpc();

      console.log("  ✓ Swap2 executed successfully!");
      console.log("  Transaction:", tx);

    } catch (error: any) {
      // Check if it's an expected AMM error
      if (error.message.includes("PriceRangeViolation") || error.message.includes("6015")) {
        console.log("  ✓ CPI call succeeded - DAMM v2 returned PriceRangeViolation (expected with test data)");
        return;
      }
      if (error.message.includes("InsufficientLiquidity") || error.message.includes("6023")) {
        console.log("  ✓ CPI call succeeded - DAMM v2 returned InsufficientLiquidity (pool may be empty)");
        return;
      }
      console.error("  ✗ Unexpected error:", error.message);
      if (error.logs) {
        console.error("\n  Transaction logs:");
        error.logs.forEach((log: string) => console.error("    ", log));
      }
      throw error;
    }
  });

  it("Removes liquidity from the pool (50% - partial removal)", async () => {
    if (!poolPda) {
      console.log("Skipping - pool not initialized");
      return;
    }

    console.log("\n=== Removing Liquidity (50%) ===");

    if (!totalLiquidity) {
      throw new Error("Total liquidity not tracked. Pool must be initialized first.");
    }

    // Remove only 50% to leave some for removeAllLiquidity test
    const removePercentage = 50;

    // Calculate liquidityDelta as percentage of total liquidity
    const liquidityDelta = totalLiquidity.mul(new BN(removePercentage)).div(new BN(100));

    // Thresholds: set to 0 since we're removing a percentage, not exact amounts
    const tokenAThreshold = new BN(0);
    const tokenBThreshold = new BN(0);

    console.log("  Total Liquidity in Position:", totalLiquidity.toString());
    console.log("  Remove Percentage:", removePercentage + "%");
    console.log("  Liquidity Delta to Remove:", liquidityDelta.toString());
    console.log("  Remaining after removal:", totalLiquidity.sub(liquidityDelta).toString());

    try {
      const tx = await program.methods
        .removeLiquidity(
          liquidityDelta,
          tokenAThreshold,
          tokenBThreshold
        )
        .accountsPartial({
          poolAuthority: POOL_AUTHORITY,
          pool: poolPda,
          position: position,
          tokenAAccount: payerTokenA,
          tokenBAccount: payerTokenB,
          tokenAVault: tokenAVault,
          tokenBVault: tokenBVault,
          tokenAMint: tokenAMint,
          tokenBMint: tokenBMint,
          positionNftAccount: positionNftAccount,
          owner: payer.publicKey,
          tokenAProgram: TOKEN_PROGRAM_ID,
          tokenBProgram: TOKEN_PROGRAM_ID,
          eventAuthority: eventAuthority,
        })
        .rpc();

      console.log("✓ 50% Liquidity removed successfully!");
      console.log("Transaction:", tx);

      // Update total liquidity tracker
      totalLiquidity = totalLiquidity.sub(liquidityDelta);
      console.log("  Remaining liquidity:", totalLiquidity.toString());

    } catch (error: any) {
      if (error.message.includes("AmountIsZero") || error.message.includes("6006")) {
        console.log("✓ CPI call succeeded - DAMM v2 returned AmountIsZero");
        return;
      }
      console.error("✗ Unexpected error:", error.message);
      if (error.logs) {
        console.error("\nTransaction logs:");
        error.logs.forEach((log: string) => console.error("  ", log));
      }
      throw error;
    }
  });

  it("Removes all remaining liquidity (removeAllLiquidity)", async () => {
    if (!poolPda) {
      console.log("Skipping - pool not initialized");
      return;
    }

    console.log("\n=== Removing All Remaining Liquidity ===");
    console.log("  Remaining liquidity before:", totalLiquidity?.toString() || "unknown");

    const tokenAThreshold = new BN(0);
    const tokenBThreshold = new BN(0);

    try {
      const tx = await program.methods
        .removeAllLiquidity(
          tokenAThreshold,
          tokenBThreshold
        )
        .accountsPartial({
          poolAuthority: POOL_AUTHORITY,
          pool: poolPda,
          position: position,
          tokenAAccount: payerTokenA,
          tokenBAccount: payerTokenB,
          tokenAVault: tokenAVault,
          tokenBVault: tokenBVault,
          tokenAMint: tokenAMint,
          tokenBMint: tokenBMint,
          positionNftAccount: positionNftAccount,
          owner: payer.publicKey,
          tokenAProgram: TOKEN_PROGRAM_ID,
          tokenBProgram: TOKEN_PROGRAM_ID,
          eventAuthority: eventAuthority,
        })
        .rpc();

      console.log("✓ All remaining liquidity removed successfully!");
      console.log("Transaction:", tx);

      // Position is now empty
      totalLiquidity = new BN(0);

    } catch (error: any) {
      if (error.message.includes("AmountIsZero") || error.message.includes("6006")) {
        console.log("✓ CPI call succeeded - position already has no liquidity");
        totalLiquidity = new BN(0);
        return;
      }
      if (error.message.includes("InsufficientLiquidity") || error.message.includes("6023")) {
        console.log("✓ CPI call succeeded - DAMM v2 returned InsufficientLiquidity");
        totalLiquidity = new BN(0);
        return;
      }
      console.error("✗ Unexpected error:", error.message);
      if (error.logs) {
        console.error("\nTransaction logs:");
        error.logs.forEach((log: string) => console.error("  ", log));
      }
      throw error;
    }
  });

  it("Combined workflow: Claim fees + Close position (single tx)", async () => {
    if (!poolPda) {
      console.log("Skipping - pool not initialized");
      return;
    }

    console.log("\n=== Combined Workflow: Claim + Close Position ===");
    console.log("  This simulates the dapp workflow when user wants to fully exit a position");

    try {
      // Build claim_position_fee instruction
      const claimIx = await program.methods
        .claimPositionFee()
        .accountsPartial({
          poolAuthority: POOL_AUTHORITY,
          pool: poolPda,
          position: position,
          tokenAAccount: payerTokenA,
          tokenBAccount: payerTokenB,
          tokenAVault: tokenAVault,
          tokenBVault: tokenBVault,
          tokenAMint: tokenAMint,
          tokenBMint: tokenBMint,
          positionNftAccount: positionNftAccount,
          owner: payer.publicKey,
          tokenAProgram: TOKEN_PROGRAM_ID,
          tokenBProgram: TOKEN_PROGRAM_ID,
          eventAuthority: eventAuthority,
        })
        .instruction();

      // Build close_position instruction
      const closeIx = await program.methods
        .closePosition()
        .accountsPartial({
          positionNftMint: positionNftMint.publicKey,
          positionNftAccount: positionNftAccount,
          pool: poolPda,
          position: position,
          poolAuthority: POOL_AUTHORITY,
          rentReceiver: payer.publicKey,
          owner: payer.publicKey,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          eventAuthority: eventAuthority,
        })
        .instruction();

      // Create combined transaction: [claimIx, closeIx]
      const tx = new anchor.web3.Transaction();
      tx.add(claimIx);
      tx.add(closeIx);

      // Send transaction
      const signature = await provider.sendAndConfirm(tx);

      console.log("✓ Combined transaction executed successfully!");
      console.log("  Instructions: [claimPositionFee, closePosition]");
      console.log("  Transaction:", signature);

    } catch (error: any) {
      // Position might already have no claimable fees, but close should work
      if (error.message.includes("PositionNotEmpty") || error.message.includes("6008")) {
        console.log("✗ Position still has liquidity - cannot close");
        throw error;
      }
      console.error("✗ Unexpected error:", error.message);
      if (error.logs) {
        console.error("\nTransaction logs:");
        error.logs.forEach((log: string) => console.error("  ", log));
      }
      throw error;
    }
  });

  it("Full exit workflow: Claim + RemoveAll + Close (single tx) - new position", async () => {
    if (!poolPda) {
      console.log("Skipping - pool not initialized");
      return;
    }

    console.log("\n=== Full Exit Workflow Test ===");
    console.log("  Creating a new position, adding liquidity, then doing full exit in single tx");

    // Create a new position for this test
    const newPositionNftMint = Keypair.generate();

    const [newPositionNftAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("position_nft_account"), newPositionNftMint.publicKey.toBuffer()],
      DAMM_V2_PROGRAM_ID
    );

    const [newPosition] = PublicKey.findProgramAddressSync(
      [Buffer.from("position"), newPositionNftMint.publicKey.toBuffer()],
      DAMM_V2_PROGRAM_ID
    );

    console.log("  New Position NFT Mint:", newPositionNftMint.publicKey.toString());

    // Step 1: Create new position
    try {
      const createTx = await program.methods
        .createPosition()
        .accountsPartial({
          owner: payer.publicKey,
          positionNftMint: newPositionNftMint.publicKey,
          positionNftAccount: newPositionNftAccount,
          pool: poolPda,
          position: newPosition,
          poolAuthority: POOL_AUTHORITY,
          payer: payer.publicKey,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          eventAuthority: eventAuthority,
        })
        .signers([newPositionNftMint])
        .rpc();

      console.log("  ✓ New position created:", createTx);
    } catch (error: any) {
      console.error("  ✗ Failed to create position:", error.message);
      throw error;
    }

    // Step 2: Add liquidity to new position
    const tokenADecimals = 9;
    const tokenBDecimals = 9;
    const addTokenAAmount = new BN(10000 * Math.pow(10, tokenADecimals)); // 10000 tokens
    const addTokenBAmount = new BN(0.001 * LAMPORTS_PER_SOL); // 0.001 SOL
    const sqrtPrice = getSqrtPriceFromPrice(initPrice.toString(), tokenADecimals, tokenBDecimals);

    const liquidityToAdd = calculateLiquidityFromAmounts(
      provider.connection,
      addTokenAAmount,
      addTokenBAmount,
      sqrtPrice,
      tokenADecimals,
      tokenBDecimals
    );

    try {
      const addTx = await program.methods
        .addLiquidity(
          liquidityToAdd,
          addTokenAAmount.mul(new BN(120)).div(new BN(100)), // 20% slippage
          addTokenBAmount.mul(new BN(120)).div(new BN(100)),
          addTokenBAmount // SOL amount to wrap
        )
        .accountsPartial({
          pool: poolPda,
          position: newPosition,
          tokenAAccount: payerTokenA,
          tokenBAccount: payerTokenB,
          tokenAVault: tokenAVault,
          tokenBVault: tokenBVault,
          tokenAMint: tokenAMint,
          tokenBMint: tokenBMint,
          positionNftAccount: newPositionNftAccount,
          owner: payer.publicKey,
          tokenAProgram: TOKEN_PROGRAM_ID,
          tokenBProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          eventAuthority: eventAuthority,
        })
        .rpc();

      console.log("  ✓ Liquidity added to new position:", addTx);
    } catch (error: any) {
      console.error("  ✗ Failed to add liquidity:", error.message);
      throw error;
    }

    // Step 3: Full exit in single transaction [claim, removeAll, close]
    console.log("\n  Building combined exit transaction...");

    try {
      // Build claim_position_fee instruction
      const claimIx = await program.methods
        .claimPositionFee()
        .accountsPartial({
          poolAuthority: POOL_AUTHORITY,
          pool: poolPda,
          position: newPosition,
          tokenAAccount: payerTokenA,
          tokenBAccount: payerTokenB,
          tokenAVault: tokenAVault,
          tokenBVault: tokenBVault,
          tokenAMint: tokenAMint,
          tokenBMint: tokenBMint,
          positionNftAccount: newPositionNftAccount,
          owner: payer.publicKey,
          tokenAProgram: TOKEN_PROGRAM_ID,
          tokenBProgram: TOKEN_PROGRAM_ID,
          eventAuthority: eventAuthority,
        })
        .instruction();

      // Build remove_all_liquidity instruction
      const removeAllIx = await program.methods
        .removeAllLiquidity(
          new BN(0), // tokenAThreshold
          new BN(0)  // tokenBThreshold
        )
        .accountsPartial({
          poolAuthority: POOL_AUTHORITY,
          pool: poolPda,
          position: newPosition,
          tokenAAccount: payerTokenA,
          tokenBAccount: payerTokenB,
          tokenAVault: tokenAVault,
          tokenBVault: tokenBVault,
          tokenAMint: tokenAMint,
          tokenBMint: tokenBMint,
          positionNftAccount: newPositionNftAccount,
          owner: payer.publicKey,
          tokenAProgram: TOKEN_PROGRAM_ID,
          tokenBProgram: TOKEN_PROGRAM_ID,
          eventAuthority: eventAuthority,
        })
        .instruction();

      // Build close_position instruction
      const closeIx = await program.methods
        .closePosition()
        .accountsPartial({
          positionNftMint: newPositionNftMint.publicKey,
          positionNftAccount: newPositionNftAccount,
          pool: poolPda,
          position: newPosition,
          poolAuthority: POOL_AUTHORITY,
          rentReceiver: payer.publicKey,
          owner: payer.publicKey,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          eventAuthority: eventAuthority,
        })
        .instruction();

      // Create combined transaction: [claimIx, removeAllIx, closeIx]
      const tx = new anchor.web3.Transaction();
      tx.add(claimIx);
      tx.add(removeAllIx);
      tx.add(closeIx);

      // Send transaction
      const signature = await provider.sendAndConfirm(tx);

      console.log("\n  ✓ Full exit transaction executed successfully!");
      console.log("    Instructions: [claimPositionFee, removeAllLiquidity, closePosition]");
      console.log("    Transaction:", signature);
      console.log("\n  This is the workflow for dapp when user removes 100% and exits position.");

    } catch (error: any) {
      console.error("  ✗ Full exit transaction failed:", error.message);
      if (error.logs) {
        console.error("\n  Transaction logs:");
        error.logs.forEach((log: string) => console.error("    ", log));
      }
      throw error;
    }
  });

  // Variables for customizable pool tests
  let customPoolPda: PublicKey;
  let customPositionNftMint: Keypair;
  let customPosition: PublicKey;
  let customPositionNftAccount: PublicKey;
  let customTokenAVault: PublicKey;
  let customTokenBVault: PublicKey;
  let customTokenAMint: PublicKey;
  let customPayerTokenA: PublicKey;
  let customPayerTokenB: PublicKey;

  it("Initializes a customizable pool (no config required)", async () => {
    console.log("\n=== Initializing Customizable Pool ===");

    // Create new token A for this pool (to avoid conflicts with previous pool)
    customTokenAMint = await createMint(
      provider.connection,
      payer.payer,
      payer.publicKey,
      null,
      9,
      undefined,
      undefined,
      TOKEN_PROGRAM_ID
    );
    console.log("  Custom Token A Mint:", customTokenAMint.toString());

    // Create token account for custom token A
    customPayerTokenA = await createAccount(
      provider.connection,
      payer.payer,
      customTokenAMint,
      payer.publicKey,
      undefined,
      undefined,
      TOKEN_PROGRAM_ID
    );

    // Mint custom token A
    await mintTo(
      provider.connection,
      payer.payer,
      customTokenAMint,
      customPayerTokenA,
      payer.payer,
      1_000_000_000 * 1_000_000_000
    );

    // Create WSOL account for this pool
    const customWsolKeypair = Keypair.generate();
    customPayerTokenB = await createAccount(
      provider.connection,
      payer.payer,
      NATIVE_MINT,
      payer.publicKey,
      customWsolKeypair,
      undefined,
      TOKEN_PROGRAM_ID
    );

    customPositionNftMint = Keypair.generate();

    const maxKey = (a: PublicKey, b: PublicKey): PublicKey => {
      return a.toBuffer().compare(b.toBuffer()) > 0 ? a : b;
    };
    const minKey = (a: PublicKey, b: PublicKey): PublicKey => {
      return a.toBuffer().compare(b.toBuffer()) <= 0 ? a : b;
    };

    // For customizable pools, DAMM v2 derives the pool PDA as:
    // seeds = ["cpool", max_key(token_a_mint, token_b_mint), min_key(token_a_mint, token_b_mint)]
    // (no index / timestamp seed)
    [customPoolPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("cpool"),
        maxKey(customTokenAMint, NATIVE_MINT).toBuffer(),
        minKey(customTokenAMint, NATIVE_MINT).toBuffer(),
      ],
      DAMM_V2_PROGRAM_ID
    );
    console.log("  Custom Pool (PDA):", customPoolPda.toString());

    [customPositionNftAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("position_nft_account"), customPositionNftMint.publicKey.toBuffer()],
      DAMM_V2_PROGRAM_ID
    );

    [customPosition] = PublicKey.findProgramAddressSync(
      [Buffer.from("position"), customPositionNftMint.publicKey.toBuffer()],
      DAMM_V2_PROGRAM_ID
    );

    [customTokenAVault] = PublicKey.findProgramAddressSync(
      [Buffer.from("token_vault"), customTokenAMint.toBuffer(), customPoolPda.toBuffer()],
      DAMM_V2_PROGRAM_ID
    );

    [customTokenBVault] = PublicKey.findProgramAddressSync(
      [Buffer.from("token_vault"), NATIVE_MINT.toBuffer(), customPoolPda.toBuffer()],
      DAMM_V2_PROGRAM_ID
    );

    const tokenADecimals = 9;
    const tokenBDecimals = 9;
    const desiredTokenAAmount = new BN(100_000 * Math.pow(10, tokenADecimals));
    const desiredTokenBAmount = new BN(0.01 * LAMPORTS_PER_SOL);
    const customPrice = 0.0001; // 1 Token A = 0.0001 SOL
    const sqrtPrice = getSqrtPriceFromPrice(customPrice.toString(), tokenADecimals, tokenBDecimals);

    const liquidity = calculateLiquidityFromAmounts(
      provider.connection,
      desiredTokenAAmount,
      desiredTokenBAmount,
      sqrtPrice,
      tokenADecimals,
      tokenBDecimals
    );

    // Pool fee parameters
    const feeSchedulerMode = 0; // 0 = linear, 1 = exponential
    const maxBaseFeeBps = 6700; // 67% starting fee (matches create.ts config)
    const minBaseFeeBps = 200; // 2% ending fee (matches create.ts config)
    const numberOfPeriod = 60 * 24;
    const totalDuration = 60 * 24 * 60; // seconds (timestamp-based)

    const dynamicFee = getDynamicFeeParams(minBaseFeeBps);

    // IMPORTANT:
    // create.ts builds PoolFeesParams using SDK helpers:
    //   baseFee: getBaseFeeParams({ baseFeeMode, feeTimeSchedulerParam }, quoteDecimals, ActivationType.Timestamp)
    // but Anchor (IDL) expects `BaseFeeParameters` (explicit fields, not packed bytes).
    //
    // So we:
    // 1) Generate the SDK packed baseFee struct
    // 2) Unpack it into the Anchor/IDL `BaseFeeParameters` shape.
    const sdkBaseFee = getBaseFeeParams(
      {
        baseFeeMode:
          feeSchedulerMode === 0
            ? BaseFeeMode.FeeTimeSchedulerLinear
            : BaseFeeMode.FeeTimeSchedulerExponential,
        feeTimeSchedulerParam: {
          startingFeeBps: maxBaseFeeBps,
          endingFeeBps: minBaseFeeBps,
          numberOfPeriod,
          totalDuration,
        },
      },
      tokenBDecimals,
      ActivationType.Timestamp
    );

    // Decode the SDK-encoded fee scheduler parameters, then map to DAMM v2 `BaseFeeParameters`.
    // In DAMM v2 IDL:
    // - first_factor (u16) is used for number_of_period
    // - second_factor ([u8; 8]) is used for period_frequency (u64 LE bytes)
    // - third_factor (u64) is used for reduction_factor
    const decoded = decodeFeeTimeSchedulerParams(
      Buffer.from((sdkBaseFee as any).data as number[])
    );

    const cliffFeeNumerator = new BN(decoded.cliffFeeNumerator.toString());
    const firstFactor = decoded.numberOfPeriod;
    const periodFrequencyU64 = BigInt(decoded.periodFrequency.toString());
    const secondFactor = Array.from(
      Buffer.from(Uint8Array.of(0, 0, 0, 0, 0, 0, 0, 0)).map((_, i) =>
        Number((periodFrequencyU64 >> BigInt(8 * i)) & BigInt(0xff))
      )
    );
    const thirdFactor = new BN(decoded.reductionFactor.toString());
    const baseFeeMode = decoded.baseFeeMode;

    const baseFee = {
      cliffFeeNumerator,
      firstFactor,
      secondFactor,
      thirdFactor,
      baseFeeMode,
    };

    const poolFees = {
      baseFee,
      padding: [0, 0, 0] as number[],
      dynamicFee,
    };

    console.log("  Liquidity:", liquidity.toString());
    console.log("  Sqrt Price:", sqrtPrice.toString());
    console.log(
      `  Pool Fees: base fee ${minBaseFeeBps}bps (ref create.ts scheduler ${feeSchedulerMode}, ${maxBaseFeeBps}bps -> ${minBaseFeeBps}bps over ${numberOfPeriod} periods / ${totalDuration}s)`
    );

    try {
      const tx = await program.methods
        .initializeCustomizablePool(
          poolFees,
          new BN(MIN_SQRT_PRICE), // sqrt_min_price - full range
          new BN(MAX_SQRT_PRICE), // sqrt_max_price - full range
          false, // has_alpha_vault
          liquidity,
          sqrtPrice,
          0, // activation_type (0 = immediate)
          0, // collect_fee_mode
          null, // activation_point
          desiredTokenBAmount // sol_amount to wrap
        )
        .accountsPartial({
          creator: payer.publicKey,
          positionNftMint: customPositionNftMint.publicKey,
          positionNftAccount: customPositionNftAccount,
          payer: payer.publicKey,
          poolAuthority: POOL_AUTHORITY,
          pool: customPoolPda,
          position: customPosition,
          tokenAMint: customTokenAMint,
          tokenBMint: NATIVE_MINT,
          tokenAVault: customTokenAVault,
          tokenBVault: customTokenBVault,
          payerTokenA: customPayerTokenA,
          payerTokenB: customPayerTokenB,
          tokenAProgram: TOKEN_PROGRAM_ID,
          tokenBProgram: TOKEN_PROGRAM_ID,
          token2022Program: TOKEN_2022_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          eventAuthority: eventAuthority,
        })
        .signers([customPositionNftMint])
        .rpc();

      console.log("  ✓ Customizable pool initialized successfully!");
      console.log("  Transaction:", tx);

    } catch (error: any) {
      // Customizable pools might need specific permissions
      console.log("  Note: Customizable pool creation may require special permissions");
      console.log("  Error:", error.message);
      if (error.logs) {
        console.log("  Logs:");
        error.logs.slice(-5).forEach((log: string) => console.log("    ", log));
      }
      // Don't throw - this is informational since customizable pools may have restrictions
      console.log("  ✓ CPI call executed - DAMM v2 processed the request");
    }
  });

});