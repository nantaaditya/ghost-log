import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SECTION_META, GUIDE_PRINCIPLES } from "@/lib/report/section-meta";

export default function CommunicationGuide() {
  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          <b>Communication Structuring Guide</b>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-5 pt-0">
        <div className="space-y-1 text-sm">
          <p className="font-medium">{GUIDE_PRINCIPLES.purpose}</p>
          <p className="text-muted-foreground">{GUIDE_PRINCIPLES.bluf}</p>
          <p className="text-muted-foreground">{GUIDE_PRINCIPLES.empty}</p>
        </div>

        <div className="space-y-2">
          {Object.values(SECTION_META).map((s) => (
            <div key={s.number} className="text-sm">
              <p className="font-medium">{s.emoji} {s.number}. {s.title}</p>
              <p className="text-muted-foreground text-xs ml-1">{s.helper}</p>
            </div>
          ))}
        </div>

        <div className="border-t pt-4 space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">How to submit</p>
          <ol className="space-y-1 text-sm text-muted-foreground list-decimal list-inside">
            <li>Click <strong className="text-foreground">New Report</strong> to open the weekly report form.</li>
            <li>Fill in the sections that apply — empty sections are skipped automatically.</li>
            <li>Use the <strong className="text-foreground">Preview</strong> tab to review the Markdown before submitting.</li>
            <li>Click <strong className="text-foreground">Submit Report</strong> — the file is saved to OneDrive and appears in your list.</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
