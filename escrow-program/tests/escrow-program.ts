import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { EscrowProgram } from "../target/types/escrow_program";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createInitializeMint2Instruction,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
  getMinimumBalanceForRentExemptMint,
} from "@solana/spl-token";
import { randomBytes } from "crypto";
import { assert } from "chai";

describe("escrow-program", () => {
  // Set provider, connection and program
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.getProvider() as anchor.AnchorProvider;
  const connection = provider.connection;
  const program = anchor.workspace.EscrowProgram as Program<EscrowProgram>;

  // Generate keypairs for initializer, taker, and two token mints
  const [initializer, taker, mintA, mintB] = Array.from({ length: 4 }, () =>
    Keypair.generate()
  );

  // Derive associated token addresses for all combinations
  const [initializerAtaA, initializerAtaB, takerAtaA, takerAtaB] = [
    initializer,
    taker,
  ]
    .map((a) =>
      [mintA, mintB].map((m) =>
        getAssociatedTokenAddressSync(m.publicKey, a.publicKey)
      )
    )
    .flat();

  // Generate a random seed for the escrow PDA
  const seed = new anchor.BN(randomBytes(8));

  // Derive escrow PDA and vault addresses
  const escrow = PublicKey.findProgramAddressSync(
    [Buffer.from("state"), seed.toArrayLike(Buffer, "le", 8)],
    program.programId
  )[0];
  const vault = getAssociatedTokenAddressSync(mintA.publicKey, escrow, true);

  // Account wrapper for easier access in tests
  const accounts = {
    initializer: initializer.publicKey,
    taker: taker.publicKey,
    mintA: mintA.publicKey,
    mintB: mintB.publicKey,
    initializerAtaA,
    initializerAtaB,
    takerAtaA,
    takerAtaB,
    escrow,
    vault,
    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    tokenProgram: TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
  };

  // Helper to confirm transactions
  const confirm = async (signature: string): Promise<string> => {
    const block = await connection.getLatestBlockhash();
    await connection.confirmTransaction({
      signature,
      ...block,
    });
    return signature;
  };

  // Helper to log transaction signatures
  const log = async (signature: string): Promise<string> => {
    console.log(
      `Transaction: https://explorer.solana.com/transaction/${signature}?cluster=custom&customUrl=${connection.rpcEndpoint}`
    );
    return signature;
  };

  it("Airdrop SOL and create mints", async () => {
    const lamports = await getMinimumBalanceForRentExemptMint(connection);
    const tx = new Transaction();

    tx.instructions = [
      // Transfer SOL to initializer and taker
      ...[initializer, taker].map((k) =>
        SystemProgram.transfer({
          fromPubkey: provider.publicKey,
          toPubkey: k.publicKey,
          lamports: 0.01 * LAMPORTS_PER_SOL,
        })
      ),
      // Create mint accounts
      ...[mintA, mintB].map((m) =>
        SystemProgram.createAccount({
          fromPubkey: provider.publicKey,
          newAccountPubkey: m.publicKey,
          lamports,
          space: MINT_SIZE,
          programId: TOKEN_PROGRAM_ID,
        })
      ),
      // Initialize mints and create ATAs with initial balances
      ...[
        [mintA.publicKey, initializer.publicKey, initializerAtaA],
        [mintB.publicKey, taker.publicKey, takerAtaB],
      ].flatMap((x) => [
        createInitializeMint2Instruction(x[0] as PublicKey, 6, x[1] as PublicKey, null),
        createAssociatedTokenAccountIdempotentInstruction(
          provider.publicKey,
          x[2] as PublicKey,
          x[1] as PublicKey,
          x[0] as PublicKey
        ),
        createMintToInstruction(x[0] as PublicKey, x[2] as PublicKey, x[1] as PublicKey, 1e9),
      ]),
    ];

    await provider.sendAndConfirm(tx, [mintA, mintB, initializer, taker]).then(log);

    // Verify balances
    const initializerBalance = await connection.getTokenAccountBalance(initializerAtaA);
    const takerBalance = await connection.getTokenAccountBalance(takerAtaB);

    assert.equal(initializerBalance.value.amount, "1000000000");
    assert.equal(takerBalance.value.amount, "1000000000");
    console.log("Initializer mint A balance:", initializerBalance.value.uiAmount);
    console.log("Taker mint B balance:", takerBalance.value.uiAmount);
  });

  it("Initialize escrow", async () => {
    const initializerAmount = 1e6; // 1 token with 6 decimals
    const takerAmount = 1e6;

    await program.methods
      .initialize(seed, new anchor.BN(initializerAmount), new anchor.BN(takerAmount))
      .accounts({ ...accounts })
      .signers([initializer])
      .rpc()
      .then(confirm)
      .then(log);

    // Verify escrow state
    const escrowAccount = await program.account.escrow.fetch(escrow);
    assert.ok(escrowAccount.seed.eq(seed));
    assert.ok(escrowAccount.initializer.equals(initializer.publicKey));
    assert.ok(escrowAccount.mintA.equals(mintA.publicKey));
    assert.ok(escrowAccount.mintB.equals(mintB.publicKey));
    assert.equal(escrowAccount.initializerAmount.toNumber(), initializerAmount);
    assert.equal(escrowAccount.takerAmount.toNumber(), takerAmount);

    // Verify vault received tokens
    const vaultBalance = await connection.getTokenAccountBalance(vault);
    assert.equal(vaultBalance.value.amount, initializerAmount.toString());
    console.log("Vault balance after initialize:", vaultBalance.value.uiAmount);
  });

  // Skip cancel test by default since it conflicts with exchange
  // Remove 'x' prefix to run cancel test instead of exchange
  xit("Cancel escrow", async () => {
    const initializerBalanceBefore = await connection.getTokenAccountBalance(initializerAtaA);

    await program.methods
      .cancel()
      .accounts({ ...accounts })
      .signers([initializer])
      .rpc()
      .then(confirm)
      .then(log);

    // Verify tokens returned to initializer
    const initializerBalanceAfter = await connection.getTokenAccountBalance(initializerAtaA);
    assert.equal(
      Number(initializerBalanceAfter.value.amount) - Number(initializerBalanceBefore.value.amount),
      1e6
    );
    console.log("Initializer balance after cancel:", initializerBalanceAfter.value.uiAmount);

    // Verify escrow account is closed
    const escrowAccount = await connection.getAccountInfo(escrow);
    assert.isNull(escrowAccount);
  });

  it("Exchange tokens", async () => {
    const initializerBalanceBefore = await connection.getBalance(initializer.publicKey);

    await program.methods
      .exchange()
      .accounts({ ...accounts })
      .signers([taker])
      .rpc()
      .then(confirm)
      .then(log);

    // Verify taker received mint A tokens
    const takerAtaABalance = await connection.getTokenAccountBalance(takerAtaA);
    assert.equal(takerAtaABalance.value.amount, "1000000");
    console.log("Taker mint A balance after exchange:", takerAtaABalance.value.uiAmount);

    // Verify initializer received mint B tokens
    const initializerAtaBBalance = await connection.getTokenAccountBalance(initializerAtaB);
    assert.equal(initializerAtaBBalance.value.amount, "1000000");
    console.log("Initializer mint B balance after exchange:", initializerAtaBBalance.value.uiAmount);

    // Verify escrow account is closed
    const escrowAccount = await connection.getAccountInfo(escrow);
    assert.isNull(escrowAccount);

    // Verify initializer received rent back
    const initializerBalanceAfter = await connection.getBalance(initializer.publicKey);
    assert.isAbove(initializerBalanceAfter, initializerBalanceBefore);
    console.log("Initializer received rent back:", (initializerBalanceAfter - initializerBalanceBefore) / LAMPORTS_PER_SOL, "SOL");
  });
});
