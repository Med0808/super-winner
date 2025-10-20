// Main API handler for Vercel
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());

// API Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'API Server is running!', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString()
  });
});

// Test endpoint
app.get('/test', (req, res) => {
  res.json({ 
    message: '✅ Backend API works!', 
    timestamp: new Date().toISOString(),
    method: req.method
  });
});

// Stripe payment intent endpoint
app.post('/create-payment-intent', async (req, res) => {
  try {
    const { STRIPE_SECRET_KEY } = process.env;
    
    if (!STRIPE_SECRET_KEY) {
      return res.status(500).json({ 
        error: 'Server misconfiguration: STRIPE_SECRET_KEY is missing' 
      });
    }

    // Dynamic import for Stripe
    const { default: Stripe } = await import('stripe');
    const stripe = new Stripe(STRIPE_SECRET_KEY, { 
      apiVersion: '2024-06-20' 
    });

    const { amount, currency = 'eur' } = req.body || {};
    
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(numericAmount * 100), // convert to cents
      currency,
      automatic_payment_methods: { enabled: true },
    });

    res.status(200).json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error('❌ Error creating payment intent:', err);
    const message = typeof err?.message === 'string' ? err.message : 'Internal Server Error';
    res.status(500).json({ error: message });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error('API Error:', err);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: err.message 
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    message: `API route ${req.originalUrl} not found`
  });
});

export default app;
