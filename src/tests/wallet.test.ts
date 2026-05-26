import request from "supertest";
import app from "../app";
import database from "../config/database";

jest.mock("../config/database", () => {
  const mockDb: any = jest.fn();
  mockDb.transaction = jest.fn();
  return mockDb;
});

jest.mock("jsonwebtoken", () => ({
  sign: jest.fn().mockReturnValue("mock_token"),
  verify: jest.fn().mockReturnValue({ userId: "user-uuid", email: "test@example.com" }),
}));

const mockDb = database as jest.MockedFunction<any>;
const AUTH_HEADER = { Authorization: "Bearer mock_token" };

const mockWallet = { id: "wallet-uuid", user_id: "user-uuid", balance: 1000, currency: "NGN" };
const mockWalletEmpty = { ...mockWallet, balance: 0 };

// Helper: build a trx mock that behaves like knex(table).where().increment/decrement/insert
const buildTrxMock = () => {
  const trx: any = jest.fn().mockReturnValue({
    where: jest.fn().mockReturnThis(),
    increment: jest.fn().mockResolvedValue(1),
    decrement: jest.fn().mockResolvedValue(1),
    insert: jest.fn().mockResolvedValue([1]),
  });
  return trx;
};

describe("POST /api/v1/wallet/fund", () => {
  beforeEach(() => jest.clearAllMocks());

  // ✅ POSITIVE: Fund wallet successfully
  it("should fund wallet successfully", async () => {
    mockDb.mockImplementation(() => ({
      where: jest.fn().mockReturnThis(),
      first: jest.fn().mockResolvedValue(mockWallet),
    }));
    mockDb.transaction.mockImplementation(async (cb: any) => cb(buildTrxMock()));

    const res = await request(app).post("/api/v1/wallet/fund").set(AUTH_HEADER).send({ amount: 500 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Wallet funded successfully");
    expect(res.body.data).toHaveProperty("reference");
  });

  // ❌ NEGATIVE: Zero amount
  it("should return 400 if amount is zero", async () => {
    const res = await request(app).post("/api/v1/wallet/fund").set(AUTH_HEADER).send({ amount: 0 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Amount must be greater than zero");
  });

  // ❌ NEGATIVE: Negative amount
  it("should return 400 if amount is negative", async () => {
    const res = await request(app).post("/api/v1/wallet/fund").set(AUTH_HEADER).send({ amount: -100 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // ❌ NEGATIVE: No auth token
  it("should return 401 if no auth token is provided", async () => {
    const res = await request(app).post("/api/v1/wallet/fund").send({ amount: 500 });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Authorization token is required");
  });

  // ❌ NEGATIVE: Wallet not found
  it("should return 404 if wallet is not found", async () => {
    mockDb.mockImplementation(() => ({
      where: jest.fn().mockReturnThis(),
      first: jest.fn().mockResolvedValue(null),
    }));

    const res = await request(app).post("/api/v1/wallet/fund").set(AUTH_HEADER).send({ amount: 500 });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Wallet not found");
  });
});

describe("POST /api/v1/wallet/transfer", () => {
  beforeEach(() => jest.clearAllMocks());

  // ✅ POSITIVE: Transfer funds successfully
  it("should transfer funds successfully", async () => {
    const receiver = { id: "receiver-uuid", email: "receiver@example.com" };
    const receiverWallet = { id: "receiver-wallet-uuid", user_id: "receiver-uuid", balance: 200, currency: "NGN" };

    let callCount = 0;
    mockDb.mockImplementation(() => ({
      where: jest.fn().mockReturnThis(),
      first: jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve(mockWallet);
        if (callCount === 2) return Promise.resolve(receiver);
        return Promise.resolve(receiverWallet);
      }),
    }));
    mockDb.transaction.mockImplementation(async (cb: any) => cb(buildTrxMock()));

    const res = await request(app)
      .post("/api/v1/wallet/transfer")
      .set(AUTH_HEADER)
      .send({ receiver_email: "receiver@example.com", amount: 200 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Funds transferred successfully");
    expect(res.body.data).toHaveProperty("reference");
  });

  // ❌ NEGATIVE: Missing fields
  it("should return 400 if receiver_email or amount is missing", async () => {
    const res = await request(app)
      .post("/api/v1/wallet/transfer")
      .set(AUTH_HEADER)
      .send({ amount: 100 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Receiver email and valid amount are required");
  });

  // ❌ NEGATIVE: Self-transfer
  it("should return 400 if user tries to transfer to themselves", async () => {
    const selfUser = { id: "user-uuid", email: "test@example.com" };

    let callCount = 0;
    mockDb.mockImplementation(() => ({
      where: jest.fn().mockReturnThis(),
      first: jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve(mockWallet);
        return Promise.resolve(selfUser);
      }),
    }));

    const res = await request(app)
      .post("/api/v1/wallet/transfer")
      .set(AUTH_HEADER)
      .send({ receiver_email: "test@example.com", amount: 100 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("You cannot transfer funds to yourself");
  });

  // ❌ NEGATIVE: Insufficient balance
  it("should return 400 if sender has insufficient balance", async () => {
    const receiver = { id: "receiver-uuid", email: "receiver@example.com" };
    const receiverWallet = { id: "receiver-wallet-uuid", user_id: "receiver-uuid", balance: 200 };

    let callCount = 0;
    mockDb.mockImplementation(() => ({
      where: jest.fn().mockReturnThis(),
      first: jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve(mockWalletEmpty);
        if (callCount === 2) return Promise.resolve(receiver);
        return Promise.resolve(receiverWallet);
      }),
    }));

    const res = await request(app)
      .post("/api/v1/wallet/transfer")
      .set(AUTH_HEADER)
      .send({ receiver_email: "receiver@example.com", amount: 500 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Insufficient wallet balance");
  });

  // ❌ NEGATIVE: Receiver not found
  it("should return 404 if receiver user does not exist", async () => {
    let callCount = 0;
    mockDb.mockImplementation(() => ({
      where: jest.fn().mockReturnThis(),
      first: jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve(mockWallet);
        return Promise.resolve(null);
      }),
    }));

    const res = await request(app)
      .post("/api/v1/wallet/transfer")
      .set(AUTH_HEADER)
      .send({ receiver_email: "nobody@example.com", amount: 100 });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Receiver not found");
  });
});

describe("POST /api/v1/wallet/withdraw", () => {
  beforeEach(() => jest.clearAllMocks());

  // ✅ POSITIVE: Withdraw successfully
  it("should withdraw funds successfully", async () => {
    mockDb.mockImplementation(() => ({
      where: jest.fn().mockReturnThis(),
      first: jest.fn().mockResolvedValue(mockWallet),
    }));
    mockDb.transaction.mockImplementation(async (cb: any) => cb(buildTrxMock()));

    const res = await request(app).post("/api/v1/wallet/withdraw").set(AUTH_HEADER).send({ amount: 200 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Withdrawal successful");
    expect(res.body.data).toHaveProperty("reference");
  });

  // ❌ NEGATIVE: Insufficient balance
  it("should return 400 if wallet balance is insufficient", async () => {
    mockDb.mockImplementation(() => ({
      where: jest.fn().mockReturnThis(),
      first: jest.fn().mockResolvedValue(mockWalletEmpty),
    }));

    const res = await request(app).post("/api/v1/wallet/withdraw").set(AUTH_HEADER).send({ amount: 500 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Insufficient wallet balance");
  });

  // ❌ NEGATIVE: Zero amount
  it("should return 400 if amount is zero", async () => {
    const res = await request(app).post("/api/v1/wallet/withdraw").set(AUTH_HEADER).send({ amount: 0 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe("GET /api/v1/wallet/balance", () => {
  beforeEach(() => jest.clearAllMocks());

  // ✅ POSITIVE: Get balance successfully
  it("should return wallet balance successfully", async () => {
    mockDb.mockImplementation(() => ({
      where: jest.fn().mockReturnThis(),
      first: jest.fn().mockResolvedValue(mockWallet),
    }));

    const res = await request(app).get("/api/v1/wallet/balance").set(AUTH_HEADER);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("balance");
    expect(res.body.data).toHaveProperty("walletId");
    expect(res.body.data).toHaveProperty("currency");
  });

  // ❌ NEGATIVE: No auth token
  it("should return 401 without auth token", async () => {
    const res = await request(app).get("/api/v1/wallet/balance");

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

describe("GET /api/v1/wallet/transactions", () => {
  beforeEach(() => jest.clearAllMocks());

  // ✅ POSITIVE: Get transactions successfully
  it("should return transaction list successfully", async () => {
    const mockTxns = [
      { id: "txn-1", type: "FUND", amount: 500, status: "SUCCESS" },
      { id: "txn-2", type: "WITHDRAW", amount: 100, status: "SUCCESS" },
    ];

    mockDb.mockImplementation((table: string) => ({
      where: jest.fn().mockReturnThis(),
      first: jest.fn().mockResolvedValue(mockWallet),
      orderBy: jest.fn().mockResolvedValue(mockTxns),
    }));

    const res = await request(app).get("/api/v1/wallet/transactions").set(AUTH_HEADER);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  // ❌ NEGATIVE: Wallet not found
  it("should return 404 if wallet not found", async () => {
    mockDb.mockImplementation(() => ({
      where: jest.fn().mockReturnThis(),
      first: jest.fn().mockResolvedValue(null),
    }));

    const res = await request(app).get("/api/v1/wallet/transactions").set(AUTH_HEADER);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
