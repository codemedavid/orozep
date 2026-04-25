# Price Update Guide for Orozep PH Admin

## Understanding Product Prices vs. Variation Prices

### 🎯 Key Concept

Your products can have **two types of prices**:

1. **Base Price** - Only shown when a product has NO size variations
2. **Variation Prices** - Shown when a product has size options (5mg, 10mg, 15mg, etc.)

⚠️ **IMPORTANT**: If a product has variations (sizes), customers will ONLY see the variation prices, NOT the base price!

---

## How to Update Prices for Products WITH Variations (like Tirzepatide)

### Example: Tirzepatide Products

Your Tirzepatide products currently have these variations:

**Tirzepatide 15mg:**
- Base Price: ₱2,500 (NOT shown to customers)
- ✅ Variation "15mg Vial": ₱8,500 (THIS is what customers see!)

**Tirzepatide 30mg:**
- Base Price: ₱3,500 (NOT shown to customers)
- ✅ Variation "30mg Vial": ₱15,000 (THIS is what customers see!)

### Steps to Update Variation Prices:

1. **Login to Admin Dashboard**
   - Password: `Orozep PH@Admin!2025`

2. **Navigate to Products**
   - Click "Manage Products" or the Products button

3. **Find Your Product**
   - Locate the Tirzepatide product you want to update
   - Look at the "Sizes" column - it will show "1 size" or "2 sizes"

4. **Click the Purple "Layers" Icon** 🔷
   - This button says "Manage Sizes" on hover
   - It opens the Variation Manager

5. **Edit the Variation**
   - Click the blue "Edit" (pencil) icon next to the variation
   - Update the **Price** field to your desired price
   - Click "Save Changes"

6. **Verify on Website**
   - Open your website in a new tab
   - The new price should appear immediately
   - If not, refresh the page (Ctrl+F5 or Cmd+Shift+R)

---

## How to Update Prices for Products WITHOUT Variations

For products without size variations:

1. **Navigate to Products** in Admin Dashboard
2. **Click the Edit (pencil) icon** next to the product
3. **Update the "Base Price"** field
4. **Click "Save"**

The price will update immediately on the website.

---

## Visual Indicators in Admin Dashboard

### 🟣 Purple Badge in "Sizes" Column
- Shows how many variations a product has
- Example: "2 sizes" means the product has 2 different size options

### 🟠 Orange Warning Under Base Price
- Appears when editing a product with variations
- Says: "Not used (has sizes)" 
- Means customers won't see this base price

### 💡 Warning in Edit Form
- When editing a product with variations, you'll see:
  > "This product has X size variation(s). Customers will see those prices instead of this base price. Use the 'Manage Sizes' button to update the prices shown on the website."

---

## Quick Reference Commands

### Check Current Prices in Database
```bash
node check-prices.js
```

### Check Product Variations
```bash
node check-variations.js
```

---

## Troubleshooting

### "I updated the base price but the website still shows the old price!"
- ✅ **Solution**: The product has variations. Use the purple "Layers" icon to update variation prices.

### "Changes don't appear on the website"
1. Refresh the website page (Ctrl+F5 / Cmd+Shift+R)
2. Check browser console for errors (F12)
3. Click the "Refresh" button in the Products list
4. Clear browser cache if needed

### "I can't find the Layers icon"
- It's the purple button with three stacked squares icon (Layers)
- Located in the "Actions" column of the products table
- Or in the mobile card view, it's the first icon in the top-right

---

## Best Practices

✅ **DO:**
- Use variations for products with multiple sizes (5mg, 10mg, 15mg, etc.)
- Update variation prices when you want to change customer-facing prices
- Use the base price only for products without variations
- Test price changes on the website after updating

❌ **DON'T:**
- Don't update base price thinking it will change the variation prices
- Don't create new variations if you just want to update a price
- Don't forget to check the "Sizes" column before editing

---

## Need Help?

1. Check the "Sizes" column first
2. If it says "1 size" or more, use the Layers icon
3. If it says "No sizes", edit the base price normally
4. When in doubt, click the Layers icon to see all variations

---

**Last Updated**: November 12, 2025
**Version**: 1.0

