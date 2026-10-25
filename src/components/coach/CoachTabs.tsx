"use client";

import type { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface CoachTab {
  id: string;
  label: string;
  content: ReactNode;
  /**
   * Keep this panel mounted while another tab is showing, so unsaved edits survive a tab switch.
   * Not for the chat: a mounted chat would keep marking messages read while it is out of sight.
   */
  keepMounted?: boolean;
}

interface CoachTabsProps {
  tabs: readonly CoachTab[];
  defaultTab?: string;
}

/** Tab chrome only: each panel is rendered on the server and handed in as children. */
export default function CoachTabs({ tabs, defaultTab }: CoachTabsProps) {
  return (
    <Tabs defaultValue={defaultTab ?? tabs[0]?.id}>
      <TabsList>
        {tabs.map((tab) => (
          <TabsTrigger key={tab.id} value={tab.id}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((tab) => (
        <TabsContent key={tab.id} value={tab.id} keepMounted={tab.keepMounted} className="pt-4">
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
