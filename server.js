const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(__dirname));
app.use(express.json()); 

const DB_PATH = path.join(__dirname, 'database.json');

// Helper functions for reading and writing data safely
function getDatabase() {
    try {
        const rawData = fs.readFileSync(DB_PATH, 'utf8');
        return JSON.parse(rawData);
    } catch (e) {
        return { gigs: [], payments: [] };
    }
}

function saveDatabase(data) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// Route to fetch open gigs
app.get('/api/gigs', (req, res) => {
    const db = getDatabase();
    res.json(db.gigs || []);
});

/**
 * AUTOMATED TRANSACTION RECEIPT ENDPOINT
 * External gateways communicate directly here to log transaction updates.
 */
app.post('/api/v1/payment-callback', (req, res) => {
    const paymentData = req.body; 
    
    // Extract universal tracking keys from incoming notification payload
    const transactionId = paymentData.tx_ref || paymentData.transaction_id || paymentData.mpesa_code;
    const phoneNumber = paymentData.phone || (paymentData.customer && paymentData.customer.phone_number);
    const amount = paymentData.amount;
    const status = paymentData.status; 

    if (!transactionId || !status) {
        return res.status(400).json({ error: "Incomplete transaction payload structure" });
    }

    const db = getDatabase();

    // Verify system does not register duplicate reference IDs
    if (!db.payments) { db.payments = []; }
    const duplicate = db.payments.find(p => p.transactionId === transactionId);
    if (duplicate) {
        return res.status(200).json({ message: "Transaction reference already recorded" });
    }

    // Append authorized entry to ledger array
    const record = {
        transactionId: transactionId,
        phoneNumber: phoneNumber || "Unknown",
        amount: parseFloat(amount) || 0,
        currency: paymentData.currency || "KES",
        status: status === "SUCCESSFUL" || status === "COMPLETED" ? "COMPLETED" : "FAILED",
        timestamp: new Date().toISOString()
    };

    db.payments.push(record);
    saveDatabase(db);

    console.log(`[LEDGER UPDATED] Reference: ${transactionId} | Status: ${record.status}`);

    // Return formal acknowledgement receipt status back to origin network
    res.status(200).json({ status: "acknowledged" });
});

app.listen(PORT, () => {
    console.log(`Tracking server active on port ${PORT}`);
});
