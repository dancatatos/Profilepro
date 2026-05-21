"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { BOTTOM_NAV } from "@/lib/constants";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 lg:hidden">
      <div className="glass-strong border-t border-white/[0.07] pb-safe">
        <div className="mx-auto flex max-w-md items-stretch justify-around px-2">
          {BOTTOM_NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.key}
                href={item.href}
                className="relative flex flex-1 flex-col items-center gap-1 py-2.5 no-tap-highlight"
              >
                {active && (
                  <motion.span
                    layoutId="bottomNavActive"
                    className="absolute -top-px h-0.5 w-8 rounded-full bg-electric-400"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <Icon
                  name={item.icon}
                  className={cn(
                    "h-5 w-5 transition-colors",
                    active ? "text-electric-400" : "text-white/45",
                  )}
                />
                <span
                  className={cn(
                    "text-[10px] font-medium transition-colors",
                    active ? "text-white" : "text-white/45",
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
