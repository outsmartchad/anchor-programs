#!/bin/bash
# Open interactive Docker session for Anchor development

cd /root/anchor-learning/token22-vault-practice

docker run --rm -it \
  -v "$(pwd):/workspace" \
  -v "$HOME/.config/solana:/root/.config/solana" \
  -w /workspace \
  anchor-builder:latest \
  bash
