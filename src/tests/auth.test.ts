import request from "supertest";
import app from "../app";
import database from "../config/database";
import * as karmaService from "../services/karma.service";

jest.mock("../config/database", () => {
  const mockDb: any = jest.fn();
  mockDb.transaction = jest.fn();
  return mockDb;
});

jest.mock("../services/karma.service");

jest.mock("bcrypt", () => ({
  hash: jest.fn().mockResolvedValue("hashed_password"),
  compare: jest.fn().mockResolvedValue(true),
}));

jest.mock("jsonwebtoken", () => ({
  sign: jest.fn().mockReturnValue("mock_jwt_token"),
  verify: jest.fn().mockReturnValue({ userId: "user-uuid", email: "test@example.com" }),
}));

const mockDb = database as jest.MockedFunction<any>;
const mockIsUserBlacklisted = karmaService.isUserBlacklisted as jest.Mock;

const validPayload = {
  first_name: "John",
  last_name: "Doe",
  email: "john@example.com",
  phone: "08012345678",
  bvn: "12345678901",
  password: "password123",
};

const buildTrxMock = () => {
  const trx: any = jest.fn().mockReturnValue({
    where: jest.fn().mockReturnThis(),
    insert: jest.fn().mockResolvedValue([1]),
  });
  return trx;
};

describe("POST /api/v1/auth/register", () => {
  beforeEach(() => jest.clearAllMocks());

  // ✅ POSITIVE: Successful registration
  it("should register a new user and create a wallet successfully", async () => {
    mockIsUserBlacklisted.mockResolvedValue(false);

    mockDb.mockImplementation(() => ({
      where: jest.fn().mockReturnThis(),
      first: jest.fn().mockResolvedValue(null), // user doesn't exist
    }));

    mockDb.transaction.mockImplementation(async (cb: any) => cb(buildTrxMock()));

    const res = await request(app).post("/api/v1/auth/register").send(validPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("User registered successfully");
    expect(res.body.data).toHaveProperty("token");
    expect(res.body.data).toHaveProperty("userId");
    expect(res.body.data).toHaveProperty("walletId");
  });

  // ❌ NEGATIVE: Missing required fields
  it("should return 400 if required fields are missing", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ email: "john@example.com", password: "pass123" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("All fields are required");
  });

  // ❌ NEGATIVE: Blacklisted by email
  it("should return 403 if user email is blacklisted", async () => {
    mockIsUserBlacklisted
      .mockResolvedValueOnce(true)  // email check
      .mockResolvedValueOnce(false); // bvn check

    const res = await request(app).post("/api/v1/auth/register").send(validPayload);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("User is blacklisted and cannot be onboarded");
  });

  // ❌ NEGATIVE: Blacklisted by BVN
  it("should return 403 if user BVN is blacklisted", async () => {
    mockIsUserBlacklisted
      .mockResolvedValueOnce(false) // email check
      .mockResolvedValueOnce(true); // bvn check

    const res = await request(app).post("/api/v1/auth/register").send(validPayload);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("User is blacklisted and cannot be onboarded");
  });

  // ❌ NEGATIVE: Duplicate email
  it("should return 409 if email already exists", async () => {
    mockIsUserBlacklisted.mockResolvedValue(false);

    mockDb.mockImplementation(() => ({
      where: jest.fn().mockReturnThis(),
      first: jest.fn().mockResolvedValue({ id: "existing-id", email: validPayload.email }),
    }));

    const res = await request(app).post("/api/v1/auth/register").send(validPayload);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("User already exists");
  });
});
