import type { ComponentType, SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

function createMultiPathIcon(paths: string[], viewBox = '0 0 24 24'): ComponentType<IconProps> {
  return function Icon({ className, ...props }: IconProps) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox={viewBox}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        {...props}
      >
        {paths.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </svg>
    );
  };
}

function createPathsWithElements(elements: React.JSX.Element[], viewBox = '0 0 24 24'): ComponentType<IconProps> {
  return function Icon({ className, ...props }: IconProps) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox={viewBox}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        {...props}
      >
        {elements}
      </svg>
    );
  };
}

export const LayoutDashboard = createMultiPathIcon([
  'M3 3v18h18',
  'M3 9h18',
  'M9 21V9',
]);

export const FolderKanban = createMultiPathIcon([
  'M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z',
  'M9 13h6',
  'M9 17h3',
]);

export const CheckSquare = createMultiPathIcon([
  'M9 11l3 3L22 4',
  'M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
]);

export const Wrench = createMultiPathIcon([
  'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z',
]);

export const Package = createMultiPathIcon([
  'm7.5 4.27 9 5.15',
  'M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z',
  'm3.3 7 8.7 5 8.7-5',
  'M12 22V12',
]);

export const FileText = createPathsWithElements([
  <path key="1" d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />,
  <polyline key="2" points="14 2 14 8 20 8" />,
  <path key="3" d="M16 13H8" />,
  <path key="4" d="M16 17H8" />,
  <path key="5" d="M10 9H8" />,
]);

export const Bell = createPathsWithElements([
  <path key="1" d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />,
  <path key="2" d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />,
]);

export const Bot = createPathsWithElements([
  <rect key="1" x="3" y="11" width="18" height="10" rx="2" />,
  <circle key="2" cx="12" cy="5" r="2" />,
  <path key="3" d="M12 7v4" />,
  <line key="4" x1="8" x2="8" y1="16" y2="16" />,
  <line key="5" x1="16" x2="16" y1="16" y2="16" />,
]);

export const ClipboardList = createPathsWithElements([
  <rect key="1" x="8" y="2" width="8" height="4" rx="1" ry="1" />,
  <path key="2" d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />,
  <path key="3" d="M12 11h4" />,
  <path key="4" d="M12 16h4" />,
  <path key="5" d="M8 11h.01" />,
  <path key="6" d="M8 16h.01" />,
]);

export const Settings = createPathsWithElements([
  <path key="1" d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />,
  <circle key="2" cx="12" cy="12" r="3" />,
]);

export const HardHat = createPathsWithElements([
  <path key="1" d="M2 18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v2z" />,
  <path key="2" d="M10 15V6a2 2 0 0 1 4 0v9" />,
  <path key="3" d="M4 15v-3a8 8 0 0 1 16 0v3" />,
]);

export const Search = createPathsWithElements([
  <circle key="1" cx="11" cy="11" r="8" />,
  <path key="2" d="m21 21-4.3-4.3" />,
]);

export const Filter = createPathsWithElements([
  <path key="1" d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />,
]);

export const Menu = createMultiPathIcon([
  'M4 12h16',
  'M4 6h16',
  'M4 18h16',
]);

export const X = createMultiPathIcon([
  'M18 6 6 18',
  'm6 6 12 12',
]);

export const Moon = createPathsWithElements([
  <path key="1" d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />,
]);

export const Sun = createPathsWithElements([
  <circle key="1" cx="12" cy="12" r="4" />,
  <path key="2" d="M12 2v2" />,
  <path key="3" d="M12 20v2" />,
  <path key="4" d="m4.93 4.93 1.41 1.41" />,
  <path key="5" d="m17.66 17.66 1.41 1.41" />,
  <path key="6" d="M2 12h2" />,
  <path key="7" d="M20 12h2" />,
  <path key="8" d="m6.34 17.66-1.41 1.41" />,
  <path key="9" d="m19.07 4.93-1.41 1.41" />,
]);

export const Monitor = createPathsWithElements([
  <rect key="1" x="2" y="3" width="20" height="14" rx="2" />,
  <line key="2" x1="8" x2="16" y1="21" y2="21" />,
  <line key="3" x1="12" x2="12" y1="17" y2="21" />,
]);

export const ChevronRight = createPathsWithElements([
  <path key="1" d="m9 18 6-6-6-6" />,
]);

/* --- Added for the 2026-09-19 collapsible sidebar + dashboard header controls --- */

export const LayoutGrid = createPathsWithElements([
  <rect key="1" x="3" y="3" width="7" height="7" rx="1" />,
  <rect key="2" x="14" y="3" width="7" height="7" rx="1" />,
  <rect key="3" x="14" y="14" width="7" height="7" rx="1" />,
  <rect key="4" x="3" y="14" width="7" height="7" rx="1" />,
]);

export const Briefcase = createPathsWithElements([
  <path key="1" d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />,
  <rect key="2" x="2" y="6" width="20" height="14" rx="2" />,
]);

export const BarChart3 = createMultiPathIcon([
  'M3 3v18h18',
  'M18 17V9',
  'M13 17V5',
  'M8 17v-3',
]);

export const ChevronDown = createPathsWithElements([
  <path key="1" d="m6 9 6 6 6-6" />,
]);

export const Home = createPathsWithElements([
  <path key="1" d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
  <polyline key="2" points="9 22 9 12 15 12 15 22" />,
]);

export const User = createPathsWithElements([
  <path key="1" d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />,
  <circle key="2" cx="12" cy="7" r="4" />,
]);

export const LogOut = createPathsWithElements([
  <path key="1" d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />,
  <polyline key="2" points="16 17 21 12 16 7" />,
  <line key="3" x1="21" x2="9" y1="12" y2="12" />,
]);

export const Check = createPathsWithElements([
  <path key="1" d="M20 6 9 17l-5-5" />,
]);

export const FileQuestion = createPathsWithElements([
  <path key="1" d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />,
  <polyline key="2" points="14 2 14 8 20 8" />,
  <path key="3" d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />,
  <path key="4" d="M12 17h.01" />,
]);

export const ArrowLeft = createPathsWithElements([
  <path key="1" d="m12 19-7-7 7-7" />,
  <path key="2" d="M19 12H5" />,
]);

export const Shield = createPathsWithElements([
  <path key="1" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
]);

export const ShieldOff = createPathsWithElements([
  <path key="1" d="m2 2 20 20" />,
  <path key="2" d="M5 5v1a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3" />,
  <path key="3" d="M12.31 12.31A2 2 0 0 0 14 16a2 2 0 0 0 .31-3.69" />,
  <path key="4" d="M2 8v13a2 2 0 0 0 2 2h13" />,
]);

export const Loader2 = createPathsWithElements([
  <path key="1" d="M21 12a9 9 0 1 1-6.219-8.56" />,
]);

export const MoreHorizontal = createPathsWithElements([
  <circle key="1" cx="12" cy="12" r="1" />,
  <circle key="2" cx="19" cy="12" r="1" />,
  <circle key="3" cx="5" cy="12" r="1" />,
]);

export const AlertCircle = createPathsWithElements([
  <circle key="1" cx="12" cy="12" r="10" />,
  <line key="2" x1="12" x2="12" y1="8" y2="12" />,
  <line key="3" x1="12" x2="12.01" y1="16" y2="16" />,
]);

export const ExternalLink = createPathsWithElements([
  <path key="1" d="M15 3h6v6" />,
  <path key="2" d="M10 14 21 3" />,
  <path key="3" d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />,
]);

export const CheckCircle = createPathsWithElements([
  <path key="1" d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />,
  <path key="2" d="M22 4 12 14.01l-3-3" />,
]);

export const AlertTriangle = createPathsWithElements([
  <path key="1" d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />,
  <path key="2" d="M12 9v4" />,
  <path key="3" d="M12 17h.01" />,
]);

export const Clock = createPathsWithElements([
  <circle key="1" cx="12" cy="12" r="10" />,
  <polyline key="2" points="12 6 12 12 16 14" />,
]);

export const ArrowRight = createPathsWithElements([
  <path key="1" d="M5 12h14" />,
  <path key="2" d="m12 5 7 7-7 7" />,
]);

export const Edit = createPathsWithElements([
  <path key="1" d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />,
  <path key="2" d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />,
]);

export const Trash = createPathsWithElements([
  <path key="1" d="M3 6h18" />,
  <path key="2" d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />,
  <path key="3" d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />,
  <line key="4" x1="10" x2="10" y1="11" y2="17" />,
  <line key="5" x1="14" x2="14" y1="11" y2="17" />,
]);

export const Calendar = createPathsWithElements([
  <rect key="1" width="18" height="18" x="3" y="4" rx="2" ry="2" />,
  <line key="2" x1="16" x2="16" y1="2" y2="6" />,
  <line key="3" x1="8" x2="8" y1="2" y2="6" />,
  <line key="4" x1="3" x2="21" y1="10" y2="10" />,
]);

export const MapPin = createPathsWithElements([
  <path key="1" d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />,
  <circle key="2" cx="12" cy="10" r="3" />,
]);

export const Plus = createPathsWithElements([
  <line key="1" x1="12" x2="12" y1="5" y2="19" />,
  <line key="2" x1="5" x2="19" y1="12" y2="12" />,
]);

export const ChevronLeft = createPathsWithElements([
  <path key="1" d="m15 18-6-6 6-6" />,
]);

export const Building = createPathsWithElements([
  <rect key="1" width="16" height="20" x="4" y="2" rx="2" ry="2" />,
  <path key="2" d="M9 22v-4h6v4" />,
  <path key="3" d="M8 6h.01" />,
  <path key="4" d="M16 6h.01" />,
  <path key="5" d="M12 6h.01" />,
  <path key="6" d="M12 10h.01" />,
  <path key="7" d="M12 14h.01" />,
  <path key="8" d="M16 10h.01" />,
  <path key="9" d="M16 14h.01" />,
  <path key="10" d="M8 10h.01" />,
  <path key="11" d="M8 14h.01" />,
]);

export const Users = createPathsWithElements([
  <path key="1" d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />,
  <circle key="2" cx="9" cy="7" r="4" />,
  <path key="3" d="M23 21v-2a4 4 0 0 0-3-3.87" />,
  <path key="4" d="M16 3.13a4 4 0 0 1 0 7.75" />,
]);

export const FolderOpen = createMultiPathIcon([
  'M6 14l1.45-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.55 6a2 2 0 0 1-1.94 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H18a2 2 0 0 1 2 2v2',
]);

export const Mic = createPathsWithElements([
  <path key="1" d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />,
  <path key="2" d="M19 10v2a7 7 0 0 1-14 0v-2" />,
  <line key="3" x1="12" x2="12" y1="19" y2="22" />,
]);

export const ArrowUp = createPathsWithElements([
  <path key="1" d="m5 12 7-7 7 7" />,
  <path key="2" d="M12 19V5" />,
]);

export const Download = createPathsWithElements([
  <path key="1" d="m12 3 7 7h-4v6h-6v-6H5z" />,
  <path key="2" d="M5 21h14" />,
]);

export const Camera = createPathsWithElements([
  <path key="1" d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />,
  <circle key="2" cx="12" cy="13" r="3" />,
]);

export const Copy = createPathsWithElements([
  <rect key="1" x="9" y="9" width="13" height="13" rx="2" ry="2" />,
  <path key="2" d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />,
]);

export const UserPlus = createPathsWithElements([
  <path key="1" d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />,
  <circle key="2" cx="9" cy="7" r="4" />,
  <line key="3" x1="19" x2="19" y1="8" y2="14" />,
  <line key="4" x1="22" x2="16" y1="11" y2="11" />,
]);

export const Mail = createPathsWithElements([
  <rect key="1" x="2" y="4" width="20" height="16" rx="2" />,
  <path key="2" d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />,
]);

export const Building2 = createPathsWithElements([
  <path key="1" d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />,
  <path key="2" d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />,
  <path key="3" d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />,
  <path key="4" d="M10 6h4" />,
  <path key="5" d="M10 10h4" />,
  <path key="6" d="M10 14h4" />,
  <path key="7" d="M10 18h4" />,
]);

/* --- Added for the 2026-09-18 landing redesign (ProblemSection scattered-tools diagram) --- */

export const MessageCircle = createPathsWithElements([
  <path key="1" d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />,
]);

export const FileSpreadsheet = createPathsWithElements([
  <path key="1" d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />,
  <polyline key="2" points="14 2 14 8 20 8" />,
  <path key="3" d="M8 13h2" />,
  <path key="4" d="M14 13h2" />,
  <path key="5" d="M8 17h2" />,
  <path key="6" d="M14 17h2" />,
]);

export const ReceiptText = createPathsWithElements([
  <path key="1" d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z" />,
  <path key="2" d="M16 8H8" />,
  <path key="3" d="M16 12H8" />,
  <path key="4" d="M13 16H8" />,
]);

export const StickyNote = createPathsWithElements([
  <path key="1" d="M16 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10l4-4V5a2 2 0 0 0-2-2Z" />,
  <path key="2" d="M15 21v-4a2 2 0 0 1 2-2h4" />,
]);

export const Crop = createMultiPathIcon([
  'M6 2v14a2 2 0 0 0 2 2h14',
  'M18 22V8a2 2 0 0 0-2-2H2',
]);

export const ZoomIn = createPathsWithElements([
  <circle key="1" cx="11" cy="11" r="8" />,
  <path key="2" d="M21 21l-4.35-4.35" />,
  <line key="3" x1="11" x2="11" y1="8" y2="14" />,
  <line key="4" x1="8" x2="14" y1="11" y2="11" />,
]);

export const ZoomOut = createPathsWithElements([
  <circle key="1" cx="11" cy="11" r="8" />,
  <path key="2" d="M21 21l-4.35-4.35" />,
  <line key="3" x1="8" x2="14" y1="11" y2="11" />,
]);

export const RotateCw = createMultiPathIcon([
  'M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8',
  'M21 3v5h-5',
]);

export const RotateCcw = createMultiPathIcon([
  'M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8',
  'M3 3v5h5',
]);

export const Undo2 = createMultiPathIcon([
  'M9 14 4 9l5-5',
  'M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11',
]);

export const Google = createPathsWithElements(
  [
    <path
      key="1"
      fill="#4285F4"
      stroke="none"
      d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.57 5.57 0 0 1-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
    />,
    <path
      key="2"
      fill="#34A853"
      stroke="none"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A11.99 11.99 0 0 0 12 24z"
    />,
    <path
      key="3"
      fill="#FBBC05"
      stroke="none"
      d="M5.27 14.29a7.17 7.17 0 0 1 0-4.58V6.62H1.29a12 12 0 0 0 0 10.76l3.98-3.09z"
    />,
    <path
      key="4"
      fill="#EA4335"
      stroke="none"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"
    />,
  ],
  '0 0 24 24',
);
