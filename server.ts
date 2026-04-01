import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

// Create a Supabase client with the service role key for admin operations
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://zikxfinrnxsmwhtnsxgx.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = (supabaseUrl && supabaseServiceKey) 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Admin API Routes
  app.post("/api/admin/create-user", async (req, res) => {
    const { email, password, name, role, metadata } = req.body;

    if (!supabaseAdmin) {
      const missing = [];
      if (!supabaseUrl) missing.push("VITE_SUPABASE_URL");
      if (!supabaseServiceKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");
      
      return res.status(500).json({ 
        success: false, 
        error: `Supabase Admin client not initialized. Missing: ${missing.join(", ")}. Please set these in your environment variables.` 
      });
    }

    try {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { ...metadata, name, role }
      });

      if (error) throw error;
      return res.json({ success: true, user: data.user });
    } catch (error: any) {
      return res.status(400).json({ success: false, error: error.message });
    }
  });

  app.post("/api/admin/create-bucket", async (req, res) => {
    const { bucketName } = req.body;

    if (!supabaseAdmin) {
      const missing = [];
      if (!supabaseUrl) missing.push("VITE_SUPABASE_URL");
      if (!supabaseServiceKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");

      return res.status(500).json({ 
        success: false, 
        error: `Supabase Admin client not initialized. Missing: ${missing.join(", ")}. Please set these in your environment variables.` 
      });
    }

    try {
      // First check if it exists
      const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
      if (listError) throw listError;

      const exists = buckets?.find(b => b.name === bucketName);
      if (exists) {
        return res.json({ success: true, message: 'Bucket already exists', data: exists });
      }

      const { data, error } = await supabaseAdmin.storage.createBucket(bucketName, {
        public: true,
        allowedMimeTypes: ['application/pdf', 'image/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        fileSizeLimit: 5242880 // 5MB
      });

      if (error) throw error;
      
      // Add a default policy for public access if it's a new bucket
      // Note: This might require more complex SQL execution which might not be supported via the storage API directly
      // but creating a public bucket usually sets up basic public read access.
      
      return res.json({ success: true, data });
    } catch (error: any) {
      console.error(`Error creating bucket ${bucketName}:`, error);
      return res.status(400).json({ success: false, error: error.message });
    }
  });

  app.post("/api/admin/reset-password/:id", async (req, res) => {
    const { id } = req.params;
    const { password } = req.body;

    if (supabaseAdmin) {
      try {
        const { error } = await supabaseAdmin.auth.admin.updateUserById(id, {
          password
        });

        if (error) throw error;
        return res.json({ success: true });
      } catch (error: any) {
        return res.status(400).json({ success: false, error: error.message });
      }
    }

    res.json({ success: true });
  });

  app.post("/api/auth/change-password", async (req, res) => {
    // This is usually handled on the client side with supabase.auth.updateUser
    // but we can provide a proxy if needed.
    res.json({ success: true });
  });

  app.delete("/api/admin/delete-user/:id", async (req, res) => {
    const { id } = req.params;

    if (supabaseAdmin) {
      try {
        // Delete from related tables first to handle potential foreign key constraints
        // although ON DELETE CASCADE is preferred in the database itself.
        
        // 1. Delete from students (if they are a student)
        await supabaseAdmin.from('students').delete().eq('profile_id', id);
        
        // 2. Delete from teachers (if they are a teacher)
        await supabaseAdmin.from('teachers').delete().eq('profile_id', id);
        
        // 3. Delete from profiles
        await supabaseAdmin.from('profiles').delete().eq('id', id);

        // 4. Finally delete from auth.users
        const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
        
        if (error) {
          // If the user doesn't exist in auth but we deleted the profile, that's still a success of sorts
          if (error.message.includes('User not found')) {
            return res.json({ success: true, message: 'User not found in auth, but profile data cleared' });
          }
          throw error;
        }
        
        return res.json({ success: true });
      } catch (error: any) {
        console.error('Error deleting user:', error);
        return res.status(400).json({ success: false, error: error.message });
      }
    }

    // In demo mode, we don't have supabaseAdmin, so we just return success.
    // The frontend should handle local data deletion in demo mode.
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false // Explicitly disable HMR to prevent WebSocket errors in this environment
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
