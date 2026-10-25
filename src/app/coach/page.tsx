import { redirect } from "next/navigation";
import { z } from "zod";
import { MessagesSquare } from "lucide-react";
import ChatThread from "@/components/coach/ChatThread";
import CoachTabs from "@/components/coach/CoachTabs";
import GoalEditor from "@/components/coach/GoalEditor";
import InboxList from "@/components/coach/InboxList";
import ManagerNotes from "@/components/coach/ManagerNotes";
import PlanView from "@/components/coach/PlanView";
import ResultsView from "@/components/coach/ResultsView";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/link-button";
import { isAdminViewer, toMemberProfileView } from "@/lib/coach/access";
import { buildInbox } from "@/lib/coach/inbox";
import { listActiveMembers } from "@/lib/coach/member-repository";
import { listThread, listThreadSummaries } from "@/lib/coach/message-repository";
import { toChatMessage } from "@/lib/coach/thread-state";
import { getActiveViewer, type ActiveViewer } from "@/lib/coach/viewer";
import { PLAN_CYCLE_YEAR, SURVEY_CYCLE_YEAR } from "@/lib/kpi/cycle";
import { toGoalDto, toMemberGoalDto } from "@/lib/kpi/goal-dto";
import { listByUser, listSharedByUser } from "@/lib/kpi/goal-repository";
import { findByUser, findForMember } from "@/lib/kpi/profile-repository";

export const dynamic = "force-dynamic";

const memberIdSchema = z.uuid();

function NoResultsYet() {
  return (
    <EmptyState
      title="No survey results yet"
      description={`The ${SURVEY_CYCLE_YEAR} survey results have not been imported for this person.`}
    />
  );
}

async function MemberView({ viewer }: { viewer: ActiveViewer }) {
  const [profileRow, goals, messages] = await Promise.all([
    findForMember(viewer.id, SURVEY_CYCLE_YEAR),
    listSharedByUser(viewer.id, PLAN_CYCLE_YEAR),
    listThread(viewer.id),
  ]);
  // The query already selects only member-visible columns; the policy filter is a second lock.
  const profile = profileRow ? toMemberProfileView(profileRow) : null;

  return (
    <CoachTabs
      tabs={[
        {
          id: "chat",
          label: "Chat",
          content: (
            <ChatThread
              memberId={viewer.id}
              viewerId={viewer.id}
              initialMessages={messages.map(toChatMessage)}
              counterpartLabel="your manager"
            />
          ),
        },
        {
          id: "results",
          label: "My results",
          content: profile ? <ResultsView profile={profile} /> : <NoResultsYet />,
          keepMounted: true,
        },
        {
          id: "plan",
          label: `${PLAN_CYCLE_YEAR} plan`,
          content: <PlanView goals={goals.map(toMemberGoalDto)} year={PLAN_CYCLE_YEAR} />,
        },
      ]}
    />
  );
}

async function AdminView({ viewer, requestedId }: { viewer: ActiveViewer; requestedId: string | undefined }) {
  const [members, summaries] = await Promise.all([listActiveMembers(), listThreadSummaries()]);
  const inbox = buildInbox(members, summaries);

  const parsedId = memberIdSchema.safeParse(requestedId);
  const selected = parsedId.success ? members.find((member) => member.id === parsedId.data) : undefined;

  const detail = selected
    ? await Promise.all([
        findByUser(selected.id, SURVEY_CYCLE_YEAR),
        listByUser(selected.id, PLAN_CYCLE_YEAR),
        listThread(selected.id),
      ])
    : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[17rem_minmax(0,1fr)]">
      <aside className="rounded-2xl border border-border/50 p-2 lg:self-start">
        <InboxList rows={inbox} selectedId={selected?.id ?? null} />
      </aside>

      <section className="min-w-0">
        {selected && detail ? (
          <div className="space-y-4">
            <h2 className="text-[1.05rem] font-semibold">{selected.name}</h2>
            <CoachTabs
              key={selected.id}
              tabs={[
                {
                  id: "chat",
                  label: "Chat",
                  content: (
                    <ChatThread
                      key={selected.id}
                      memberId={selected.id}
                      viewerId={viewer.id}
                      initialMessages={detail[2].map(toChatMessage)}
                      counterpartLabel={selected.name}
                    />
                  ),
                },
                {
                  id: "results",
                  label: "Results",
                  content: detail[0] ? (
                    <div className="space-y-5">
                      <ManagerNotes
                        summary={detail[0].managerSummary}
                        decisions={detail[0].managerDecisions}
                      />
                      <ResultsView profile={detail[0]} subjectName={selected.name} />
                    </div>
                  ) : (
                    <NoResultsYet />
                  ),
                  keepMounted: true,
                },
                {
                  id: "plan",
                  label: `${PLAN_CYCLE_YEAR} plan`,
                  content: (
                    <GoalEditor
                      key={selected.id}
                      userId={selected.id}
                      cycleYear={PLAN_CYCLE_YEAR}
                      initialGoals={detail[1].map(toGoalDto)}
                    />
                  ),
                  // The editor holds unsaved edits; switching tabs must not throw them away.
                  keepMounted: true,
                },
              ]}
            />
          </div>
        ) : (
          <EmptyState
            icon={<MessagesSquare className="h-6 w-6" />}
            title="Pick someone to talk to"
            description="Choose a team member on the left to read the conversation, their survey results and their plan."
          />
        )}
      </section>
    </div>
  );
}

export default async function CoachPage({
  searchParams,
}: {
  searchParams: Promise<{ member?: string }>;
}) {
  const viewer = await getActiveViewer();
  if (!viewer) redirect("/signin");

  const isAdmin = isAdminViewer(viewer);
  const { member } = await searchParams;

  return (
    <PageShell maxWidth="4xl" className={isAdmin ? "max-w-6xl" : undefined}>
      <PageHeader
        title="1:1 and growth"
        subtitle={isAdmin ? "Your team" : "With your manager"}
        actions={
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <LinkButton href="/" variant="ghost" size="sm">
              ← Dashboard
            </LinkButton>
          </div>
        }
      />
      {isAdmin ? <AdminView viewer={viewer} requestedId={member} /> : <MemberView viewer={viewer} />}
    </PageShell>
  );
}
