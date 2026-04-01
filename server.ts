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
        const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
        if (error) throw error;
        return res.json({ success: true });
      } catch (error: any) {
        return res.status(400).json({ success: false, error: error.message });
      }
    }

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
