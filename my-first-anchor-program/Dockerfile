FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive

# Clean and install deps
RUN rm -rf /var/lib/apt/lists/* \
    && apt-get update \
    && apt-get install -y --no-install-recommends \
        curl \
        build-essential \
        libssl-dev \
        pkg-config \
        libudev-dev \
        git \
        ca-certificates \
        unzip \
    && rm -rf /var/lib/apt/lists/*

# Rust (already in PATH via ENV below)
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y

# Modern all-in-one installer
RUN curl -sSfL https://solana-install.solana.workers.dev | bash \
    && . "$HOME/.bashrc"  # Source immediately to pick up any appended exports

# Make PATH persistent across layers (critical!)
ENV PATH="/root/.local/share/solana/install/active_release/bin:/root/.cargo/bin:${PATH}"

# Optional: Pin Anchor version for Blueshift course consistency (check your course for exact, e.g. 0.29.0 or 0.30.1)
# RUN avm install 0.30.1 && avm use 0.30.1

# Verify installations (now solana/anchor should be found)
RUN rustc --version && \
    cargo --version && \
    solana --version && \
    anchor --version

SHELL ["/bin/bash", "-c"]