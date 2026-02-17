interface InboxRowProps {
  title: string;
  subtitle?: string;
  unread?: number;
  onClick: () => void;
  cta?: string;
}

export default function InboxRow({
  title,
  subtitle,
  unread,
  onClick,
  cta,
}: InboxRowProps) {
  return (
    <button 
      className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition shadow-sm" 
      onClick={onClick}
      aria-label={`${title}${subtitle ? ` - ${subtitle}` : ""}${unread ? ` - ${unread} mensagens não lidas` : ""}`}
    >
      <div className="flex-1 text-left">
        <div className="text-sm font-semibold text-gray-900">{title}</div>
        {subtitle && <div className="text-xs text-gray-600 mt-0.5">{subtitle}</div>}
      </div>
      <div className="flex items-center gap-2 ml-3">
        {cta && <span className="text-xs font-medium text-gray-900 px-2 py-1 bg-gradient-to-r from-gradient-start via-gradient-mid to-gradient-end rounded">{cta}</span>}
        {unread && unread > 0 && (
          <span className="min-w-5 h-5 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full px-1.5" aria-label={`${unread} mensagens não lidas`}>
            {unread}
          </span>
        )}
        <svg 
          className="text-gray-400" 
          width="18" 
          height="18" 
          viewBox="0 0 24 24" 
          fill="none" 
          aria-hidden="true"
        >
          <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" />
        </svg>
      </div>
    </button>
  );
}
