import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

console.log("[Server] Starting initialization...");
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lazy initialization of Supabase Admin client
let supabaseAdminInstance: any = null;

function getSupabaseAdmin() {
  if (supabaseAdminInstance) return supabaseAdminInstance;
  
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  // Check both with and without VITE_ prefix for service role key
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("[Supabase Admin] Missing configuration:", { 
      url: !!supabaseUrl, 
      key: !!supabaseServiceKey 
    });
    return null;
  }
  
  try {
    supabaseAdminInstance = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    console.log("[Supabase Admin] Client initialized successfully");
    return supabaseAdminInstance;
  } catch (error) {
    console.error("[Supabase Admin] Failed to initialize Supabase Admin:", error);
    return null;
  }
}

const app = express();
app.use(express.json());

// Health check route
app.get("/api/health", (req, res) => {
  const admin = getSupabaseAdmin();
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
    vercel: !!process.env.VERCEL,
    supabaseUrl: !!process.env.VITE_SUPABASE_URL,
    supabaseServiceKey: !!(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY),
    adminClientInitialized: !!admin
  });
});

// Admin API Routes
app.post("/api/admin/create-user", async (req, res) => {
  try {
    const { email, password, name, role, metadata } = req.body;
    console.log(`[Admin API] Attempting to create user: ${email} with role: ${role}`);
    
    const admin = getSupabaseAdmin();

    if (!admin) {
      console.error("[Admin API] Supabase Admin client missing during user creation");
      return res.status(500).json({ 
        success: false, 
        error: "Supabase Admin client not initialized. Please check your Vercel Environment Variables: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set." 
      });
    }

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { ...metadata, name, role }
    });

    if (error) {
      console.error("[Admin API] Supabase Auth error:", error);
      return res.status(400).json({ success: false, error: error.message });
    }
    
    console.log("[Admin API] User created successfully in Auth:", data.user?.id);
    return res.json({ success: true, user: data.user });
  } catch (error: any) {
    console.error("[Admin API] Unhandled error in create-user route:", error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || "An unexpected error occurred on the server" 
    });
  }
});

app.post("/api/admin/create-bucket", async (req, res) => {
  const { bucketName } = req.body;
  const admin = getSupabaseAdmin();

  if (!admin) {
    return res.status(500).json({ 
      success: false, 
      error: "Supabase Admin client not initialized." 
    });
  }

  try {
    // First check if it exists
    const { data: buckets, error: listError } = await admin.storage.listBuckets();
    if (listError) throw listError;

    const exists = buckets?.find((b: any) => b.name === bucketName);
    if (exists) {
      return res.json({ success: true, message: 'Bucket already exists', data: exists });
    }

    const { data, error } = await admin.storage.createBucket(bucketName, {
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
  const admin = getSupabaseAdmin();

  if (!admin) {
    return res.status(500).json({ success: false, error: "Supabase Admin client not initialized." });
  }

  try {
    const { error } = await admin.auth.admin.updateUserById(id, {
      password
    });

    if (error) throw error;
    return res.json({ success: true });
  } catch (error: any) {
    console.error("Error resetting password:", error);
    return res.status(400).json({ success: false, error: error.message });
  }
});

app.delete("/api/admin/delete-user/:id", async (req, res) => {
  const { id } = req.params;
  const admin = getSupabaseAdmin();

  if (!admin) {
    return res.status(500).json({ success: false, error: "Supabase Admin client not initialized." });
  }

  try {
    // Delete related records first
    await admin.from('students').delete().eq('profile_id', id);
    await admin.from('teachers').delete().eq('profile_id', id);
    await admin.from('profiles').delete().eq('id', id);

    const { error } = await admin.auth.admin.deleteUser(id);
    
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
});

// Export the app for Vercel
export default app;

async function startServer() {
  const PORT = 3000;

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
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

// Only call startServer if this file is run directly and not on Vercel
const isMainModule = import.meta.url === `file://${process.cwd()}/server.ts` || 
                    import.meta.url === `file://${path.join(process.cwd(), 'server.ts')}`;

if (isMainModule && !process.env.VERCEL) {
  startServer();
}
