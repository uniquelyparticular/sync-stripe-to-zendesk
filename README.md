# @particular./sync-stripe-to-zendesk

> Add a Zendesk Sunshine Evenet when payment refunded in Stripe

Asynchronous microservice that is triggered by [Stripe](https://stripe.com) webhooks to create a Sunshine Event inside of [Zendesk](https://zendesk.com).

Built with [Micro](https://github.com/zeit/micro)! 🤩

## 🛠 Setup

Both a [Zendesk](https://zendesk.com) _and_ [Stripe](https://stripe.com) account are needed for this to function.

Create a `.env` at the project root with the following credentials:

```dosini
STRIPE_SECRET_KEY=
ZENDESK_INTEGRATION_EMAIL=
ZENDESK_INTEGRATION_SECRET=
```

Find your `STRIPE_SECRET_KEY` within Stripe's [API Settings](https://dashboard.stripe.com/account/apikeys).

TODO: add instructions on ZENDESK keys above

## 📦 Package

Run the following command to build the app

```bash
yarn install
```

Start the development server

```bash
yarn dev
```

The server will typically start on PORT `3000`, if not, make a note for the next step.

Start ngrok (change ngrok port below from 3000 if yarn dev deployed locally on different port above)

```bash
ngrok http 3000
```

Make a note of the https `ngrok URL` provided.

## ⛽️ Usage

Next head over to the Stripe [Webhook Settings](https://dashboard.stripe.com/account/webhooks) area, add a new webhook with the following details:

| URL to be called    | Webhook version        | Filter event                               |
| ------------------- | ---------------------- | ------------------------------------------ |
| _`ngrok URL` above_ | `2018-05-21 (Default)` | 'Select types to send' > `charge.refunded` |

## 🚀 Deploy

You can easily deploy this function to [now](https://now.sh).

_Contact [Adam Grohs](https://www.linkedin.com/in/adamgrohs/) @ [Particular.](https://uniquelyparticular.com) for any questions._
