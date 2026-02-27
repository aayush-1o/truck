/**
 * test/shipments.test.js
 * 6 tests covering shipment CRUD and role-based access.
 */

const supertest = require('supertest');
const { app } = require('../server');
const { createUser, createDriver, createShipment, loginUser } = require('./helpers/seed');

describe('Shipment routes — role-based access and CRUD', () => {

    it('shipper can create a shipment and receives 201', async () => {
        const shipper = await createUser({ email: 'shipper_create@example.com', role: 'shipper' });
        const token = await loginUser(app, shipper.email);

        const res = await supertest(app)
            .post('/api/shipments')
            .set('Authorization', `Bearer ${token}`)
            .send({
                pickupLocation: 'Mumbai, Maharashtra',
                deliveryLocation: 'Pune, Maharashtra',
                weight: 200,
                vehicleType: 'Standard Truck (14ft)',
                cargoDescription: 'Electronics',
                pickupDate: new Date(Date.now() + 86400000).toISOString()
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.trackingId).toBeDefined();
        expect(res.body.data.pricing.totalPrice).toBeGreaterThan(0);
    });

    it('driver cannot create a shipment — receives 403', async () => {
        const { user: driverUser } = await createDriver();
        const token = await loginUser(app, driverUser.email);

        const res = await supertest(app)
            .post('/api/shipments')
            .set('Authorization', `Bearer ${token}`)
            .send({
                pickupLocation: 'Delhi',
                deliveryLocation: 'Jaipur',
                weight: 100,
                vehicleType: 'Mini Truck (7ft)',
                pickupDate: new Date(Date.now() + 86400000).toISOString()
            });

        expect(res.status).toBe(403);
        expect(res.body.success).toBe(false);
    });

    it('shipper can only see their own shipments — not other shippers\'', async () => {
        const shipperA = await createUser({ email: 'shipper_a@example.com', role: 'shipper' });
        const shipperB = await createUser({ email: 'shipper_b@example.com', role: 'shipper' });

        // Each shipper creates their own shipment
        await createShipment(shipperA._id);
        await createShipment(shipperB._id);

        const tokenA = await loginUser(app, shipperA.email);
        const res = await supertest(app)
            .get('/api/shipments')
            .set('Authorization', `Bearer ${tokenA}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        // Shipper A should only see 1 shipment (their own), not shipper B's
        expect(res.body.count).toBe(1);
        expect(res.body.data[0].shipper._id.toString()).toBe(shipperA._id.toString());
    });

    it('admin can see all shipments from all shippers', async () => {
        const shipperA = await createUser({ email: 'shipper_admin_test_a@example.com', role: 'shipper' });
        const shipperB = await createUser({ email: 'shipper_admin_test_b@example.com', role: 'shipper' });
        await createShipment(shipperA._id);
        await createShipment(shipperB._id);

        const admin = await createUser({ email: 'admin_sees_all@example.com', role: 'admin' });
        const adminToken = await loginUser(app, admin.email);

        const res = await supertest(app)
            .get('/api/shipments')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        // Admin sees both shipments
        expect(res.body.count).toBeGreaterThanOrEqual(2);
    });

    it('driver can update shipment status to picked-up when assigned', async () => {
        const shipper = await createUser({ email: 'shipper_status@example.com', role: 'shipper' });
        const { user: driverUser, driver } = await createDriver();

        // Create a shipment already assigned to our driver
        const shipment = await createShipment(shipper._id, {
            driver: driver._id,
            status: 'assigned'
        });

        const driverToken = await loginUser(app, driverUser.email);

        const res = await supertest(app)
            .patch(`/api/shipments/${shipment._id}/status`)
            .set('Authorization', `Bearer ${driverToken}`)
            .send({ status: 'picked-up', note: 'Picked up from warehouse' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe('picked-up');
    });

    it('shipper cannot update shipment status — receives 403', async () => {
        const shipper = await createUser({ email: 'shipper_no_status@example.com', role: 'shipper' });
        const shipment = await createShipment(shipper._id);
        const token = await loginUser(app, shipper.email);

        const res = await supertest(app)
            .patch(`/api/shipments/${shipment._id}/status`)
            .set('Authorization', `Bearer ${token}`)
            .send({ status: 'in-transit' });

        expect(res.status).toBe(403);
        expect(res.body.success).toBe(false);
    });

});
