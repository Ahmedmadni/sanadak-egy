import logoLight from "@/assets/sanadak-logo-light.png";
import logoDark from "@/assets/sanadak-logo-dark.png";
import icon from "@/assets/sanadak-icon.png";
import { useSanadak } from "@/lib/sanadak-context";

type Props = {
  variant?: "horizontal" | "icon";
  className?: string;
  alt?: string;
};

export function Logo({ variant = "horizontal", className, alt = "Sanadak | سندك" }: Props) {
  const { theme } = useSanadak();
  if (variant === "icon") {
    return <img src={icon} alt={alt} className={className} />;
  }
  const src = theme === "dark" ? logoDark : logoLight;
  return <img src={src} alt={alt} className={className} />;
}
