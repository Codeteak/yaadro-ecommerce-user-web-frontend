import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computeSessionExpiresAtMs,
  REFRESH_TOKEN_LIFETIME_DAYS,
  REFRESH_SESSION_DURATION_MS,
} from "./authSession.js";
import { getJwtExpiresAtMs, isLikelyRefreshTokenJwt } from "./jwtExp.js";

function b64url(obj) {
  return Buffer.from(JSON.stringify(obj), "utf8")
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function fakeJwt(payload) {
  return `hdr.${b64url(payload)}.sig`;
}

describe("jwtExp + authSession refresh alignment", () => {
  it("defaults refresh lifetime to 30 days (backend JWT_REFRESH_EXPIRES_IN)", () => {
    assert.equal(REFRESH_TOKEN_LIFETIME_DAYS, 30);
    assert.equal(REFRESH_SESSION_DURATION_MS, 30 * 24 * 60 * 60 * 1000);
  });

  it("detects typ=refresh JWTs", () => {
    const exp = Math.floor(Date.now() / 1000) + 30 * 24 * 3600;
    const token = fakeJwt({ typ: "refresh", exp, sub: "u1" });
    assert.equal(isLikelyRefreshTokenJwt(token), true);
    assert.equal(getJwtExpiresAtMs(token), exp * 1000);
  });

  it("uses refresh JWT exp as session deadline", () => {
    const loginAtMs = Date.UTC(2026, 0, 1);
    const expSec = Math.floor(loginAtMs / 1000) + 30 * 24 * 3600;
    const token = fakeJwt({ typ: "refresh", exp: expSec });
    const deadline = computeSessionExpiresAtMs({ refreshToken: token, loginAtMs });
    assert.equal(deadline, expSec * 1000);
  });

  it("does not prefer short-lived access JWT when stored as refresh", () => {
    const loginAtMs = Date.UTC(2026, 0, 1);
    const expSec = Math.floor(loginAtMs / 1000) + 15 * 60;
    const token = fakeJwt({ role: "customer", exp: expSec });
    assert.equal(isLikelyRefreshTokenJwt(token), false);
    const deadline = computeSessionExpiresAtMs({ refreshToken: token, loginAtMs });
    assert.equal(deadline, loginAtMs + REFRESH_SESSION_DURATION_MS);
  });
});
