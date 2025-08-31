const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const Joi = require('joi');
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

// Validation schema for checkout session
const checkoutSchema = Joi.object({
  priceId: Joi.string().optional(),
  planType: Joi.string().valid('pro').required(),
  successUrl: Joi.string().uri().optional(),
  cancelUrl: Joi.string().uri().optional()
});

// @route   POST /api/payments/create-checkout-session
// @desc    Create Stripe checkout session for Pro subscription
// @access  Private
router.post('/create-checkout-session', async (req, res) => {
  try {
    console.log('=== Creating Checkout Session ===');
    console.log('User ID:', req.user?.id);
    
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
        error: 'NO_USER_ID'
      });
    }

    // Validate request body
    const { error: validationError, value } = checkoutSchema.validate(req.body);
    if (validationError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request data',
        error: 'VALIDATION_ERROR',
        errors: validationError.details.map(d => d.message)
      });
    }

    const { planType, successUrl, cancelUrl } = value;

    // Get user data from database
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, name, username, subscription_status, subscription_tier')
      .eq('id', req.user.id)
      .single();

    if (userError || !user) {
      console.error('Error fetching user:', userError);
      return res.status(404).json({
        success: false,
        message: 'User not found',
        error: 'USER_NOT_FOUND'
      });
    }

    // Check if user is already on Pro plan
    if (user.subscription_status === 'active' && user.subscription_tier === 'pro') {
      return res.status(400).json({
        success: false,
        message: 'User is already on Pro plan',
        error: 'ALREADY_SUBSCRIBED'
      });
    }

    // Create or get Stripe customer
    let stripeCustomer;
    const { data: existingCustomer } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', req.user.id)
      .single();

    if (existingCustomer?.stripe_customer_id) {
      // Get existing customer
      try {
        stripeCustomer = await stripe.customers.retrieve(existingCustomer.stripe_customer_id);
      } catch (stripeError) {
        console.warn('Stripe customer not found, creating new one');
        stripeCustomer = null;
      }
    }

    if (!stripeCustomer) {
      // Create new Stripe customer
      stripeCustomer = await stripe.customers.create({
        email: user.email,
        name: user.name || user.username,
        metadata: {
          user_id: user.id,
          username: user.username
        }
      });

      // Update user with Stripe customer ID
      await supabase
        .from('users')
        .update({ 
          stripe_customer_id: stripeCustomer.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', req.user.id);
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'CodeLens Pro Plan',
              description: 'Unlimited code reviews, advanced AI analysis, priority support'
            },
            unit_amount: 1900, // $19.00 in cents
            recurring: {
              interval: 'month'
            }
          },
          quantity: 1
        }
      ],
      mode: 'subscription',
      success_url: successUrl || `${process.env.CORS_ORIGIN}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.CORS_ORIGIN}/pricing?canceled=true`,
      metadata: {
        user_id: user.id,
        plan_type: planType
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          plan_type: planType
        }
      }
    });

    console.log('Checkout session created:', session.id);

    res.json({
      success: true,
      sessionId: session.id,
      sessionUrl: session.url
    });

  } catch (error) {
    console.error('Create checkout session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create checkout session',
      error: 'CHECKOUT_SESSION_FAILED',
      details: error.message
    });
  }
});

// @route   GET /api/payments/subscription-status
// @desc    Get user's current subscription status
// @access  Private
router.get('/subscription-status', async (req, res) => {
  try {
    console.log('=== Getting Subscription Status ===');
    
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
        error: 'NO_USER_ID'
      });
    }

    // Get user subscription data
    const { data: user, error } = await supabase
      .from('users')
      .select('subscription_status, subscription_tier, stripe_customer_id, credits_used, credits_limit')
      .eq('id', req.user.id)
      .single();

    if (error || !user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        error: 'USER_NOT_FOUND'
      });
    }

    let stripeSubscription = null;
    if (user.stripe_customer_id) {
      try {
        // Get active subscriptions from Stripe
        const subscriptions = await stripe.subscriptions.list({
          customer: user.stripe_customer_id,
          status: 'active',
          limit: 1
        });

        if (subscriptions.data.length > 0) {
          stripeSubscription = subscriptions.data[0];
        }
      } catch (stripeError) {
        console.warn('Error fetching Stripe subscription:', stripeError);
      }
    }

    res.json({
      success: true,
      subscription: {
        status: user.subscription_status || 'inactive',
        tier: user.subscription_tier || 'free',
        creditsUsed: user.credits_used || 0,
        creditsLimit: user.credits_limit || 100,
        stripeSubscriptionId: stripeSubscription?.id || null,
        currentPeriodStart: stripeSubscription?.current_period_start ? new Date(stripeSubscription.current_period_start * 1000) : null,
        currentPeriodEnd: stripeSubscription?.current_period_end ? new Date(stripeSubscription.current_period_end * 1000) : null,
        cancelAtPeriodEnd: stripeSubscription?.cancel_at_period_end || false
      }
    });

  } catch (error) {
    console.error('Get subscription status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get subscription status',
      error: 'SUBSCRIPTION_STATUS_FAILED',
      details: error.message
    });
  }
});

// @route   POST /api/payments/cancel-subscription
// @desc    Cancel user's subscription (at period end)
// @access  Private
router.post('/cancel-subscription', async (req, res) => {
  try {
    console.log('=== Canceling Subscription ===');
    
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
      .select('stripe_customer_id, subscription_status')
      .eq('id', req.user.id)
      .single();

    if (error || !user || !user.stripe_customer_id) {
      return res.status(404).json({
        success: false,
        message: 'No active subscription found',
        error: 'NO_SUBSCRIPTION'
      });
    }

    // Get active subscription from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: user.stripe_customer_id,
      status: 'active',
      limit: 1
    });

    if (subscriptions.data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No active subscription found',
        error: 'NO_ACTIVE_SUBSCRIPTION'
      });
    }

    const subscription = subscriptions.data[0];

    // Cancel subscription at period end
    const canceledSubscription = await stripe.subscriptions.update(subscription.id, {
      cancel_at_period_end: true
    });

    console.log('Subscription canceled at period end:', subscription.id);

    res.json({
      success: true,
      message: 'Subscription will be canceled at the end of the billing period',
      cancelAt: new Date(canceledSubscription.current_period_end * 1000)
    });

  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel subscription',
      error: 'CANCEL_SUBSCRIPTION_FAILED',
      details: error.message
    });
  }
});

// @route   POST /api/payments/reactivate-subscription
// @desc    Reactivate a canceled subscription
// @access  Private
router.post('/reactivate-subscription', async (req, res) => {
  try {
    console.log('=== Reactivating Subscription ===');
    
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
      return res.status(404).json({
        success: false,
        message: 'No subscription found',
        error: 'NO_SUBSCRIPTION'
      });
    }

    // Get subscription that's set to cancel
    const subscriptions = await stripe.subscriptions.list({
      customer: user.stripe_customer_id,
      status: 'active',
      limit: 1
    });

    if (subscriptions.data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No active subscription found',
        error: 'NO_ACTIVE_SUBSCRIPTION'
      });
    }

    const subscription = subscriptions.data[0];

    if (!subscription.cancel_at_period_end) {
      return res.status(400).json({
        success: false,
        message: 'Subscription is not set to cancel',
        error: 'SUBSCRIPTION_NOT_CANCELING'
      });
    }

    // Reactivate subscription
    await stripe.subscriptions.update(subscription.id, {
      cancel_at_period_end: false
    });

    console.log('Subscription reactivated:', subscription.id);

    res.json({
      success: true,
      message: 'Subscription has been reactivated'
    });

  } catch (error) {
    console.error('Reactivate subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reactivate subscription',
      error: 'REACTIVATE_SUBSCRIPTION_FAILED',
      details: error.message
    });
  }
});

// @route   GET /api/payments/billing-portal
// @desc    Create Stripe billing portal session
// @access  Private
router.get('/billing-portal', async (req, res) => {
  try {
    console.log('=== Creating Billing Portal Session ===');
    
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
      return res.status(404).json({
        success: false,
        message: 'No billing information found',
        error: 'NO_BILLING_INFO'
      });
    }

    // Create billing portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${process.env.CORS_ORIGIN}/dashboard`
    });

    res.json({
      success: true,
      portalUrl: portalSession.url
    });

  } catch (error) {
    console.error('Billing portal error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create billing portal session',
      error: 'BILLING_PORTAL_FAILED',
      details: error.message
    });
  }
});

module.exports = router;