const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { authenticateToken } = require('../middleware/auth.middleware');
const router = express.Router();

// Initialize Stripe
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Apply authentication middleware to all routes
router.use(authenticateToken);

// @route   POST /api/payment/create-checkout-session
// @desc    Create Stripe checkout session
// @access  Private
router.post('/create-checkout-session', async (req, res) => {
  try {
    console.log('=== Create Checkout Session ===');
    console.log('User ID:', req.user?.id);
    console.log('Request body:', req.body);

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
        error: 'NO_USER_ID'
      });
    }

    const { planType, successUrl, cancelUrl } = req.body;

    if (planType !== 'pro') {
      return res.status(400).json({
        success: false,
        message: 'Invalid plan type',
        error: 'INVALID_PLAN'
      });
    }

    // Get or create Stripe customer
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('stripe_customer_id, email, name')
      .eq('id', req.user.id)
      .single();

    if (userError || !user) {
      console.error('❌ User not found:', userError);
      return res.status(404).json({
        success: false,
        message: 'User not found',
        error: 'USER_NOT_FOUND'
      });
    }

    let customerId = user.stripe_customer_id;

    // Create Stripe customer if doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name || `User ${req.user.id}`,
        metadata: {
          user_id: req.user.id
        }
      });

      customerId = customer.id;

      // Save customer ID to database
      await supabase
        .from('users')
        .update({ stripe_customer_id: customerId })
        .eq('id', req.user.id);

      console.log('✅ Created Stripe customer:', customerId);
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'CodeLens Pro',
            description: 'Unlimited code reviews and advanced features'
          },
          unit_amount: 1900, // $19.00 in cents
          recurring: {
            interval: 'month'
          }
        },
        quantity: 1
      }],
      mode: 'subscription',
      success_url: successUrl || `${process.env.FRONTEND_URL}/dashboard?upgraded=true`,
      cancel_url: cancelUrl || `${process.env.FRONTEND_URL}/pricing?canceled=true`,
      metadata: {
        user_id: req.user.id,
        plan_type: 'pro'
      },
      subscription_data: {
        metadata: {
          user_id: req.user.id
        }
      }
    });

    console.log('✅ Checkout session created:', session.id);

    res.json({
      success: true,
      sessionId: session.id,
      sessionUrl: session.url
    });

  } catch (error) {
    console.error('❌ Create checkout session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create checkout session',
      error: 'STRIPE_ERROR',
      details: error.message
    });
  }
});

router.get('/subscription-status', async (req, res) => {
  try {
    console.log('=== Get Subscription Status ===');
    console.log('User ID:', req.user?.id);

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
        error: 'NO_USER_ID'
      });
    }

    // FIXED: Get user with subscription info - removed 'plan' column
    const { data: user, error } = await supabase
      .from('users')
      .select('stripe_customer_id, subscription_status, subscription_tier')
      .eq('id', req.user.id)
      .single();

    if (error || !user) {
      console.error('❌ User not found:', error);
      return res.status(404).json({
        success: false,
        message: 'User not found',
        error: 'USER_NOT_FOUND',
        details: error?.message
      });
    }

    let subscription = null;

    // If user has Stripe customer ID, get subscription from Stripe
    if (user.stripe_customer_id) {
      try {
        const subscriptions = await stripe.subscriptions.list({
          customer: user.stripe_customer_id,
          status: 'all',
          limit: 1
        });

        if (subscriptions.data.length > 0) {
          const stripeSubscription = subscriptions.data[0];
          subscription = {
            id: stripeSubscription.id,
            status: stripeSubscription.status,
            tier: stripeSubscription.status === 'active' ? 'pro' : 'free',
            currentPeriodStart: stripeSubscription.current_period_start * 1000,
            currentPeriodEnd: stripeSubscription.current_period_end * 1000,
            cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end
          };

          // Update database with latest info from Stripe
          await supabase
            .from('users')
            .update({
              subscription_status: stripeSubscription.status,
              subscription_tier: stripeSubscription.status === 'active' ? 'pro' : 'free',
              updated_at: new Date().toISOString()
            })
            .eq('id', req.user.id);
        }
      } catch (stripeError) {
        console.warn('⚠️ Could not fetch Stripe subscription:', stripeError.message);
      }
    }

    // Fallback to database info
    if (!subscription) {
      subscription = {
        status: user.subscription_status || 'inactive',
        tier: user.subscription_tier || 'free'
      };
    }

    console.log('✅ Subscription status retrieved:', subscription);

    res.json({
      success: true,
      subscription
    });

  } catch (error) {
    console.error('❌ Get subscription status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get subscription status',
      error: 'SERVER_ERROR',
      details: error.message
    });
  }
});
// @route   GET /api/payment/billing-portal
// @desc    Create Stripe billing portal session
// @access  Private
router.get('/billing-portal', async (req, res) => {
  try {
    console.log('=== Create Billing Portal Session ===');
    console.log('User ID:', req.user?.id);

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
        error: 'NO_USER_ID'
      });
    }

    // Get user's Stripe customer ID
    const { data: user, error } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', req.user.id)
      .single();

    if (error || !user || !user.stripe_customer_id) {
      return res.status(400).json({
        success: false,
        message: 'No active subscription found',
        error: 'NO_SUBSCRIPTION'
      });
    }

    // Create billing portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${process.env.FRONTEND_URL}/pricing`
    });

    console.log('✅ Billing portal session created');

    res.json({
      success: true,
      portalUrl: portalSession.url
    });

  } catch (error) {
    console.error('❌ Create billing portal error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create billing portal session',
      error: 'STRIPE_ERROR',
      details: error.message
    });
  }
});

// @route   POST /api/payment/cancel-subscription
// @desc    Cancel user's subscription
// @access  Private
router.post('/cancel-subscription', async (req, res) => {
  try {
    console.log('=== Cancel Subscription ===');
    console.log('User ID:', req.user?.id);

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
        error: 'NO_USER_ID'
      });
    }

    // Get user's Stripe customer ID
    const { data: user, error } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', req.user.id)
      .single();

    if (error || !user || !user.stripe_customer_id) {
      return res.status(400).json({
        success: false,
        message: 'No active subscription found',
        error: 'NO_SUBSCRIPTION'
      });
    }

    // Get active subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: user.stripe_customer_id,
      status: 'active',
      limit: 1
    });

    if (subscriptions.data.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No active subscription found',
        error: 'NO_ACTIVE_SUBSCRIPTION'
      });
    }

    // Cancel subscription at period end
    const subscription = await stripe.subscriptions.update(
      subscriptions.data[0].id,
      {
        cancel_at_period_end: true
      }
    );

    console.log('✅ Subscription marked for cancellation');

    res.json({
      success: true,
      message: 'Subscription will be canceled at the end of the billing period',
      endsAt: subscription.current_period_end * 1000
    });

  } catch (error) {
    console.error('❌ Cancel subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel subscription',
      error: 'STRIPE_ERROR',
      details: error.message
    });
  }
});

module.exports = router;