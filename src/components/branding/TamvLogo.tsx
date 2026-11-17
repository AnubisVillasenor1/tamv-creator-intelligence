/**
 * Logotipo institucional de TAMV ONLINE NETWORK.
 *
 * Se sirve desde `public/brand/` para que funcione igual en desarrollo y en
 * cualquier hosting estático. La variante `full` es para el hero y la `compact`
 * para navegación, acceso y pie de página.
 */
const LOGO_SOURCES = {
  full: "/brand/tamv-online-logo-512.jpg",
  compact: "/brand/tamv-online-logo-192.jpg",
} as const;

type TamvLogoProps = {
  className?: string;
  size?: number;
  variant?: keyof typeof LOGO_SOURCES;
  /** Marca el logotipo como contenido above-the-fold para evitar carga diferida. */
  priority?: boolean;
};

export function TamvLogo({
  className,
  size = 48,
  variant = "compact",
  priority = false,
}: TamvLogoProps) {
  return (
    <img
      src={LOGO_SOURCES[variant]}
      alt="TAMV ONLINE NETWORK"
      width={size}
      height={size}
      className={className}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
    />
  );
}
