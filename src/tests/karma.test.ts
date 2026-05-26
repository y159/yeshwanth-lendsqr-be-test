import { isUserBlacklisted } from "../services/karma.service";
import axios from "axios";

jest.mock("axios");
const mockAxios = axios as jest.Mocked<typeof axios>;

describe("karmaService - isUserBlacklisted", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      ADJUTOR_API_KEY: "test_api_key",
      ADJUTOR_BASE_URL: "https://adjutor.lendsqr.com/v2",
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  // ✅ POSITIVE: User is blacklisted
  it("should return true if user is on the karma blacklist", async () => {
    mockAxios.get.mockResolvedValue({
      data: { data: { identity: "blacklisted@example.com", karma_identity: "EMAIL" } },
    });

    const result = await isUserBlacklisted("blacklisted@example.com");
    expect(result).toBe(true);
  });

  // ✅ POSITIVE: User is NOT blacklisted (404)
  it("should return false if user is not found in blacklist (404)", async () => {
    const err: any = new Error("Not Found");
    err.response = { status: 404 };
    mockAxios.get.mockRejectedValue(err);

    const result = await isUserBlacklisted("clean@example.com");
    expect(result).toBe(false);
  });

  // ✅ POSITIVE: API key not configured — skip check
  it("should return false and warn if ADJUTOR_API_KEY is not set", async () => {
    delete process.env.ADJUTOR_API_KEY;
    const consoleSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

    const result = await isUserBlacklisted("anyone@example.com");
    expect(result).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith("Adjutor API key not configured. Skipping Karma check.");
    consoleSpy.mockRestore();
  });

  // ❌ NEGATIVE: API returns null data — not blacklisted
  it("should return false if API response data is null", async () => {
    mockAxios.get.mockResolvedValue({ data: { data: null } });

    const result = await isUserBlacklisted("safe@example.com");
    expect(result).toBe(false);
  });

  // ❌ NEGATIVE: Network/server error — fail open
  it("should return false on unexpected API error (fail-open)", async () => {
    const err: any = new Error("Server Error");
    err.response = { status: 500, data: { message: "Internal Server Error" } };
    mockAxios.get.mockRejectedValue(err);

    const result = await isUserBlacklisted("test@example.com");
    expect(result).toBe(false);
  });
});
