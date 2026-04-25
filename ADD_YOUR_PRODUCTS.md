# How to Add Your Peptide Products

## ✅ Quick Setup - Your Products Are Ready!

I've prepared a SQL file with all your peptides already configured with the correct Philippine Peso prices.

---

## 📋 Your Products List

1. **Tirzepatide 20mg** - ₱2,100
2. **Bac Water** - ₱250
3. **GHK-Cu** - ₱999
4. **AA3** - ₱150
5. **Semax** - ₱1,300
6. **NAD+** - ₱1,600
7. **AOD-9604** - ₱1,600

---

## 🚀 Step-by-Step Installation

### Step 1: Apply Database Migration

1. Go to your **Supabase Dashboard**
2. Click on **SQL Editor** (left sidebar)
3. Click **New Query**
4. Open the file: `supabase/migrations/20250111000000_add_actual_products.sql`
5. Copy all the contents
6. Paste into Supabase SQL Editor
7. Click **Run** button

**That's it!** Your products are now in the database! 🎉

---

## 💰 Currency Updated

I've updated the entire website to use **Philippine Peso (₱)**:

✅ Product prices show ₱ symbol  
✅ Cart totals in PHP  
✅ Checkout amounts in PHP  
✅ Shipping: **₱150** (FREE over ₱5,000)

---

## 🛒 Shipping Settings

**Current Settings:**
- Shipping Cost: **₱150**
- Free Shipping Threshold: **₱5,000**

To change these, edit:
- `src/components/Cart.tsx` (line 50)
- `src/components/Checkout.tsx` (line 46)

---

## 🎨 Product Categories

Your products are organized as:
- **Research** - Tirzepatide, Bac Water, AA3
- **Cosmetic** - GHK-Cu
- **Cognitive** - Semax
- **Performance** - NAD+, AOD-9604

---

## 📸 Adding Product Images

### Option 1: Via Supabase Storage
1. Go to Supabase Dashboard → **Storage**
2. Create bucket: `product-images`
3. Set to **Public**
4. Upload images
5. Copy image URL
6. Update via Admin Panel (`/admin`)

### Option 2: Via Admin Panel
1. Go to `/admin`
2. Login (password: `Orozep PH@Admin!2025`)
3. Click **Manage Products**
4. Click **Edit** on any product
5. Scroll to "Product Image" section
6. Upload image

---

## ✏️ Editing Products

### Via Admin Panel (Easiest):
1. Visit: `http://localhost:5173/admin`
2. Login with: `Orozep PH@Admin!2025`
3. Click **Manage Products**
4. Edit any product:
   - Name
   - Description
   - Price
   - Stock
   - Category
   - Images

### Via SQL (Advanced):
```sql
UPDATE products 
SET base_price = 2500.00 
WHERE name = 'Tirzepatide 20mg';
```

---

## 📊 Product Details Included

Each product has:
- ✅ Name and description
- ✅ Price in PHP
- ✅ Category
- ✅ Purity percentage (99%+)
- ✅ Storage conditions
- ✅ Stock quantity
- ✅ Featured flag (for homepage)
- ✅ Availability status

---

## 🎯 Next Steps

1. **Apply the SQL migration** (most important!)
2. **Test your site**: `npm run dev`
3. **Add your WhatsApp number** (see WHATSAPP_SETUP.md)
4. **Upload product images** (optional)
5. **Customize descriptions** if needed
6. **Launch!** 🚀

---

## 💡 Tips

### To add more products later:
Use the Admin Panel (`/admin`) - much easier!

### To update prices:
Either use Admin Panel or update the SQL:
```sql
UPDATE products SET base_price = 1500.00 WHERE name = 'Semax';
```

### To add product variations (sizes):
```sql
INSERT INTO product_variations (product_id, name, quantity_mg, price, stock_quantity)
SELECT id, '10mg', 10.0, 1200.00, 30 
FROM products WHERE name = 'Tirzepatide 20mg';
```

---

## 🆘 Troubleshooting

**Products don't show up?**
- Make sure you ran the SQL migration
- Check products are set to `available = true`
- Refresh the page

**Prices show $0?**
- The migration sets all prices correctly
- If still showing $0, check the migration ran successfully

**Can't edit products?**
- Make sure you're logged into admin panel
- Password: `Peptide@Admin!2025`

---

## ✅ Checklist

- [ ] Run the SQL migration in Supabase
- [ ] Test products appear on website
- [ ] Verify prices show in ₱ PHP
- [ ] Add WhatsApp number
- [ ] Upload product images (optional)
- [ ] Test adding to cart
- [ ] Test checkout process
- [ ] Launch your store! 🎊

---

**Your peptide store is ready to go!** 💊✨

All products are configured with:
- Correct names
- Philippine Peso prices
- Proper categories
- Professional descriptions
- Ready for customers!

