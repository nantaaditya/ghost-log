import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/env", () => ({ env: { EMAIL_FROM: "noreply@example.com" } }));
vi.mock("../transporter", () => ({ transporter: { sendMail: vi.fn() } }));

import { transporter } from "../transporter";
import { sendCoachNotificationEmail } from "../send-coach-notification";

describe("sendCoachNotificationEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (transporter.sendMail as Mock).mockResolvedValue(undefined);
  });

  it("sends to the recipient with a generic subject that contains no message content", async () => {
    await sendCoachNotificationEmail({
      to: "member@example.com",
      recipientName: "Member",
      senderName: "Admin",
      url: "https://app.test/coach",
    });
    const mail = (transporter.sendMail as Mock).mock.calls[0][0];
    expect(mail.to).toBe("member@example.com");
    expect(mail.subject).toBe("You have a new message on Alamak Team");
    expect(mail.html).toContain("https://app.test/coach");
  });

  it("escapes HTML in names so a crafted name cannot inject markup", async () => {
    await sendCoachNotificationEmail({
      to: "member@example.com",
      recipientName: "<img src=x onerror=alert(1)>",
      senderName: "<script>alert(1)</script>",
      url: "https://app.test/coach",
    });
    const html = (transporter.sendMail as Mock).mock.calls[0][0].html as string;
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;script&gt;");
  });
});
