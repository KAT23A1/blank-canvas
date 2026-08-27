import logoAsset from "@/assets/unmess-logo.png.asset.json";

export function Logo({ className = "h-8" }: { className?: string }) {
  return (
    <img
      src={logoAsset.url}
      alt="UNMESS"
      className={`inline-block w-auto object-contain ${className}`}
    />
  );
}

