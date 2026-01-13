import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { MyFirstAnchorProgram } from "../target/types/my_first_anchor_program";
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram } from "@solana/web3.js";
import { expect } from "chai";

describe("my-first-anchor-program", () => {
  // Configure the client to use the devnet cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.MyFirstAnchorProgram as Program<MyFirstAnchorProgram>;
  const signer = provider.wallet;

  it("Initializes vault", async () => {
    // Derive the PDA for the vault
    const [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), signer.publicKey.toBuffer()],
      program.programId
    );

    // Check if vault already exists
    try {
      const vaultAccount = await program.account.vault.fetch(vaultPda);
      console.log("Vault already initialized, skipping initialization");
      console.log("Vault owner:", vaultAccount.owner.toString());
      return; // Skip if already initialized
    } catch (err) {
      // Vault doesn't exist, proceed with initialization
    }

    // Initialize the vault account
    const tx = await program.methods
      .initialize()
      .accounts({
        signer: signer.publicKey,
        vault: vaultPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("Initialize transaction signature:", tx);
  });

  it("Deposits lamports to vault", async () => {
    // Derive the PDA for the vault
    const [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), signer.publicKey.toBuffer()],
      program.programId
    );

    const depositAmount = new anchor.BN(300_000_000); // 0.3 SOL

    // Deposit to vault
    const tx = await program.methods
      .deposit(depositAmount)
      .accounts({
        signer: signer.publicKey,
        vault: vaultPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("Deposit transaction signature:", tx);

    // Check vault balance increased
    const vaultBalance = await provider.connection.getBalance(vaultPda);
    expect(vaultBalance).to.be.greaterThan(0);
  });

  it("Withdraws lamports from vault", async () => {
    // Derive the PDA for the vault
    const [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), signer.publicKey.toBuffer()],
      program.programId
    );

    // Check vault balance first
    const vaultBalanceBefore = await provider.connection.getBalance(vaultPda);
    console.log("Vault balance before withdraw:", vaultBalanceBefore);

    // Calculate rent-exempt minimum for the vault account
    // Vault account size: discriminator (8) + owner (32) + total_deposits (8) + total_withdrawals (8) = 56 bytes
    const accountDataLength = 8 + 32 + 8 + 8; // 56 bytes
    const rentExemptMin = await provider.connection.getMinimumBalanceForRentExemption(accountDataLength);
    console.log("Rent-exempt minimum:", rentExemptMin);

    // Only withdraw what's available above the rent-exempt minimum
    const availableToWithdraw = Math.max(0, vaultBalanceBefore - rentExemptMin);
    
    if (availableToWithdraw === 0) {
      console.log("Vault has no withdrawable balance above rent-exempt minimum");
      return; // Skip test if nothing to withdraw
    }

    const withdrawAmount = new anchor.BN(availableToWithdraw);
    const balanceBefore = await provider.connection.getBalance(signer.publicKey);

    // Withdraw from vault
    const tx = await program.methods
      .withdraw(withdrawAmount)
      .accounts({
        signer: signer.publicKey,
        vault: vaultPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("Withdraw transaction signature:", tx);

    // Check signer balance increased
    const balanceAfter = await provider.connection.getBalance(signer.publicKey);
    expect(balanceAfter).to.be.greaterThan(balanceBefore);
  });
});
