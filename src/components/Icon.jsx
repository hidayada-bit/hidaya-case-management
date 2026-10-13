import {
  Search, MapPin, Phone, Check, X, TriangleAlert, Info, Download, Upload, Pencil, Trash2,
  Plus, ArrowLeft, ArrowRight, ChevronRight, ChevronLeft, MessageSquare, FolderOpen, Users,
  Globe, Baby, Hourglass, School, ChartColumn, Paperclip, FileText, IdCard, Landmark, Image,
  ClipboardList, Save, Camera, Stethoscope, Lightbulb, Smartphone, PhoneOff, Building2, Award,
  ThumbsUp, TrendingUp, CircleCheck, Map, GraduationCap, LockKeyhole, Printer, FileSpreadsheet,
  Copy, ShieldCheck, UserCheck, UserX, UserCog, UserPlus, Wallet, Receipt, CalendarDays, House,
  Settings, LogOut, Loader2, Eye, EyeOff, Mail, KeyRound, Clock, RefreshCw, Banknote,
  CircleAlert, CircleX, Filter, Send, LayoutDashboard,
} from 'lucide-react'

// One place to map semantic names -> vector icons (Lucide). Use: <Icon name="search" size={16} />
const ICONS = {
  search: Search, pin: MapPin, phone: Phone, check: Check, x: X, alert: TriangleAlert,
  info: Info, download: Download, upload: Upload, edit: Pencil, trash: Trash2, plus: Plus,
  back: ArrowLeft, forward: ArrowRight, chevron: ChevronRight, chevronLeft: ChevronLeft,
  message: MessageSquare, folder: FolderOpen, users: Users, globe: Globe, child: Baby,
  pending: Hourglass, school: School, chart: ChartColumn, attach: Paperclip, file: FileText,
  idcard: IdCard, bank: Landmark, image: Image, clipboard: ClipboardList, save: Save,
  camera: Camera, medical: Stethoscope, tip: Lightbulb, sms: Smartphone, noPhone: PhoneOff,
  city: Building2, award: Award, good: ThumbsUp, trend: TrendingUp, done: CircleCheck,
  map: Map, graduation: GraduationCap, lock: LockKeyhole, print: Printer,
  spreadsheet: FileSpreadsheet, copy: Copy, shield: ShieldCheck, approve: UserCheck,
  reject: UserX, userCog: UserCog, userPlus: UserPlus, wallet: Wallet, receipt: Receipt,
  calendar: CalendarDays, home: House, settings: Settings, logout: LogOut, spinner: Loader2,
  eye: Eye, eyeOff: EyeOff, mail: Mail, key: KeyRound, clock: Clock, refresh: RefreshCw,
  cash: Banknote, warn: CircleAlert, fail: CircleX, filter: Filter, send: Send,
  dashboard: LayoutDashboard,
}

export default function Icon({ name, size = 16, color = 'currentColor', strokeWidth = 2, style, spin = false, ...rest }) {
  const C = ICONS[name]
  if (!C) return null
  return (
    <C
      size={size} color={color} strokeWidth={strokeWidth}
      style={{ flexShrink: 0, verticalAlign: 'middle', animation: spin ? 'spin 0.9s linear infinite' : undefined, ...style }}
      aria-hidden="true" {...rest}
    />
  )
}
