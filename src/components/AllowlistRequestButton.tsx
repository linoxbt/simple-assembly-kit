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

  const handleRequest = () => {
    requestAllowlist(walletAddress);
    toast.success("KYC allowlist request submitted", {
      description: "An admin will review your request.",
    });
  };

  if (isRejected) {
    return (
      <div className="text-xs tracking-wider text-center py-2 rounded border border-destructive text-destructive bg-destructive/5">
        ✗ KYC REQUEST REJECTED — CONTACT ADMIN
      </div>
    );
  }

  if (hasRequested) {
    return (
      <div className="text-xs tracking-wider text-center py-2 rounded border border-warning text-warning bg-warning/5">
        ◌ KYC REQUEST PENDING — AWAITING ADMIN APPROVAL
      </div>
    );
  }

  return (
    <button
      onClick={handleRequest}
      className="w-full text-xs tracking-wider text-center py-2 rounded border border-info text-info bg-info/5 hover:bg-info/10 transition-colors"
    >
      → REQUEST KYC ALLOWLIST ACCESS
    </button>
  );
};

export default AllowlistRequestButton;
