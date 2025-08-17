import { useEffect, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { BotVersion, Credits } from "@/services/types";

interface ChatHeaderProps {
  version: BotVersion;
  credits: Credits | null;
  onVersionChange: (v: BotVersion) => void;
}

export function ChatHeader({ version, credits, onVersionChange }: ChatHeaderProps) {
  const remaining = useMemo(() => {
    if (!credits) return 0;
    return version === "V1" ? credits.v1 : version === "V2" ? credits.v2 : credits.v3;
  }, [credits, version]);

  return (
    <header className="sticky top-0 z-10 h-14 border-b flex items-center px-3 gap-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <h1 className="text-base font-medium flex items-center gap-2">
        <span>Chatbot Version</span>
        <Select value={version} onValueChange={(v) => onVersionChange(v as BotVersion)}>
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="V1">V1</SelectItem>
            <SelectItem value="V2">V2</SelectItem>
            <SelectItem value="V3">V3</SelectItem>
          </SelectContent>
        </Select>
      </h1>
      <div className="ml-auto">
        <Badge variant="secondary" aria-live="polite">Credits: {remaining}</Badge>
      </div>
    </header>
  );
}
