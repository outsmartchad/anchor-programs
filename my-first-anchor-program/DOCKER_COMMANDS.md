# Docker Commands for Anchor Development

## Build Docker Image (one-time)
```bash
cd /root/anchor-learning/my-first-anchor-program
docker build -t anchor-builder:latest -f Dockerfile .
```

## Open Interactive Session
```bash
cd /root/anchor-learning/my-first-anchor-program
./docker-run.sh
```

Or manually:
```bash
docker run --rm -it \
  -v "$(pwd):/workspace" \
  -v "$HOME/.config/solana:/root/.config/solana" \
  -w /workspace \
  anchor-builder:latest \
  bash
```

## Run Single Command
```bash
docker run --rm \
  -v "$(pwd):/workspace" \
  -v "$HOME/.config/solana:/root/.config/solana" \
  -w /workspace \
  anchor-builder:latest \
  bash -c "YOUR_COMMAND_HERE"
```

## Examples

### Build
```bash
docker run --rm -v "$(pwd):/workspace" -v "$HOME/.config/solana:/root/.config/solana" -w /workspace anchor-builder:latest bash -c "anchor build"
```

### Test
```bash
docker run --rm -v "$(pwd):/workspace" -v "$HOME/.config/solana:/root/.config/solana" -w /workspace anchor-builder:latest bash -c "anchor test --skip-deploy --skip-local-validator"
```

### Deploy
```bash
docker run --rm -v "$(pwd):/workspace" -v "$HOME/.config/solana:/root/.config/solana" -w /workspace anchor-builder:latest bash -c "anchor deploy --provider.cluster devnet"
```

### Check Balance
```bash
docker run --rm -v "$(pwd):/workspace" -v "$HOME/.config/solana:/root/.config/solana" -w /workspace anchor-builder:latest bash -c "solana balance --url devnet"
```

## Notes
- Use `./docker-run.sh` for interactive session (recommended)
- Use single command pattern for one-off commands
- Always run from project directory: `/root/anchor-learning/my-first-anchor-program`
