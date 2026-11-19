import type { SVGProps } from "react";

type Provider = "facebook" | "instagram" | "tiktok" | "threads" | "whatsapp" | "telegram" | "linkedin" | "longe" | "github" | "twitter";

const brandColors: Record<Provider, string> = {
  facebook: "#1877F2",
  instagram: "#E4405F",
  tiktok: "#25F4EE",
  threads: "currentColor",
  whatsapp: "#25D366",
  telegram: "#24A1DE",
  linkedin: "#0A66C2",
  longe: "currentColor",
  github: "currentColor",
  twitter: "currentColor",
};

export function SocialBrandIcon({ provider, ...props }: { provider: Provider } & Omit<SVGProps<SVGSVGElement>, "children">) {
  const color = brandColors[provider];
  const shared = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, ...props };
  switch (provider) {
    case "facebook":
      return <svg {...shared} fill={color} stroke="none"><path d="M13.4 21v-8h2.7l.4-3.1h-3.1v-2c0-.9.3-1.5 1.6-1.5h1.7V3.6c-.3 0-1.4-.1-2.6-.1-2.6 0-4.4 1.6-4.4 4.5v1.9H7V13h2.7v8z" /></svg>;
    case "instagram":
      return <svg {...shared} stroke={color}><rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5.2" /><circle cx="12" cy="12" r="4.1" /><circle cx="17.7" cy="6.6" r=".9" fill={color} stroke="none" /></svg>;
    case "tiktok":
      return <svg {...shared} stroke={color}><path d="M14.1 3.2v11.1a4.1 4.1 0 1 1-3.3-4.1" /><path d="M14.1 3.2c.6 2.7 2.3 4.2 5 4.5" /></svg>;
    case "threads":
      return <svg {...shared} strokeWidth={2.2}><path d="M18.4 10.8c-.2-4.5-2.4-7-6.4-7-4.7 0-7.4 3.2-7.4 8.3 0 5.1 2.7 8.1 7.3 8.1 3.4 0 5.6-1.8 5.6-4.5 0-2.2-1.6-3.5-4-3.5-2.1 0-3.4 1-3.4 2.6 0 1.3 1 2.1 2.4 2.1 2.7 0 4.5-2.4 4.4-5.6-.1-2.1-1.1-3.2-2.7-3.2-1.2 0-2 .7-2.2 1.8" /></svg>;
    case "whatsapp":
      return <svg {...shared} stroke={color}><path d="M20.2 11.7a8.2 8.2 0 0 1-12.1 7.2L3.5 20l1.2-4.4a8.2 8.2 0 1 1 15.5-3.9Z" /><path d="M8.6 8.2c.3-.6.6-.6 1-.6h.4c.2 0 .4.1.5.4l.8 1.9c.1.2.1.4-.1.6l-.7.8c-.2.2-.2.4 0 .7.6 1 1.5 1.8 2.6 2.3.3.1.5.1.7-.1l.9-1c.2-.2.4-.2.7-.1l1.8.9c.3.1.4.3.4.5 0 .4-.2 1.2-.7 1.6-.5.5-1.2.8-2 .7-1.1-.1-2.4-.7-3.8-1.8-1.7-1.4-2.8-3.2-3-4.4-.2-1.1.1-1.9.5-2.4Z" /></svg>;
    case "telegram":
      return <svg {...shared} fill={color} stroke="none"><path d="m21.5 4.3-3.2 15.1c-.2 1.1-.8 1.4-1.7.9l-4.7-3.5-2.3 2.2c-.3.3-.5.5-1 .5l.4-4.8 8.8-8c.4-.4-.1-.6-.6-.2L6.3 13.4l-4.6-1.5c-1-.3-1-1 .2-1.5L19.8 3.6c.9-.3 1.9.2 1.7.7Z" /></svg>;
    case "linkedin":
      return <svg {...shared} fill={color} stroke="none"><rect x="3" y="3" width="18" height="18" rx="2.4" /><path fill="#fff" d="M6.2 9.4h2.6v8.4H6.2zm1.3-3.8a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3m2.9 3.8h2.5v1.1h.1a2.8 2.8 0 0 1 2.5-1.4c2.7 0 3.2 1.8 3.2 4v4.7h-2.6v-4.2c0-1 0-2.3-1.4-2.3s-1.7 1.1-1.7 2.2v4.3h-2.6z" /></svg>;
    case "github":
      return <svg {...shared} fill="currentColor" stroke="none"><path d="M12 .9a11.1 11.1 0 0 0-3.5 21.6c.6.1.8-.2.8-.6v-2.1c-3.1.7-3.8-1.3-3.8-1.3-.5-1.2-1.2-1.5-1.2-1.5-1-.7.1-.7.1-.7 1.1.1 1.7 1.1 1.7 1.1 1 .1.7 2.3 3.6 1.7.1-.7.4-1.2.7-1.5-2.5-.3-5.1-1.2-5.1-5.5 0-1.2.4-2.2 1.1-3-.1-.3-.5-1.5.1-3.1 0 0 .9-.3 3.1 1.1a10.8 10.8 0 0 1 5.6 0c2.1-1.4 3.1-1.1 3.1-1.1.6 1.6.2 2.8.1 3.1.7.8 1.1 1.8 1.1 3 0 4.3-2.6 5.2-5.1 5.5.4.3.7 1 .7 1.9v2.8c0 .4.2.7.8.6A11.1 11.1 0 0 0 12 .9Z" /></svg>;
    case "twitter":
      return <svg {...shared} fill="currentColor" stroke="none"><path d="M18.9 2.8h3.3l-7.2 8.2 8.5 10.2h-6.7l-5.2-6.8-6 6.8H2.3l7.7-8.8L1.9 2.8h6.9l4.7 6.2zm-1.2 16.6h1.8L7.5 4.5H5.6z" /></svg>;
    case "longe":
      return <svg {...shared}><circle cx="12" cy="12" r="8.5" /><path d="M8 16V8h3.8a2 2 0 0 1 0 4H8m4 0 4 4" /></svg>;
  }
}
