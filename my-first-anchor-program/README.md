# Anchor Learning Project

This is a beginner-friendly Anchor project for learning Solana program development following the Blueshift course.

## Project Structure

```
my-first-anchor-program/
├── programs/
│   └── my-first-anchor-program/
│       └── src/
│           ├── lib.rs              # Main program entry point, declares modules
│           ├── state.rs            # Vault account struct definition
│           ├── errors.rs           # Custom error types (VaultError)
│           ├── contexts.rs         # Account validation structs (InitializeVault, VaultAction, etc.)
│           └── instructions/       # Instruction handlers (modular design)
│               ├── mod.rs          # Module declarations
│               ├── initialize.rs   # Initialize vault PDA
│               ├── deposit.rs      # Deposit lamports to vault
│               ├── withdraw.rs     # Withdraw lamports from vault
│               └── read_vault.rs   # Read vault using LazyAccount (efficient)
├── tests/
│   └── my-first-anchor-program.ts  # Test file
├── Anchor.toml                     # Anchor configuration
├── Cargo.toml                      # Rust workspace config
├── package.json                    # Node.js dependencies
└── Dockerfile                      # Docker environment for consistent builds
```

## Program Overview

This is a **modular vault program** that demonstrates:
- **PDA (Program Derived Address)** management
- **Account initialization** with rent-exempt minimums
- **Lamport transfers** (deposits and withdrawals)
- **LazyAccount** feature for efficient read-only access
- **Modular code organization** (separate files for state, errors, contexts, instructions)

### Instructions

1. **`initialize`**: Creates a new vault PDA account owned by the signer
2. **`deposit`**: Adds lamports to the vault (increases `total_deposits`)
3. **`withdraw`**: Removes lamports from the vault (increases `total_withdrawals`)
   - Ensures vault remains rent-exempt
   - Uses manual lamport manipulation (can't use SystemProgram::transfer on accounts with data)
4. **`read_vault`**: Efficiently reads vault data using `LazyAccount` (read-only, stack-efficient)

### Program ID

```
GqSMeguuRK2vT1auHzQrda6ojKFwAxw2GoNso1myd39i
```

### Vault Account Structure

```rust
pub struct Vault {
    pub owner: Pubkey,           // 32 bytes
    pub total_deposits: u64,     // 8 bytes
    pub total_withdrawals: u64,  // 8 bytes
}
// Total: 8 (discriminator) + 32 + 8 + 8 = 56 bytes
```

## Setup Instructions

### Development Environment

This project uses **Docker** to provide a consistent build environment that avoids system-specific library compatibility issues (e.g., GLIBCXX version mismatches).

### Quick Start

1. **Build the Docker image**:
   ```bash
   docker build -t anchor-dev .
   ```

2. **Run an interactive Docker session**:
   ```bash
   ./docker-run.sh
   # Or manually:
   docker run -it --rm -v $(pwd):/workspace anchor-dev bash
   ```

3. **Inside Docker, build and test**:
   ```bash
   cd /workspace
   anchor build
   anchor test  # This will deploy to devnet and run tests
   ```

See `DOCKER_COMMANDS.md` and `ANCHOR_COMMANDS.md` for more details.

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

## Development Workflow

1. **Make code changes** in `programs/my-first-anchor-program/src/`
2. **Open Docker session**: `./docker-run.sh`
3. **Build**: `anchor build`
4. **Test**: `anchor test` (automatically deploys to devnet and runs tests)
5. **Deploy manually** (if needed): `anchor deploy`

## File Organization

- **`lib.rs`**: Program entry point, declares all modules, defines `#[program]` with instruction handlers
- **`state.rs`**: Account structs (e.g., `Vault`)
- **`errors.rs`**: Custom error codes (e.g., `VaultError`)
- **`contexts.rs`**: Account validation structs with `#[derive(Accounts)]` (e.g., `InitializeVault`, `VaultAction`)
- **`instructions/`**: Individual instruction handler functions
  - Each instruction has its own file for better organization
  - Handlers are called from `lib.rs` via the `#[program]` macro

## Learning Resources

- Blueshift Course: `anchor-for-dummies` → `anchor-101`
- Anchor Documentation: https://www.anchor-lang.com/
- Solana Cookbook: https://solanacookbook.com/
- LazyAccount Docs: Anchor 0.32+ feature for efficient account reading
