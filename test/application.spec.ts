import { Application as ExpressApp } from "express"
import { Application } from "../src";
import { join } from "path";
import bodyParser from "body-parser"
import supertest from "supertest"

describe("Application Test", () => {
    let app: ExpressApp

    beforeAll(async () => {
        const application = new Application({ controllerPath: join(__dirname, "controller") })
        application.use(bodyParser.json())
        app = await application.initialize()
    })

    it("Should handle root request", () => {
        return supertest(app)
            .get("/")
            .expect(200, { message: "Hello world" })
    })

    it("Should handle get method", () => {
        return supertest(app)
            .get("/animals/123")
            .expect(200, { params: { id: '123' } })
    })

    it("Should handle post method", () => {
        return supertest(app)
            .post("/animals")
            .send({ message: "Hello world" })
            .expect(200, { message: 'Hello world' })
    })

    it("Should handle delete method", () => {
        return supertest(app)
            .delete("/animals/123")
            .expect(200, { params: { id: '123' } })
    })

    it("Should handle put method", () => {
        return supertest(app)
            .put("/animals/123")
            .send({ message: "Hello world" })
            .expect(200, { params: { id: '123' }, data: { message: "Hello world" } })
    })

    it("Should handle patch method", () => {
        return supertest(app)
            .patch("/animals/123")
            .send({ message: "Hello world" })
            .expect(200, { params: { id: '123' }, data: { message: "Hello world" } })
    })

    it("Should able to bind request", () => {
        return supertest(app)
            .get("/request")
            .expect(200, { isRequest: true })
    })

    it("Should able to bind query", () => {
        return supertest(app)
            .get("/query?msg=hello&offset=1")
            .expect(200, { msg: "hello", offset: "1" })
    })
})