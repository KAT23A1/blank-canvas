import logoAsset from "@/assets/unmess-logo.png.asset.json";

export function Logo({
  height = 32,
  className = "",
}: {
  height?: number;
  className?: string;
}) {
  return (
    <img
      src={logoAsset.url}
      alt="UNMESS"
      height={height}
      className={`inline-block h-auto w-auto object-contain ${className}`}
      style={{ height }}
    />
  );
}
