import { route, bind } from "../../src";
import { IncomingMessage } from "http";

export class HomeController {
    @route.get("/")
    index() {
        return { message: "Hello world" }
    }

    @route.get("/request")
    request(@bind.request() req:any){
        return { isRequest: req instanceof IncomingMessage }
    }

    @route.get("/query")
    query(@bind.query() query:any){
        return query;
    }
}