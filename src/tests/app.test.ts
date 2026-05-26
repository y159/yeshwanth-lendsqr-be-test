import request from "supertest";
import app from "../app";

describe("GET /", () => {
  it("should return API running message", async () => {
    const response = await request(app).get("/");

    expect(response.status).toBe(200);

    expect(response.body).toHaveProperty("success", true);

    expect(response.body).toHaveProperty(
      "message",
      "Lendsqr wallet service API is running"
    );
  });
});