import logoAsset from "@/assets/unmess-logo.png.asset.json";

export function Logo({
  className = "h-8",
  bounce = false,
}: {
  className?: string;
  bounce?: boolean;
}) {
  return (
    <img
      src={logoAsset.url}
      alt="UNMESS"
      className={`inline-block w-auto object-contain transition-transform duration-200 hover:scale-105 ${bounce ? "logo-bounce" : ""} ${className}`}
    />
  );
}


