import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Token22VaultPractice } from "../target/types/token22_vault_practice";
import {
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createMint,
  mintTo,
  createAssociatedTokenAccount,
  getAccount,
} from "@solana/spl-token";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";

describe("token22-vault-practice", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Token22VaultPractice as Program<Token22VaultPractice>;
  const provider = anchor.getProvider();

  // Test accounts
  let mint: PublicKey;
  let userTokenAccount: PublicKey;
  let vaultTokenAccount: PublicKey;
  let vault: PublicKey;
  let vaultBump: number;

  it("Creates a new Token-2022 mint", async () => {
    // Create a new Token-2022 mint
    mint = await createMint(
      provider.connection,
      (provider.wallet as anchor.Wallet).payer, // payer
      (provider.wallet as anchor.Wallet).publicKey, // mint authority
      null, // freeze authority
      9, // decimals
      undefined, // keypair
      undefined, // confirmOptions
      TOKEN_2022_PROGRAM_ID // IMPORTANT: Use Token-2022 program ID
    );

    console.log("Token-2022 Mint created:", mint.toString());
    
    // Create user's token account (associated)
    userTokenAccount = await createAssociatedTokenAccount(
      provider.connection,
      (provider.wallet as anchor.Wallet).payer,
      mint,
      provider.wallet.publicKey,
      undefined,
      TOKEN_2022_PROGRAM_ID, // Use Token-2022
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    console.log("User ATA created:", userTokenAccount.toString());

    // Mint some tokens to the user
    await mintTo(
      provider.connection,
      (provider.wallet as anchor.Wallet).payer,
      mint,
      userTokenAccount,
      provider.wallet.publicKey,
      1_000_000_000 * 10 ** 9,
      [],
      undefined,
      TOKEN_2022_PROGRAM_ID // Use Token-2022
    );

    const balance = await getAccount(
      provider.connection, 
      userTokenAccount, 
      undefined, 
      TOKEN_2022_PROGRAM_ID
    );
    console.log("User balance:", Number(balance.amount));
  });

  it("Initializes the vault", async () => {
    // Derive vault PDA
    [vault, vaultBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("token22_vault"), mint.toBuffer()],
      program.programId
    );

    console.log("Vault PDA:", vault.toString());

    // Derive vault's token account address
    vaultTokenAccount = await getAssociatedTokenAddress(
      mint,
      vault,
      true, // allowOwnerOffCurve
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    console.log("Vault ATA address:", vaultTokenAccount.toString());

    // Initialize vault (this will also create the vault's token account via Anchor)
    const tx = await program.methods
      .initializeVault()
      .accounts({
        user: provider.wallet.publicKey,
        mint: mint,
        vault: vault,
        vaultTokenAccount: vaultTokenAccount,
        tokenProgram: TOKEN_2022_PROGRAM_ID, // Use Token-2022
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("Initialize vault transaction:", tx);

    // Verify vault was initialized
    const vaultAccount = await program.account.token22Vault.fetch(vault);
    console.log("Vault initialized with mint:", vaultAccount.mint.toString());
  });

  it("Deposits tokens into the vault", async () => {
    const depositAmount = new anchor.BN(1_000_000 * 10 ** 9);

    // Get initial balances
    const userBalanceBefore = await getAccount(
      provider.connection, 
      userTokenAccount, 
      undefined, 
      TOKEN_2022_PROGRAM_ID
    );
    
    // Check if vault token account exists
    let vaultBalanceBefore;
    try {
      vaultBalanceBefore = await getAccount(
        provider.connection, 
        vaultTokenAccount, 
        undefined, 
        TOKEN_2022_PROGRAM_ID
      );
      console.log("Vault ATA exists");
    } catch (err) {
      console.log("Vault ATA doesn't exist yet (should have been created by init)");
      vaultBalanceBefore = { amount: BigInt(0) };
    }

    console.log("Before deposit:");
    console.log("  User balance:", Number(userBalanceBefore.amount));
    console.log("  Vault balance:", Number(vaultBalanceBefore.amount));

    // Deposit tokens
    const tx = await program.methods
      .depositToken(depositAmount)
      .accounts({
        user: provider.wallet.publicKey,
        userTokenAccount: userTokenAccount,
        vaultTokenAccount: vaultTokenAccount,
        mint: mint,
        vault: vault,
        tokenProgram: TOKEN_2022_PROGRAM_ID, // Use Token-2022
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("Deposit transaction:", tx);

    // Get balances after deposit
    const userBalanceAfter = await getAccount(
      provider.connection, 
      userTokenAccount, 
      undefined, 
      TOKEN_2022_PROGRAM_ID
    );
    const vaultBalanceAfter = await getAccount(
      provider.connection, 
      vaultTokenAccount, 
      undefined, 
      TOKEN_2022_PROGRAM_ID
    );

    console.log("After deposit:");
    console.log("  User balance:", Number(userBalanceAfter.amount));
    console.log("  Vault balance:", Number(vaultBalanceAfter.amount));
  });
});
