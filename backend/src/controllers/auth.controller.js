import { asyncHandler } from "../utils/asyncHandler.js";
import { ok, created } from "../utils/apiResponse.js";
import {
  registerUser,
  loginUser,
  getUserById,
  refreshAccessToken,
} from "../services/auth.service.js";
import { ACCESS_COOKIE_NAME } from "../middleware/auth.middleware.js";
import { env } from "../config/env.js";

const REFRESH_COOKIE_NAME = "hsea_refresh_token";

const baseCookieOptions = {
  httpOnly: true,
  secure: env.isProduction,
  sameSite: env.isProduction ? "strict" : "lax",
  path: "/",
};

function setAuthCookies(res, { accessToken, refreshToken }) {
  res.cookie(ACCESS_COOKIE_NAME, accessToken, {
    ...baseCookieOptions,
    maxAge: 15 * 60 * 1000,
  });
  if (refreshToken) {
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
      ...baseCookieOptions,
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: "/api/auth/refresh",
    });
  }
}

function clearAuthCookies(res) {
  res.clearCookie(ACCESS_COOKIE_NAME, { path: "/" });
  res.clearCookie(REFRESH_COOKIE_NAME, { path: "/api/auth/refresh" });
}

export const register = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await registerUser(req.body);
  setAuthCookies(res, { accessToken, refreshToken });
  return created(res, { user }, "Account created successfully.");
});

export const login = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await loginUser(req.body);
  setAuthCookies(res, { accessToken, refreshToken });
  return ok(res, { user }, "Logged in successfully.");
});

export const logout = asyncHandler(async (req, res) => {
  clearAuthCookies(res);
  return ok(res, {}, "Logged out.");
});

export const me = asyncHandler(async (req, res) => {
  const user = await getUserById(req.user.id);
  return ok(res, { user });
});

export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];
  const { user, accessToken } = await refreshAccessToken(token);
  setAuthCookies(res, { accessToken });
  return ok(res, { user }, "Session refreshed.");
});
