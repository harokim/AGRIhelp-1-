
import {
  env,
  createExecutionContext
} from "cloudflare:test";
import {
  describe,
  it,
  expect
} from "vitest";
import worker from "../src";

const ORIGIN = "http://localhost:5173";

async function sendRequest({
  method = "POST",
  origin = ORIGIN,
  body = {}
} = {}) {
  const request = new Request(
    "https://sms-worker.test/",
    {
      method,
      headers: {
        Origin: origin,
        "Content-Type": "application/json"
      },
      body:
        method === "GET" || method === "HEAD"
          ? undefined
          : JSON.stringify(body)
    }
  );

  return worker.fetch(
    request,
    env,
    createExecutionContext()
  );
}

describe("SMS worker", () => {
  it("rejects methods other than POST", async () => {
    const response = await sendRequest({
      method: "GET"
    });

    expect(response.status).toBe(405);

    expect(await response.json()).toMatchObject({
      success: false,
      message: "Only POST requests are allowed."
    });
  });

  it("rejects unapproved origins", async () => {
    const response = await sendRequest({
      origin: "https://unauthorized.example",
      body: {
        number: "09171234567",
        message: "Test"
      }
    });

    expect(response.status).toBe(403);

    expect(await response.json()).toMatchObject({
      success: false,
      message: "Origin is not allowed."
    });
  });

  it("requires a phone number", async () => {
    const response = await sendRequest({
      body: {
        message: "Test message"
      }
    });

    expect(response.status).toBe(400);

    expect(await response.json()).toMatchObject({
      success: false,
      message: "Phone number is required."
    });
  });

  it("requires a message", async () => {
    const response = await sendRequest({
      body: {
        number: "09171234567"
      }
    });

    expect(response.status).toBe(400);

    expect(await response.json()).toMatchObject({
      success: false,
      message: "SMS message is required."
    });
  });
});
