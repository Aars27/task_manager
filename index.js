// index.js - Node.js + Express + Supabase Backend
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());


const SUPABASE_URL = process.env.SUPABASE_URL || 'https://joarjohffyqadnmrhqoo.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvYXJqb2hmZnlxYWRubXJocW9vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5NjU0NDgsImV4cCI6MjA3OTU0MTQ0OH0.THYJwFVEd5Am9d15Z0njuiADW0aeJv4ViWaQN18oOq0';


// Stop server if env vaiables are missing
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase environment variables. Please set SUPABASE_URL and SUPABASE_KEY.');
  process.exit(1);
}


// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'Task Manager API Running',
    timestamp: new Date().toISOString(),
    endpoints: [
      'POST /generateTaskId',
      'POST /verifyTask',
      'GET /tasks (with auth)',
      'GET /health'
    ]
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ healthy: true, timestamp: new Date().toISOString() });
});

// Generate unique task ID
app.post('/generateTaskId', (req, res) => {
  try {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 9).toUpperCase();
    const taskId = `TASK-${timestamp}-${randomStr}`;
    
    res.json({
      success: true,
      taskId: taskId,
      timestamp: new Date().toISOString(),
      message: 'Task ID generated successfully'
    });
  } catch (error) {
    console.error('Error generating task ID:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Verify task (admin endpoint)
app.post('/verifyTask', async (req, res) => {
  try {
    const { taskId, authToken } = req.body;
    
    if (!taskId) {
      return res.status(400).json({
        success: false,
        error: 'Task ID is required'
      });
    }

    // Optional: Verify auth token if provided
    if (authToken) {
      const { data: { user }, error } = await supabase.auth.getUser(authToken);
      if (error || !user) {
        return res.status(401).json({
          success: false,
          error: 'Invalid authentication token'
        });
      }
    }

    res.json({
      success: true,
      taskId: taskId,
      verified: true,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error verifying task:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get all tasks (requires authentication)
app.get('/tasks', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authorization token required'
      });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    // Get user's tasks
    const { data: tasks, error: dbError } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (dbError) {
      throw dbError;
    }

    res.json({
      success: true,
      tasks: tasks || [],
      count: tasks?.length || 0
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Create task (alternative endpoint for testing)
app.post('/tasks', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authorization token required'
      });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    const { title, description } = req.body;
    
    if (!title) {
      return res.status(400).json({
        success: false,
        error: 'Title is required'
      });
    }

    // Generate task ID
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 9).toUpperCase();
    const taskId = `TASK-${timestamp}-${randomStr}`;

    // Insert task
    const { data: task, error: dbError } = await supabase
      .from('tasks')
      .insert([
        {
          task_id: taskId,
          title: title,
          description: description || '',
          user_id: user.id,
          user_email: user.email,
          status: 'pending',
          verified: false
        }
      ])
      .select()
      .single();

    if (dbError) {
      throw dbError;
    }

    res.json({
      success: true,
      task: task,
      message: 'Task created successfully'
    });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get task statistics
app.get('/stats', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authorization token required'
      });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    // Get all tasks for user
    const { data: tasks, error: dbError } = await supabase
      .from('tasks')
      .select('status, verified')
      .eq('user_id', user.id);

    if (dbError) {
      throw dbError;
    }

    const stats = {
      total: tasks.length,
      pending: tasks.filter(t => t.status === 'pending').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      verified: tasks.filter(t => t.verified).length
    };

    res.json({
      success: true,
      stats: stats
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
});