note: donnot let ai to work on this file manually enter and update it 

1. smooth trsnsaction in footer navbar while switching
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
15. in help support shw the shop address and number and address
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
26. location based messages need to add in toaster (done — playground + live checkout / address book)
27. list the coupon page with same design as showing in the cart
28. category card need tochange in the category page use the same card in the home page make this a common compoentn and inherit as a function card(image(if image exist else icon),name) and import
29. use a common header and footer for all the pages (fixed) 
30. add more sections in the home menu (refer with main branch and check with)
31. fir the address there is no need for a dedicated page use a popup modal for adress to edit and add
32. remove transaprency of checkout button keep it fixed 
33. add a pop up modal showing why price may change and clearly mention that may be shop price has been updated or custom weight might me vary thats why add a question mark and clicking that mwntion this details or reditect to help and support and open price varying question and add proper nav to checkout page remember the nav path if needed use a linked list to store this
34. remove amount due hightlight in checkout
35. in checkout address edit not working add pop up modal as a common component for address editinf
36. while editing the quantuy of product in cart the prduct is rearnnging remove that auto sorting 
