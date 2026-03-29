# AurumX — Institutional Gold-Backed Stablecoin Protocol

AurumX is a **compliance-first, gold-backed stablecoin protocol** built on **Solana** using the **Anchor framework** and **SPL Token-2022**. It enables institutions to deposit tokenised gold (XAU) as collateral and mint xUSD — a dollar-pegged stablecoin — with every compliance requirement banks care about built into the smart contract itself.

---

## What AurumX Does

AurumX works like an on-chain pawnshop for gold:

1. **Deposit** tokenised gold (XAU) into a vault
2. **Borrow** up to 66% of its USD value as xUSD stablecoin (150% collateral ratio)
3. **Return** xUSD to reclaim your gold
4. If gold price crashes below 120% collateral ratio → **liquidation**

Every interaction is gated by institutional compliance checks: KYC allowlists, AML risk scoring, KYT monitoring, and Travel Rule enforcement.

---

## Architecture

```
REAL WORLD                     AURUMX ON SOLANA

SIX BFI / Pyth gold price ──→  PriceAccount PDA (on-chain)
($2,345/oz, every 30s)                ↓
                                      ↓ read by MintController
User (KYC verified) ──deposit──→ Vault PDA
1oz tokenised XAU                     ↓
                               locks your XAU
                                      ↓
                               checks: is collateral > 150% of xUSD?
                                      ↓ yes
                               mints xUSD ────────→ your wallet

                               SPL Token-2022 hook
                               on every xUSD send:
                               checks recipient KYC ── not verified → BLOCKED

Return xUSD ──────────────→    vault burns xUSD
                               releases XAU back to you

Gold price crashes:
ratio < 120% ─────────────→   anyone can liquidate
                               they repay your debt
                               they get your XAU + 5% bonus
```

---

## Compliance Framework

| Pillar | Threshold | Enforcement |
|--------|-----------|-------------|
| **KYC** | All transactions | Block if wallet not on AllowList PDA |
| **AML** | Risk score > 70/100 | Block at instruction level |
| **KYT** | All txns, flag ≥$10,000 | Emit KytEvent on-chain |
| **Travel Rule** | Transfers ≥ $3,000 | Require VASP fields + immutable PDA record |

---

## Protocol Parameters

| Parameter | Value |
|-----------|-------|
| Minimum collateral ratio | **150%** |
| Liquidation threshold | **120%** |
| Liquidation bonus | **5%** |
| Travel Rule threshold | **$3,000** |
| KYT flag threshold | **$10,000** |
| AML block threshold | **70/100** |
| Token standard | **SPL Token-2022** |
| Price staleness limit | **60 seconds** |

---

## Tech Stack

### Frontend
- **React 18** + **TypeScript** + **Vite**
- **Tailwind CSS** — design system with gold/charcoal palette, dark/light themes
- **Recharts** — real-time XAU/USD price history charts
- **Zustand** — global protocol state management
- **Solana Wallet Adapter** — Phantom, Solflare, Backpack, Coinbase wallet support

### Blockchain
- **Solana** (Devnet) — high throughput, low fees
- **Anchor Framework** — Rust smart contract framework
- **SPL Token-2022** — transfer hooks for compliance enforcement

### Oracles
- **SIX BFI** — Swiss financial data provider for institutional-grade pricing

---

## Project Structure

```
src/
├── components/          # UI components
│   ├── Header.tsx       # Navigation, wallet connect, theme toggle
│   ├── VaultDashboard.tsx   # Main vault interface (deposit/mint/burn)
│   ├── AdminPanel.tsx   # Admin: KYC management, AML scoring
│   ├── ExplorerPanel.tsx    # On-chain data explorer
│   ├── PriceHistoryChart.tsx    # Real-time XAU/USD chart
│   ├── LiquidationMonitor.tsx   # At-risk vault monitoring
│   ├── ProtocolDiagram.tsx  # Visual architecture guide
│   ├── ComplianceStatusPanel.tsx # Compliance status display
│   ├── TransactionHistoryPanel.tsx  # Transaction log
│   ├── TravelRulePanel.tsx  # Travel Rule VASP form
│   ├── AllowlistRequestButton.tsx   # KYC request for users
│   ├── ThemeToggle.tsx  # Dark/light mode switcher
│   └── ui/              # shadcn/ui base components
├── hooks/
│   ├── useVault.ts      # Vault state management
│   ├── usePriceFeed.ts  # Real-time price feed polling
│   └── useVaultNotifications.ts # Collateral ratio alerts
├── services/
│   ├── anchorProgram.ts # Anchor program interactions (mock until deploy)
│   └── priceFeed.ts     # Pyth + SIX BFI price fetching
├── stores/
│   └── protocolStore.ts # Zustand global state
├── providers/
│   └── WalletProvider.tsx   # Solana wallet adapter setup
├── pages/
│   ├── Index.tsx        # Main application page
│   ├── Faucet.tsx       # Devnet token faucet
│   └── NotFound.tsx     # 404 page
└── utils/
    ├── constants.ts     # Protocol parameters
    └── format.ts        # Formatting utilities
```

---

## Admin System

- **First wallet to connect** automatically becomes the admin
- Admins can **promote other wallets** to admin status
- Only admin wallets can see and access the Admin tab
- Admin controls:
  - Add/remove wallets from KYC allowlist
  - Approve/reject KYC requests from users
  - Set AML risk scores per wallet
  - Manage other admin wallets

**Admin is a compliance gatekeeper only** — admins cannot touch vaults, move collateral, or mint xUSD on behalf of users.

---

## User Flow

1. **Connect wallet** (Phantom/Solflare/Backpack/Coinbase)
2. **Request KYC access** (pending admin approval)
3. **Get approved** by admin on the AllowList
4. **Claim test tokens** on the Faucet page (devnet SOL + mock XAU)
5. **Deposit XAU** collateral into vault
6. **Mint xUSD** stablecoin against collateral
7. **Burn xUSD** to reclaim gold when ready

---

## Tokens on Devnet

| Token | Source | Purpose |
|-------|--------|---------|
| **SOL** | [Solana Faucet](https://faucet.solana.com/) | Gas fees |
| **Mock XAU** | Self-minted via `yarn create-mints` or Faucet page | Collateral |
| **xUSD** | Protocol-minted on deposit | Stablecoin |

---

## Design

- **Palette**: Gold (#C9A84C) + dark charcoal + soft warm white
- **Typography**: IBM Plex Mono — terminal-grade monospace
- **Theme**: Dark/light mode with smooth transitions
- **Aesthetic**: Institutional finance meets crypto terminal

---

## License

Built for StableHacks 2026. MIT License.
