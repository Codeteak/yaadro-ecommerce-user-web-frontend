1. ****smooth trsnsaction in footer while switching**** (done)
2. ****click effect the categories**** (done)
3. ****home page take some time to load**** (done — hero / category rail / shelves stream in separate Suspense; categories all-aisle parallel)
4. ****properly show cooupons and min cart value in cart page**** (done)
5. ****after login show sucess page and show welcome message and shoe the profile section ad logged in**** (done — Welcome to {shop} → /home; logout → /login; guest menu = Help only)
6. ****place order button needs enable effect and show proper message**** (done)
7. ****show loc acess after the page has been loaded**** (done — `DeferredLocationPrompt` on `/home`; playground `/playground/deferred-location`)
8. ****for addres lisitng add make default button not star**** (done)
9. ****price varying banner needs to redesign**** (done — soft orange notice on cart/checkout/PDP)
10. ****in sumamry hightlight savings amount**** (done — dotted line under You save)
11. ****remove the footer id in the checkout page**** (done — Amount due bar off)
12. ****list first top 2 coupons**** (done)
13. ****after the order delivered remove dp number from order history**** (done — keep name, hide phone/call)
14. ****remove settings**** (done)
15. ****in help support shw the shop address and number and address**** (done — `/profile/support`; phone/address via `NEXT_PUBLIC_SHOP_SUPPORT_*` until API exposes them)
16. ****in the cart keep the the weight at the bottom**** (done — kg + Edit weight under line)
17. ****if use not logged in the check the coupon the page show to sign in not redirecting make coupon as a toaster warning if user is not logged in**** (done)
18. ****at cart page if user not loged in ask then only redirect to checkout else coupon would be missed**** (done — guest → login?next=/cart) 
19. ****in the cart if coupon applied the checkout amount is not updating**** (done — Item total + Checkout ₹ sync)
20. ****checkout need ui updations**** (done — savings highlight, Amount due off, price-may-vary soft)
21. ****in order history hightlight the order status in a badge or live green dot icon**** (done — badge + green pulse)
22. ****order list show order id + parcel icon (not location)**** (done)
23. ****order details delivery address empty / wrong**** (done — map line1/raw + hide blank Address)
24. ****order details product images missing**** (done — API/snapshot/fallback thumb)
25. dms bsed api format and testing add varibale in .env
26. location based messages need to add in toaster

---

## Still open / next
| # | Status | Next |
|---|--------|------|
| **25** | Open | DMS-based API format + `.env` variable |
| **26** | Open | Location-based toaster messages |
| — | Note | Help contact still uses env until shop support API exists |
| — | Done | Live coupons from shop API only; playground keeps samples + `/playground/checkout-coupon` |
| — | Done | Logout confirm on `/profile`; home catalog + SEO + cart preview latency cuts |
