# Manual Test Plan: Admin Root Redirect & Navbar Icon

## Objectives

Validate that admin users are redirected from `/` to `/admin/dashboard`, see a dedicated admin dashboard icon in the navbar, and retain access to all normal user-facing pages. Non-admin users should experience no changes.

## Preconditions

- Test accounts: one admin user (role: `admin`), one normal user (role: `user`).
- Backend protection for `/admin/*` already in place (verify non-admin receives 403 or redirect if accessing admin routes directly).
- Local dev server running: `npm run dev`.

## Scenarios

### 1. Normal User Experience

1. Log in as normal user.
2. Navigate to `/`.
   - EXPECT: Normal home page renders (hero, featured, popular templates, etc.).
3. Inspect navbar.
   - EXPECT: No admin dashboard icon present.
4. Manually visit `/admin/dashboard`.
   - EXPECT: Access denied (protected response).

### 2. Admin Root Redirect

1. Log in as admin user.
2. Navigate to `/`.
   - EXPECT: Immediate redirect to `/admin/dashboard` (network log shows 307/308 or direct server redirect, never sees home content).
3. Use browser back; revisit `/`.
   - EXPECT: Still redirected to `/admin/dashboard`.

### 3. Admin Navbar Icon

1. While on `/admin/dashboard`, inspect navbar.
   - EXPECT: Admin dashboard icon (e.g., layout grid) visible next to other nav icons.
2. Click the icon.
   - EXPECT: Remains (or returns) at `/admin/dashboard` with no error.
3. Hover/focus states.
   - EXPECT: Styles match other icons (background hover, focus ring).

### 4. Admin Access to User Pages

1. As admin, navigate sequentially to:
   - `/products`
   - `/wishlist`
   - `/cart`
   - `/custom-order`
   - `/my-custom-orders`
   - EXPECT: All pages load normally; NO forced redirect back to admin dashboard.
2. From any user page click the admin icon.
   - EXPECT: Returns to `/admin/dashboard`.

### 5. Non-Regression & Error Checks

1. Open browser dev tools console during navigation.
   - EXPECT: No new runtime errors or hydration warnings.
2. Inspect network panel hitting `/` as both user types.
   - EXPECT: Only admin triggers redirect; normal user returns 200 for home.
3. Confirm CSS/theme toggle still works after changes.
4. Confirm profile dropdown still shows admin links when admin and omits them when normal user.

### 6. Accessibility Quick Checks

1. Tab through navbar.
   - EXPECT: Admin icon receives focus and has accessible name (aria-label or sr-only text).
2. Screen reader (optional): Should announce "Admin dashboard" for the icon.

## Edge Cases

- Unauthenticated visitor hitting `/`: Should see normal home page (no redirect).
- Stale admin session cookie removed → hitting `/` should revert to normal home page until re-authenticated.
- Admin hitting deep link `/admin/custom-orders` directly: Should load (backend protection unchanged).

## Acceptance Criteria Mapping

- Redirect on `/` only for admin: Verified in Scenario 2.
- Non-admin unaffected: Scenario 1.
- Admin icon conditional: Scenarios 1 & 3.
- Admin retains access to user pages: Scenario 4.
- No new errors/regressions: Scenario 5.

## Post-Test Checklist

- All expectations met.
- Log any discrepancies with reproduction steps and console/network evidence.
- If failures found, re-run after fixes.

---

Prepared: Nov 22, 2025
