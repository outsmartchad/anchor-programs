# Anchor Commands (Run inside Docker session)

## Build
```bash
anchor build
```

## Test
```bash
anchor test --skip-deploy --skip-local-validator
```

## Deploy
```bash
anchor deploy --provider.cluster devnet
```

## Upgrade
```bash
anchor upgrade target/deploy/my_first_anchor_program.so --program-id YOUR_PROGRAM_ID --provider.cluster devnet
```

## Solana Commands

```bash
solana balance --url devnet
solana address --url devnet
solana airdrop 2 --url devnet
solana program show YOUR_PROGRAM_ID --url devnet
solana program close YOUR_PROGRAM_ID --url devnet --bypass-warning
solana-keygen new --outfile target/deploy/my_first_anchor_program-keypair.json --force --no-bip39-passphrase
```

## Common Workflow
```bash
anchor build
anchor test --skip-deploy --skip-local-validator
anchor deploy --provider.cluster devnet
solana balance --url devnet
```
