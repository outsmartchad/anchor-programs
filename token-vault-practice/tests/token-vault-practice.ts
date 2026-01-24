import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { TokenVaultPractice } from "../target/types/token_vault_practice";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createMint,
  mintTo,
  createAssociatedTokenAccount,
  createAccount,
  getAccount,
} from "@solana/spl-token";
import { Keypair, PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";

describe("token-vault-practice", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.TokenVaultPractice as Program<TokenVaultPractice>;
  const provider = anchor.getProvider();

  // Test accounts
  let mint: PublicKey;
  let userTokenAccount: PublicKey;
  let vaultTokenAccount: PublicKey;
  let vault: PublicKey;
  let vaultBump: number;

  it("Creates a new SPL token mint", async () => {
    const mintKeypair = Keypair.generate();
    mint = await createMint(
      provider.connection,
      (provider.wallet as anchor.Wallet).payer, // payer
      (provider.wallet as anchor.Wallet).publicKey, // mint authority
      null, // freeze authority (null = no freeze)
      9 // decimals
    );

    console.log("Mint created:", mint.toString());
    
    // Create user's token account
    userTokenAccount = await getAssociatedTokenAddress(
      mint,
      provider.wallet.publicKey
    );

    // Create the associated token account if it doesn't exist
    try {
      await createAssociatedTokenAccount(
        provider.connection,
        (provider.wallet as anchor.Wallet).payer,
        mint,
        provider.wallet.publicKey
      );
      console.log("User token account created:", userTokenAccount.toString());
    } catch (err) {
      console.log("User token account may already exist");
    }

    // Mint some tokens to the user (1_000_000_000 tokens with 9 decimals = 1_000_000_000 * 10^9)
    const mintAmount = 1_000_000_000 * 10 ** 9;
    await mintTo(
      provider.connection,
      (provider.wallet as anchor.Wallet).payer,
      mint,
      userTokenAccount,
      (provider.wallet as anchor.Wallet).payer, // mint authority
      mintAmount
    );

    const userBalance = await getAccount(provider.connection, userTokenAccount);
    console.log("User token balance:", Number(userBalance.amount) / 10 ** 9, "tokens");
  });

  it("Initializes the vault", async () => {
    // Derive vault PDA
    [vault, vaultBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("token_vault"), mint.toBuffer()],
      program.programId
    );

    console.log("Vault PDA:", vault.toString());
    console.log("Vault bump:", vaultBump);

    // Derive vault's token account address
    vaultTokenAccount = await getAssociatedTokenAddress(
      mint,
      vault,
      true // allowOwnerOffCurve (for PDA)
    );

    console.log("Vault token account address:", vaultTokenAccount.toString());

    // Initialize vault (this will also create the vault's token account)
    const tx = await program.methods
      .initializeVault()
      .accounts({
        user: provider.wallet.publicKey,
        mint: mint,
        vault: vault,
        vaultTokenAccount: vaultTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("Initialize vault transaction:", tx);

    // Verify vault was initialized
    const vaultAccount = await program.account.tokenVault.fetch(vault);
    console.log("Vault mint:", vaultAccount.mint.toString());
    console.log("Vault total deposits:", vaultAccount.totalDeposits.toString());
    console.log("Vault bump:", vaultAccount.bump);
  });

  it("Deposits tokens into the vault", async () => {
    const depositAmount = new anchor.BN(1_000_000 * 10 ** 9); // 1_000_000 tokens

    // Get initial balances
    const userBalanceBefore = await getAccount(provider.connection, userTokenAccount);
    
    // Check if vault token account exists (for PDAs, it might not exist yet)
    let vaultBalanceBefore;
    try {
      vaultBalanceBefore = await getAccount(provider.connection, vaultTokenAccount);
      console.log("Vault token account exists");
    } catch (err) {
      // Account doesn't exist yet - will be created automatically on transfer
      vaultBalanceBefore = { amount: BigInt(0) } as any;
      console.log("Vault token account doesn't exist yet (balance = 0)");
    }

    console.log("Before deposit:");
    console.log("  User balance:", Number(userBalanceBefore.amount) / 10 ** 9, "tokens");
    console.log("  Vault balance:", Number(vaultBalanceBefore.amount) / 10 ** 9, "tokens");

    // Deposit tokens
    const tx = await program.methods
      .depositToken(depositAmount)
      .accounts({
        user: provider.wallet.publicKey,
        userTokenAccount: userTokenAccount,
        vaultTokenAccount: vaultTokenAccount,
        mint: mint,
        vault: vault,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("Deposit transaction:", tx);

    // Get balances after deposit
    const userBalanceAfter = await getAccount(provider.connection, userTokenAccount);
    const vaultBalanceAfter = await getAccount(provider.connection, vaultTokenAccount);

    console.log("After deposit:");
    console.log("  User balance:", Number(userBalanceAfter.amount) / 10 ** 9, "tokens");
    console.log("  Vault balance:", Number(vaultBalanceAfter.amount) / 10 ** 9, "tokens");

    // Verify vault state
    const vaultAccount = await program.account.tokenVault.fetch(vault);
    console.log("Vault total deposits:", vaultAccount.totalDeposits.toString());

    // Verify balances
    const expectedUserBalance = Number(userBalanceBefore.amount) - depositAmount.toNumber();
    const expectedVaultBalance = Number(vaultBalanceBefore.amount) + depositAmount.toNumber();

    console.log("Expected user balance:", expectedUserBalance / 10 ** 9);
    console.log("Expected vault balance:", expectedVaultBalance / 10 ** 9);

    // Assertions
    if (Number(userBalanceAfter.amount) !== expectedUserBalance) {
      throw new Error("User balance mismatch!");
    }
    if (Number(vaultBalanceAfter.amount) !== expectedVaultBalance) {
      throw new Error("Vault balance mismatch!");
    }
    if (vaultAccount.totalDeposits.toString() !== depositAmount.toString()) {
      throw new Error("Vault total deposits mismatch!");
    }

    console.log("✅ Deposit test passed!");
  });
});
