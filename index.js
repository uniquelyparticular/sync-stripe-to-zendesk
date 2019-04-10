const { buffer, send } = require('micro')
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const moment = require('moment')
const currency = require('currency.js')
const fetch = require('node-fetch')

const cors = require('micro-cors')({
  allowMethods: ['POST'],
  exposeHeaders: ['stripe-signature'],
  allowHeaders: [
    'stripe-signature',
    'user-agent',
    'x-forwarded-proto',
    'X-Requested-With',
    'Access-Control-Allow-Origin',
    'X-HTTP-Method-Override',
    'Content-Type',
    'Authorization',
    'Accept'
  ]
})

const _toJSON = error => {
  return !error
    ? ''
    : Object.getOwnPropertyNames(error).reduce(
        (jsonError, key) => {
          return { ...jsonError, [key]: error[key] }
        },
        { type: 'error' }
      )
}

process.on('unhandledRejection', (reason, p) => {
  console.error(
    'Promise unhandledRejection: ',
    p,
    ', reason:',
    JSON.stringify(reason)
  )
})

module.exports = cors(async (req, res) => {
  if (req.method === 'OPTIONS') {
    return send(res, 200, 'ok!')
  }

  try {
    const sig = await req.headers['stripe-signature']
    const body = await buffer(req)

    const {
      type,
      created,
      data: {
        object: {
          id: reference,
          customer: stripe_id,
          status,
          refunded,
          amount: total_paid,
          amount_refunded: total_refunded,
          refunds: { total_count: number_refunds },
          source: {
            card: { last4: card_last4, brand: card_brand }
          },
          metadata: { email, order_id, customer_id, customer_name }
        },
        previous_attributes: { amount_refunded: previously_refunded }
      }
    } = await stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    )

    if (order_id && type === 'charge.refunded' && status === 'succeeded') {
      const payload = {
        profile: {
          source: 'support',
          identifiers: {
            stripe_id: stripe_id,
            moltin_id: customer_id,
            email: email
          }
        },
        event: {
          source: 'stripe',
          type: 'stripe-payment-refund',
          description: refunded === true ? 'Order Refunded' : 'Partial Refund',
          created_at: moment.unix(created),
          properties: {
            'Transcation Reference': reference,
            'Customer Name': customer_name,
            'Order ID': order_id,
            'Order Total': currency(total_paid / 100, {
              formatWithSymbol: true
            }).format(),
            'Amount Refunded': currency(
              (total_refunded - previously_refunded) / 100,
              { formatWithSymbol: true }
            ).format(),
            [`Total Refunds (${number_refunds}) - ${Math.round(
              (total_refunded / total_paid) * 100
            )}%`]: currency(total_refunded / 100, {
              formatWithSymbol: true
            }).format()
          }
        }
      }

      fetch(
        `https://${
          process.env.ZENDESK_SUBDOMAIN
        }.zendesk.com/api/sunshine/track`,
        {
          headers: {
            Authorization: `Basic ${Buffer.from(
              `${process.env.ZENDESK_INTEGRATION_EMAIL}/token:${
                process.env.ZENDESK_INTEGRATION_SECRET
              }`
            ).toString('base64')}`,
            Accept: 'application/json',
            'Content-Type': 'application/json'
          },
          method: 'POST',
          body: JSON.stringify(payload)
        }
      )
        .then(response => {
          if (response.ok && response.status < 299) {
            return send(res, 200, JSON.stringify({ received: true }))
          } else {
            return send(res, 500, 'Error')
          }
        })
        .catch(error => {
          const jsonError = _toJSON(error)
          return send(
            res,
            jsonError.type === 'StripeSignatureVerificationError' ? 401 : 500,
            jsonError
          )
        })
    }
  } catch (error) {
    const jsonError = _toJSON(error)
    return send(
      res,
      jsonError.type === 'StripeSignatureVerificationError' ? 401 : 500,
      jsonError
    )
  }
})
