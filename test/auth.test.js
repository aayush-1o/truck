/**
 * test/auth.test.js
 * 8 tests covering the full authentication flow.
 */

const supertest = require('supertest');
const { app } = require('../server');
const { createUser } = require('./helpers/seed');

describe('POST /api/register', () => {

    it('returns 201 with user data and NO password field on success', async () => {
        const res = await supertest(app).post('/api/register').send({
            name: 'John Doe',
            email: 'john@example.com',
            phone: '9876543210',
            password: 'password123',
            role: 'shipper'
        });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toBeDefined();
        // Password must NEVER appear in any API response
        expect(res.body.data.password).toBeUndefined();
        expect(res.body.data.email).toBe('john@example.com');
        expect(res.body.data.role).toBe('shipper');
    });

    it('returns 409 when email is already registered', async () => {
        await createUser({ email: 'duplicate@example.com' });

        const res = await supertest(app).post('/api/register').send({
            name: 'Another User',
            email: 'duplicate@example.com',
            phone: '9876543210',
            password: 'password123'
        });

        expect(res.status).toBe(409);
        expect(res.body.success).toBe(false);
    });

    it('returns 400 when email format is invalid', async () => {
        const res = await supertest(app).post('/api/register').send({
            name: 'Bad Email',
            email: 'not-an-email',
            phone: '9876543210',
            password: 'password123'
        });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });

    it('returns 400 when required fields are missing', async () => {
        const res = await supertest(app).post('/api/register').send({
            email: 'incomplete@example.com'
            // name, phone, password missing
        });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });

});

describe('POST /api/login', () => {

    it('returns 200 with token and correct user.role on success', async () => {
        await createUser({ email: 'logintest@example.com', role: 'shipper' });

        const res = await supertest(app).post('/api/login').send({
            email: 'logintest@example.com',
            password: 'password123'
        });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.token).toBeDefined();
        expect(typeof res.body.token).toBe('string');
        expect(res.body.user.role).toBe('shipper');
        // Password must never appear
        expect(res.body.user.password).toBeUndefined();
    });

    it('returns 401 on wrong password', async () => {
        await createUser({ email: 'wrongpass@example.com' });

        const res = await supertest(app).post('/api/login').send({
            email: 'wrongpass@example.com',
            password: 'WRONG_PASSWORD'
        });

        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
        expect(res.body.token).toBeUndefined();
    });

    it('returns 401 (not 404) for nonexistent email — user enumeration prevention', async () => {
        const res = await supertest(app).post('/api/login').send({
            email: 'ghost_user_does_not_exist@example.com',
            password: 'anypassword'
        });

        // MUST NOT be 404 — that would confirm the email doesn't exist (enumeration)
        // Should be 401 to be consistent with wrong-password responses
        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
        expect(res.body.token).toBeUndefined();
    });

    it('returns 401 for unauthenticated request to a protected route', async () => {
        const res = await supertest(app)
            .get('/api/shipments');
        // No Authorization header

        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
    });

});
