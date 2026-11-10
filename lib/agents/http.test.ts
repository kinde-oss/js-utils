import { describe, expect, it } from "vitest";
import { AgentAuthError } from "./errors";
import { fetchJson, isPrivateHost } from "./http";
import { jsonResponse, mockFetch } from "./testUtils";

describe("isPrivateHost", () => {
  it.each([
    "localhost",
    "LOCALHOST.",
    "app.localhost",
    "metadata",
    "metadata.internal",
    "printer.local",
    "0.0.0.0",
    "10.0.0.5",
    "127.0.0.1",
    "169.254.169.254",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.1.1",
    "100.64.0.1",
    "198.18.0.1",
    "224.0.0.1",
    "[::1]",
    "[::]",
    "[fe80::1]",
    "[fc00::1]",
    "[fd12:3456::1]",
    "[ff02::1]",
    "[::ffff:7f00:1]",
    "[::ffff:a00:5]",
    "[64:ff9b::a00:5]",
  ])("treats %s as private", (host) => {
    expect(isPrivateHost(host)).toBe(true);
  });

  it.each([
    "example.com",
    "api.example.com",
    "8.8.8.8",
    "172.15.0.1",
    "172.32.0.1",
    "100.63.0.1",
    "192.169.0.1",
    "198.20.0.1",
    "[2606:4700::1111]",
    "[::ffff:808:808]",
  ])("treats %s as public", (host) => {
    expect(isPrivateHost(host)).toBe(false);
  });

  it("recognises numeric forms the URL parser normalises", () => {
    expect(isPrivateHost(new URL("http://2130706433/").hostname)).toBe(true);
    expect(isPrivateHost(new URL("http://0x7f.1/").hostname)).toBe(true);
    expect(isPrivateHost(new URL("http://[::ffff:127.0.0.1]/").hostname)).toBe(
      true,
    );
  });
});

const redirect = (location: string, status = 302) =>
  new Response(null, { status, headers: { Location: location } });

describe("fetchJson", () => {
  it("refuses a private destination without calling fetch", async () => {
    const fetchMock = mockFetch(() => jsonResponse({}));
    await expect(
      fetchJson(fetchMock, "https://10.0.0.5/meta", "Metadata"),
    ).rejects.toMatchObject({ code: "private_network_blocked" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("allows a private destination when explicitly enabled", async () => {
    const fetchMock = mockFetch(() => jsonResponse({ ok: true }));
    await expect(
      fetchJson(fetchMock, "https://10.0.0.5/meta", "Metadata", {
        allowPrivateNetworks: true,
      }),
    ).resolves.toEqual({ ok: true });
  });

  it("follows redirects manually to a public destination", async () => {
    const fetchMock = mockFetch((url) =>
      url === "https://a.example.com/meta"
        ? redirect("https://b.example.com/meta", 301)
        : url === "https://b.example.com/meta"
          ? redirect("/final", 307)
          : jsonResponse({ ok: true }),
    );
    await expect(
      fetchJson(fetchMock, "https://a.example.com/meta", "Metadata"),
    ).resolves.toEqual({ ok: true });
    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([
      "https://a.example.com/meta",
      "https://b.example.com/meta",
      "https://b.example.com/final",
    ]);
    for (const call of fetchMock.mock.calls) {
      expect(call[1].redirect).toBe("manual");
    }
  });

  it.each([
    "https://10.0.0.5/meta",
    "https://metadata.internal/",
    "https://169.254.169.254/latest/meta-data",
    "http://api.example.com/meta",
  ])("blocks a redirect to %s before connecting", async (location) => {
    const fetchMock = mockFetch((url) =>
      url === "https://a.example.com/meta"
        ? redirect(location)
        : jsonResponse({ leaked: true }),
    );
    await expect(
      fetchJson(fetchMock, "https://a.example.com/meta", "Metadata"),
    ).rejects.toBeInstanceOf(AgentAuthError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("blocks a redirect to a private destination with the right code", async () => {
    const fetchMock = mockFetch(() => redirect("https://10.0.0.5/meta"));
    await expect(
      fetchJson(fetchMock, "https://a.example.com/meta", "Metadata"),
    ).rejects.toMatchObject({ code: "private_network_blocked" });
  });

  it("stops after too many redirects", async () => {
    const fetchMock = mockFetch(() => redirect("https://a.example.com/loop"));
    await expect(
      fetchJson(fetchMock, "https://a.example.com/loop", "Metadata"),
    ).rejects.toMatchObject({ code: "too_many_redirects" });
    expect(fetchMock).toHaveBeenCalledTimes(6);
  });

  it("fails clearly when the redirect destination is unreadable", async () => {
    await expect(
      fetchJson(
        mockFetch(() => new Response(null, { status: 302 })),
        "https://a.example.com/meta",
        "Metadata",
      ),
    ).rejects.toMatchObject({ code: "redirect_blocked" });

    const opaque = new Response(null, { status: 200 });
    Object.defineProperty(opaque, "type", { value: "opaqueredirect" });
    await expect(
      fetchJson(
        mockFetch(() => opaque),
        "https://a.example.com/meta",
        "Metadata",
      ),
    ).rejects.toMatchObject({ code: "redirect_blocked" });
  });
});
