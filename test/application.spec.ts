import { Express, Application as ExpressApp, Response, NextFunction, Request } from "express"
import { Application } from "../src";
import { join } from "path";
import bodyParser from "body-parser"
import supertest from "supertest"

describe("Application Test", () => {
    let app: Express

    beforeAll(async () => {
        //const globalHandler = 
        const application = new Application({ controllerPath: join(__dirname, "controller") })
        application.use(bodyParser.json())
        app = await application.initialize()
        app.use((err:any, req:Request, res:Response, next:NextFunction) => {
            res.status(err.status || 500)
            res.send(err)
        })
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

    it("Should able to catch error", () => {
        return supertest(app)
            .get("/error")
            .expect(500)
    })
})