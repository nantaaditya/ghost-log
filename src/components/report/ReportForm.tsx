"use client";

import { useForm, useFieldArray, Controller } from "react-hook-form";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";
import { SECTION_META } from "@/lib/report/section-meta";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { serializeReport } from "@/lib/markdown/serialize";
import { getCurrentWeekId } from "@/lib/week/iso-week";
import type { ReportData, HealthIndicator, SprintGoalStatus } from "@/types/report";

const HEALTH_OPTIONS: { value: HealthIndicator; label: string }[] = [
  { value: "on-track", label: "🟢 On Track" },
  { value: "at-risk", label: "🟡 At Risk" },
  { value: "off-track", label: "🔴 Off Track" },
];

const SPRINT_STATUSES: SprintGoalStatus[] = ["Achieved", "Ongoing", "Missed"];
const DRAFT_KEY = "report-draft";

type Props = {
  reporterName: string;
  weekId?: string;
  initial?: Partial<ReportData>;
  backHref?: string;
  onSubmit: (data: ReportData) => Promise<void>;
};

export default function ReportForm({ reporterName, weekId, initial, backHref, onSubmit }: Props) {
  const currentWeekId = weekId ?? getCurrentWeekId();
  const [submitting, setSubmitting] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);

  const defaultValues: ReportData = {
    reporterName,
    weekId: currentWeekId,
    healthIndicator: "on-track",
    escalations: [],
    productionHealth: [],
    techDebt: [],
    delivery: [],
    lookAhead: { priority1: "", priority2: "" },
    ghibah: "",
    ...initial,
  };

  const form = useForm<ReportData>({ defaultValues });
  const { control, register, handleSubmit, watch, setValue, reset } = form;

  const escalations = useFieldArray({ control, name: "escalations" });
  const productionHealth = useFieldArray({ control, name: "productionHealth" });
  const techDebt = useFieldArray({ control, name: "techDebt" });
  const delivery = useFieldArray({ control, name: "delivery" });

  const formData = watch();

  // Restore draft on mount
  useEffect(() => {
    if (initial) return;
    const saved = localStorage.getItem(`${DRAFT_KEY}-${currentWeekId}`);
    if (saved) {
      reset(JSON.parse(saved));
      setDraftRestored(true);
    }
  }, [currentWeekId, initial, reset]);

  // Auto-save draft
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem(`${DRAFT_KEY}-${currentWeekId}`, JSON.stringify(formData));
    }, 2000);
    return () => clearTimeout(timer);
  }, [formData, currentWeekId]);

  async function submit(data: ReportData) {
    setSubmitting(true);
    try {
      await onSubmit(data);
      localStorage.removeItem(`${DRAFT_KEY}-${currentWeekId}`);
    } finally {
      setSubmitting(false);
    }
  }

  const preview = serializeReport({ ...formData, reporterName });

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {backHref && (
            <LinkButton href={backHref} variant="ghost" size="sm">← Back</LinkButton>
          )}
          <div>
            <h1 className="text-xl font-semibold">Weekly Report</h1>
            <p className="text-sm text-muted-foreground">{currentWeekId}</p>
          </div>
        </div>
        {draftRestored && (
          <Badge variant="outline">Draft restored</Badge>
        )}
      </div>

      <Tabs defaultValue="edit">
        <TabsList>
          <TabsTrigger value="edit">Edit</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="edit">
          <form onSubmit={handleSubmit(submit)} className="space-y-6">

            {/* Overall Health */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">📊 Overall Health</CardTitle>
                <CardDescription>Your team's status at a glance — the first signal your manager reads.</CardDescription>
              </CardHeader>
              <CardContent>
                <Controller
                  control={control}
                  name="healthIndicator"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {HEALTH_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </CardContent>
            </Card>

            {/* Section 1: Escalations */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">🚨 1. Escalations & Blockers</CardTitle>
                <CardDescription>{SECTION_META.escalations.helper}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {escalations.fields.map((field, i) => (
                  <div key={field.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex gap-2">
                      <Input placeholder="Product · Client" {...register(`escalations.${i}.project`)} />
                      <Input placeholder="Topic" {...register(`escalations.${i}.topic`)} />
                      <Button type="button" variant="ghost" size="sm" onClick={() => escalations.remove(i)}>✕</Button>
                    </div>
                    <Textarea placeholder="Problem (BLUF)" rows={2} {...register(`escalations.${i}.problem`)} />
                    <Textarea placeholder="Impact" rows={2} {...register(`escalations.${i}.impact`)} />
                    <Textarea placeholder="Actions taken" rows={2} {...register(`escalations.${i}.actionsTaken`)} />
                    <Input placeholder="Ask (what do you need?)" {...register(`escalations.${i}.ask`)} />
                    <Input type="url" placeholder="Jira ticket link (optional)" {...register(`escalations.${i}.jiraLink`)} />
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm"
                  onClick={() => escalations.append({ project: "", topic: "", problem: "", impact: "", actionsTaken: "", ask: "", jiraLink: "" })}>
                  + Add escalation
                </Button>
              </CardContent>
            </Card>

            {/* Section 2: Production Health */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">📉 2. Production Health & Incidents</CardTitle>
                <CardDescription>{SECTION_META.productionHealth.helper}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {productionHealth.fields.map((field, i) => (
                  <div key={field.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex gap-2">
                      <Input placeholder="Product · Client" {...register(`productionHealth.${i}.project`)} />
                      <Input placeholder="Topic" {...register(`productionHealth.${i}.topic`)} />
                      <Button type="button" variant="ghost" size="sm" onClick={() => productionHealth.remove(i)}>✕</Button>
                    </div>
                    <Textarea placeholder="Problem (BLUF)" rows={2} {...register(`productionHealth.${i}.problem`)} />
                    <Textarea placeholder="Impact" rows={2} {...register(`productionHealth.${i}.impact`)} />
                    <Textarea placeholder="Root cause" rows={2} {...register(`productionHealth.${i}.rootCause`)} />
                    <Input placeholder="Next action" {...register(`productionHealth.${i}.nextAction`)} />
                    <Input type="url" placeholder="Jira ticket link (optional)" {...register(`productionHealth.${i}.jiraLink`)} />
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm"
                  onClick={() => productionHealth.append({ project: "", topic: "", problem: "", impact: "", rootCause: "", nextAction: "", jiraLink: "" })}>
                  + Add incident
                </Button>
              </CardContent>
            </Card>

            {/* Section 3: Tech Debt */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">🛠 3. Technical Debt & Architecture</CardTitle>
                <CardDescription>{SECTION_META.techDebt.helper}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {techDebt.fields.map((field, i) => (
                  <div key={field.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex gap-2">
                      <Input placeholder="Product · Client" {...register(`techDebt.${i}.project`)} />
                      <Input placeholder="Type (e.g. Debt Incurred)" {...register(`techDebt.${i}.debtType`)} />
                      <Button type="button" variant="ghost" size="sm" onClick={() => techDebt.remove(i)}>✕</Button>
                    </div>
                    <Textarea placeholder="Description" rows={2} {...register(`techDebt.${i}.description`)} />
                    <Input placeholder="Proposed mitigation" {...register(`techDebt.${i}.mitigation`)} />
                    <Input type="url" placeholder="Jira ticket link (optional)" {...register(`techDebt.${i}.jiraLink`)} />
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm"
                  onClick={() => techDebt.append({ project: "", debtType: "", description: "", mitigation: "", jiraLink: "" })}>
                  + Add tech debt
                </Button>
              </CardContent>
            </Card>

            {/* Section 4: Delivery */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">🚀 4. Delivery & Execution</CardTitle>
                <CardDescription>{SECTION_META.delivery.helper}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {delivery.fields.map((field, i) => (
                  <div key={field.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex gap-2">
                      <Input placeholder="Product · Client" {...register(`delivery.${i}.project`)} />
                      <Controller
                        control={control}
                        name={`delivery.${i}.sprintGoalStatus`}
                        render={({ field: f }) => (
                          <Select value={f.value} onValueChange={f.onChange}>
                            <SelectTrigger className="w-36">
                              <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                              {SPRINT_STATUSES.map((s) => (
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      <Button type="button" variant="ghost" size="sm" onClick={() => delivery.remove(i)}>✕</Button>
                    </div>
                    <Textarea placeholder="Progress" rows={2} {...register(`delivery.${i}.progress`)} />
                    <Textarea placeholder="Next steps" rows={2} {...register(`delivery.${i}.nextSteps`)} />
                    <Input placeholder="Risks (optional)" {...register(`delivery.${i}.risks`)} />
                    <Input type="url" placeholder="Jira ticket link (optional)" {...register(`delivery.${i}.jiraLink`)} />
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm"
                  onClick={() => delivery.append({ project: "", sprintGoalStatus: "Ongoing", progress: "", nextSteps: "", risks: "", jiraLink: "" })}>
                  + Add delivery item
                </Button>
              </CardContent>
            </Card>

            {/* Section 5: Look Ahead */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">🔮 5. Look Ahead</CardTitle>
                <CardDescription>{SECTION_META.lookAhead.helper}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="space-y-1">
                  <Label>Priority 1</Label>
                  <Input {...register("lookAhead.priority1")} />
                </div>
                <div className="space-y-1">
                  <Label>Priority 2</Label>
                  <Input {...register("lookAhead.priority2")} />
                </div>
              </CardContent>
            </Card>

            {/* Section 6: Ghibah */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">💬 6. Ghibah Online</CardTitle>
                <CardDescription>{SECTION_META.ghibah.helper}</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  rows={5}
                  placeholder="Cerita seru minggu ini…"
                  {...register("ghibah")}
                />
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button type="submit" disabled={submitting} size="lg">
                {submitting ? "Submitting…" : "Submit Report"}
              </Button>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="preview">
          <Card>
            <CardContent className="p-6 prose prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{preview}</ReactMarkdown>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
