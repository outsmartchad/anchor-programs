# Anchor Learning Project

This is a beginner-friendly Anchor project for learning Solana program development following the Blueshift course.

## Project Structure

```
my-first-anchor-program/
├── programs/
│   └── my-first-anchor-program/
│       └── src/
│           └── lib.rs          # Main program code
├── tests/
│   └── my-first-anchor-program.ts  # Test file
├── Anchor.toml                  # Anchor configuration
├── Cargo.toml                   # Rust workspace config
└── package.json                 # Node.js dependencies
```

## Current Program

The program includes a simple vault example with:
- `deposit`: Adds lamports to a PDA vault
- `withdraw`: Removes lamports from the vault

This matches the Blueshift "Anchor for Dummies" course examples.

## Setup Instructions

### Prerequisites (Already Installed)
- ✅ Anchor CLI 0.30.0
- ✅ Solana CLI 2.1.18
- ✅ Rust 1.86.0
- ✅ Node.js v18.20.8
- ✅ Yarn

### Build Issue (GLIBCXX)

**Current Issue**: The Solana build tools require `GLIBCXX_3.4.30` but your system has up to `GLIBCXX_3.4.29`.

**Solutions**:

1. **Update to a newer OS** (Recommended for production):
   - Upgrade to CentOS 9 / RHEL 9
   - Or use Ubuntu 22.04+

2. **Use Docker** (Quick workaround):
   ```bash
   docker run -it -v $(pwd):/workspace solanalabs/solana:latest bash
   cd /workspace
   anchor build
   ```

3. **Install newer GCC** (if available):
   ```bash
   # Try installing from EPEL or other sources
   sudo dnf install gcc-toolset-13  # or newer version
   scl enable gcc-toolset-13 -- bash
   ```

4. **Use GitHub Codespaces or similar** cloud development environment

## Commands

Once build is working:

```bash
# Build the program
anchor build

# Run tests
anchor test

# Deploy to devnet
anchor deploy

# Generate IDL
anchor idl parse -f programs/my-first-anchor-program/src/lib.rs -o target/idl/my_first_anchor_program.json
```

## Learning Resources

- Blueshift Course: `anchor-for-dummies` → `anchor-101`
- Anchor Documentation: https://www.anchor-lang.com/
- Solana Cookbook: https://solanacookbook.com/

## Next Steps

1. Fix the build environment (see solutions above)
2. Build the program: `anchor build`
3. Write tests in `tests/my-first-anchor-program.ts`
4. Deploy to devnet: `anchor deploy`
5. Continue with Blueshift course lessons
# Updated: Tue Jan 13 08:28:53 AM EST 2026
