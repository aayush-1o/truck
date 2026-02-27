/**
 * test/drivers.test.js
 * 4 tests covering driver profile management and access control.
 */

const supertest = require('supertest');
const { app } = require('../server');
const { createUser, createDriver, loginUser } = require('./helpers/seed');

describe('Driver routes — profile, availability, location, access control', () => {

    it('driver can create their own profile — returns 201', async () => {
        const driverUser = await createUser({
            email: 'driver_new@example.com',
            role: 'driver'
        });
        const token = await loginUser(app, driverUser.email);

        const res = await supertest(app)
            .post('/api/drivers')
            .set('Authorization', `Bearer ${token}`)
            .send({
                vehicleType: 'Standard Truck (14ft)',
                vehicleNumber: 'DL01CD5678',
                licenseNumber: 'DL012345678'
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.vehicleNumber).toBe('DL01CD5678');
        expect(res.body.data.licenseNumber).toBe('DL012345678');
    });

    it('driver can toggle their own availability — returns 200', async () => {
        const { user: driverUser } = await createDriver();
        const token = await loginUser(app, driverUser.email);

        const res = await supertest(app)
            .patch('/api/drivers/availability')
            .set('Authorization', `Bearer ${token}`)
            .send({ isAvailable: false });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.availability).toBe(false);
    });

    it('driver can update their GPS location — returns 200', async () => {
        const { user: driverUser } = await createDriver();
        const token = await loginUser(app, driverUser.email);

        const res = await supertest(app)
            .put('/api/drivers/location')
            .set('Authorization', `Bearer ${token}`)
            .send({
                lat: 19.076,
                lng: 72.877,
                address: 'Andheri, Mumbai',
                city: 'Mumbai'
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.coordinates.lat).toBeCloseTo(19.076);
        expect(res.body.data.coordinates.lng).toBeCloseTo(72.877);
    });

    it('shipper cannot access driver stats endpoint — returns 403', async () => {
        const shipper = await createUser({
            email: 'shipper_no_driver_stats@example.com',
            role: 'shipper'
        });
        const token = await loginUser(app, shipper.email);

        const res = await supertest(app)
            .get('/api/drivers/stats')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(403);
        expect(res.body.success).toBe(false);
    });

});
