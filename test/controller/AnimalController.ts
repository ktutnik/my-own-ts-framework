import { route, bind } from "../../src";


export class AnimalController {

    @route.get("/animals/:id")
    get(@bind.params() params: any) {
        return { params }
    }

    @route.post("/animals")
    save(@bind.body() data: any) {
        return data
    }

    @route.put("/animals/:id")
    replace(@bind.params() params: any, @bind.body() data: any) {
        return { params, data }
    }

    @route.patch("/animals/:id")
    modify(@bind.params() params: any, @bind.body() data: any) {
        return { params, data }
    }

    @route.del("/animals/:id")
    delete(@bind.params() params: any) {
        return { params }
    }
}