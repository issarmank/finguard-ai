import { SVGProps } from "react";

interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number;
  stroke?: string;
}

const Icon = ({ children, size = 16, stroke = "currentColor", fill = "none", strokeWidth = 1.75, style, ...rest }: IconProps & { children: React.ReactNode }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke}
    strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
    style={{ display: "block", flexShrink: 0, ...style }} {...rest}>
    {children}
  </svg>
);

export const IconHome = (p: IconProps) => <Icon {...p}><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></Icon>;
export const IconBook = (p: IconProps) => <Icon {...p}><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/></Icon>;
export const IconSparkles = (p: IconProps) => <Icon {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/></Icon>;
export const IconShield = (p: IconProps) => <Icon {...p}><path d="M12 3 4 6v6c0 4.5 3.2 8.4 8 9 4.8-.6 8-4.5 8-9V6z"/></Icon>;
export const IconFile = (p: IconProps) => <Icon {...p}><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/></Icon>;
export const IconFile2 = (p: IconProps) => <Icon {...p}><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/></Icon>;
export const IconSettings = (p: IconProps) => <Icon {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></Icon>;
export const IconSearch = (p: IconProps) => <Icon {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></Icon>;
export const IconBell = (p: IconProps) => <Icon {...p}><path d="M6 8a6 6 0 0 1 12 0c0 6 3 7 3 7H3s3-1 3-7"/><path d="M10 21a2 2 0 0 0 4 0"/></Icon>;
export const IconChevronDown = (p: IconProps) => <Icon {...p}><path d="m6 9 6 6 6-6"/></Icon>;
export const IconChevronRight = (p: IconProps) => <Icon {...p}><path d="m9 6 6 6-6 6"/></Icon>;
export const IconChevronLeft = (p: IconProps) => <Icon {...p}><path d="m15 6-6 6 6 6"/></Icon>;
export const IconX = (p: IconProps) => <Icon {...p}><path d="M18 6 6 18M6 6l12 12"/></Icon>;
export const IconPlus = (p: IconProps) => <Icon {...p}><path d="M12 5v14M5 12h14"/></Icon>;
export const IconTrash = (p: IconProps) => <Icon {...p}><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14"/></Icon>;
export const IconCopy = (p: IconProps) => <Icon {...p}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></Icon>;
export const IconDownload = (p: IconProps) => <Icon {...p}><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></Icon>;
export const IconArrowUp = (p: IconProps) => <Icon {...p}><path d="M12 19V5M5 12l7-7 7 7"/></Icon>;
export const IconArrowDown = (p: IconProps) => <Icon {...p}><path d="M12 5v14M19 12l-7 7-7-7"/></Icon>;
export const IconArrowRight = (p: IconProps) => <Icon {...p}><path d="M5 12h14M13 5l7 7-7 7"/></Icon>;
export const IconCheck = (p: IconProps) => <Icon {...p}><path d="m5 12 5 5L20 7"/></Icon>;
export const IconAlert = (p: IconProps) => <Icon {...p}><path d="M12 2 2 21h20z"/><path d="M12 9v5M12 17.5v.1"/></Icon>;
export const IconMenu = (p: IconProps) => <Icon {...p}><path d="M3 12h18M3 6h18M3 18h18"/></Icon>;
export const IconClock = (p: IconProps) => <Icon {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></Icon>;
export const IconRefresh = (p: IconProps) => <Icon {...p}><path d="M3 12a9 9 0 0 1 15.5-6.3L21 8"/><path d="M21 3v5h-5M21 12a9 9 0 0 1-15.5 6.3L3 16"/><path d="M3 21v-5h5"/></Icon>;
export const IconCalendar = (p: IconProps) => <Icon {...p}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></Icon>;
export const IconUsers = (p: IconProps) => <Icon {...p}><circle cx="9" cy="8" r="4"/><path d="M3 21a6 6 0 0 1 12 0"/><path d="M16 4a4 4 0 0 1 0 8M21 21a6 6 0 0 0-4-5.7"/></Icon>;
export const IconFingerprint = (p: IconProps) => <Icon {...p}><path d="M5 12a7 7 0 0 1 14 0v2"/><path d="M9 12a3 3 0 0 1 6 0v6"/><path d="M12 12v4"/><path d="M5 17.5c1 1.5 2 2.5 3 3"/><path d="M19 16c-.5 2-1.5 4-3 5"/></Icon>;
export const IconLayers = (p: IconProps) => <Icon {...p}><path d="m12 2 10 6-10 6L2 8z"/><path d="m2 14 10 6 10-6"/></Icon>;
export const IconActivity = (p: IconProps) => <Icon {...p}><path d="M3 12h4l3-9 4 18 3-9h4"/></Icon>;
export const IconMoon = (p: IconProps) => <Icon {...p}><path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z"/></Icon>;
export const IconZap = (p: IconProps) => <Icon {...p}><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></Icon>;
export const IconEye = (p: IconProps) => <Icon {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></Icon>;
export const IconRoundDollar = (p: IconProps) => <Icon {...p}><circle cx="12" cy="12" r="9"/><path d="M9 9c0-1.5 1.5-2 3-2 3 0 3 2 3 2s0 2-3 2-3 2-3 2 0 2 3 2 3-2 3-2"/><path d="M12 5v2M12 17v2"/></Icon>;
export const IconCreditCard = (p: IconProps) => <Icon {...p}><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></Icon>;
export const IconPieChart = (p: IconProps) => <Icon {...p}><path d="M22 12A10 10 0 1 1 12 2v10z"/><path d="M12 2a10 10 0 0 1 10 10H12z"/></Icon>;
export const IconTarget = (p: IconProps) => <Icon {...p}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/></Icon>;
export const IconTrendingUp = (p: IconProps) => <Icon {...p}><path d="M3 17l5-5 4 4 7-8"/><path d="M17 8h4v4"/></Icon>;
export const IconLink2 = (p: IconProps) => <Icon {...p}><path d="M10 13a5 5 0 0 0 7.5.6l2-2a5 5 0 0 0-7-7.1l-1.1 1.1"/><path d="M14 11a5 5 0 0 0-7.5-.6l-2 2a5 5 0 0 0 7 7.1l1.1-1.1"/></Icon>;
export const IconWallet = (p: IconProps) => <Icon {...p}><path d="M20 7H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><path d="M16 3H8L4 7h16z"/><circle cx="17" cy="13" r="1" fill="currentColor" stroke="none"/></Icon>;
