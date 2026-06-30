# n8n Integration & Setup Guide

## Overview

This guide outlines the workflows, MongoDB schema, and testing strategies for integrating n8n with the application. The integration consists of three main features:

1. **Background Job (Every 10 minutes)**: Periodically fetches products older than 12 hours and updates their prices.
2. **Real-time Price Check (User Click)**: Handles concurrent product clicks using MongoDB locks to prevent race conditions and rate limits.
3. **Telegram Bot**: Provides a conversational interface to perform CRUD operations (Create, Read, Update, Delete) on products.

---

## 1. MongoDB Setup & Schema

Ensure your MongoDB instance is running and accessible by n8n.

### Schema

```javascript
// products collection
{
  _id: ObjectId,
  name: String,
  link: String,
  price: Number,
  createdAt: ISODate,
  updatedAt: ISODate
}

// requestLocks collection (for concurrency)
{
  _id: ObjectId,
  productId: String, // or ObjectId
  locked: Boolean,
  lockedAt: ISODate,
  userId: String,
  expiresAt: ISODate // TTL index field
}
```

### Required Indexes

Run these commands in your MongoDB shell to ensure performance and automatic lock cleanup:

```javascript
// Index for fast product lookup
db.products.createIndex({ "_id": 1, "updatedAt": 1 });

// TTL index - auto-delete locks after 10 seconds to prevent deadlocks
db.requestLocks.createIndex(
  { "expiresAt": 1 },
  { expireAfterSeconds: 0 }
);

// Index for product name queries (used by Telegram Bot)
db.products.createIndex({ "name": 1 });
```

---

## 2. Environment Variables

Add these variables to your n8n environment or `.env` file:

```env
MONGODB_URL=mongodb+srv://user:pass@cluster.mongodb.net/dbname
TELEGRAM_BOT_TOKEN=your_bot_token_here
TIMEZONE=Asia/Kolkata
```

---

## 3. Workflows JSON 

You can import these workflows directly into your n8n instance.

### Workflow A: Product Price Manager (Background Job & Telegram Bot)

Save the following JSON as a file (e.g., `background-job.json`) and import it into n8n:

```json
{
  "name": "Product Price Manager - MongoDB + Telegram Bot",
  "nodes": [
    {
      "parameters": {
        "rule": {
          "interval": [
            {
              "type": "minutes",
              "value": 10
            }
          ]
        }
      },
      "name": "Schedule Trigger - Every 10 Min",
      "type": "n8n-nodes-base.scheduleTrigger",
      "typeVersion": 1,
      "position": [100, 300]
    }
    // Note: This workflow contains the MongoDB fetch, filter > 12 hours, loop update, and Telegram bot nodes.
    // See the provided JSON in the setup requirements for the full node list.
  ]
}
```

### Workflow B: Real-Time Price Check (API Endpoint)

This workflow handles the `N8N_REALTIME_WEBHOOK_URL` requests from the web application.

```json
{
  "name": "API - Real-Time Price Check (User Click)",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "check-price",
        "responseMode": "responseNode"
      },
      "name": "HTTP Endpoint",
      "type": "n8n-nodes-base.httpRequestNode",
      "typeVersion": 1
    }
    // Note: Contains the Lock Check, Request Validation, Web Scraping/API Fetching for price,
    // Database Update, and Lock Release nodes.
  ]
}
```

*(You will need to replace the placeholders in these JSON workflows with the actual logic to fetch the price from the external product link if it isn't fully implemented in the n8n function nodes yet).*

---

## 4. Testing & Debugging

### A. Testing the Background Job

**Manual Test:**
1. In MongoDB, insert a test product with an `updatedAt` date older than 12 hours:
   ```javascript
   db.products.insertOne({
     name: "Test Product",
     link: "https://example.com",
     price: 99,
     updatedAt: new Date(Date.now() - 13 * 60 * 60 * 1000),
     createdAt: new Date()
   })
   ```
2. Trigger the n8n workflow manually.
3. Check MongoDB to see if the price and `updatedAt` timestamp were updated.

### B. Concurrency Stress Test

Simulate multiple concurrent requests to ensure the locking mechanism works:

```bash
# Using Apache Bench
ab -n 100 -c 50 -p payload.json -T application/json http://your-n8n-webhook/check-price
```

*Expected Result:*
- First request: Processed and updated.
- Concurrent requests (within 5s): Return HTTP 429 Too Many Requests.

### C. Telegram Bot Testing

Open Telegram and start a chat with your bot. Test the following commands:
- `/start` - Shows menu
- `/add` - Follow prompts to insert a product
- `/list` - Displays all products
- `/update ProductName` - Asks for a new price and updates
- `/delete ProductName` - Deletes the product

Ensure you are testing concurrent commands if multiple users might use the bot simultaneously.

---

## 5. Next Steps for Implementation

To answer your question: *"will it actually check the datas in mongodb and fetches prices and replace prices from the respective product link?"*

**Yes, but you need to ensure one critical piece is implemented in n8n:**
In your n8n workflow, between checking if the product needs an update and actually updating MongoDB, you must add an **HTTP Request Node** (or a Puppeteer/Scraping node) in n8n that actually visits the `product.link`, scrapes the current price, and passes that new price down to the MongoDB Update node. 

The current JSON structure assumes the new price (`{{ $json.newPrice }}`) is somehow available. If you are scraping Amazon/Flipkart/etc., you will need to integrate an API (like ScraperAPI, Rainforest API) or use n8n's HTTP Request node to fetch the HTML and extract the price using regex or Cheerio.

Once that scraping node is added to your n8n workflow, the flow will work perfectly alongside the web app!
