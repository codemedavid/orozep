# 🪣 Create Supabase Storage Buckets - Step by Step

## 🎯 You Need to Create 2 Storage Buckets

Follow these **exact steps** to enable image uploads in your admin dashboard:

---

## 📋 **Step-by-Step Instructions**

### **1. Go to Your Supabase Dashboard**
```
https://supabase.com/dashboard
```

### **2. Select Your Project**
- Click on your Orozep PH project

### **3. Open Storage**
- Click **"Storage"** in the left sidebar menu
- You'll see the Storage page

### **4. Create First Bucket: `menu-images`**

Click the **"New bucket"** button (green button on the right)

Fill in the form:
- **Name**: `menu-images`
- **Public bucket**: Toggle this **ON** ✅ (IMPORTANT!)
- Click **"Create bucket"**

### **5. Create Second Bucket: `coa-images`**

Click **"New bucket"** again

Fill in the form:
- **Name**: `coa-images`
- **Public bucket**: Toggle this **ON** ✅ (IMPORTANT!)
- Click **"Create bucket"**

---

## ✅ **Verify Buckets Created**

You should now see 2 buckets in your Storage:
- ✅ `menu-images` (Public)
- ✅ `coa-images` (Public)

---

## 🚀 **After Creating Buckets**

Your admin dashboard will now support:
- ✅ Direct image upload for products
- ✅ Direct image upload for COA reports
- ✅ Drag and drop functionality
- ✅ Automatic upload to Supabase
- ✅ No manual file management needed!

---

## 💡 **Alternative: Manual Upload (If You Don't Want to Use Supabase Storage)**

If you prefer NOT to use Supabase Storage, you can:

### **Option 1: Use Local Files**
1. Save images to `/public/coa/` folder
2. Use path: `/coa/filename.jpg`

### **Option 2: Use External Hosting**
1. Upload to Imgur: https://imgur.com
2. Right-click image → "Copy image address"
3. Paste URL in admin

---

## 🆘 **Still Getting Errors?**

If you see "bucket not found":
1. Make sure bucket names are EXACTLY: `menu-images` and `coa-images`
2. Make sure both are set to **Public**
3. Refresh your browser
4. Try uploading again

---

**Once buckets are created, image uploads will work perfectly! 🎉**

