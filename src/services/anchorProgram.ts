/**
 * AurumX On-Chain Service — Real Solana Devnet interactions.
 * All reads and writes go through the deployed AurumX program.
 * Zero mock data. Every call hits the chain.
 */
import {
  PublicKey,
  Transaction,
  SystemProgram,
  Connection,
  TransactionInstruction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  getAccount,
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  RPC_URL,
  AURUMX_PROGRAM_ID,
  COLLATERAL_MINT,
  XUSD_MINT,
  TOKEN_DECIMALS,
} from "@/utils/constants";

// ─── Public Keys ─────────────────────────────────────────
export const PROGRAM_ID = new PublicKey(AURUMX_PROGRAM_ID);
export const COLLATERAL_MINT_PK = new PublicKey(COLLATERAL_MINT);
export const XUSD_MINT_PK = new PublicKey(XUSD_MINT);
export const connection = new Connection(RPC_URL, "confirmed");

// ─── Error mapping ───────────────────────────────────────
const ERROR_MAP: Record<string, string> = {
  KycNotVerified: "Your wallet is not KYC verified. Ask the admin to add you.",
  StalePrice: "Price feed is stale. The keeper service may be offline.",
  NotEnoughCollateral: "Not enough gold deposited. Deposit more XAU first.",
  VaultDead: "This vault has been liquidated.",
  VaultHealthy: "Vault is healthy. Cannot liquidate.",
  TooMuch: "Amount exceeds debt.",
  ZeroAmount: "Amount must be greater than zero.",
  TravelRuleIncomplete: "Fill all 4 VASP fields for transfers above $3,000.",
  NotAdmin: "Not the admin.",
  AlreadyOnList: "Wallet already on the allowlist.",
  ListFull: "Allowlist is full (500 max).",
  Overflow: "Math overflow.",
};

export function parseProgramError(err: any): string {
  const msg = err?.message || err?.toString() || "";
  // Check for Anchor error codes
  for (const [name, friendly] of Object.entries(ERROR_MAP)) {
    if (msg.includes(name)) return friendly;
  }
  // Check hex error codes
  const hexMatch = msg.match(/0x(1[7-9][0-9a-f]{2})/i);
  if (hexMatch) {
    const code = parseInt(hexMatch[1], 16);
    const anchorCode = code - 6000;
    const errorNames = Object.keys(ERROR_MAP);
    if (anchorCode >= 0 && anchorCode < errorNames.length) {
      return ERROR_MAP[errorNames[anchorCode]];
    }
  }
  if (msg.includes("User rejected")) return "You rejected the transaction in your wallet.";
  if (msg.includes("0x1")) return "Not enough SOL for gas. Get devnet SOL from the Faucet.";
  if (msg.includes("AccountNotFound") || msg.includes("could not find account"))
    return "Token account not found. Use the Faucet to set up your account.";
  if (msg.includes("fetch") || msg.includes("network") || msg.includes("ECONNREFUSED"))
    return "Cannot reach Solana Devnet. Check your internet connection.";
  return msg;
}

// ─── PDA Derivations ─────────────────────────────────────
export function deriveVaultPda(owner: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), owner.toBuffer()],
    PROGRAM_ID
  );
}

export function deriveAllowlistPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("allowlist")],
    PROGRAM_ID
  );
}

export function derivePricePda(assetName: string): [PublicKey, number] {
  const assetBytes = Buffer.alloc(8);
  assetBytes.write(assetName);
  return PublicKey.findProgramAddressSync(
    [Buffer.from("price"), assetBytes],
    PROGRAM_ID
  );
}

export function deriveMintAuthorityPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("mint_authority")],
    PROGRAM_ID
  );
}

export function deriveTravelRulePda(transferId: Uint8Array): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("travel_rule"), transferId],
    PROGRAM_ID
  );
}

// ─── ATA Helper ──────────────────────────────────────────
export function getAta(owner: PublicKey, mint: PublicKey, allowOwnerOffCurve = false): PublicKey {
  return getAssociatedTokenAddressSync(mint, owner, allowOwnerOffCurve, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
}

// ─── Anchor Discriminator ────────────────────────────────
async function disc(methodName: string): Promise<Buffer> {
  const msgBuffer = new TextEncoder().encode(`global:${methodName}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  return Buffer.from(new Uint8Array(hashBuffer).slice(0, 8));
}

function encodeU64(val: bigint): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(val);
  return buf;
}

function toRawAmount(amount: number): bigint {
  return BigInt(Math.floor(amount * Math.pow(10, TOKEN_DECIMALS)));
}

// ─── On-Chain Account Readers ────────────────────────────

export interface OnChainVault {
  owner: PublicKey;
  collateralMint: PublicKey;
  collateralAmount: number; // raw u64 / 10^6
  xusdMinted: number;       // raw u64 / 10^6
  lastUpdated: number;      // unix timestamp
  isLiquidated: boolean;
  bump: number;
}

export async function fetchVaultAccount(owner: PublicKey): Promise<OnChainVault | null> {
  try {
    const [vaultPda] = deriveVaultPda(owner);
    const info = await connection.getAccountInfo(vaultPda);
    if (!info || !info.data || info.data.length < 8 + 32 + 32 + 8 + 8 + 8 + 1 + 1) return null;
    const data = info.data.slice(8); // skip discriminator
    const ownerPk = new PublicKey(data.slice(0, 32));
    const collateralMint = new PublicKey(data.slice(32, 64));
    const collateralAmountRaw = data.readBigUInt64LE(64);
    const xusdMintedRaw = data.readBigUInt64LE(72);
    const lastUpdated = Number(data.readBigInt64LE(80));
    const isLiquidated = data[88] === 1;
    const bump = data[89];
    return {
      owner: ownerPk,
      collateralMint,
      collateralAmount: Number(collateralAmountRaw) / 1_000_000,
      xusdMinted: Number(xusdMintedRaw) / 1_000_000,
      lastUpdated,
      isLiquidated,
      bump,
    };
  } catch (err) {
    console.error("fetchVaultAccount:", err);
    return null;
  }
}

export interface OnChainPrice {
  asset: string;
  price: number;        // USD price (raw / 1_000_000)
  publishedAt: number;  // unix timestamp
  authority: PublicKey;
  fromSix: boolean;
  bump: number;
  isStale: boolean;
}

export async function fetchPriceAccount(assetName: string): Promise<OnChainPrice | null> {
  try {
    const [pricePda] = derivePricePda(assetName);
    const info = await connection.getAccountInfo(pricePda);
    if (!info || !info.data || info.data.length < 8 + 8 + 8 + 8 + 32 + 1 + 1) return null;
    const data = info.data.slice(8);
    const assetBytes = data.slice(0, 8);
    const asset = Buffer.from(assetBytes).toString("utf8").replace(/\0/g, "");
    const priceRaw = data.readBigUInt64LE(8);
    const publishedAt = Number(data.readBigInt64LE(16));
    const authority = new PublicKey(data.slice(24, 56));
    const fromSix = data[56] === 1;
    const bump = data[57];
    const now = Math.floor(Date.now() / 1000);
    return {
      asset,
      price: Number(priceRaw) / 1_000_000,
      publishedAt,
      authority,
      fromSix,
      bump,
      isStale: now - publishedAt > 60,
    };
  } catch (err) {
    console.error("fetchPriceAccount:", err);
    return null;
  }
}

export interface OnChainAllowList {
  admin: PublicKey;
  members: PublicKey[];
  bump: number;
}

export async function fetchAllowlistAccount(): Promise<OnChainAllowList | null> {
  try {
    const [allowlistPda] = deriveAllowlistPda();
    const info = await connection.getAccountInfo(allowlistPda);
    if (!info || !info.data || info.data.length < 8 + 32 + 4 + 1) return null;
    const data = info.data.slice(8);
    const admin = new PublicKey(data.slice(0, 32));
    const vecLen = data.readUInt32LE(32);
    const members: PublicKey[] = [];
    for (let i = 0; i < vecLen; i++) {
      const offset = 36 + i * 32;
      if (offset + 32 > data.length) break;
      members.push(new PublicKey(data.slice(offset, offset + 32)));
    }
    const bumpOffset = 36 + vecLen * 32;
    const bump = bumpOffset < data.length ? data[bumpOffset] : 0;
    return { admin, members, bump };
  } catch (err) {
    console.error("fetchAllowlistAccount:", err);
    return null;
  }
}

export async function fetchTokenBalance(owner: PublicKey, mint: PublicKey): Promise<number> {
  try {
    const ata = getAta(owner, mint);
    const account = await getAccount(connection, ata, "confirmed", TOKEN_2022_PROGRAM_ID);
    return Number(account.amount) / 1_000_000;
  } catch {
    return 0;
  }
}

export interface VaultActionResult {
  success: boolean;
  txSignature?: string;
  error?: string;
}

// ─── Transaction Builders ────────────────────────────────

async function sendTx(
  ix: TransactionInstruction,
  walletPk: PublicKey,
  signTransaction: (tx: Transaction) => Promise<Transaction>
): Promise<VaultActionResult> {
  const tx = new Transaction().add(ix);
  tx.feePayer = walletPk;
  const { blockhash } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  const signed = await signTransaction(tx);
  const rawTx = signed.serialize();
  const txSig = await connection.sendRawTransaction(rawTx, { skipPreflight: false });
  await connection.confirmTransaction(txSig, "confirmed");
  return { success: true, txSignature: txSig };
}

/**
 * Deposit XAU collateral into vault
 */
export async function depositCollateral(
  walletPk: PublicKey,
  amountOz: number,
  signTransaction: (tx: Transaction) => Promise<Transaction>
): Promise<VaultActionResult> {
  try {
    const [vaultPda] = deriveVaultPda(walletPk);
    const [allowlistPda] = deriveAllowlistPda();
    const ownerCollAta = getAta(walletPk, COLLATERAL_MINT_PK);
    const vaultCollAta = getAta(vaultPda, COLLATERAL_MINT_PK, true);

    const data = Buffer.concat([
      await disc("deposit"),
      encodeU64(toRawAmount(amountOz)),
    ]);

    const ix = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: walletPk, isSigner: true, isWritable: true },
        { pubkey: vaultPda, isSigner: false, isWritable: true },
        { pubkey: allowlistPda, isSigner: false, isWritable: false },
        { pubkey: ownerCollAta, isSigner: false, isWritable: true },
        { pubkey: vaultCollAta, isSigner: false, isWritable: true },
        { pubkey: COLLATERAL_MINT_PK, isSigner: false, isWritable: false },
        { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data,
    });

    return await sendTx(ix, walletPk, signTransaction);
  } catch (err: any) {
    return { success: false, error: parseProgramError(err) };
  }
}

/**
 * Mint xUSD against deposited collateral
 */
export async function mintXusd(
  walletPk: PublicKey,
  amountUsd: number,
  signTransaction: (tx: Transaction) => Promise<Transaction>
): Promise<VaultActionResult> {
  try {
    const [vaultPda] = deriveVaultPda(walletPk);
    const [allowlistPda] = deriveAllowlistPda();
    const [pricePda] = derivePricePda("XAU/USD");
    const [mintAuthority] = deriveMintAuthorityPda();
    const ownerXusdAta = getAta(walletPk, XUSD_MINT_PK);

    const data = Buffer.concat([
      await disc("mint_xusd"),
      encodeU64(toRawAmount(amountUsd)),
    ]);

    const ix = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: walletPk, isSigner: true, isWritable: true },
        { pubkey: vaultPda, isSigner: false, isWritable: true },
        { pubkey: allowlistPda, isSigner: false, isWritable: false },
        { pubkey: pricePda, isSigner: false, isWritable: false },
        { pubkey: XUSD_MINT_PK, isSigner: false, isWritable: true },
        { pubkey: ownerXusdAta, isSigner: false, isWritable: true },
        { pubkey: mintAuthority, isSigner: false, isWritable: false },
        { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data,
    });

    return await sendTx(ix, walletPk, signTransaction);
  } catch (err: any) {
    return { success: false, error: parseProgramError(err) };
  }
}

/**
 * Burn xUSD and reclaim collateral
 */
export async function burnXusd(
  walletPk: PublicKey,
  amountUsd: number,
  signTransaction: (tx: Transaction) => Promise<Transaction>
): Promise<VaultActionResult> {
  try {
    const [vaultPda] = deriveVaultPda(walletPk);
    const [allowlistPda] = deriveAllowlistPda();
    const ownerXusdAta = getAta(walletPk, XUSD_MINT_PK);
    const ownerCollAta = getAta(walletPk, COLLATERAL_MINT_PK);
    const vaultCollAta = getAta(vaultPda, COLLATERAL_MINT_PK, true);

    const data = Buffer.concat([
      await disc("burn_xusd"),
      encodeU64(toRawAmount(amountUsd)),
    ]);

    const ix = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: walletPk, isSigner: true, isWritable: true },
        { pubkey: vaultPda, isSigner: false, isWritable: true },
        { pubkey: allowlistPda, isSigner: false, isWritable: false },
        { pubkey: XUSD_MINT_PK, isSigner: false, isWritable: true },
        { pubkey: ownerXusdAta, isSigner: false, isWritable: true },
        { pubkey: vaultCollAta, isSigner: false, isWritable: true },
        { pubkey: ownerCollAta, isSigner: false, isWritable: true },
        { pubkey: COLLATERAL_MINT_PK, isSigner: false, isWritable: false },
        { pubkey: vaultPda, isSigner: false, isWritable: false }, // vaultSigner = vaultPda
        { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data,
    });

    return await sendTx(ix, walletPk, signTransaction);
  } catch (err: any) {
    return { success: false, error: parseProgramError(err) };
  }
}

/**
 * Admin: add wallet to on-chain KYC allowlist
 */
export async function addToAllowlistOnChain(
  adminPk: PublicKey,
  memberPk: PublicKey,
  signTransaction: (tx: Transaction) => Promise<Transaction>
): Promise<VaultActionResult> {
  try {
    const [allowlistPda] = deriveAllowlistPda();
    const memberBytes = memberPk.toBuffer();

    const data = Buffer.concat([
      await disc("add_to_allowlist"),
      memberBytes,
    ]);

    const ix = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: adminPk, isSigner: true, isWritable: false },
        { pubkey: allowlistPda, isSigner: false, isWritable: true },
      ],
      data,
    });

    return await sendTx(ix, adminPk, signTransaction);
  } catch (err: any) {
    return { success: false, error: parseProgramError(err) };
  }
}

/**
 * Admin: remove wallet from on-chain KYC allowlist
 */
export async function removeFromAllowlistOnChain(
  adminPk: PublicKey,
  memberPk: PublicKey,
  signTransaction: (tx: Transaction) => Promise<Transaction>
): Promise<VaultActionResult> {
  try {
    const [allowlistPda] = deriveAllowlistPda();
    const memberBytes = memberPk.toBuffer();

    const data = Buffer.concat([
      await disc("remove_from_allowlist"),
      memberBytes,
    ]);

    const ix = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: adminPk, isSigner: true, isWritable: false },
        { pubkey: allowlistPda, isSigner: false, isWritable: true },
      ],
      data,
    });

    return await sendTx(ix, adminPk, signTransaction);
  } catch (err: any) {
    return { success: false, error: parseProgramError(err) };
  }
}

/**
 * Request SOL airdrop on devnet
 */
export async function requestSolAirdrop(walletPk: PublicKey): Promise<string> {
  const sig = await connection.requestAirdrop(walletPk, 1 * LAMPORTS_PER_SOL);
  await connection.confirmTransaction(sig, "confirmed");
  return sig;
}

export { TOKEN_2022_PROGRAM_ID };
