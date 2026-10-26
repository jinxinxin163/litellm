import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setServerRootPath } from "@/lib/serverRootPath";
import { clearTokenCookies } from "@/utils/cookieUtils";
import { clearStoredReturnUrl } from "@/utils/returnUrlUtils";
import useProxySettings from "./proxySettings/useProxySettings";
import { useLogout } from "./useLogout";

vi.mock("./proxySettings/useProxySettings", () => ({ default: vi.fn() }));
vi.mock("@/utils/cookieUtils", () => ({ clearTokenCookies: vi.fn() }));
vi.mock("@/utils/returnUrlUtils", () => ({ clearStoredReturnUrl: vi.fn() }));

const originalLocation = window.location;

describe("useLogout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setServerRootPath("/");
    Object.defineProperty(window, "location", {
      value: { ...originalLocation, href: "http://localhost:4000/ui/logs" },
      writable: true,
    });
    vi.mocked(useProxySettings).mockReturnValue({ PROXY_BASE_URL: "", PROXY_LOGOUT_URL: "" });
  });

  afterEach(() => {
    setServerRootPath("/");
    vi.unstubAllEnvs();
    Object.defineProperty(window, "location", { value: originalLocation, writable: true });
  });

  it("goes straight to login and clears the previous session when no logout URL is configured", () => {
    localStorage.setItem("litellm_selected_worker_id", "worker-a");
    localStorage.setItem("litellm_worker_url", "http://worker-a:4000");
    const { result } = renderHook(() => useLogout("access-token"));

    result.current();

    expect(window.location.href).toBe("/ui/login/");
    expect(clearTokenCookies).toHaveBeenCalledOnce();
    expect(clearStoredReturnUrl).toHaveBeenCalledOnce();
    expect(localStorage.getItem("litellm_selected_worker_id")).toBeNull();
    expect(localStorage.getItem("litellm_worker_url")).toBeNull();
  });

  it("preserves a configured logout URL", () => {
    vi.mocked(useProxySettings).mockReturnValue({
      PROXY_BASE_URL: "",
      PROXY_LOGOUT_URL: "https://sso.example.com/logout",
    });
    const { result } = renderHook(() => useLogout("access-token"));
    result.current();
    expect(window.location.href).toBe("https://sso.example.com/logout");
  });

  it("includes the server root path in the login destination", () => {
    setServerRootPath("/gateway");
    const { result } = renderHook(() => useLogout("access-token"));
    result.current();
    expect(window.location.href).toBe("/gateway/ui/login/");
  });

  it("uses the development login route without the proxy UI prefix", () => {
    vi.stubEnv("NODE_ENV", "development");
    const { result } = renderHook(() => useLogout("access-token"));
    result.current();
    expect(window.location.href).toBe("/login/");
  });
});
