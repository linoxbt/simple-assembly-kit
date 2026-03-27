import { useWallet } from "@solana/wallet-adapter-react";
import { useProtocolStore } from "@/stores/protocolStore";
import { toast } from "sonner";

const AllowlistRequestButton = () => {
  const { publicKey, connected } = useWallet();
  const walletAddress = publicKey?.toBase58() ?? null;
  const isOnAllowlist = useProtocolStore((s) => s.isOnAllowlist(walletAddress));
  const hasRequested = useProtocolStore((s) => s.hasRequestedAllowlist(walletAddress));
  const requestAllowlist = useProtocolStore((s) => s.requestAllowlist);
  const requests = useProtocolStore((s) => s.allowlistRequests);

  if (!connected || !walletAddress) return null;
  if (isOnAllowlist) return null;

  const currentRequest = requests.find((r) => r.wallet === walletAddress);
  const isRejected = currentRequest?.status === "rejected";

  if (isRejected) {
    return (
      <div className="text-xs tracking-wider text-center py-2 rounded border border-destructive/40 text-destructive bg-destructive/5">
        ✗ KYC REQUEST REJECTED — CONTACT ADMIN
      </div>
    );
  }

  if (hasRequested) {
    return (
      <div className="text-xs tracking-wider text-center py-2 rounded border border-accent/40 text-accent bg-accent/5">
        ◌ KYC REQUEST PENDING — AWAITING ADMIN APPROVAL
      </div>
    );
  }

  return (
    <button
      onClick={() => { requestAllowlist(walletAddress); toast.success("KYC allowlist request submitted", { description: "An admin will review your request." }); }}
      className="w-full text-xs tracking-wider text-center py-2 rounded border border-primary/40 text-primary bg-primary/5 hover:bg-primary/10 transition-colors"
    >
      → REQUEST KYC ALLOWLIST ACCESS
    </button>
  );
};

export default AllowlistRequestButton;
