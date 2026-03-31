/**
 * Anchor Program Service — Real Solana devnet interactions.
 * Uses the deployed AurumX program for vault operations.
 */
import {
  PublicKey,
  Transaction,
  SystemProgram,
  Connection,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  RPC_URL,
  AURUMX_PROGRAM_ID,
  COLLATERAL_MINT,
  XUSD_MINT,
  TOKEN_DECIMALS,
  TOKEN_2022_PROGRAM_ID,
} from "@/utils/constants";

const PROGRAM_ID = new PublicKey(AURUMX_PROGRAM_ID);
const TOKEN_2022 = new PublicKey(TOKEN_2022_PROGRAM_ID);
const COLLATERAL_MINT_PK = new PublicKey(COLLATERAL_MINT);
const XUSD_MINT_PK = new PublicKey(XUSD_MINT);

export const connection = new Connection(RPC_URL, "confirmed");

export interface VaultActionResult {
  success: boolean;
  txSignature?: string;
  error?: string;
}

// Derive PDA for user's vault account
function deriveVaultPda(userPubkey: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), userPubkey.toBuffer()],
    PROGRAM_ID
  );
}

// Derive PDA for mint authority
function deriveMintAuthorityPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("mint_authority")],
    PROGRAM_ID
  );
}

// Derive Associated Token Account for Token-2022
function deriveAta(owner: PublicKey, mint: PublicKey): PublicKey {
  const [ata] = PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_2022.toBuffer(), mint.toBuffer()],
    new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL")
  );
  return ata;
}

// Convert amount to on-chain integer (6 decimals)
function toOnChainAmount(amount: number): bigint {
  return BigInt(Math.round(amount * Math.pow(10, TOKEN_DECIMALS)));
}

// Encode u64 as little-endian 8-byte buffer
function encodeU64(val: bigint): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(val);
  return buf;
}

// Anchor discriminator: first 8 bytes of SHA256("global:<method_name>")
async function anchorDiscriminator(methodName: string): Promise<Buffer> {
  const msgBuffer = new TextEncoder().encode(`global:${methodName}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  return Buffer.from(new Uint8Array(hashBuffer).slice(0, 8));
}

/**
 * Deposit XAU collateral into the vault.
 */
export async function depositCollateral(
  walletPublicKey: PublicKey,
  amountOz: number,
  signTransaction: (tx: Transaction) => Promise<Transaction>
): Promise<VaultActionResult> {
  try {
    const [vaultPda] = deriveVaultPda(walletPublicKey);
    const userCollateralAta = deriveAta(walletPublicKey, COLLATERAL_MINT_PK);
    const vaultCollateralAta = deriveAta(vaultPda, COLLATERAL_MINT_PK);

    const discriminator = await anchorDiscriminator("deposit");
    const amountData = encodeU64(toOnChainAmount(amountOz));
    const data = Buffer.concat([discriminator, amountData]);

    const ix = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: walletPublicKey, isSigner: true, isWritable: true },
        { pubkey: vaultPda, isSigner: false, isWritable: true },
        { pubkey: userCollateralAta, isSigner: false, isWritable: true },
        { pubkey: vaultCollateralAta, isSigner: false, isWritable: true },
        { pubkey: COLLATERAL_MINT_PK, isSigner: false, isWritable: false },
        { pubkey: TOKEN_2022, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data,
    });

    const tx = new Transaction().add(ix);
    tx.feePayer = walletPublicKey;
    const { blockhash } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;

    const signed = await signTransaction(tx);
    const rawTx = signed.serialize();
    const txSig = await connection.sendRawTransaction(rawTx, { skipPreflight: false });
    await connection.confirmTransaction(txSig, "confirmed");

    return { success: true, txSignature: txSig };
  } catch (err: any) {
    console.error("Deposit error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Mint xUSD against deposited collateral.
 */
export async function mintXusd(
  walletPublicKey: PublicKey,
  amountUsd: number,
  signTransaction: (tx: Transaction) => Promise<Transaction>
): Promise<VaultActionResult> {
  try {
    const [vaultPda] = deriveVaultPda(walletPublicKey);
    const [mintAuthority] = deriveMintAuthorityPda();
    const userXusdAta = deriveAta(walletPublicKey, XUSD_MINT_PK);

    const discriminator = await anchorDiscriminator("mint_xusd");
    const amountData = encodeU64(toOnChainAmount(amountUsd));
    const data = Buffer.concat([discriminator, amountData]);

    const ix = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: walletPublicKey, isSigner: true, isWritable: true },
        { pubkey: vaultPda, isSigner: false, isWritable: true },
        { pubkey: XUSD_MINT_PK, isSigner: false, isWritable: true },
        { pubkey: userXusdAta, isSigner: false, isWritable: true },
        { pubkey: mintAuthority, isSigner: false, isWritable: false },
        { pubkey: TOKEN_2022, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data,
    });

    const tx = new Transaction().add(ix);
    tx.feePayer = walletPublicKey;
    const { blockhash } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;

    const signed = await signTransaction(tx);
    const rawTx = signed.serialize();
    const txSig = await connection.sendRawTransaction(rawTx, { skipPreflight: false });
    await connection.confirmTransaction(txSig, "confirmed");

    return { success: true, txSignature: txSig };
  } catch (err: any) {
    console.error("Mint error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Burn xUSD and reclaim collateral.
 */
export async function burnXusd(
  walletPublicKey: PublicKey,
  amountUsd: number,
  signTransaction: (tx: Transaction) => Promise<Transaction>
): Promise<VaultActionResult> {
  try {
    const [vaultPda] = deriveVaultPda(walletPublicKey);
    const userXusdAta = deriveAta(walletPublicKey, XUSD_MINT_PK);
    const userCollateralAta = deriveAta(walletPublicKey, COLLATERAL_MINT_PK);
    const vaultCollateralAta = deriveAta(vaultPda, COLLATERAL_MINT_PK);

    const discriminator = await anchorDiscriminator("burn_xusd");
    const amountData = encodeU64(toOnChainAmount(amountUsd));
    const data = Buffer.concat([discriminator, amountData]);

    const ix = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: walletPublicKey, isSigner: true, isWritable: true },
        { pubkey: vaultPda, isSigner: false, isWritable: true },
        { pubkey: XUSD_MINT_PK, isSigner: false, isWritable: true },
        { pubkey: userXusdAta, isSigner: false, isWritable: true },
        { pubkey: COLLATERAL_MINT_PK, isSigner: false, isWritable: false },
        { pubkey: userCollateralAta, isSigner: false, isWritable: true },
        { pubkey: vaultCollateralAta, isSigner: false, isWritable: true },
        { pubkey: TOKEN_2022, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data,
    });

    const tx = new Transaction().add(ix);
    tx.feePayer = walletPublicKey;
    const { blockhash } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;

    const signed = await signTransaction(tx);
    const rawTx = signed.serialize();
    const txSig = await connection.sendRawTransaction(rawTx, { skipPreflight: false });
    await connection.confirmTransaction(txSig, "confirmed");

    return { success: true, txSignature: txSig };
  } catch (err: any) {
    console.error("Burn error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Fetch on-chain vault state for a wallet.
 */
export async function fetchVaultState(walletPublicKey: PublicKey) {
  try {
    const [vaultPda] = deriveVaultPda(walletPublicKey);
    const accountInfo = await connection.getAccountInfo(vaultPda);
    
    if (!accountInfo || !accountInfo.data || accountInfo.data.length < 8) {
      return null; // No vault exists
    }

    // Skip 8-byte Anchor discriminator
    const data = accountInfo.data.slice(8);
    
    // Parse vault data: owner(32) + collateral_amount(8) + xusd_debt(8) + ...
    if (data.length < 48) return null;
    
    const collateralRaw = data.readBigUInt64LE(32);
    const xusdDebtRaw = data.readBigUInt64LE(40);
    
    const collateralOz = Number(collateralRaw) / Math.pow(10, TOKEN_DECIMALS);
    const xusdDebt = Number(xusdDebtRaw) / Math.pow(10, TOKEN_DECIMALS);

    return { collateralOz, xusdDebt };
  } catch (err) {
    console.error("Failed to fetch vault state:", err);
    return null;
  }
}

/**
 * Fetch token balance for a given mint and owner.
 */
export async function fetchTokenBalance(
  ownerPubkey: PublicKey,
  mintPubkey: PublicKey
): Promise<number> {
  try {
    const ata = deriveAta(ownerPubkey, mintPubkey);
    const balance = await connection.getTokenAccountBalance(ata);
    return parseFloat(balance.value.uiAmountString ?? "0");
  } catch {
    return 0;
  }
}

export { PROGRAM_ID, COLLATERAL_MINT_PK, XUSD_MINT_PK, deriveVaultPda, deriveAta };
