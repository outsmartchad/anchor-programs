# Docker Commands for Anchor Development

## 1. Build the Docker Image

Run this once to create the environment:

```bash
docker build -t anchor-builder:latest -f Dockerfile .
```

## 2. Start the Container

Run this to start an interactive shell:

```bash
./docker-run.sh
```

## 3. Inside the Container

Once inside, you can run all Anchor commands:

```bash
# Build the program
anchor build

# Run tests
anchor test

# Deploy (requires wallet setup)
anchor deploy
```

## 4. Troubleshooting

If you have permission issues with `docker-run.sh`:

```bash
chmod +x docker-run.sh
```

If you need to rebuild the image (e.g. after changing Dockerfile):

```bash
docker build -t anchor-builder:latest -f Dockerfile .
```

## 5. Persistence

- Your code in the current directory is mounted to `/workspace`
- Changes made inside/outside are synced
- Solana wallet config is mounted from `~/.config/solana`
