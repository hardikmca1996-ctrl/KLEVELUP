import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

const app = express();
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
      fileSizeLimit: 10485760 // 10MB
    });

    if (error) throw error;
    
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

app.delete("/api/admin/delete-user/:id", async (req, res) => {
  const { id } = req.params;

  if (supabaseAdmin) {
    try {
      await supabaseAdmin.from('students').delete().eq('profile_id', id);
      await supabaseAdmin.from('teachers').delete().eq('profile_id', id);
      await supabaseAdmin.from('profiles').delete().eq('id', id);

      const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
      
      if (error) {
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

  res.json({ success: true });
});

// Export the app for Vercel
export default app;

async function startServer() {
  const PORT = 3000;

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false 
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

  // Only listen if not running as a serverless function
  if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

// Only call startServer if this file is run directly
if (import.meta.url === `file://${process.cwd()}/server.ts` || !process.env.VERCEL) {
  startServer();
}
