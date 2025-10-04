// Reseller website with PayHero integration (Express + EJS)
customerName: customerName || '',
contact: contact || '',
status: 'pending',
createdAt: new Date().toISOString()
};
orders.push(newOrder);
writeOrders(orders);
res.json({ orderId });
});


// PayHero callback (webhook) URL - PayHero will POST payment result here
app.post('/payhero/callback', async (req, res) => {
try {
const payload = req.body; // adjust based on PayHero callback shape
console.log('PayHero callback received:', payload);


// PayHero should include a user reference (we used order id as reference)
const userRef = payload.user_reference || payload.reference || payload.client_reference;
const success = payload.paymentSuccess === true || payload.payment_status === 'paid' || payload.status === 'success' || payload.success === true;


const orders = readOrders();
const order = orders.find(o => o.id === userRef);
if (!order) {
console.warn('Order not found for callback ref:', userRef);
// still respond 200
return res.json({ success: false, message: 'order not found' });
}


if (success) {
order.status = 'paid';
order.paidAt = new Date().toISOString();
order.paymentResult = payload;
writeOrders(orders);
// Optionally: you can send email/WhatsApp here using provider
} else {
order.status = 'failed';
order.paymentResult = payload;
writeOrders(orders);
}


return res.json({ success: true });
} catch (err) {
console.error('Callback error', err);
return res.status(500).json({ success: false });
}
});


// Admin view
app.get('/admin', (req, res) => {
const pass = req.query.pass || '';
if (!ADMIN_PASS || pass !== ADMIN_PASS) return res.status(401).send('Unauthorized. Append ?pass=YOUR_ADMIN_PASS');
const orders = readOrders();
res.render('admin', { orders });
});


// Mark delivered endpoint (admin action)
app.post('/admin/deliver', (req, res) => {
const pass = req.query.pass || '';
if (!ADMIN_PASS || pass !== ADMIN_PASS) return res.status(401).json({ error: 'Unauthorized' });
const { orderId, deliveredBy, notes } = req.body;
const orders = readOrders();
const order = orders.find(o => o.id === orderId);
if (!order) return res.status(404).json({ error: 'Order not found' });
order.status = 'delivered';
order.deliveredAt = new Date().toISOString();
order.deliveredBy = deliveredBy || 'admin';
order.notes = notes || '';
writeOrders(orders);
res.json({ success: true });
});


// Simple success / fail pages
app.get('/paid', (req, res) => res.render('paid'));
app.get('/failed', (req, res) => res.render('failed'));


app.listen(PORT, () => {
console.log(`Server running on port ${PORT}`);
console.log('Make sure PAYHERO_CALLBACK_URL is set and reachable (ngrok or public URL)');
});
