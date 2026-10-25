import { describe, it, expect } from "vitest";
import { isTrustedOrigin } from "../origin";

const APP = "https://app.example.com";

describe("isTrustedOrigin", () => {
  it("trusts the app's own origin", () => {
    expect(isTrustedOrigin("https://app.example.com", APP)).toBe(true);
  });

  it("compares origins only, ignoring a path or trailing slash on the app url", () => {
    expect(isTrustedOrigin("https://app.example.com", "https://app.example.com/")).toBe(true);
    expect(isTrustedOrigin("https://app.example.com", "https://app.example.com/base/path")).toBe(true);
  });

  it("rejects another host", () => {
    expect(isTrustedOrigin("https://evil.example.net", APP)).toBe(false);
  });

  it("rejects a look-alike subdomain or suffix", () => {
    expect(isTrustedOrigin("https://app.example.com.evil.net", APP)).toBe(false);
    expect(isTrustedOrigin("https://evil.app.example.com", APP)).toBe(false);
  });

  it("rejects a different scheme or port", () => {
    expect(isTrustedOrigin("http://app.example.com", APP)).toBe(false);
    expect(isTrustedOrigin("https://app.example.com:8443", APP)).toBe(false);
  });

  it('rejects the opaque origin "null" (sandboxed frames, some redirects)', () => {
    expect(isTrustedOrigin("null", APP)).toBe(false);
  });

  it("allows a request with no Origin header (non-browser clients cannot be cross-site forged)", () => {
    expect(isTrustedOrigin(null, APP)).toBe(true);
  });

  it("rejects a malformed Origin", () => {
    expect(isTrustedOrigin("not a url", APP)).toBe(false);
  });

  it("fails closed when the configured app url is malformed", () => {
    expect(isTrustedOrigin("https://app.example.com", "not a url")).toBe(false);
  });
});
