import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SECTION_META, GUIDE_PRINCIPLES } from "@/lib/report/section-meta";
import { BookOpen } from "lucide-react";

export default function CommunicationGuide() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-muted-foreground/60" />
          <CardTitle className="text-[0.8rem] text-muted-foreground font-medium">
            Writing Guide
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <div className="space-y-1.5 text-[0.75rem] bg-muted/40 rounded-xl p-3">
          <p className="font-medium text-foreground/80">{GUIDE_PRINCIPLES.purpose}</p>
          <p className="text-muted-foreground/70">{GUIDE_PRINCIPLES.bluf}</p>
          <p className="text-muted-foreground/70">{GUIDE_PRINCIPLES.empty}</p>
        </div>

        <div className="space-y-2">
          {Object.values(SECTION_META).map((s) => (
            <div key={s.number} className="text-[0.75rem] flex gap-2">
              <span className="shrink-0 mt-px">{s.emoji}</span>
              <div>
                <p className="font-medium text-foreground/80">{s.number}. {s.title}</p>
                <p className="text-muted-foreground/60 text-[0.7rem] mt-0.5">{s.helper}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-border/30 pt-3.5 space-y-2">
          <p className="text-[0.65rem] font-semibold text-muted-foreground/50 uppercase tracking-widest">
            How to submit
          </p>
          <ol className="space-y-1.5 text-[0.75rem] text-muted-foreground/70 list-decimal list-inside">
            <li>Click <strong className="text-foreground/80 font-medium">New Report</strong> to open the form.</li>
            <li>Fill in the sections — empty ones are skipped.</li>
            <li>Use <strong className="text-foreground/80 font-medium">Preview</strong> to review before submitting.</li>
            <li>Click <strong className="text-foreground/80 font-medium">Submit</strong> — saved to OneDrive.</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
