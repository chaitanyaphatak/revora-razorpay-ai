import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="bottom-right"
      className="toaster group"
      closeButton
      richColors={false}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white/95 group-[.toaster]:text-slate-900 group-[.toaster]:border group-[.toaster]:border-slate-200/90 group-[.toaster]:shadow-[0_20px_48px_rgba(15,23,42,0.14),0_4px_12px_rgba(15,23,42,0.05)] group-[.toaster]:backdrop-blur-xl group-[.toaster]:rounded-2xl group-[.toaster]:p-4 group-[.toaster]:gap-3 group-[.toaster]:font-sans group-[.toaster]:tracking-tight group-[.toaster]:transition-all",
          title:
            "group-[.toast]:text-[13px] group-[.toast]:font-bold group-[.toast]:text-slate-900 group-[.toast]:tracking-tight group-[.toast]:leading-snug font-['Manrope']",
          description:
            "group-[.toast]:text-[12px] group-[.toast]:font-medium group-[.toast]:text-slate-600 group-[.toast]:leading-relaxed group-[.toast]:mt-0.5",
          actionButton:
            "group-[.toast]:bg-teal-600 group-[.toast]:hover:bg-teal-700 group-[.toast]:text-white group-[.toast]:text-xs group-[.toast]:font-semibold group-[.toast]:rounded-xl group-[.toast]:px-3.5 group-[.toast]:py-1.5 group-[.toast]:shadow-sm group-[.toast]:transition-colors",
          cancelButton:
            "group-[.toast]:bg-slate-100 group-[.toast]:hover:bg-slate-200 group-[.toast]:text-slate-600 group-[.toast]:text-xs group-[.toast]:font-medium group-[.toast]:rounded-xl group-[.toast]:px-3 group-[.toast]:py-1.5 group-[.toast]:transition-colors",
          closeButton:
            "group-[.toast]:bg-white group-[.toast]:border group-[.toast]:border-slate-200 group-[.toast]:text-slate-400 group-[.toast]:hover:text-slate-700 group-[.toast]:hover:bg-slate-50 group-[.toast]:shadow-xs group-[.toast]:rounded-full group-[.toast]:transition-all",
          success:
            "group-[.toaster]:border-emerald-300/80 group-[.toaster]:bg-gradient-to-br group-[.toaster]:from-white group-[.toaster]:to-emerald-50/70 group-[.toast]:!text-emerald-950",
          error:
            "group-[.toaster]:border-rose-300/80 group-[.toaster]:bg-gradient-to-br group-[.toaster]:from-white group-[.toaster]:to-rose-50/70 group-[.toast]:!text-rose-950",
          warning:
            "group-[.toaster]:border-amber-300/80 group-[.toaster]:bg-gradient-to-br group-[.toaster]:from-white group-[.toaster]:to-amber-50/70 group-[.toast]:!text-amber-950",
          info:
            "group-[.toaster]:border-teal-300/80 group-[.toaster]:bg-gradient-to-br group-[.toaster]:from-white group-[.toaster]:to-teal-50/70 group-[.toast]:!text-slate-900",
        },
      }}
      style={
        {
          "--normal-bg": "#ffffff",
          "--normal-text": "#0f172a",
          "--normal-border": "rgba(226, 232, 240, 0.9)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
