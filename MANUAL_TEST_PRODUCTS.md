# Manual Test Plan: Products (Admin + Public)

## Prerequisites

- Environment vars configured: `ADMIN_EMAILS`, MongoDB, Cloudinary (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`).
- Your admin account email is included in `ADMIN_EMAILS`.
- Next.js dev server running.

## 1) Image Optimization (Design Preview)

- Open custom design builder where `DesignPreview` renders.
- Add an image placement and confirm images render crisply.
- Verify network tab shows `res.cloudinary.com` image requests, sized appropriately.

## 2) Admin Product Create

1. Login with an admin email.
2. Navigate to `/admin/products`.
3. Click `Add Product`.
4. Fill fields:
   - Name: "Test Tee"
   - Price: `19.99`
   - Category: `tshirt`
   - Colors: `black,white`
   - Sizes: `S,M,L`
   - Description: any text
5. Upload 1-4 images; verify previews appear.
6. Click `Create Product`.
7. Expect:
   - Product appears in list with primary image.
   - No console errors.

## 3) Admin Product Edit

1. On the created product card, click `Edit`.
2. Form opens populated with existing values.
3. Change:
   - Name to "Test Tee Updated"
   - Price to `24.99`
   - Add another image (optional) or remove by replacing full list (re-upload to change primary ordering).
4. Click `Update Product`.
5. Expect:
   - List refresh shows updated name/price.
   - Primary image reflects first URL in updated list.

## 4) Admin Product Delete

1. On the same product card, click `Delete`.
2. Confirm the prompt.
3. Expect:
   - Product disappears from the list.
   - Reloading the page does not bring it back.

## 5) Public Products Page

1. Navigate to `/products`.
2. Confirm DB-backed products are listed.
3. Click a product detail page and verify image loads.

## 6) Access Control

- Hit `GET /api/admin/products` and the new endpoints `/api/admin/products/{id}` as a non-admin.
- Expect 403 responses.

## 7) Failure Cases

- Try creating without a name, price <= 0, or without images.
- Expect validation error messages in UI and no network 500s.

## Notes

- Product images use Cloudinary via `/api/uploads/product-image`.
- Remote images are optimized by `next/image` (Cloudinary domain allowed in `next.config.ts`).
