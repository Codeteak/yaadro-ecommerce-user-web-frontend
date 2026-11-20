# Manual QA (gap bugs)

## Fixed in code (verify once in browser)
- [ ] Open address sheet while signed in → shows server address (not stale phone-only)
- [ ] Home search “milk” → `/categories?q=milk` loads matching products from DB search
- [ ] Place Order after delivery check (cookies on `/api/storefront/*`) — signed-in COD
- [ ] `next` is 16.4.5 (security patch) — `npm run dev` should not block on old vuln banner

## Still manual / environment
- [ ] Login phone A, save address, open phone B → Deliver-to appears
- [ ] Switch shop id / domain → cart does not mix
- [ ] Close browser for a day → still signed in (~50 days client clock; backend must allow)
- [ ] Install prompt / Add to Home Screen on supported mobile browser
- [ ] Custom domain banners show; empty banner shop shows no banner strip
