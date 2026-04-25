# Testing Checklist ✅

## Before You Test

- [ ] Dev server is running (`npm run dev`)
- [ ] `.env` file has correct Supabase credentials
- [ ] Supabase project is active and accessible

## Test Scenario 1: Price Update

### Step 1: Setup
- [ ] Open browser tab 1: `http://localhost:5173` (Website)
- [ ] Open browser tab 2: `http://localhost:5173/admin` (Admin)
- [ ] Login to admin (password: `Orozep PH@Admin!2025`)

### Step 2: Make Changes
- [ ] In admin: Click "Manage Products"
- [ ] Click edit (✏️) button on any product
- [ ] Note the current price (e.g., ₱2,500)
- [ ] Change price to something different (e.g., ₱3,000)
- [ ] Click "Save" button
- [ ] See success message

### Step 3: Verify Update
- [ ] Switch to website tab (Tab 1)
- [ ] Find the same product on the page
- [ ] ✅ Price should be updated automatically!
- [ ] No manual refresh needed

**Expected Result:** New price (₱3,000) shows immediately

## Test Scenario 2: Product Availability

### Step 1: Toggle Availability
- [ ] In admin: Edit a product
- [ ] Uncheck "Available" checkbox
- [ ] Click "Save"

### Step 2: Verify on Website
- [ ] Switch to website tab
- [ ] ✅ Product should disappear from the list

### Step 3: Toggle Back
- [ ] In admin: Edit same product
- [ ] Check "Available" checkbox
- [ ] Click "Save"

### Step 4: Verify Restoration
- [ ] Switch to website tab
- [ ] ✅ Product should reappear

## Test Scenario 3: Category Changes

### Step 1: Edit Category
- [ ] In admin: Click "Manage Categories"
- [ ] Edit any category name
- [ ] Click "Save"

### Step 2: Verify on Website
- [ ] Switch to website tab
- [ ] ✅ Category name updated in navigation

## Test Scenario 4: Window Focus

### Step 1: Make Multiple Changes
- [ ] In admin tab, make 3 price changes
- [ ] Save each one
- [ ] Don't switch tabs yet

### Step 2: Switch Back
- [ ] Now switch to website tab
- [ ] ✅ All changes should appear at once

## Test Scenario 5: Real-Time Subscription

### Step 1: Keep Both Tabs Visible
- [ ] Arrange browser windows side-by-side
- [ ] Website on left, Admin on right
- [ ] Both should be visible simultaneously

### Step 2: Make Changes
- [ ] In admin: Change a price
- [ ] Click "Save"
- [ ] Watch website tab

### Step 3: Observe
- [ ] ✅ Price updates in 1-2 seconds (if Realtime enabled)
- [ ] No need to switch tabs

**Note:** This only works if Supabase Realtime is enabled

## Debugging Checklist

If not working, check:

### Browser Console
- [ ] Open DevTools (F12) on website tab
- [ ] Go to Console tab
- [ ] Look for these messages:
  - `"Product changed:"` (real-time working)
  - `"Window focused - refreshing products..."` (focus working)
- [ ] Check for any red error messages

### Network Tab
- [ ] Open DevTools → Network tab
- [ ] Make a change in admin
- [ ] Switch to website tab
- [ ] ✅ Should see request to Supabase

### Environment
- [ ] `.env` file exists in project root
- [ ] `VITE_SUPABASE_URL` is correct
- [ ] `VITE_SUPABASE_ANON_KEY` is correct
- [ ] Supabase project is not paused

### Supabase Dashboard
- [ ] Login to Supabase
- [ ] Go to Table Editor
- [ ] Find the product you edited
- [ ] ✅ Verify price is actually updated in database

## Success Criteria

✅ All tests pass if:
1. Changes made in admin appear on website
2. No manual refresh (F5) needed
3. Updates appear within 1-2 seconds of switching tabs
4. Console shows proper log messages
5. No errors in browser console

## If Tests Fail

Try these in order:

1. **Hard Refresh**
   - Ctrl+Shift+R (Windows)
   - Cmd+Shift+R (Mac)

2. **Restart Dev Server**
   ```bash
   # Stop server (Ctrl+C)
   npm run dev
   ```

3. **Clear Browser Cache**
   - DevTools → Application → Clear Storage
   - Click "Clear site data"

4. **Check Supabase**
   - Verify project is active
   - Check API keys are correct
   - Test connection in browser console

5. **Review Code**
   - Ensure `useMenu.ts` has real-time subscriptions
   - Check `App.tsx` imports `refreshProducts`
   - Verify no TypeScript errors

## Expected Console Output

When working correctly, you should see:

```javascript
// When switching to website tab:
Window focused - refreshing products...

// When product changes (if Realtime enabled):
Product changed: {
  eventType: "UPDATE",
  new: {...},
  old: {...},
  schema: "public",
  table: "products"
}

// When variation changes:
Variation changed: {...}

// When category changes:
Category changed: {...}
```

## Performance Check

- [ ] Page loads quickly (< 2 seconds)
- [ ] Updates don't cause lag or freeze
- [ ] Smooth transitions
- [ ] No flickering or flashing
- [ ] Multiple updates don't slow down page

## Final Verification

After all tests pass:

- [ ] Website shows current data
- [ ] Admin changes reflect immediately
- [ ] No manual refreshes needed
- [ ] User experience is smooth
- [ ] No console errors
- [ ] Performance is good

---

**All Checked?** 🎉 **You're done!** The fix is working perfectly!

**Some Failed?** 📋 Review the troubleshooting section or check the documentation files.

